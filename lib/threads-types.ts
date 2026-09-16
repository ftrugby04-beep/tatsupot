export type PostGenre =
  | "beauty"
  | "stretch"
  | "product"
  | "knowledge"
  | "experience"
  | "habit"
  | "summary";

export const POST_GENRE_LABELS: Record<PostGenre, string> = {
  beauty: "美容",
  stretch: "ストレッチ",
  product: "商品紹介",
  knowledge: "豆知識",
  experience: "体験談",
  habit: "習慣",
  summary: "まとめ",
};

export type HookType =
  | "problem"
  | "curiosity"
  | "surprise"
  | "empathy"
  | "howto"
  | "number";

export const HOOK_TYPE_LABELS: Record<HookType, string> = {
  problem: "悩み訴求",
  curiosity: "好奇心",
  surprise: "意外性",
  empathy: "共感",
  howto: "ノウハウ提示",
  number: "数字訴求",
};

export type ContentType =
  | "howto"
  | "list"
  | "story"
  | "comparison"
  | "qa"
  | "checklist";

export const CONTENT_TYPE_LABELS: Record<ContentType, string> = {
  howto: "HowTo",
  list: "リスト",
  story: "体験談",
  comparison: "比較",
  qa: "Q&A",
  checklist: "チェックリスト",
};

export type CtaType =
  | "save"
  | "follow"
  | "comment"
  | "link_click"
  | "profile_link"
  | "none";

export const CTA_TYPE_LABELS: Record<CtaType, string> = {
  save: "保存誘導",
  follow: "フォロー誘導",
  comment: "コメント誘導",
  link_click: "リンククリック誘導",
  profile_link: "プロフィールリンク誘導",
  none: "なし",
};

export type PostStatus =
  | "draft"
  | "needs_review"
  | "pending_approval"
  | "approved"
  | "scheduled"
  | "published"
  | "rejected";

export const POST_STATUS_LABELS: Record<PostStatus, string> = {
  draft: "下書き",
  needs_review: "要修正",
  pending_approval: "承認待ち",
  approved: "承認済み",
  scheduled: "投稿予約",
  published: "投稿済み",
  rejected: "投稿中止",
};

export type ComplianceLaw =
  | "薬機法"
  | "景表法"
  | "PR表記"
  | "誇大表現"
  | "商標/権利"
  | "重複投稿";

export type ComplianceFlag = {
  phrase: string;
  law: ComplianceLaw;
  reason: string;
  suggestion: string;
};

export type ComplianceResult = {
  riskScore: number;
  flags: ComplianceFlag[];
  prDisclosureOk: boolean;
  duplicateOf?: string;
  checkedAt: string;
};

export type ProductPlatform = "rakuten" | "amazon" | "other";

export type Product = {
  id: string;
  name: string;
  url: string;
  category: string;
  isAffiliate: boolean;
  platform: ProductPlatform;
  notes?: string;
};

export type PostMetrics = {
  views: number;
  likes: number;
  replies: number;
  reposts: number;
  saves: number;
  linkClicks: number;
  revenue: number;
  recordedAt: string;
};

export type PostHistoryEntry = {
  action: string;
  at: string;
  note?: string;
};

export type ThreadsPost = {
  id: string;
  postDate: string;
  postTime: string;
  genre: PostGenre;
  theme: string;
  target: string;
  purpose: string;
  hook: string;
  body: string;
  cta: string;
  ctaType: CtaType;
  productId?: string;
  productUrl?: string;
  isPr: boolean;
  imageDirection?: string;
  videoDirection?: string;
  status: PostStatus;
  tags: {
    hookType: HookType;
    contentType: ContentType;
    category: string;
  };
  compliance?: ComplianceResult;
  metrics?: PostMetrics;
  createdAt: string;
  updatedAt: string;
  history: PostHistoryEntry[];
};

export type ScheduleSlot = {
  time: string;
  genre: PostGenre;
};

export type ThreadsSettings = {
  slots: ScheduleSlot[];
  targetAudience: string;
  brandVoice: string;
};

export const DEFAULT_SLOTS: ScheduleSlot[] = [
  { time: "08:00", genre: "stretch" },
  { time: "10:00", genre: "knowledge" },
  { time: "12:00", genre: "product" },
  { time: "14:00", genre: "beauty" },
  { time: "16:00", genre: "beauty" },
  { time: "18:00", genre: "product" },
  { time: "20:00", genre: "habit" },
  { time: "22:00", genre: "experience" },
];

export const DEFAULT_SETTINGS: ThreadsSettings = {
  slots: DEFAULT_SLOTS,
  targetAudience: "30〜40代女性、美容・姿勢改善・ストレッチに関心がある",
  brandVoice: "親しみやすく、断定しすぎない、共感ベースのトーン",
};

export type KnowledgeInsight = {
  id: string;
  createdAt: string;
  summary: string;
  basedOnPostIds: string[];
};

export type NgExpression = {
  phrase: string;
  law: ComplianceLaw;
  suggestion: string;
};

export function createId(): string {
  return crypto.randomUUID();
}

export function nowIso(): string {
  return new Date().toISOString();
}
