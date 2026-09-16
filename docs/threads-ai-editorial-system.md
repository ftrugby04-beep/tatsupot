# Threads AI編集部 設計書

たつぽっと（`/`〜`/meeting`〜`/coaching`）とは無関係な新セクション `/threads` として実装する、Threads投稿を「リサーチ→企画→原稿→コンプライアンス確認→素材選定→投稿予約→投稿→分析→改善」まで循環させるAI編集部システムの設計書。

> 実装コードは本ドキュメントと同じPRに雛形として含まれる（`lib/threads-*`, `app/threads/**`, `app/api/threads/**`）。外部連携（Threads公式API / Metricool / 楽天・Amazonアソシエイト）は認証情報を持たないため**モック/手動投稿フロー**として実装し、差し替え用のインターフェースのみ用意する。

---

## ① 必要なAIエージェント一覧

| # | Agent | 役割 | 実装形態 | 実行タイミング |
|---|-------|------|----------|----------------|
| 1 | Research Agent | トレンド・競合・悩みの仮説出しの元ネタとなるテーマ候補を生成 | Claude呼び出し（Idea Agentと1回のリクエストに統合） | 日次バッチ開始時 |
| 2 | Idea Agent | テーマ候補から投稿候補（枠数分）を生成 | Claude呼び出し（Researchと統合） | 日次バッチ開始時 |
| 3 | Planning Agent | 誰に・何を・どう伝えるかを決定し、スロット（時間×ジャンル）に投稿案を割り当て | 決定的ロジック（設定した比率に従いジャンルをスロットへ割当）＋ Claude出力のtarget/purposeをそのまま採用 | Idea Agentの直後 |
| 4 | Writer Agent | Threads本文（Hook含む一次原稿）を作成 | Claude呼び出し（投稿案ごとに並列実行） | Planning直後 |
| 5 | Hook Agent | 1行目（Hook）を強化する専用パス。初回生成はWriter Agentに含めるが、編集画面から独立して「Hookを強化」実行可能 | Claude呼び出し（独立API） | Writer後 or ユーザー操作時 |
| 6 | Product Agent | 投稿と商品（アフィリエイト商品）を紐付け | 決定的ロジック（カテゴリ/キーワード一致）＋ 商品訴求文のみClaude補助 | Writer前（Writerへ商品情報を渡す） |
| 7 | Compliance Agent | PR表記・薬機法・景表法・誇大表現・重複投稿をチェックしRisk Scoreと修正候補を生成 | ローカル辞書スキャン（`lib/threads-compliance.ts`）＋ Claude呼び出しで最終スコアリング | Writer/Hook後、承認前必須 |
| 8 | Creative Agent | 画像・動画に必要な構成案（テキストディレクション）を提案 | Claude呼び出し（Writerと同一レスポンスに含める） | Writer直後 |
| 9 | Scheduler Agent | 投稿時間・投稿順を管理 | 決定的ロジック（設定したスロット時刻をそのまま付与） | Planning時 |
| 10 | Publisher Agent | Threads/Metricoolへの投稿実行 | モック実装（`ManualPublisher`）。本文コピー＋ステータス更新のみ。公式API連携は差し替え用インターフェースのみ用意 | 承認後、ユーザーが「投稿する」を押した時 |
| 11 | Analytics Agent | 閲覧・いいね・保存等の指標を記録・集計 | 決定的ロジック（ユーザーが手入力した指標を保存・集計） | 投稿翌日以降、随時 |
| 12 | Optimization Agent | 分析結果から「勝ちパターン」「弱いHook」「強い時間帯」を発見 | Claude呼び出し（タグ付きの投稿+指標をまとめて渡す） | Analytics蓄積後、ユーザー操作時 |
| 13 | Knowledge Agent | 過去投稿・NG表現・勝ちパターンを保存し、以後の生成プロンプトに注入 | 決定的ロジック（`lib/threads-store.ts` の knowledge / customNgExpressions を Research・Compliance の呼び出し時に読み込む） | 常時（保存・読込） |
| 14 | Orchestrator | 全Agentを順番に動かし、1日分の投稿案一式を生成する司令塔 | `app/api/threads/generate/route.ts` がサーバー側で1〜9を直列/並列に実行 | ユーザーが「AI編集会議を開く」を押した時 |

