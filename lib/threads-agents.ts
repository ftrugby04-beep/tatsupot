import {
  ComplianceFlag,
  ContentType,
  HookType,
  Product,
  PostGenre,
  ScheduleSlot,
  ThreadsSettings,
} from "./threads-types";

export function extractJson<T>(rawText: string, kind: "object" | "array"): T | null {
  const pattern = kind === "array" ? /\[[\s\S]*\]/ : /\{[\s\S]*\}/;
  const match = rawText.match(pattern);
  if (!match) return null;
  try {
    return JSON.parse(match[0]) as T;
  } catch {
    return null;
  }
}

export type IdeaDraft = {
  genre: PostGenre;
  theme: string;
  target: string;
  purpose: string;
  category: string;
};

export function buildResearchIdeaPrompt(
  slots: ScheduleSlot[],
  settings: ThreadsSettings,
  researchNotes: string,
  knowledgeSummary: string
): string {
  const slotLines = slots
    .map((s, i) => `${i + 1}. ${s.time} / ジャンル: ${s.genre}`)
    .join("\n");

  return `あなたはThreadsアカウント運用の企画チーム「Research Agent」と「Idea Agent」を兼任するAIです。

【役割】
1. 与えられたブランドボイス・ターゲット像・トレンドメモ・過去の勝ちパターンをもとに、投稿ネタ候補をスロット数(${slots.length}件)と同じ件数だけ考案する。
2. 各候補には「ジャンル」「テーマ」「ターゲット」「投稿目的」「カテゴリ」を付与する。
3. ジャンルは下記スロットの並び順・ジャンル指定に厳密に従うこと(1件ずつ対応させる)。
4. 過去のナレッジ(勝ちパターン)がある場合は積極的に取り入れる。NG表現(断定的な効果表現・誇大表現)は候補の時点で避ける。

【ターゲット像】
${settings.targetAudience}

【ブランドボイス】
${settings.brandVoice}

【トレンドメモ(ユーザー入力、無ければ「特になし」)】
${researchNotes || "特になし"}

【過去の勝ちパターン(Knowledge Agent蓄積分)】
${knowledgeSummary}

【本日のスロット】
${slotLines}

【出力形式(JSON配列のみ、件数は必ず${slots.length}件、説明文やマークダウンは不要)】
[{ "genre": "スロットと同じジャンル文字列", "theme": "...", "target": "...", "purpose": "...", "category": "..." }]`;
}

export type WriterOutput = {
  hook: string;
  body: string;
  cta: string;
  ctaType: string;
  hookType: HookType;
  contentType: ContentType;
  imageDirection: string;
  videoDirection: string;
};

export function buildWriterPrompt(
  idea: IdeaDraft,
  product: Product | undefined,
  settings: ThreadsSettings
): string {
  const productBlock = product
    ? `【紐付けられた商品】\n商品名: ${product.name}\nカテゴリ: ${product.category}\nアフィリエイト: ${product.isAffiliate ? "あり(PR表記必須)" : "なし"}`
    : "【紐付けられた商品】\nなし";

  return `あなたはThreadsの投稿本文を書く「Writer Agent」と、画像/動画構成を考える「Creative Agent」を兼任します。

【投稿案】
ジャンル: ${idea.genre}
テーマ: ${idea.theme}
ターゲット: ${idea.target}
投稿目的: ${idea.purpose}
カテゴリ: ${idea.category}

${productBlock}

【ブランドボイス】
${settings.brandVoice}

【制約】
- 本文は全角500文字以内。Threadsらしい改行・絵文字は最小限に留める。
- 1文目(Hook)は続きを読みたくなる強い一文にする。
- 商品情報が渡された場合は不自然にならない範囲で1箇所だけ触れる。アフィリエイトの場合は本文またはCTAに必ず「PR」等のPR表記を含める。
- 誇大・断定的な効果表現(薬機法・景表法に抵触しうる表現、例:「絶対に痩せる」「必ず治る」「100%」)は絶対に使わない。

【出力形式(JSONのみ、説明文不要)】
{
  "hook": "1文目",
  "body": "本文全体(hookを含む)",
  "cta": "締めの一言・行動喚起文",
  "ctaType": "save|follow|comment|link_click|profile_link|none",
  "hookType": "problem|curiosity|surprise|empathy|howto|number",
  "contentType": "howto|list|story|comparison|qa|checklist",
  "imageDirection": "必要な画像の構成案(1〜2文、不要なら空文字)",
  "videoDirection": "必要な動画の構成案(1〜2文、不要なら空文字)"
}`;
}

