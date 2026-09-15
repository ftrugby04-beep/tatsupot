"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import AppHeader from "@/components/AppHeader";
import { useMeetings } from "@/lib/store";

export default function SearchPage() {
  const meetings = useMeetings();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<{ id: string; reason: string }[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const meetingMap = useMemo(() => new Map(meetings.map((m) => [m.id, m])), [meetings]);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    setResults(null);
    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query,
          meetings: meetings.map((m) => ({
            id: m.id,
            title: m.title,
            company: m.company,
            createdAt: m.createdAt,
            summary: m.minutes?.summary ?? "",
            keywords: m.minutes?.keywords ?? [],
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "検索に失敗しました。");
        return;
      }
      setResults(data.results);
    } catch {
      setError("通信エラーが発生しました。");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <AppHeader current="search" />
      <main className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">AI横断検索</h1>
          <p className="text-sm text-gray-500 mb-4">
            「○○社が料金について話した会議を探して」のように自然言語で過去の会議を検索できます。
          </p>
          <div className="flex gap-2 mb-6">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="例）予算について話した会議を探して"
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
            />
            <button
              onClick={handleSearch}
              disabled={loading || !query.trim()}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white text-sm font-medium px-5 py-2 rounded-lg"
            >
              {loading ? "検索中..." : "検索"}
            </button>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm mb-4">{error}</div>
          )}

          {results !== null && (
            <div className="space-y-3">
              {results.length === 0 ? (
                <p className="text-gray-500 text-sm">該当する会議は見つかりませんでした。</p>
              ) : (
                results.map((r) => {
                  const m = meetingMap.get(r.id);
                  if (!m) return null;
                  return (
                    <Link
                      key={r.id}
                      href={`/meeting/${r.id}`}
                      className="block bg-white border border-gray-200 rounded-xl p-4 hover:shadow-sm"
                    >
                      <p className="font-semibold text-gray-800">{m.title}</p>
                      <p className="text-xs text-gray-500 mb-1">
                        {m.company} ・ {new Date(m.createdAt).toLocaleDateString("ja-JP")}
                      </p>
                      <p className="text-sm text-blue-700">💡 {r.reason}</p>
                    </Link>
                  );
                })
              )}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