**設計判断メモ**
- Threadsの投稿API・Metricool APIの実際のエンドポイント仕様は未確定（認証情報も無い）ため、Publisher Agentは「コピーして手動投稿」を既定動作にし、`lib/threads-publisher.ts` の `Publisher` インターフェースを実装差し替えるだけで本連携に切り替えられるようにしてある。
- Research Agentは外部Web検索を持たない（このアプリ単体では検索APIキー等の追加連携が必要）。そのため「トレンドメモ」欄にユーザーが手動で気になるネタを書き込める入力を設け、Research Agentがそれを踏まえて発想する設計にした。将来的に検索API（例: 独自にSerpAPI等を契約）を足す場合は `buildResearchIdeaPrompt` に検索結果を差し込むだけで良い。

---

## ② 各Agentの詳細指示（プロンプト設計方針）

実装は `lib/threads-agents.ts` に集約。各関数は「入力→システムプロンプト文字列」を返す純粋関数で、API Route側でAnthropic SDKに渡す。

### Research × Idea Agent（統合） — `buildResearchIdeaPrompt`
```
あなたはThreadsアカウント運用の企画チーム「Research Agent」と「Idea Agent」を兼任するAIです。
【役割】
1. 与えられたブランドボイス・ターゲット像・トレンドメモ・過去の勝ちパターンをもとに、
   投稿ネタ候補をスロット数と同じ件数だけ考案する。
2. 各候補には「ジャンル」「テーマ」「ターゲット」「投稿目的」「カテゴリ」を付与する。
3. ジャンルは指定されたスロットのジャンル配分に必ず従うこと（スロットの順番通りに1件ずつ対応させる）。
4. 過去のナレッジ（勝ちパターン）がある場合は積極的に取り入れる。NG表現は候補の時点で避ける。

【出力形式（JSON配列のみ、件数はスロット数と厳密に一致）】
[{ "genre": "...", "theme": "...", "target": "...", "purpose": "...", "category": "..." }, ...]
```
入力: `slots`（時間×ジャンル配列）, `settings.targetAudience`, `settings.brandVoice`, `researchNotes`（トレンドメモ自由記述）, `knowledgeSummary`（Knowledge Agentが保持する勝ちパターン要約・NG表現一覧）。

### Writer × Creative Agent（統合） — `buildWriterPrompt`
```
あなたはThreadsの投稿本文を書く「Writer Agent」と、画像/動画構成を考える「Creative Agent」を兼任します。
【制約】
- 本文は全角500文字以内、Threadsらしい改行・絵文字は最小限。
- 1文目（Hook）は続きを読みたくなる強い一文にする。
- 商品情報が渡された場合は不自然にならない範囲で1箇所だけ触れ、PRの場合は必ずPR表記を含める。
- 誇大・断定的な効果表現（薬機法/景表法に抵触しうる表現）は使わない。

【出力形式（JSONのみ）】
{
  "hook": "...", "body": "...", "cta": "...", "ctaType": "save|follow|comment|link_click|profile_link|none",
  "hookType": "problem|curiosity|surprise|empathy|howto|number",
  "contentType": "howto|list|story|comparison|qa|checklist",
  "imageDirection": "必要な画像の構成案（1〜2文）",
  "videoDirection": "必要な動画の構成案（不要なら空文字）"
}
```
入力: Planning Agentが決めた1件の投稿案（genre/theme/target/purpose/category）＋ Product Agentが紐付けた商品情報（あれば）。

### Hook Agent（独立強化パス） — `buildHookStrengthenPrompt`
```
あなたは「Hook Agent」です。以下のThreads投稿の1文目（Hook）だけを、
悩み訴求・数字訴求・意外性のいずれかを使ってより強い一文に書き直してください。
本文の内容や事実と矛盾してはいけません。
出力はJSON: { "hook": "書き直した1文目", "hookType": "problem|curiosity|surprise|empathy|howto|number" }
```
編集画面の「Hookを強化」ボタンから `app/api/threads/hook/route.ts` 経由で呼ばれる。

