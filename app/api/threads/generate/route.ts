import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import {
  buildCompliancePrompt,
  buildResearchIdeaPrompt,
  buildWriterPrompt,
  extractJson,
  IdeaDraft,
  WriterOutput,
} from "@/lib/threads-agents";
import {
  findDuplicate,
  hasPrDisclosure,
  localComplianceScan,
} from "@/lib/threads-compliance";
import {
  ComplianceResult,
  ContentType,
  CtaType,
  HookType,
  NgExpression,
  Product,
  ScheduleSlot,
  ThreadsPost,
  ThreadsSettings,
  createId,
  nowIso,
} from "@/lib/threads-types";

const client = new Anthropic();

type RequestBody = {
  date: string;
  slots: ScheduleSlot[];
  products: Product[];
  settings: ThreadsSettings;
  researchNotes?: string;
  knowledgeSummary?: string;
  customNg?: NgExpression[];
  pastPosts?: { id: string; body: string }[];
};

async function callClaude(prompt: string): Promise<string> {
  const message = await client.messages.create({
    model: "claude-sonnet-5",
    max_tokens: 2048,
    messages: [{ role: "user", content: prompt }],
  });
  return message.content[0].type === "text" ? message.content[0].text : "";
}

function matchProduct(idea: IdeaDraft, products: Product[]): Product | undefined {
  const haystack = `${idea.theme} ${idea.category} ${idea.genre}`.toLowerCase();
  return products.find((p) => haystack.includes(p.category.toLowerCase()));
}

async function runCompliance(
  hook: string,
  body: string,
  isPr: boolean,
  customNg: NgExpression[],
  pastPosts: { id: string; body: string }[]
): Promise<ComplianceResult> {
  const localFlags = localComplianceScan(`${hook} ${body}`, customNg);
  const duplicateOf = findDuplicate(body, pastPosts);

  try {
    const raw = await callClaude(
      buildCompliancePrompt(hook, body, isPr, localFlags, duplicateOf)
    );
    const parsed = extractJson<{
      riskScore: number;
      flags: ComplianceResult["flags"];
      prDisclosureOk: boolean;
    }>(raw, "object");

    if (!parsed) throw new Error("compliance parse failed");

    return {
      riskScore: parsed.riskScore,
      flags: parsed.flags ?? localFlags,
      prDisclosureOk: isPr ? parsed.prDisclosureOk : true,
      duplicateOf: duplicateOf?.id,
      checkedAt: nowIso(),
    };
  } catch {
    // Claude呼び出しに失敗した場合はローカル判定のみでフォールバックする
    const fallbackScore = Math.min(
      100,
      localFlags.length * 25 + (isPr && !hasPrDisclosure(body) ? 30 : 0) + (duplicateOf ? 40 : 0)
    );
    return {
      riskScore: fallbackScore,
      flags: localFlags,
      prDisclosureOk: isPr ? hasPrDisclosure(body) : true,
      duplicateOf: duplicateOf?.id,
      checkedAt: nowIso(),
    };
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: RequestBody = await request.json();
    const {
      date,
      slots,
      products,
      settings,
      researchNotes = "",
      knowledgeSummary = "(まだ蓄積された勝ちパターンはありません)",
      customNg = [],
      pastPosts = [],
    } = body;

    if (!date || !slots || slots.length === 0) {
      return NextResponse.json(
        { error: "日付とスロット設定が必要です。" },
        { status: 400 }
      );
    }

    // 1. Research × Idea Agent
    const ideaRaw = await callClaude(
      buildResearchIdeaPrompt(slots, settings, researchNotes, knowledgeSummary)
    );
    const ideas = extractJson<IdeaDraft[]>(ideaRaw, "array");
    if (!ideas || ideas.length === 0) {
      return NextResponse.json(
        { error: "投稿ネタの生成に失敗しました。もう一度お試しください。" },
        { status: 500 }
      );
    }

    // 2 & 3. Planning Agent + Scheduler Agent (決定的)
    const plannedIdeas = slots.map((slot, i) => ({
      slot,
      idea: ideas[i] ?? {
        genre: slot.genre,
        theme: "テーマ未生成",
        target: settings.targetAudience,
        purpose: "情報提供",
        category: slot.genre,
      },
    }));

    // 4〜6. Product Agent → Writer/Creative Agent → Compliance Agent（アイデアごとに並列）
    const posts: ThreadsPost[] = await Promise.all(
      plannedIdeas.map(async ({ slot, idea }) => {
        const product = matchProduct(idea, products);
        const writerRaw = await callClaude(buildWriterPrompt(idea, product, settings));
        const writer = extractJson<WriterOutput>(writerRaw, "object");

        const hook = writer?.hook ?? idea.theme;
        const draftBody = writer?.body ?? `${hook}\n\n(生成に失敗しました。再生成してください。)`;
        const isPr = Boolean(product?.isAffiliate);

        const compliance = await runCompliance(
          hook,
          draftBody,
          isPr,
          customNg,
          pastPosts
        );

        const status: ThreadsPost["status"] =
          compliance.riskScore >= 60 || (isPr && !compliance.prDisclosureOk)
            ? "needs_review"
            : "pending_approval";

        const now = nowIso();
        const post: ThreadsPost = {
          id: createId(),
          postDate: date,
          postTime: slot.time,
          genre: idea.genre,
          theme: idea.theme,
          target: idea.target,
          purpose: idea.purpose,
          hook,
          body: draftBody,
          cta: writer?.cta ?? "",
          ctaType: (writer?.ctaType as CtaType) ?? "none",
          productId: product?.id,
          productUrl: product?.url,
          isPr,
          imageDirection: writer?.imageDirection || undefined,
          videoDirection: writer?.videoDirection || undefined,
          status,
          tags: {
            hookType: (writer?.hookType as HookType) ?? "howto",
            contentType: (writer?.contentType as ContentType) ?? "howto",
            category: idea.category,
          },
          compliance,
          createdAt: now,
          updatedAt: now,
          history: [{ action: "generated", at: now }],
        };
        return post;
      })
    );

    return NextResponse.json({ posts });
  } catch (error) {
    console.error("Threads generate error:", error);
    return NextResponse.json(
      { error: "投稿生成中にエラーが発生しました。APIキーの設定を確認してください。" },
      { status: 500 }
    );
  }
}
