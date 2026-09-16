"use client";

import { useState } from "react";
import Link from "next/link";
import ThreadsHeader from "@/components/threads/ThreadsHeader";
import {
  useThreadsPosts,
  useThreadsKnowledge,
  addKnowledge,
} from "@/lib/threads-store";
import { OptimizationInsight } from "@/lib/threads-agents";
import { POST_GENRE_LABELS, createId, nowIso } from "@/lib/threads-types";

export default function ThreadsAnalyticsPage() {
  const posts = useThreadsPosts();
  const knowledge = useThreadsKnowledge();
  const published = posts.filter((p) => p.status === "published");
  const withMetrics = published.filter((p) => p.metrics);

  const [analyzing, setAnalyzing] = useState(false);
  const [insights, setInsights] = useState<OptimizationInsight[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    setAnalyzing(true);
    setError(null);
    try {
      const res = await fetch("/api/threads/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ posts: withMetrics }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "分析に失敗しました。");
      setInsights(data.insights ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "分析に失敗しました。");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSaveInsight = (insight: OptimizationInsight) => {
    addKnowledge({
      id: createId(),
      createdAt: nowIso(),
      summary: insight.summary,
      basedOnPostIds: insight.postIds,
    });
  };

  return (
    <>
      <ThreadsHeader current="analytics" />
      <main className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-3xl mx-auto space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">分析・改善</h1>
            <p className="text-sm text-gray-500">
              公開済み投稿の実績を入力し、Optimization Agentに勝ちパターンを発見させます。
            </p>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500">
                <tr>
                  <th className="text-left px-3 py-2">日時</th>
                  <th className="text-left px-3 py-2">ジャンル</th>
                  <th className="text-left px-3 py-2">Hook</th>
                  <th className="text-right px-3 py-2">閲覧</th>
                  <th className="text-right px-3 py-2">保存</th>
                  <th className="text-right px-3 py-2">指標</th>
                </tr>
              </thead>
              <tbody>
                {published.map((p) => (
                  <tr key={p.id} className="border-t border-gray-100">
                    <td className="px-3 py-2 text-gray-500">
                      {p.postDate} {p.postTime}
                    </td>
                    <td className="px-3 py-2">{POST_GENRE_LABELS[p.genre]}</td>
                    <td className="px-3 py-2 truncate max-w-[200px]">{p.hook}</td>
                    <td className="px-3 py-2 text-right">{p.metrics?.views ?? "-"}</td>
                    <td className="px-3 py-2 text-right">{p.metrics?.saves ?? "-"}</td>
                    <td className="px-3 py-2 text-right">
                      <Link href={`/threads/posts/${p.id}`} className="text-blue-600">
                        入力/編集
                      </Link>
                    </td>
                  </tr>
                ))}
                {published.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center text-gray-400 py-8">
                      投稿済みの投稿がまだありません。
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-gray-800">
                パターン分析（指標入力済み {withMetrics.length}件）
              </p>
              <button
                onClick={handleAnalyze}
                disabled={analyzing || withMetrics.length === 0}
                className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg disabled:opacity-50"
              >
                {analyzing ? "分析中..." : "パターン分析を実行"}
              </button>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            {insights.length > 0 && (
              <ul className="space-y-2">
                {insights.map((insight, i) => (
                  <li key={i} className="border border-gray-100 bg-gray-50 rounded-lg p-3 text-sm">
                    <p className="text-gray-800">{insight.summary}</p>
                    <button
                      onClick={() => handleSaveInsight(insight)}
                      className="mt-2 text-xs text-blue-600 hover:underline"
                    >
                      ナレッジに保存
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-2">
            <p className="font-semibold text-gray-800">蓄積されたナレッジ（勝ちパターン）</p>
            {knowledge.length === 0 ? (
              <p className="text-sm text-gray-400">まだありません。</p>
            ) : (
              <ul className="space-y-1 text-sm text-gray-700 list-disc list-inside">
                {knowledge
                  .slice()
                  .reverse()
                  .map((k) => (
                    <li key={k.id}>{k.summary}</li>
                  ))}
              </ul>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