### Compliance Agent — `buildCompliancePrompt`
1. まずローカル辞書（`NG_EXPRESSIONS`, ユーザー登録の `customNgExpressions`）で正規表現マッチし、`localFlags` を作る。
2. 過去投稿とのテキスト類似度（bigram Jaccard）を計算し、閾値超えなら重複フラグを立てる。
3. Claudeに `body`/`hook`/`isPr`/`localFlags`/`duplicateFlag` を渡し、最終判定と自然な修正文を生成させる。
```
あなたは「Compliance Agent」です。日本のアフィリエイト/美容系Threads投稿について、
薬機法・景品表示法・PR表記義務・誇大表現・（提示された場合は）重複投稿のリスクを判定してください。
ローカル辞書で検知済みの表現は必ず考慮し、必要なら追加の懸念点も指摘してください。
断定は避け、修正候補は実際にそのまま差し替えて使える自然な日本語にしてください。

【出力形式（JSONのみ）】
{
  "riskScore": 0-100の整数,
  "flags": [{ "phrase": "該当箇所", "law": "薬機法|景表法|PR表記|誇大表現|商標/権利|重複投稿", "reason": "...", "suggestion": "差し替え候補" }],
  "prDisclosureOk": true/false
}
```

### Optimization Agent — `buildOptimizationPrompt`
```
あなたは「Optimization Agent」です。タグ付きの投稿と実績指標の一覧を分析し、
「ターゲット×カテゴリ×コンテンツ形式×CTA種別」の組み合わせで反応が良い/悪いパターンを日本語で要約してください。
具体的な数値根拠（閲覧数・保存率など）を必ず添えること。次回の投稿生成で使える実行可能な提案にすること。

【出力形式（JSON配列）】
[{ "summary": "パターンの説明", "postIds": ["根拠にした投稿ID"] }]
```

### Planning / Product / Scheduler / Publisher / Analytics / Knowledge
決定的ロジックのため詳細プロンプトは無し。ロジック仕様は「⑦ Agent同士の処理フロー」参照。

---

## ③ 画面構成

すべて `/threads` 配下、既存の議事録アプリとは独立したヘッダー・レイアウトを持つ。

| パス | 画面名 | 内容 |
|------|--------|------|
| `/threads` | ダッシュボード（承認画面） | 日付選択、「AI編集会議を開く」ボタン（Orchestrator起動）、生成中は各Agentの進捗を表示、当日の投稿一覧をカード表示。カードごとに `[承認] [編集] [再生成] [投稿中止]`。上部に `[すべて承認]`。Risk Score別に色分け（緑<30 / 黄30-59 / 赤60+）。承認済み・投稿時刻到来分は `[コピーして投稿]`（Publisher Agent呼び出し） |
| `/threads/posts/[id]` | 投稿編集画面 | Hook/本文/CTA/商品/タグの編集、Compliance再チェック、フラグごとに「修正候補を適用」、Hook Agent単体実行、ステータス変更、（公開後）指標入力フォーム |
| `/threads/analytics` | 分析画面 | 公開済み投稿の指標一覧テーブル、指標の追加・編集、「パターン分析を実行」（Optimization Agent）、発見されたパターンの「ナレッジに保存」ボタン |
| `/threads/settings` | 設定画面 | 商品マスタ（登録・編集・削除）、投稿スロット（時間×ジャンル比率）編集、ターゲット像・ブランドボイスの自由記述、NG表現の追加登録 |

---

## ④ DB構造

現行アプリの永続化方式（サーバーDBなし・ブラウザ`localStorage`＋`useSyncExternalStore`）を踏襲する。将来Postgres等へ移行しやすいよう、キーごとに独立したテーブル相当のJSON配列として設計。

```
localStorage keys (namespace: "tatsupot:threads:*")
├─ posts        : ThreadsPost[]
├─ products     : Product[]
├─ settings     : ThreadsSettings (単一オブジェクト)
├─ knowledge    : KnowledgeInsight[]
└─ customNg     : NgExpression[]  (ユーザー登録の追加NG表現)
```

