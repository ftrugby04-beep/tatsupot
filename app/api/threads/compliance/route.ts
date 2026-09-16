import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { buildCompliancePrompt, extractJson } from "@/lib/threads-agents";
import { findDuplicate, localComplianceScan } from "@/lib/threads-compliance";
import { ComplianceResult, NgExpression, nowIso } from "@/lib/threads-types";

const client = new Anthropic();

type RequestBody = {
  hook: string;
  body: string;
  isPr: boolean;
  customNg?: NgExpression[];
  pastPosts?: { id: string; body: string }[];
};

export async function POST(request: NextRequest) {
  try {
    const {
      hook,
      body,
      isPr,
      customNg = [],
      pastPosts = [],
    }: RequestBody = await request.json();

    if (!hook || !body) {
      return NextResponse.json(
        { error: "hookとbodyが必要です。" },
        { status: 400 }
      );
    }

    const localFlags = localComplianceScan(`${hook} ${body}`, customNg);
    const duplicateOf = findDuplicate(body, pastPosts);

    const message = await client.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: buildCompliancePrompt(hook, body, isPr, localFlags, duplicateOf),
        },
      ],
    });

    const rawText =
      message.content[0].type === "text" ? message.content[0].text : "";
    const parsed = extractJson<{
      riskScore: number;
      flags: ComplianceResult["flags"];
      prDisclosureOk: boolean;
    }>(rawText, "object");

    if (!parsed) {
      return NextResponse.json(
        { error: "コンプライアンス判定に失敗しました。" },
        { status: 500 }
      );
    }

    const result: ComplianceResult = {
      riskScore: parsed.riskScore,
      flags: parsed.flags ?? localFlags,
      prDisclosureOk: isPr ? parsed.prDisclosureOk : true,
      duplicateOf: duplicateOf?.id,
      checkedAt: nowIso(),
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("Compliance agent error:", error);
    return NextResponse.json(
      { error: "コンプライアンス確認中にエラーが発生しました。" },
      { status: 500 }
    );
  }
}
