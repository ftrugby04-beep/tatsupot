"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import AppHeader from "@/components/AppHeader";
import { useMeetings, deleteMeeting } from "@/lib/store";

export default function Home() {
  const meetings = useMeetings();
  const [companyFilter, setCompanyFilter] = useState<string>("all");

  const companies = useMemo(() => {
    const set = new Set(meetings.map((m) => m.company).filter(Boolean));
    return Array.from(set);
  }, [meetings]);

  const filtered = useMemo(() => {
    if (companyFilter === "all") return meetings;
    return meetings.filter((m) => m.company === companyFilter);
  }, [meetings, companyFilter]);

  const handleDelete = (id: string) => {
    if (!confirm("この会議記録を削除しますか？この操作は取り消せません。")) return;
    deleteMeeting(id);
  };

  return (
    <>
      <AppHeader current="dashboard" />
      <main className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">会議一覧</h1>
              <p className="text-sm text-gray-500">
                録音・議事録・ToDo・商談分析をまとめて管理します。
              </p>
            </div>
            {companies.length > 0 && (
              <select
                value={companyFilter}
                onChange={(e) => setCompanyFilter(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
              >
                <option value="all">すべての会社</option>
                {companies.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            )}
          </div>

          {filtered.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-xl p-10 text-center">
              <p className="text-gray-500 mb-4">まだ会議記録がありません。</p>
              <Link
                href="/meeting/new"
                className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2.5 rounded-lg"
              >
                最初の会議を記録する
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((m) => (
                <div
                  key={m.id}
                  className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between hover:shadow-sm transition-shadow"
                >
                  <Link href={`/meeting/${m.id}`} className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-gray-800 truncate">{m.title}</span>
                      {m.isDealMeeting && (
                        <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">商談</span>
                      )}
                    </div>
                    <div className="text-sm text-gray-500 flex gap-3">
                      <span>{m.company || "会社未設定"}</span>
                      <span>{new Date(m.createdAt).toLocaleString("ja-JP")}</span>
                      {m.minutes?.dealCoach && (
                        <span className="text-blue-600 font-medium">
                          商談スコア {m.minutes.dealCoach.score}/100
                        </span>
                      )}
                    </div>
                    {m.minutes?.summary && (
                      <p className="text-sm text-gray-600 mt-1 line-clamp-1">{m.minutes.summary}</p>
                    )}
                  </Link>
                  <button
                    onClick={() => handleDelete(m.id)}
                    className="text-gray-400 hover:text-red-600 text-sm ml-4 px-2"
                    title="削除"
                  >
                    削除
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
