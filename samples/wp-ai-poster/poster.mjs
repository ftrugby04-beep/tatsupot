// WordPress AI記事 自動生成・投稿ツール（最小構成）
//
// 必要な環境変数
//   ANTHROPIC_API_KEY  … Claude APIキー
//   WP_URL             … 例 https://example.com
//   WP_USER            … WordPressユーザー名
//   WP_APP_PASSWORD    … WordPress「アプリケーションパスワード」（ユーザー → プロフィールで発行）
//
// 使い方
//   node poster.mjs topics.json            … 生成して投稿（各トピックの status: draft / publish / future）
//   node poster.mjs topics.json --dry-run  … 生成のみ（WordPressへは送らず ./out に保存）
//
// 安全策：既定は「下書き保存」。公開前に人が確認できる承認フローになります。

import Anthropic from "@anthropic-ai/sdk";
import fs from "node:fs/promises";

const MODEL = process.env.CLAUDE_MODEL || "claude-sonnet-5-5";
const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const topicsFile = args.find((a) => !a.startsWith("--")) || "topics.example.json";

const { WP_URL, WP_USER, WP_APP_PASSWORD } = process.env;
const auth = WP_USER && WP_APP_PASSWORD
  ? "Basic " + Buffer.from(`${WP_USER}:${WP_APP_PASSWORD}`).toString("base64")
  : null;

async function wp(path, init = {}) {
  const res = await fetch(`${WP_URL.replace(/\/$/, "")}/wp-json/wp/v2/${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", Authorization: auth, ...(init.headers || {}) },
  });
  if (!res.ok) throw new Error(`WordPress ${path}: ${res.status} ${await res.text()}`);
  return res.json();
}

// カテゴリー・タグ名 → ID（無ければ作成）
async function termId(kind, name) {
  const found = await wp(`${kind}?search=${encodeURIComponent(name)}&per_page=100`);
  const hit = found.find((t) => t.name === name);
  if (hit) return hit.id;
  return (await wp(kind, { method: "POST", body: JSON.stringify({ name }) })).id;
}

const client = new Anthropic();

async function generate(topic) {
  const prompt = `あなたは日本語のSEO編集者です。次のキーワードで検索する読者に役立つブログ記事を書いてください。
キーワード: ${topic.keyword}
${topic.notes ? `補足情報: ${topic.notes}` : ""}

条件:
- 3,000字前後。H2見出し4〜6個、必要に応じてH3
- 事実が不確かな数値・固有名詞は書かない（推測で断定しない）
- 最後に「まとめ」と、お問い合わせへの短い誘導文
- 本文はWordPressにそのまま入るHTML（h2,h3,p,ul,li,strongのみ）

次のJSONだけを出力してください:
{"title": "32字以内のタイトル", "slug": "英小文字とハイフン", "meta_description": "120字以内", "html": "本文HTML"}`;

  const msg = await client.messages.create({
    model: MODEL,
    max_tokens: 8000,
    messages: [{ role: "user", content: prompt }],
  });
  const text = msg.content.filter((b) => b.type === "text").map((b) => b.text).join("");
  const json = text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
  return JSON.parse(json);
}

async function main() {
  const topics = JSON.parse(await fs.readFile(topicsFile, "utf8"));
  if (!dryRun && (!WP_URL || !auth)) throw new Error("WP_URL / WP_USER / WP_APP_PASSWORD を設定してください");
  await fs.mkdir("out", { recursive: true });
  const log = [];

  for (const t of topics) {
    try {
      const a = await generate(t);
      await fs.writeFile(`out/${a.slug}.json`, JSON.stringify(a, null, 2));
      if (dryRun) {
        log.push({ keyword: t.keyword, result: "generated", title: a.title });
        continue;
      }
      const post = await wp("posts", {
        method: "POST",
        body: JSON.stringify({
          title: a.title,
          slug: a.slug,
          content: a.html,
          excerpt: a.meta_description,
          status: t.status || "draft",
          ...(t.date ? { date: t.date } : {}),
          categories: t.category ? [await termId("categories", t.category)] : [],
          tags: await Promise.all((t.tags || []).map((n) => termId("tags", n))),
        }),
      });
      log.push({ keyword: t.keyword, result: post.status, id: post.id, link: post.link });
    } catch (e) {
      log.push({ keyword: t.keyword, result: "error", error: String(e.message || e) });
    }
    console.log(log.at(-1));
  }
  await fs.writeFile(`out/log-${Date.now()}.json`, JSON.stringify(log, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
