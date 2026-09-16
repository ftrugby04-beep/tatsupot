import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { buildHookStrengthenPrompt, extractJson } from "@/lib/threads-agents";
import { HookType } from "@/lib/threads-types";

const client = new Anthropic();

type RequestBody = {
  hook: string;
  body: string;
};

export async function POST(request: NextRequest) {
  try {
    const { hook, body }: RequestBody = await request.json();
    if (!hook || !body) {
      return NextResponse.json(
        { error: "hookとbodyが必要です。" },
        { status: 400 }
      );
    }

    const message = await client.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 512,
      messages: [{ role: "user", content: buildHookStrengthenPrompt(hook, body) }],
    });

    const rawText =
      message.content[0].type === "text" ? message.content[0].text : "";
    const parsed = extractJson<{ hook: string; hookType: HookType }>(
      rawText,
      "object"
    );

    if (!parsed) {
      return NextResponse.json(
        { error: "Hookの強化に失敗しました。" },
        { status: 500 }
      );
    }

    return NextResponse.json(parsed);
  } catch (error) {
    console.error("Hook agent error:", error);
    return NextResponse.json(
      { error: "Hook生成中にエラーが発生しました。" },
      { status: 500 }
    );
  }
}
