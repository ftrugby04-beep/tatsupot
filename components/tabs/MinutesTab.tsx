"use client";

import { useState } from "react";
import { Meeting } from "@/lib/types";

function Card({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
      <h2 className="text-base font-semibold text-gray-800 mb-3">
        {icon} {title}
      </h2>
      {children}
    </div>
  );
}

function List({ items, empty }: { items: string[]; empty: string }) {
  if (!items || items.length === 0) return <p className="text-gray-400 text-sm">{empty}</p>;
  return (
    <ul className="list-disc list-inside space-y-1">
      {items.map((d, i) => (
        <li key={i} className="text-gray-700 text-sm">
          {d}
        </li>
      ))}
    </ul>
  );
}

export default function MinutesTab({ meeting }: { meeting: Meeting }) {
  const [showTranscript, setShowTranscript] = useState(false);
  const minutes = meeting.minutes;

  if (!minutes) {
    return <p className="text-gray-500 text-sm">議事録が未生成です。</p>;
  }

  return (
    <div className="space-y-4">
      <Card title="要約" icon="📋">
        <p className="text-gray-700 text-sm leading-relaxed">{minutes.summary}</p>
      </Card>

      {minutes.discrepancies && minutes.discrepancies.length > 0 && (
        <Card title="資料との食い違い・抜け漏れ" icon="⚠️">
          <List items={minutes.discrepancies} empty="なし" />
        </Card>
      )}

      <Card title="決定事項" icon="🔖">
        <List items={minutes.decisions} empty="なし" />
      </Card>

      <Card title="未決事項" icon="🕒">
        <List items={minutes.openIssues} empty="なし" />
      </Card>

      <Card title="質問と回答" icon="❓">
        {minutes.questions.length === 0 ? (
          <p className="text-gray-400 text-sm">なし</p>
        ) : (
          <ul className="space-y-2">
            {minutes.questions.map((q, i) => (
              <li key={i} className="text-sm">
                <p className="text-gray-800 font-medium">Q. {q.question}</p>
                <p className="text-gray-600 ml-3">A. {q.answer}</p>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="キーワード" icon="🔑">
        {minutes.keywords.length === 0 ? (
          <p className="text-gray-400 text-sm">なし</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {minutes.keywords.map((k, i) => (
              <span key={i} className="bg-blue-50 text-blue-700 text-xs px-2.5 py-1 rounded-full">
                {k}
              </span>
            ))}
          </div>
        )}
      </Card>

      <Card title="次回アジェンダ案" icon="📅">
        <ol className="list-decimal list-inside space-y-1">
          {minutes.nextAgenda.length === 0 ? (
            <p className="text-gray-400 text-sm">なし</p>
          ) : (
            minutes.nextAgenda.map((a, i) => (
              <li key={i} className="text-gray-700 text-sm">
                {a}
              </li>
            ))
          )}
        </ol>
      </Card>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <button
          onClick={() => setShowTranscript(!showTranscript)}
          className="text-sm text-blue-600 hover:text-blue-800 underline"
        >
          {showTranscript ? "文字起こしを閉じる" : "元の文字起こしを表示"}
        </button>
        {showTranscript && (
          <div className="mt-3 space-y-1 max-h-72 overflow-y-auto text-sm">
            {meeting.transcript.map((s, i) => (
              <p key={i}>
                <span className="font-semibold text-blue-700">{s.speaker}: </span>
                <span className="text-gray-700">{s.text}</span>
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
