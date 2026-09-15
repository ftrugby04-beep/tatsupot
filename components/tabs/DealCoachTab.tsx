"use client";

import { useState } from "react";
import { Meeting, transcriptToText } from "@/lib/types";

export default function DealCoachTab({
  meeting,
  onUpdate,
}: {
  meeting: Meeting;
  onUpdate: (meeting: Meeting) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const coach = meeting.minutes?.dealCoach;

  const analyze = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/minutes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcriptText: transcriptToText(meeting.transcript),
          documents: meeting.documents.map((d) => ({ name: d.name, text: d.text })),
          isDealMeeting: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "分析に失敗しました。");
        return;
      }
      onUpdate({ ...meeting, isDealMeeting: true, minutes: data });
    } catch {
      setError("通信エラーが発生しました。");
    } finally {
      setLoading(false);
    }
  };

  if (!coach) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
        <p className="text-sm text-gray-500 mb-4">
          この会議はまだ商談分析されていません。商談コーチAIが評価・改善点・成約可能性を分析します。
        </p>
        {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
        <button
          onClick={analyze}
          disabled={loading}
          className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 text-white font-semibold px-5 py-2.5 rounded-lg text-sm"
        >
          {loading ? "分析中..." : "🎯 商談コーチAIで分析する"}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-4">
          <div className="text-4xl font-bold text-purple-600">{coach.score}</div>
          <div className="text-gray-400">/ 100</div>
          <p className="ml-auto text-sm text-gray-500">
            成約可能性 <span className="font-semibold text-purple-600">{coach.winProbability}%</span>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-green-700 mb-2">✅ 良かった点</h3>
          <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
            {coach.good.map((g, i) => (
              <li key={i}>{g}</li>
            ))}
          </ul>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-red-700 mb-2">🔧 改善点</h3>
          <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
            {coach.improve.map((g, i) => (
              <li key={i}>{g}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">顧客の関心度: {coach.interestLevel}</h3>
        <h3 className="text-sm font-semibold text-gray-700 mt-3 mb-2">📌 次回やるべきこと</h3>
        <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
          {coach.nextActions.map((a, i) => (
            <li key={i}>{a}</li>
          ))}
        </ul>
      </div>

      <button
        onClick={analyze}
        disabled={loading}
        className="text-sm text-purple-600 hover:text-purple-800 underline"
      >
        {loading ? "再分析中..." : "再分析する"}
      </button>
    </div>
  );
}
