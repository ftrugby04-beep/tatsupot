"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import MinutesTab from "@/components/tabs/MinutesTab";
import TodoTab from "@/components/tabs/TodoTab";
import DocumentsTab from "@/components/tabs/DocumentsTab";
import ChatTab from "@/components/tabs/ChatTab";
import DealCoachTab from "@/components/tabs/DealCoachTab";
import ShareTab from "@/components/tabs/ShareTab";
import { useMeeting, saveMeeting } from "@/lib/store";
import { Meeting } from "@/lib/types";

const TABS = [
  { key: "minutes", label: "📋 議事録" },
  { key: "todo", label: "✅ ToDo" },
  { key: "documents", label: "📂 資料" },
  { key: "chat", label: "🤖 AIチャット" },
  { key: "coach", label: "🎯 商談分析" },
  { key: "share", label: "📤 共有" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default function MeetingDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const meeting = useMeeting(params.id);
  const [tab, setTab] = useState<TabKey>("minutes");

  const handleUpdate = (updated: Meeting) => {
    saveMeeting(updated);
  };

  if (meeting === null) {
    return (
      <>
        <AppHeader />
        <main className="p-6">
          <p className="text-gray-500 mb-4">会議記録が見つかりませんでした。</p>
          <button onClick={() => router.push("/")} className="text-blue-600 underline">
            会議一覧に戻る
          </button>
        </main>
      </>
    );
  }

  return (
    <>
      <AppHeader />
      <main className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-3xl mx-auto">
          <div className="mb-4">
            <h1 className="text-2xl font-bold text-gray-800">{meeting.title}</h1>
            <p className="text-sm text-gray-500">
              {meeting.company || "会社未設定"} ・ {new Date(meeting.createdAt).toLocaleString("ja-JP")}
            </p>
          </div>

          <div className="flex gap-1 mb-4 overflow-x-auto border-b border-gray-200">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`px-3 py-2 text-sm font-medium whitespace-nowrap border-b-2 -mb-px ${
                  tab === t.key ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {tab === "minutes" && <MinutesTab meeting={meeting} />}
          {tab === "todo" && <TodoTab meeting={meeting} onUpdate={handleUpdate} />}
          {tab === "documents" && <DocumentsTab meeting={meeting} onUpdate={handleUpdate} />}
          {tab === "chat" && <ChatTab meeting={meeting} onUpdate={handleUpdate} />}
          {tab === "coach" && <DealCoachTab meeting={meeting} onUpdate={handleUpdate} />}
          {tab === "share" && <ShareTab meeting={meeting} />}
        </div>
      </main>
    </>
  );
}