export function buildHookStrengthenPrompt(hook: string, body: string): string {
  return `あなたは「Hook Agent」です。以下のThreads投稿の1文目(Hook)だけを、悩み訴求・数字訴求・意外性のいずれかを使ってより強い一文に書き直してください。本文の内容や事実と矛盾してはいけません。誇大・断定的な表現は使わないこと。

【現在のHook】
${hook}

【本文全体(参考)】
${body}

【出力形式(JSONのみ)】
{ "hook": "書き直した1文目", "hookType": "problem|curiosity|surprise|empathy|howto|number" }`;
}

export function buildCompliancePrompt(
  hook: string,
  body: string,
  isPr: boolean,
  localFlags: ComplianceFlag[],
  duplicateOf: { id: string; similarity: number } | null
): string {
  const localFlagsBlock =
    localFlags.length > 0
      ? localFlags
          .map((f) => `- 「${f.phrase}」(${f.law}) : ${f.reason}`)
          .join("\n")
      : "(ローカル辞書での検知なし)";

  const duplicateBlock = duplicateOf
    ? `過去投稿(ID: ${duplicateOf.id})とテキスト類似度 ${(duplicateOf.similarity * 100).toFixed(0)}% で酷似しています。`
    : "過去投稿との明確な重複は検出されていません。";

  return `あなたは「Compliance Agent」です。日本のアフィリエイト/美容系Threads投稿について、薬機法・景品表示法・PR表記義務・誇大表現・重複投稿のリスクを判定してください。

【投稿(Hook)】
${hook}

【投稿(本文)】
${body}

【PR/アフィリエイト商品を含むか】
${isPr ? "はい(PR表記が必須)" : "いいえ"}

【ローカル辞書での事前検知結果】
${localFlagsBlock}

【重複チェック結果】
${duplicateBlock}

事前検知された表現は必ずflagsに含め、他に見落としがあれば追加してください。断定はせず、修正候補はそのまま差し替えて使える自然な日本語にしてください。

【出力形式(JSONのみ)】
{
  "riskScore": 0から100の整数(高いほど危険),
  "flags": [{ "phrase": "該当箇所", "law": "薬機法|景表法|PR表記|誇大表現|商標/権利|重複投稿", "reason": "...", "suggestion": "差し替え候補" }],
  "prDisclosureOk": true または false
}`;
}

export type OptimizationInsight = {
  summary: string;
  postIds: string[];
};

export function buildOptimizationPrompt(
  posts: {
    id: string;
    genre: string;
    target: string;
    hookType: string;
    contentType: string;
    ctaType: string;
    category: string;
    metrics: { views: number; likes: number; saves: number; linkClicks: number };
  }[]
): string {
  const catalog = posts
    .map(
      (p) =>
        `id:${p.id} genre:${p.genre} target:${p.target} hookType:${p.hookType} contentType:${p.contentType} ctaType:${p.ctaType} category:${p.category} | views:${p.metrics.views} likes:${p.metrics.likes} saves:${p.metrics.saves} linkClicks:${p.metrics.linkClicks}`
    )
    .join("\n");

  return `あなたは「Optimization Agent」です。タグ付きの投稿と実績指標の一覧を分析し、「ターゲット×カテゴリ×コンテンツ形式×CTA種別」の組み合わせで反応が良い/悪いパターンを日本語で要約してください。具体的な数値根拠(閲覧数・保存数など)を必ず添えること。次回の投稿生成でそのまま使える実行可能な提案にすること。

【投稿と実績の一覧】
${catalog}

【出力形式(JSON配列のみ、3〜5件)】
[{ "summary": "パターンの説明(数値根拠を含む)", "postIds": ["根拠にした投稿ID"] }]`;
}
