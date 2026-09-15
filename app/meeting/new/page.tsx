"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import AppHeader from "@/components/AppHeader";
import ConsentModal from "@/components/ConsentModal";
import AssistPanel from "@/components/AssistPanel";
import DocumentUploader from "@/components/DocumentUploader";
import { createMeetingId, saveMeeting } from "@/lib/store";
import { Meeting, MeetingDocument, TranscriptSegment, transcriptToText } from "@/lib/types";

const RecordingPanel = dynamic(() => import("@/components/RecordingPanel"), {
  ssr: false,
  loading: () => (
    <div className="bg-white rounded-xl border border-gray-200 p-5 text-sm text-gray-400">読み込み中...</div>
  ),
});

export default function NewMeetingPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"record" | "paste">("record");
  const [title, setTitle] = useState("");
  const [company, setCompany] = useState("");
  const [isDealMeeting, setIsDealMeeting] = useState(false);
  const [documents, setDocuments] = useState<MeetingDocument[]>([]);

  const [consentGiven, setConsentGiven] = useState(false);
  const [showConsent, setShowConsent] = useState(false);
  const [recording, setRecording] = useState(false);
  const [segments, setSegments] = useState<TranscriptSegment[]>([]);
  const [pastedText, setPastedText] = useState("");

  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const transcriptText =
    mode === "record" ? transcriptToText(segments) : pastedText;

  const handleGenerate = async () => {
    if (!transcriptText.trim()) return;
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/minutes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcriptText,
          documents: documents.map((d) => ({ name: d.name, text: d.text })),
          isDealMeeting,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "議事録の生成に失敗しました。");
        setGenerating(false);
        return;
      }

      const meeting: Meeting = {
        id: createMeetingId(),
        title: title.trim() || "無題の会議",
        company: company.trim(),
        createdAt: new Date().toISOString(),
        transcript:
          mode === "record"
            ? segments
            : [{ speaker: "全体", text: pastedText, timestamp: 0 }],
        documents,
        minutes: data,
        chatHistory: [],
        isDealMeeting,
      };
      saveMeeting(meeting);
      router.push(`/meeting/${meeting.id}`);
    } catch {
      setError("通信エラーが発生しました。");
      setGenerating(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setPastedText((ev.target?.result as string) ?? "");
    reader.readAsText(file, "utf-8");
  };

  return (
    <>
      <AppHeader />
      {showConsent && (
        <ConsentModal
          onConfirm={() => {
            setConsentGiven(true);
            setShowConsent(false);
          }}
          onCancel={() => setShowConsent(false)}
        />
      )}
      <main className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-3xl mx-auto space-y-4">
          <h1 className="text-2xl font-bold text-gray-800">新規会議</h1>

          <div className="bg-white rounded-xl border border-gray-200 p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">会議タイトル</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="例）〇〇社 定例商談"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">会社・顧客名</label>
              <input
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="例）株式会社〇〇"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-700 sm:col-span-2">
              <input
                type="checkbox"
                checked={isDealMeeting}
                onChange={(e) => setIsDealMeeting(e.target.checked)}
              />
              この会議は商談（営業）です。商談コーチAIによる分析を行う
            </label>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setMode("record")}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                mode === "record" ? "bg-blue-600 text-white" : "bg-white text-gray-600 border border-gray-200"
              }`}
            >
              🎙️ 録音する
            </button>
            <button
              onClick={() => setMode("paste")}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                mode === "paste" ? "bg-blue-600 text-white" : "bg-white text-gray-600 border border-gray-200"
              }`}
            >
              ✍️ テキストを貼り付け
            </button>
          </div>

          {mode === "record" ? (
            consentGiven ? (
              <>
                <RecordingPanel
                  onTranscriptChange={setSegments}
                  onRecordingStateChange={setRecording}
                />
                <AssistPanel
                  recording={recording}
                  transcriptText={transcriptToText(segments)}
                  documents={documents}
                />
              </>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
                <p className="text-sm text-gray-500 mb-3">
                  録音を開始する前に、参加者からの同意確認が必要です。
                </p>
                <button
                  onClick={() => setShowConsent(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2.5 rounded-lg"
                >
                  録音の準備をする
                </button>
              </div>
            )
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">議事録テキスト</label>
                <label className="text-sm text-blue-600 hover:text-blue-800 underline cursor-pointer">
                  ファイルから読み込む (.txt / .md)
                  <input type="file" accept=".txt,.md" className="hidden" onChange={handleFileUpload} />
                </label>
              </div>
              <textarea
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                placeholder="議事録・文字起こしテキストを貼り付けてください..."
                className="w-full h-52 p-3 border border-gray-200 rounded-lg text-sm resize-y focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
            </div>
          )}

          <DocumentUploader documents={documents} onChange={setDocuments} />

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm">{error}</div>
          )}

          <button
            onClick={handleGenerate}
            disabled={generating || !transcriptText.trim()}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-semibold rounded-xl transition-colors"
          >
            {generating ? "AIが議事録を作成中..." : "📋 議事録を生成する"}
          </button>
        </div>
      </main>
    </>
  );
}
