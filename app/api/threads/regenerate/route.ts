import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import {
  buildCompliancePrompt,
  buildWriterPrompt,
  extractJson,
  IdeaDraft,
  WriterOutput,
} from "@/lib/threads-agents";
import { findDuplicate, localComplianceScan } from "@/lib/threads-compliance";
import {
  ComplianceResult,
  ContentType,
  CtaType,
  HookType,
  NgExpression,
  Product,
  ThreadsSettings,
  nowIso,
} from "@/lib/threads-types";

const client = new Anthropic();

type RequestBody = {
  idea: IdeaDraft;
  product?: Product;
  settings: ThreadsSettings;
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

export async function POST(request: NextRequest) {
  try {
    const {
      idea,
      product,
      settings,
      customNg = [],
      pastPosts = [],
    }: RequestBody = await request.json();

    if (!idea) {
      return NextResponse.json({ error: "投稿案が必要です。" }, { status: 400 });
    }

    const writerRaw = await callClaude(buildWriterPrompt(idea, product, settings));
    const writer = extractJson<WriterOutput>(writerRaw, "object");

    if (!writer) {
      return NextResponse.json(
        { error: "本文の再生成に失敗しました。" },
        { status: 500 }
      );
    }

    const isPr = Boolean(product?.isAffiliate);
    const localFlags = localComplianceScan(`${writer.hook} ${writer.body}`, customNg);
    const duplicateOf = findDuplicate(writer.body, pastPosts);

    const complianceRaw = await callClaude(
      buildCompliancePrompt(writer.hook, writer.body, isPr, localFlags, duplicateOf)
    );
    const complianceParsed = extractJson<{
      riskScore: number;
      flags: ComplianceResult["flags"];
      prDisclosureOk: boolean;
    }>(complianceRaw, "object");

    const compliance: ComplianceResult = {
      riskScore: complianceParsed?.riskScore ?? localFlags.length * 25,
      flags: complianceParsed?.flags ?? localFlags,
      prDisclosureOk: isPr ? (complianceParsed?.prDisclosureOk ?? false) : true,
      duplicateOf: duplicateOf?.id,
      checkedAt: nowIso(),
    };

    return NextResponse.json({
      hook: writer.hook,
      body: writer.body,
      cta: writer.cta,
      ctaType: writer.ctaType as CtaType,
      imageDirection: writer.imageDirection || undefined,
      videoDirection: writer.videoDirection || undefined,
      tags: {
        hookType: writer.hookType as HookType,
        contentType: writer.contentType as ContentType,
        category: idea.category,
      },
      compliance,
    });
  } catch (error) {
    console.error("Regenerate error:", error);
    return NextResponse.json(
      { error: "再生成中にエラーが発生しました。" },
      { status: 500 }
    );
  }
}
