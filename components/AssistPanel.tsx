"use client";

import { useEffect, useRef, useState } from "react";

export default function AssistPanel({
  recording,
  transcriptText,
  documents,
}: {
  recording: boolean;
  transcriptText: string;
  documents?: { name: string; text: string }[];
}) {
  const [tips, setTips] = useState<{ text: string; at: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const lastTextRef = useRef("");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchTips = async () => {
    if (loading) return;
    const recentText = transcriptText;
    if (!recentText || recentText === lastTextRef.current) return;
    lastTextRef.current = recentText;
    setLoading(true);
    try {
      const res = await fetch("/api/assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recentText, documents }),
      });
      const data = await res.json();
      if (Array.isArray(data.tips) && data.tips.length > 0) {
        const now = new Date().toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" });
        setTips((prev) => [
          ...data.tips.map((t: string) => ({ text: t, at: now })),
          ...prev,
        ].slice(0, 20));
      }
    } catch {
      // silent fail; assist panel is a nice-to-have
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (recording) {
      timerRef.current = setInterval(fetchTips, 25000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recording, transcriptText]);

  if (!recording && tips.length === 0) return null;

  return (
    <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-bold text-indigo-800">🤖 リアルタイムAI支援</h3>
        <button
          onClick={fetchTips}
          disabled={!recording || loading}
          className="text-xs text-indigo-600 hover:text-indigo-800 disabled:text-gray-400"
        >
          {loading ? "分析中..." : "今すぐ助言を取得"}
        </button>
      </div>
      {tips.length === 0 ? (
        <p className="text-xs text-indigo-400">会話が進むと、AIからの助言がここに表示されます。</p>
      ) : (
        <ul className="space-y-1.5 max-h-40 overflow-y-auto">
          {tips.map((t, i) => (
            <li key={i} className="text-sm text-indigo-900 bg-white rounded-lg px-3 py-1.5">
              <span className="text-[10px] text-indigo-400 mr-1">{t.at}</span>
              {t.text}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
