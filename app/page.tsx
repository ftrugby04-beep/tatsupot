"use client";

import { useState, useRef } from "react";

type ActionItem = {
  who: string;
  what: string;
  when: string;
};

type SummaryResult = {
  summary: string;
  actionItems: ActionItem[];
  decisions: string[];
  nextAgenda: string[];
};

export default function Home() {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SummaryResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setText((ev.target?.result as string) ?? "");
    };
    reader.readAsText(file, "utf-8");
  };

  const handleSubmit = async () => {
    if (!text.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "エラーが発生しました。");
      } else {
        setResult(data);
      }
    } catch {
      setError("通信エラーが発生しました。");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">議事録まとめ</h1>
        <p className="text-gray-500 mb-6">
          議事録を貼り付けるかファイルをアップロードして、すぐに使える形に整理します。
        </p>

        {/* 入力エリア */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 mb-4">
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-medium text-gray-700">
              議事録テキスト
            </label>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-sm text-blue-600 hover:text-blue-800 underline"
            >
              ファイルから読み込む (.txt / .md)
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.md"
              className="hidden"
              onChange={handleFileUpload}
            />
          </div>
          <textarea
            className="w-full h-52 p-3 border border-gray-200 rounded-lg text-sm text-gray-800 resize-y focus:outline-none focus:ring-2 focus:ring-blue-300"
            placeholder="ここに議事録を貼り付けてください..."
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={loading || !text.trim()}
          className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-semibold rounded-xl transition-colors mb-8"
        >
          {loading ? "解析中..." : "まとめる"}
        </button>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 mb-6 text-sm">
            {error}
          </div>
        )}

        {result && (
          <div className="space-y-4">
            <Card title="要約" icon="📋">
              <p className="text-gray-700 text-sm leading-relaxed">{result.summary}</p>
            </Card>

            <Card title="アクションアイテム" icon="✅">
              {result.actionItems.length === 0 ? (
                <p className="text-gray-400 text-sm">なし</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 border-b border-gray-100">
                      <th className="pb-2 pr-4 font-medium">担当</th>
                      <th className="pb-2 pr-4 font-medium">内容</th>
                      <th className="pb-2 font-medium">期限</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.actionItems.map((item, i) => (
                      <tr key={i} className="border-b border-gray-50">
                        <td className="py-2 pr-4 text-gray-600 whitespace-nowrap">{item.who}</td>
                        <td className="py-2 pr-4 text-gray-800">{item.what}</td>
                        <td className="py-2 text-gray-600 whitespace-nowrap">{item.when}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Card>

            <Card title="決定事項" icon="🔖">
              {result.decisions.length === 0 ? (
                <p className="text-gray-400 text-sm">なし</p>
              ) : (
                <ul className="list-disc list-inside space-y-1">
                  {result.decisions.map((d, i) => (
                    <li key={i} className="text-gray-700 text-sm">{d}</li>
                  ))}
                </ul>
              )}
            </Card>

            <Card title="次回アジェンダ案" icon="📅">
              {result.nextAgenda.length === 0 ? (
                <p className="text-gray-400 text-sm">なし</p>
              ) : (
                <ol className="list-decimal list-inside space-y-1">
                  {result.nextAgenda.map((a, i) => (
                    <li key={i} className="text-gray-700 text-sm">{a}</li>
                  ))}
                </ol>
              )}
            </Card>
          </div>
        )}
      </div>
    </main>
  );
}

function Card({
  title,
  icon,
  children,
}: {
  title: string;
  icon: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
      <h2 className="text-base font-semibold text-gray-800 mb-3">
        {icon} {title}
      </h2>
      {children}
    </div>
  );
}
