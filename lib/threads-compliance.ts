import { ComplianceFlag, NgExpression } from "./threads-types";

export const NG_EXPRESSIONS: NgExpression[] = [
  { phrase: "絶対に痩せる", law: "薬機法", suggestion: "継続することでダイエットをサポートします" },
  { phrase: "必ず痩せる", law: "薬機法", suggestion: "継続することでダイエットをサポートします" },
  { phrase: "必ず治る", law: "薬機法", suggestion: "症状の緩和が期待できる場合があります" },
  { phrase: "医学的に証明", law: "薬機法", suggestion: "個人の感想です。効果には個人差があります" },
  { phrase: "科学的に証明", law: "薬機法", suggestion: "個人の感想です。効果には個人差があります" },
  { phrase: "副作用なし", law: "薬機法", suggestion: "使用感には個人差があります" },
  { phrase: "即効性", law: "薬機法", suggestion: "早い段階から変化を感じる方もいます" },
  { phrase: "完治", law: "薬機法", suggestion: "改善が期待できる場合があります" },
  { phrase: "100%", law: "誇大表現", suggestion: "多くの方に効果を実感いただいています" },
  { phrase: "誰でも簡単に", law: "誇大表現", suggestion: "取り組みやすい方法です" },
  { phrase: "永久に", law: "誇大表現", suggestion: "長期的な効果を期待できる場合があります" },
  { phrase: "業界No.1", law: "景表法", suggestion: "根拠となるデータを明記するか、表現を削除してください" },
  { phrase: "日本一", law: "景表法", suggestion: "根拠となるデータを明記するか、表現を削除してください" },
  { phrase: "今だけ", law: "景表法", suggestion: "対象期間・条件を明確に記載してください" },
  { phrase: "最安値", law: "景表法", suggestion: "比較対象・時点を明記するか、表現を削除してください" },
];

const PR_KEYWORDS = ["PR", "#PR", "広告", "プロモーション", "アフィリエイト", "案件"];

export function localComplianceScan(text: string, customNg: NgExpression[] = []): ComplianceFlag[] {
  const flags: ComplianceFlag[] = [];
  for (const ng of [...NG_EXPRESSIONS, ...customNg]) {
    if (text.includes(ng.phrase)) {
      flags.push({
        phrase: ng.phrase,
        law: ng.law,
        reason: `断定的・誇大な表現「${ng.phrase}」が含まれています`,
        suggestion: ng.suggestion,
      });
    }
  }
  return flags;
}

export function hasPrDisclosure(text: string): boolean {
  const upper = text.toUpperCase();
  return PR_KEYWORDS.some((k) => upper.includes(k.toUpperCase()));
}

function bigrams(text: string): Set<string> {
  const cleaned = text.replace(/\s+/g, "");
  const set = new Set<string>();
  for (let i = 0; i < cleaned.length - 1; i++) {
    set.add(cleaned.slice(i, i + 2));
  }
  return set;
}

export function jaccardSimilarity(a: string, b: string): number {
  const setA = bigrams(a);
  const setB = bigrams(b);
  if (setA.size === 0 || setB.size === 0) return 0;
  let intersection = 0;
  for (const g of setA) {
    if (setB.has(g)) intersection++;
  }
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

export const DUPLICATE_THRESHOLD = 0.6;

export function findDuplicate(
  text: string,
  pastPosts: { id: string; body: string }[]
): { id: string; similarity: number } | null {
  let best: { id: string; similarity: number } | null = null;
  for (const p of pastPosts) {
    const similarity = jaccardSimilarity(text, p.body);
    if (similarity >= DUPLICATE_THRESHOLD && (!best || similarity > best.similarity)) {
      best = { id: p.id, similarity };
    }
  }
  return best;
}
