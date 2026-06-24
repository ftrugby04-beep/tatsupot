import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const client = new Anthropic();

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json();

    if (!text || typeof text !== "string" || text.trim() === "") {
      return NextResponse.json(
        { error: "議事録のテキストを入力してください。" },
        { status: 400 }
      );
    }

    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      messages: [
        {
          role: "user",
          content: `以下の議事録を読み取り、次の4つの項目をJSON形式で出力してください。

【議事録】
${text}

【出力形式】
必ず以下のJSONのみを返してください（マークダウンコードブロック不要）:
{
  "summary": "議事録全体の要約（200字以内）",
  "actionItems": [
    { "who": "担当者名（不明な場合は「未定」）", "what": "タスク内容", "when": "期限（不明な場合は「未定」）" }
  ],
  "decisions": [
    "決定事項1",
    "決定事項2"
  ],
  "nextAgenda": [
    "次回アジェンダ候補1",
    "次回アジェンダ候補2"
  ]
}`,
        },
      ],
    });

    const rawText =
      message.content[0].type === "text" ? message.content[0].text : "";

    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json(
        { error: "AIからの応答を解析できませんでした。" },
        { status: 500 }
      );
    }

    const result = JSON.parse(jsonMatch[0]);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Summarize error:", error);
    return NextResponse.json(
      { error: "処理中にエラーが発生しました。APIキーの設定を確認してください。" },
      { status: 500 }
    );
  }
}