### ThreadsPost（投稿1件 = 依頼にあった全項目を網羅）
| フィールド | 型 | 説明 |
|---|---|---|
| id | string | 投稿ID |
| postDate / postTime | string | 投稿日・投稿時間 |
| genre | PostGenre | ジャンル |
| theme | string | テーマ |
| target | string | ターゲット |
| purpose | string | 投稿目的 |
| hook | string | Hook（1文目） |
| body | string | 本文 |
| cta / ctaType | string | CTA文言・種別 |
| productId / productUrl | string? | 商品・商品URL |
| isPr | boolean | PR有無 |
| imageDirection / videoDirection | string? | 画像・動画の構成案 |
| status | PostStatus | draft/needs_review/pending_approval/approved/scheduled/published/rejected |
| tags.hookType / contentType / category | enum/string | 自動タグ |
| compliance | ComplianceResult? | riskScore, flags[], prDisclosureOk |
| metrics | PostMetrics? | 閲覧数・いいね・返信・再投稿・保存・リンククリック・売上 |
| history | {action, at, note?}[] | 承認/却下/再生成などの操作履歴 |

完全な型定義は `lib/threads-types.ts` を参照。

---

## ⑤ フォルダ構成

```
app/
  threads/
    layout.tsx              # /threads 専用レイアウト・メタデータ
    page.tsx                # ダッシュボード（承認画面）
    posts/[id]/page.tsx     # 投稿編集画面
    analytics/page.tsx      # 分析画面
    settings/page.tsx       # 設定画面
  api/
    threads/
      generate/route.ts     # Orchestrator: Research→Idea→Planning→Product→Writer→Compliance
      regenerate/route.ts   # 1件のみWriter/Creative→Complianceを再実行
      hook/route.ts         # Hook Agent 単体実行
      compliance/route.ts   # Compliance Agent 単体再チェック
      analyze/route.ts      # Optimization Agent
components/
  threads/
    ThreadsHeader.tsx
    AgentPipelineStatus.tsx
    PostCard.tsx
    ComplianceBadge.tsx
lib/
  threads-types.ts          # 型定義（Post/Product/Settings/Knowledge/Compliance）
  threads-store.ts          # localStorageストア（useSyncExternalStore）
  threads-agents.ts         # 各Agentのプロンプト生成・JSON抽出ユーティリティ
  threads-compliance.ts     # NG辞書・ローカルスキャン・重複判定
  threads-publisher.ts      # Publisher Agentのインターフェースとモック実装
docs/
  threads-ai-editorial-system.md  # 本設計書
```

---

## ⑥ API構成

| Method | Path | Body | Response | 呼び出すAgent |
|---|---|---|---|---|
| POST | `/api/threads/generate` | `{ date, slots, products, settings, researchNotes?, knowledgeSummary? }` | `{ posts: ThreadsPost[] }` | Research/Idea → Planning → Product → Writer/Creative → Compliance |
| POST | `/api/threads/regenerate` | `{ idea, product?, settings, customNg?, pastPosts? }` | `{ hook, body, cta, ctaType, tags, compliance, ... }` | Writer/Creative Agent → Compliance Agent（1件のみ再生成） |
| POST | `/api/threads/hook` | `{ hook, body }` | `{ hook, hookType }` | Hook Agent |
| POST | `/api/threads/compliance` | `{ hook, body, isPr, pastPosts }` | `ComplianceResult` | Compliance Agent |
| POST | `/api/threads/analyze` | `{ posts: ThreadsPost[] }`（metrics付きのもの） | `{ insights: {summary, postIds}[] }` | Optimization Agent |

すべて `ANTHROPIC_API_KEY`（既存の `env.example` と共用）を使用し、`app/api/minutes` 等と同じくAnthropic SDKをサーバー側でのみ呼び出す。Planning/Product/Scheduler/Publisher/Analytics/KnowledgeはAPIを持たず、クライアント側の `lib/threads-store.ts` と `lib/threads-agents.ts` 内の純関数で処理する。

---

## ⑦ Agent同士の処理フロー

