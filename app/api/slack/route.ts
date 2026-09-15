import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { webhookUrl, title, decisions, actionItems } = await request.json() as {
      webhookUrl: string;
      title: string;
      decisions: string[];
      actionItems: { who: string; what: string; when: string }[];
    };

    if (!webhookUrl || !webhookUrl.startsWith("https://hooks.slack.com/")) {
      return NextResponse.json(
        { error: "有効なSlack Incoming Webhook URLを入力してください。" },
        { status: 400 }
      );
    }

    const lines: string[] = [`*📋 議事録共有: ${title}*`];
    if (decisions.length > 0) {
      lines.push("*決定事項*");
      decisions.forEach((d) => lines.push(`• ${d}`));
    }
    if (actionItems.length > 0) {
      lines.push("*ToDo*");
      actionItems.forEach((a) => lines.push(`• [${a.who}] ${a.what} (期限: ${a.when})`));
    }

    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: lines.join("\n") }),
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: "Slackへの送信に失敗しました。Webhook URLを確認してください。" },
        { status: 502 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Slack share error:", error);
    return NextResponse.json(
      { error: "Slack共有中にエラーが発生しました。" },
      { status: 500 }
    );
  }
}
