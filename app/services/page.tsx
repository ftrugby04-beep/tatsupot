import type { Metadata } from "next";

// ▼ 公開前にここだけ書き換えてください（ココナラ等のプロフィールURL / 問い合わせ先）
const CONTACT_URL = "https://coconala.com/";
const CONTACT_LABEL = "ココナラで相談する（見積り無料）";

export const metadata: Metadata = {
  title: "AI業務ツール・Webアプリ制作 | たつぽっと",
  description:
    "議事録AI・予定管理アプリ・業務自動化ツールを最短3日で制作。スマホで使えるWebアプリを低価格で。",
};

const works = [
  {
    title: "AI議事録アシスタント",
    body: "録音→文字起こし→AI議事録・ToDo抽出・商談分析・PowerPoint資料生成まで自動化。営業会議の記録時間を大幅に削減。",
    tags: ["Claude API", "Next.js", "PPT自動生成"],
  },
  {
    title: "スポーツ指導記録カレンダー",
    body: "部活・クラブの指導日、移動手段、駐車場代などをiPhoneでワンタップ記録。月次の交通費集計にも対応。",
    tags: ["iPhoneホーム画面対応", "オフライン保存"],
  },
  {
    title: "AI横断検索・メール文面生成",
    body: "過去の記録を自然言語で検索。お礼メール・日程調整メールを1クリックで作成。",
    tags: ["自然言語検索", "業務効率化"],
  },
  {
    title: "チーム出欠ボード（デモ公開中）",
    body: "部活・スクール・社会人チーム向け。タップで出欠入力、集計はワンタップでLINEに貼れる形に。/demo/attendance で実際に触れます。",
    tags: ["部活・クラブ向け", "LINE連携"],
  },
];

const plans = [
  {
    name: "ライト",
    price: "5,000円〜",
    desc: "既存の業務をAIで1つ自動化（文章生成・要約・定型メール作成など）",
    days: "最短2日",
  },
  {
    name: "スタンダード",
    price: "15,000円〜",
    desc: "スマホで使える記録・予約・管理アプリ（1〜3画面）。部活・教室・個人店向け",
    days: "最短5日",
    featured: true,
  },
  {
    name: "プレミアム",
    price: "30,000円〜",
    desc: "AI連携つき業務アプリ（議事録・顧客管理・資料自動作成など）。公開設定まで対応",
    days: "最短10日",
  },
];

const flow = [
  "ご相談（やりたいことを箇条書きで送るだけでOK）",
  "無料お見積り・画面イメージのご提示",
  "制作（途中経過をスマホで確認できます）",
  "納品・使い方レクチャー・1週間の無料修正",
];

export default function ServicesPage() {
  return (
    <main className="min-h-screen bg-white text-gray-800">
      <section className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white px-4 py-16">
        <div className="max-w-3xl mx-auto">
          <p className="text-sm font-semibold opacity-80 mb-2">個人・小規模チーム向け</p>
          <h1 className="text-3xl sm:text-4xl font-bold leading-tight mb-4">
            「手作業がめんどう」を、
            <br />
            スマホで使えるAIツールに。
          </h1>
          <p className="opacity-90 mb-8">
            議事録・記録・集計・メール作成など、毎週くり返す作業を自動化するWebアプリを
            5,000円から制作します。インストール不要、iPhone/Androidでそのまま使えます。
          </p>
          <a
            href={CONTACT_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block bg-white text-blue-700 font-bold px-6 py-3 rounded-xl shadow"
          >
            {CONTACT_LABEL}
          </a>
        </div>
      </section>

      <section className="px-4 py-14 max-w-3xl mx-auto">
        <h2 className="text-2xl font-bold mb-6">制作実績</h2>
        <div className="grid gap-4">
          {works.map((w) => (
            <div key={w.title} className="border border-gray-200 rounded-xl p-5">
              <h3 className="font-bold text-lg mb-1">{w.title}</h3>
              <p className="text-sm text-gray-600 mb-3">{w.body}</p>
              <div className="flex flex-wrap gap-2">
                {w.tags.map((t) => (
                  <span key={t} className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-gray-50 px-4 py-14">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold mb-6">料金プラン</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {plans.map((p) => (
              <div
                key={p.name}
                className={`rounded-xl p-5 bg-white border ${
                  p.featured ? "border-blue-600 ring-2 ring-blue-600" : "border-gray-200"
                }`}
              >
                {p.featured && (
                  <p className="text-xs font-bold text-blue-600 mb-1">いちばん人気</p>
                )}
                <h3 className="font-bold">{p.name}</h3>
                <p className="text-2xl font-bold my-2">{p.price}</p>
                <p className="text-sm text-gray-600 mb-2">{p.desc}</p>
                <p className="text-xs text-gray-500">納期：{p.days}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-4">
            ※ 先着3名様はモニター価格（各プラン30%OFF）で承ります。レビュー投稿にご協力ください。
          </p>
        </div>
      </section>

      <section className="px-4 py-14 max-w-3xl mx-auto">
        <h2 className="text-2xl font-bold mb-6">ご依頼の流れ</h2>
        <ol className="space-y-3">
          {flow.map((f, i) => (
            <li key={f} className="flex gap-3 items-start">
              <span className="shrink-0 w-7 h-7 rounded-full bg-blue-600 text-white text-sm font-bold flex items-center justify-center">
                {i + 1}
              </span>
              <span className="pt-0.5">{f}</span>
            </li>
          ))}
        </ol>
        <div className="mt-10 text-center">
          <a
            href={CONTACT_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block bg-blue-600 text-white font-bold px-6 py-3 rounded-xl"
          >
            {CONTACT_LABEL}
          </a>
        </div>
      </section>
    </main>
  );
}