```
[ユーザー] 日付・トレンドメモを入力し「AI編集会議を開く」
   │
   ▼
POST /api/threads/generate
   │
   ├─ 1. Research×Idea Agent（1回のClaude呼び出し）
   │      入力: slots, settings, researchNotes, knowledgeSummary
   │      出力: スロット数分のアイデア[]
   │
   ├─ 2. Planning Agent（決定的）
   │      アイデアの genre がスロットの想定ジャンルと一致するか検証し、
   │      target/purpose/category をそのまま採用
   │
   ├─ 3. Scheduler Agent（決定的）
   │      各アイデアにスロットの postTime を付与
   │
   ├─ 4. Product Agent（決定的、アイデアごと）
   │      products[] から category/theme と一致する商品を検索
   │      → 一致すればアイデアに productId/productUrl/isPr を付与
   │
   ├─ 5. Writer×Creative Agent（アイデアごとに並列 Claude呼び出し）
   │      入力: アイデア + 商品情報
   │      出力: hook, body, cta, ctaType, hookType, contentType, imageDirection, videoDirection
   │
   ├─ 6. Compliance Agent（アイデアごとに並列）
   │      ローカルNGスキャン → 重複スキャン(過去posts) → Claude最終判定
   │      出力: riskScore, flags[], prDisclosureOk
   │
   └─ 7. ステータス決定（決定的）
          riskScore >= 60          → "needs_review"
          isPr && !prDisclosureOk  → "needs_review"
          それ以外                  → "pending_approval"
   │
   ▼
[ユーザー] ダッシュボードで確認
   ├─ 承認 → status="approved" (history追記)
   ├─ 編集 → /threads/posts/[id] で本文/Hook/商品/タグを修正 → Compliance再実行
   ├─ 再生成 → Writer×Creative Agentのみ再実行（Planning結果は維持）
   └─ 投稿中止 → status="rejected"
   │
   ▼
投稿時刻到来 → [コピーして投稿] → Publisher Agent(Manual) → status="scheduled"→"published"
   │
   ▼
翌日以降: [Analytics] 画面で指標を手入力 → metrics保存
   │
   ▼
[分析画面] 「パターン分析を実行」→ Optimization Agent → insights[]
   │
   ▼
「ナレッジに保存」→ Knowledge Agent（knowledgeストアに追記）
   │
   ▼
次回の Research×Idea Agent 呼び出し時に knowledgeSummary として注入（循環）
```

---

## ⑧ Claude Code用マスタープロンプト

このシステムに機能追加・改修を依頼する際に使うテンプレート（`AGENTS.md`のNext.js固有事情の遵守を明記）。

```
あなたはtatsupotリポジトリの `/threads`（Threads AI編集部）モジュールを開発するエンジニアです。

前提:
- このリポジトリはNext.js App Router、TypeScript、Tailwind v4。
- 永続化はサーバーDBを持たず、ブラウザlocalStorage + useSyncExternalStore（lib/threads-store.ts）。
- AI呼び出しはサーバー側API Route（app/api/threads/**/route.ts）でのみ行い、Anthropic SDK（@anthropic-ai/sdk）を使う。
- 既存の /meeting, /coaching セクションと同じ規約（'use client'ページ、Tailwindユーティリティ、日本語UI）に合わせる。
- 各Agentの役割・プロンプト方針は docs/threads-ai-editorial-system.md の①②⑦を必ず参照し、逸脱しないこと。
- 薬機法・景表法・PR表記のコンプライアンスチェックは絶対に省略・弱体化させない。Compliance Agentを経由しない投稿の承認導線を追加してはいけない。
- Threads公式API/Metricool/楽天・Amazonアソシエイト等の外部連携は、未確認の仕様を推測して実装しない。lib/threads-publisher.ts の Publisher インターフェースを実装差し替える形で対応し、本物のAPI仕様が判明するまではモック（ManualPublisher）を維持する。

依頼内容:
<ここに追加したい機能や修正したいバグを具体的に記述>

出力:
- 変更したファイル一覧と各ファイルの変更概要
- 型定義・DB構造（lib/threads-types.ts）に変更が生じる場合は、その影響範囲（store/agents/API/UIのどこを直す必要があるか）
```
