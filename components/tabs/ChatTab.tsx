"use client";

import { useState } from "react";
import { Meeting, transcriptToText } from "@/lib/types";

export default function ChatTab({
  meeting,
  onUpdate,
}: {
  meeting: Meeting;
  onUpdate: (meeting: Meeting) => void;
}) {
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);

  const send = async () => {
    const q = question.trim();
    if (!q || loading) return;
    setQuestion("");
    const history = [...meeting.chatHistory, { role: "user" as const, content: q }];
    onUpdate({ ...meeting, chatHistory: history });
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcriptText: transcriptToText(meeting.transcript),
          minutesSummary: meeting.minutes?.summary,
          documents: meeting.documents.map((d) => ({ name: d.name, text: d.text })),
          history: meeting.chatHistory,
          question: q,
        }),
      });
      const data = await res.json();
      const answer = res.ok ? data.answer : (data.error ?? "エラーが発生しました。");
      onUpdate({
        ...meeting,
        chatHistory: [...history, { role: "assistant", content: answer }],
      });
    } catch {
      onUpdate({
        ...meeting,
        chatHistory: [...history, { role: "assistant", content: "通信エラーが発生しました。" }],
      });
    } finally {
      setLoading(false);
    }
  };

  const suggestions = ["今日の最大の課題は？", "決まっていないことは何？", "次回までに誰が何をやる？"];

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col h-[32rem]">
      <h2 className="text-base font-semibold text-gray-800 mb-3">🤖 会議AIチャット</h2>
      <div className="flex-1 overflow-y-auto space-y-3 mb-3">
        {meeting.chatHistory.length === 0 && (
          <div className="text-sm text-gray-400">
            <p className="mb-2">この会議の内容について質問できます。例:</p>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => setQuestion(s)}
                  className="bg-gray-50 hover:bg-gray-100 text-gray-600 text-xs px-3 py-1.5 rounded-full"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {meeting.chatHistory.map((m, i) => (
          <div
            key={i}
            className={`text-sm max-w-[85%] rounded-lg px-3 py-2 ${
              m.role === "user" ? "bg-blue-600 text-white ml-auto" : "bg-gray-100 text-gray-800"
            }`}
          >
            {m.content}
          </div>
        ))}
        {loading && <div className="text-sm text-gray-400">考えています...</div>}
      </div>
      <div className="flex gap-2">
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="会議について質問する..."
          className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
        />
        <button
          onClick={send}
          disabled={loading || !question.trim()}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white px-4 py-2 rounded-lg text-sm font-medium"
        >
          送信
        </button>
      </div>
    </div>
  );
}
