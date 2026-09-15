import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const client = new Anthropic();

type ChatMessage = { role: "user" | "assistant"; content: string };

export async function POST(request: NextRequest) {
  try {
    const { transcriptText, minutesSummary, documents, history, question } =
      await request.json() as {
        transcriptText: string;
        minutesSummary?: string;
        documents?: { name: string; text: string }[];
        history: ChatMessage[];
        question: string;
      };

    if (!question || question.trim() === "") {
      return NextResponse.json({ error: "質問を入力してください。" }, { status: 400 });
    }

    const docsBlock =
      documents && documents.length > 0
        ? documents.map((d) => `### ${d.name}\n${d.text.slice(0, 6000)}`).join("\n\n")
        : "(なし)";

    const systemPrompt = `あなたは会議の内容を熟知したAIアシスタントです。以下の会議記録・議事録・関連資料の内容だけに基づいて、ユーザーの質問に日本語で簡潔かつ具体的に答えてください。記録にない内容は「会議記録からは分かりません」と答えてください。

【会議の文字起こし】
${transcriptText.slice(0, 15000)}

【議事録要約】
${minutesSummary ?? "(未生成)"}

【関連資料】
${docsBlock}`;

    const message = await client.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 1024,
      system: systemPrompt,
      messages: [
        ...(history ?? []).slice(-10),
        { role: "user", content: question },
      ],
    });

    const answer =
      message.content[0].type === "text" ? message.content[0].text : "";

    return NextResponse.json({ answer });
  } catch (error) {
    console.error("Chat error:", error);
    return NextResponse.json(
      { error: "チャット処理中にエラーが発生しました。" },
      { status: 500 }
    );
  }
}
