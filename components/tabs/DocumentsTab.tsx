"use client";

import { useState } from "react";
import DocumentUploader from "@/components/DocumentUploader";
import { Meeting, transcriptToText } from "@/lib/types";

export default function DocumentsTab({
  meeting,
  onUpdate,
}: {
  meeting: Meeting;
  onUpdate: (meeting: Meeting) => void;
}) {
  const [regenerating, setRegenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const regenerate = async () => {
    setRegenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/minutes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcriptText: transcriptToText(meeting.transcript),
          documents: meeting.documents.map((d) => ({ name: d.name, text: d.text })),
          isDealMeeting: meeting.isDealMeeting,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "再生成に失敗しました。");
        return;
      }
      onUpdate({ ...meeting, minutes: data });
    } catch {
      setError("通信エラーが発生しました。");
    } finally {
      setRegenerating(false);
    }
  };

  return (
    <div className="space-y-4">
      <DocumentUploader
        documents={meeting.documents}
        onChange={(docs) => onUpdate({ ...meeting, documents: docs })}
      />
      <p className="text-sm text-gray-500">
        資料を追加・変更した後は「議事録を再生成」を押すと、資料との食い違いや抜け漏れの再チェックを含めて議事録を作り直します。
      </p>
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm">{error}</div>
      )}
      <button
        onClick={regenerate}
        disabled={regenerating}
        className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-semibold px-5 py-2.5 rounded-lg text-sm"
      >
        {regenerating ? "再生成中..." : "🔄 議事録を再生成"}
      </button>
    </div>
  );
}
