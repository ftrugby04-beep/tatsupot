"use client";

import { useState } from "react";
import { Meeting } from "@/lib/types";
import { generatePptx, PptMode } from "@/lib/ppt";
import { buildICS, downloadTextFile } from "@/lib/ics";
import { getSavedSlackWebhookUrl, saveSlackWebhookUrl } from "@/lib/store";

const PPT_MODES: { mode: PptMode; label: string; desc: string }[] = [
  { mode: "proposal", label: "提案資料モード", desc: "顧客向けの提案資料として出力" },
  { mode: "review", label: "振り返りモード", desc: "社内報告・振り返り資料として出力" },
  { mode: "report", label: "上司報告モード", desc: "結論・数字・課題中心の1ページ" },
];

export default function ShareTab({ meeting }: { meeting: Meeting }) {
  const [pptLoading, setPptLoading] = useState<PptMode | null>(null);
  const [nextDate, setNextDate] = useState("");
  const [nextTime, setNextTime] = useState("15:00");
  const [emailMode, setEmailMode] = useState<"thanks" | "followup">("thanks");
  const [emailDraft, setEmailDraft] = useState("");
  const [emailLoading, setEmailLoading] = useState(false);
  const [slackUrl, setSlackUrl] = useState(() => getSavedSlackWebhookUrl());
  const [slackStatus, setSlackStatus] = useState<string | null>(null);
  const [slackLoading, setSlackLoading] = useState(false);

  const minutes = meeting.minutes;

  const handlePpt = async (mode: PptMode) => {
    if (!minutes) return;
    setPptLoading(mode);
    try {
      await generatePptx(meeting, mode);
    } catch {
      alert("PowerPointの生成に失敗しました。");
    } finally {
      setPptLoading(null);
    }
  };

  const handleIcs = () => {
    if (!nextDate) {
      alert("次回会議の日付を入力してください。");
      return;
    }
    const start = new Date(`${nextDate}T${nextTime || "15:00"}:00`);
    const ics = buildICS({
      title: `${meeting.title}（次回）`,
      description: (minutes?.nextAgenda ?? []).join("\n"),
      start,
    });
    downloadTextFile(`${meeting.title}_次回会議.ics`, ics);
  };

  const handleEmail = async () => {
    if (!minutes) return;
    setEmailLoading(true);
    try {
      const res = await fetch("/api/email-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          minutesSummary: minutes.summary,
          decisions: minutes.decisions,
          actionItems: minutes.actionItems,
          mode: emailMode,
          company: meeting.company,
        }),
      });
      const data = await res.json();
      setEmailDraft(res.ok ? data.draft : data.error);
    } catch {
      setEmailDraft("通信エラーが発生しました。");
    } finally {
      setEmailLoading(false);
    }
  };

  const handleSlack = async () => {
    if (!minutes) return;
    saveSlackWebhookUrl(slackUrl);
    setSlackLoading(true);
    setSlackStatus(null);
    try {
      const res = await fetch("/api/slack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          webhookUrl: slackUrl,
          title: meeting.title,
          decisions: minutes.decisions,
          actionItems: minutes.actionItems,
        }),
      });
      const data = await res.json();
      setSlackStatus(res.ok ? "✅ Slackに送信しました" : `❌ ${data.error}`);
    } catch {
      setSlackStatus("❌ 通信エラーが発生しました。");
    } finally {
      setSlackLoading(false);
    }
  };

  if (!minutes) {
    return <p className="text-gray-500 text-sm">議事録が未生成です。</p>;
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-800 mb-3">📊 資料作成（PowerPoint）</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {PPT_MODES.map((m) => (
            <button
              key={m.mode}
              onClick={() => handlePpt(m.mode)}
              disabled={pptLoading !== null}
              className="border border-gray-200 rounded-lg p-3 text-left hover:border-blue-300 disabled:opacity-50"
            >
              <p className="text-sm font-medium text-gray-800">{m.label}</p>
              <p className="text-xs text-gray-500 mt-0.5">{m.desc}</p>
              {pptLoading === m.mode && <p className="text-xs text-blue-600 mt-1">生成中...</p>}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-800 mb-3">🔔 次回会議をカレンダーに登録</h3>
        <p className="text-xs text-gray-500 mb-3">
          .icsファイルをダウンロードし、Google Calendar等に取り込めます。（直接連携には別途Google
          Calendar連携の設定が必要です）
        </p>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="text-xs text-gray-500 block mb-1">日付</label>
            <input
              type="date"
              value={nextDate}
              onChange={(e) => setNextDate(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">時刻</label>
            <input
              type="time"
              value={nextTime}
              onChange={(e) => setNextTime(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <button
            onClick={handleIcs}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg"
          >
            .icsをダウンロード
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-800 mb-3">📧 メール文章生成</h3>
        <div className="flex gap-2 mb-3">
          <button
            onClick={() => setEmailMode("thanks")}
            className={`text-sm px-3 py-1.5 rounded-lg ${emailMode === "thanks" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600"}`}
          >
            お礼メール
          </button>
          <button
            onClick={() => setEmailMode("followup")}
            className={`text-sm px-3 py-1.5 rounded-lg ${emailMode === "followup" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600"}`}
          >
            フォローアップメール
          </button>
          <button
            onClick={handleEmail}
            disabled={emailLoading}
            className="ml-auto bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white text-sm font-medium px-4 py-1.5 rounded-lg"
          >
            {emailLoading ? "生成中..." : "生成する"}
          </button>
        </div>
        {emailDraft && (
          <>
            <textarea
              value={emailDraft}
              onChange={(e) => setEmailDraft(e.target.value)}
              className="w-full h-40 border border-gray-200 rounded-lg p-3 text-sm"
            />
            <button
              onClick={() => navigator.clipboard.writeText(emailDraft)}
              className="text-sm text-blue-600 hover:text-blue-800 underline mt-2"
            >
              コピーする
            </button>
          </>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-800 mb-3">💬 Slackに共有</h3>
        <div className="flex gap-2">
          <input
            value={slackUrl}
            onChange={(e) => setSlackUrl(e.target.value)}
            placeholder="https://hooks.slack.com/services/..."
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm"
          />
          <button
            onClick={handleSlack}
            disabled={slackLoading || !slackUrl}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white text-sm font-medium px-4 py-2 rounded-lg"
          >
            {slackLoading ? "送信中..." : "送信"}
          </button>
        </div>
        {slackStatus && <p className="text-sm mt-2">{slackStatus}</p>}
        <p className="text-xs text-gray-400 mt-2">
          SlackのIncoming Webhook URLを設定すると、決定事項とToDoを送信できます。
        </p>
      </div>
    </div>
  );
}
