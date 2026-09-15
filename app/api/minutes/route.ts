import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const client = new Anthropic();

type RequestBody = {
  transcriptText: string;
  documents?: { name: string; text: string }[];
  isDealMeeting?: boolean;
};

function buildPrompt(body: RequestBody) {
  const today = new Date().toISOString().slice(0, 10);
  const docsBlock =
    body.documents && body.documents.length > 0
      ? body.documents
          .map((d) => `### 資料: ${d.name}\n${d.text.slice(0, 8000)}`)
          .join("\n\n")
      : "(会議資料はアップロードされていません)";

  const dealCoachInstruction = body.isDealMeeting
    ? `\n  "dealCoach": {
    "score": 0から100の整数（商談の総合評価）,
    "good": ["良かった点1", "良かった点2"],
    "improve": ["改善点1", "改善点2"],
    "interestLevel": "高" または "中" または "低",
    "winProbability": 0から100の整数（成約可能性%）,
    "nextActions": ["次にやるべきこと1", "次にやるべきこと2"]
  },`
    : "";

  const discrepancyInstruction =
    body.documents && body.documents.length > 0
      ? `\n  "discrepancies": ["資料と発言内容の食い違い、または資料の重要ポイントで会議中に触れられていない点（なければ空配列）"],`
      : "";

  return `あなたは優秀な議事録作成AIアシスタントです。以下の会議の文字起こしを分析し、正式な議事録データをJSON形式で出力してください。
今日の日付は ${today} です。相対的な日付表現（「金曜まで」「来週」など）は、これを基準にYYYY-MM-DD形式に変換してください。変換できない場合は null にしてください。

【会議の文字起こし】
${body.transcriptText.slice(0, 15000)}

【関連資料】
${docsBlock}

【出力形式】
必ず以下のJSON構造のみを出力してください（マークダウンのコードブロックは不要です）:
{
  "summary": "会議全体の要約（300字以内、日本語）",
  "decisions": ["決定事項1", "決定事項2"],
  "actionItems": [
    { "who": "担当者名（不明な場合は「未定」）", "what": "タスク内容", "when": "期限の元の表現（不明な場合は「未定」）", "whenISO": "YYYY-MM-DD または null" }
  ],
  "openIssues": ["結論が出ず持ち越しになった論点1"],
  "questions": [
    { "question": "会議中に出た質問", "answer": "その場での回答（未回答なら「未回答」）" }
  ],
  "keywords": ["金額・日付・企業名・サービス名などの重要キーワード"],
  "nextAgenda": ["次回会議で話すべき候補1"],${dealCoachInstruction}${discrepancyInstruction}
}`;
}

export async function POST(request: NextRequest) {
  try {
    const body: RequestBody = await request.json();

    if (!body.transcriptText || body.transcriptText.trim() === "") {
      return NextResponse.json(
        { error: "文字起こしテキストが空です。" },
        { status: 400 }
      );
    }

    const message = await client.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 4096,
      messages: [{ role: "user", content: buildPrompt(body) }],
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

    const parsed = JSON.parse(jsonMatch[0]);

    const actionItems = (parsed.actionItems ?? []).map(
      (item: Record<string, unknown>) => ({
        id: crypto.randomUUID(),
        who: item.who ?? "未定",
        what: item.what ?? "",
        when: item.when ?? "未定",
        whenISO: item.whenISO ?? null,
        status: "todo" as const,
      })
    );

    return NextResponse.json({
      summary: parsed.summary ?? "",
      decisions: parsed.decisions ?? [],
      actionItems,
      openIssues: parsed.openIssues ?? [],
      questions: parsed.questions ?? [],
      keywords: parsed.keywords ?? [],
      nextAgenda: parsed.nextAgenda ?? [],
      dealCoach: parsed.dealCoach ?? undefined,
      discrepancies: parsed.discrepancies ?? undefined,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Minutes generation error:", error);
    return NextResponse.json(
      { error: "議事録の生成中にエラーが発生しました。APIキーの設定を確認してください。" },
      { status: 500 }
    );
  }
}
