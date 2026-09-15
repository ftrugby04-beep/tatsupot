import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const client = new Anthropic();

export async function POST(request: NextRequest) {
  try {
    const { minutesSummary, decisions, actionItems, mode, company } =
      await request.json() as {
        minutesSummary: string;
        decisions: string[];
        actionItems: { who: string; what: string; when: string }[];
        mode: "thanks" | "followup";
        company?: string;
      };

    const modeLabel =
      mode === "thanks" ? "会議後のお礼メール" : "決定事項とToDoのフォローアップメール";

    const message = await client.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 800,
      messages: [
        {
          role: "user",
          content: `以下の会議情報をもとに、${modeLabel}の文章を日本語のビジネスメール形式で作成してください。件名も含めてください。宛先企業名: ${company ?? "先方"}

【要約】
${minutesSummary}

【決定事項】
${decisions.join("\n")}

【ToDo】
${actionItems.map((a) => `- ${a.who}: ${a.what} (${a.when})`).join("\n")}

件名と本文のみを出力してください。`,
        },
      ],
    });

    const draft =
      message.content[0].type === "text" ? message.content[0].text : "";

    return NextResponse.json({ draft });
  } catch (error) {
    console.error("Email draft error:", error);
    return NextResponse.json(
      { error: "メール文章の生成中にエラーが発生しました。" },
      { status: 500 }
    );
  }
}
