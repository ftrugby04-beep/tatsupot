import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const client = new Anthropic();

export async function POST(request: NextRequest) {
  try {
    const { recentText, documents } = await request.json() as {
      recentText: string;
      documents?: { name: string; text: string }[];
    };

    if (!recentText || recentText.trim().length < 20) {
      return NextResponse.json({ tips: [] });
    }

    const docsBlock =
      documents && documents.length > 0
        ? documents.map((d) => `### ${d.name}\n${d.text.slice(0, 4000)}`).join("\n\n")
        : "(なし)";

    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 400,
      messages: [
        {
          role: "user",
          content: `あなたは商談・会議に同席しているリアルタイムAIアシスタントです。直近の会話（下記）を読み、話者に今すぐ役立つ短い助言を最大3件、日本語でJSON配列だけで出力してください。
例: "予算についてまだ確認できていません", "この質問をすると良いです：導入時期はいつ頃を想定していますか？", "先方が価格を懸念している様子です"
助言すべき点が特にない場合は空配列 [] を返してください。マークダウンや説明文は不要、JSON配列のみを出力してください。

【関連資料】
${docsBlock}

【直近の会話】
${recentText.slice(-3000)}`,
        },
      ],
    });

    const rawText =
      message.content[0].type === "text" ? message.content[0].text : "[]";
    const jsonMatch = rawText.match(/\[[\s\S]*\]/);
    const tips = jsonMatch ? JSON.parse(jsonMatch[0]) : [];

    return NextResponse.json({ tips });
  } catch (error) {
    console.error("Assist error:", error);
    return NextResponse.json({ tips: [] });
  }
}
