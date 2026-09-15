import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const client = new Anthropic();

type MeetingBrief = {
  id: string;
  title: string;
  company: string;
  createdAt: string;
  summary: string;
  keywords: string[];
};

export async function POST(request: NextRequest) {
  try {
    const { query, meetings } = await request.json() as {
      query: string;
      meetings: MeetingBrief[];
    };

    if (!query || query.trim() === "") {
      return NextResponse.json({ error: "検索キーワードを入力してください。" }, { status: 400 });
    }
    if (!meetings || meetings.length === 0) {
      return NextResponse.json({ results: [] });
    }

    const catalog = meetings
      .map(
        (m) =>
          `id: ${m.id}\ntitle: ${m.title}\ncompany: ${m.company}\ndate: ${m.createdAt.slice(0, 10)}\nsummary: ${m.summary}\nkeywords: ${m.keywords.join(", ")}`
      )
      .join("\n---\n");

    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: `以下は過去の会議一覧です。ユーザーの検索クエリに関連する会議を関連度が高い順に最大10件選び、各会議について理由を日本語で一言添えてJSON配列で出力してください。関連する会議がなければ空配列を返してください。マークダウンや説明文は不要、JSON配列のみを出力してください。

出力形式: [{ "id": "会議のid", "reason": "関連する理由（一言）" }]

【検索クエリ】
${query}

【会議一覧】
${catalog}`,
        },
      ],
    });

    const rawText =
      message.content[0].type === "text" ? message.content[0].text : "[]";
    const jsonMatch = rawText.match(/\[[\s\S]*\]/);
    const results = jsonMatch ? JSON.parse(jsonMatch[0]) : [];

    return NextResponse.json({ results });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json(
      { error: "検索中にエラーが発生しました。" },
      { status: 500 }
    );
  }
}
