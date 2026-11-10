"use client";

import { useEffect, useState } from "react";

type Status = "出席" | "遅刻" | "欠席" | "未回答";
type Member = { id: string; name: string };
type Event = { id: string; date: string; title: string; answers: Record<string, Status> };
type Data = { members: Member[]; events: Event[] };

const KEY = "demo-attendance-v1";
const STATUSES: Status[] = ["出席", "遅刻", "欠席"];
const COLORS: Record<Status, string> = {
  出席: "bg-green-600 text-white",
  遅刻: "bg-yellow-500 text-white",
  欠席: "bg-red-500 text-white",
  未回答: "bg-gray-100 text-gray-500",
};

const initial: Data = {
  members: ["佐藤", "鈴木", "高橋", "田中"].map((name, i) => ({ id: `m${i}`, name })),
  events: [{ id: "e0", date: new Date().toISOString().slice(0, 10), title: "練習", answers: {} }],
};

const uid = () => Math.random().toString(36).slice(2, 9);

export default function AttendanceDemo() {
  const [data, setData] = useState<Data>(initial);
  const [loaded, setLoaded] = useState(false);
  const [newMember, setNewMember] = useState("");
  const [newDate, setNewDate] = useState("");
  const [newTitle, setNewTitle] = useState("練習");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (raw) setData(JSON.parse(raw));
    } catch {}
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
    } catch {}
  }, [data, loaded]);

  const setAnswer = (eventId: string, memberId: string, s: Status) =>
    setData((d) => ({
      ...d,
      events: d.events.map((e) =>
        e.id === eventId ? { ...e, answers: { ...e.answers, [memberId]: s } } : e,
      ),
    }));

  const addMember = () => {
    const name = newMember.trim();
    if (!name) return;
    setData((d) => ({ ...d, members: [...d.members, { id: uid(), name }] }));
    setNewMember("");
  };

  const addEvent = () => {
    if (!newDate) return;
    setData((d) => ({
      ...d,
      events: [...d.events, { id: uid(), date: newDate, title: newTitle || "練習", answers: {} }].sort(
        (a, b) => a.date.localeCompare(b.date),
      ),
    }));
    setNewDate("");
  };

  const removeEvent = (id: string) =>
    setData((d) => ({ ...d, events: d.events.filter((e) => e.id !== id) }));

  const shareText = (e: Event) => {
    const lines = STATUSES.map((s) => {
      const names = data.members.filter((m) => e.answers[m.id] === s).map((m) => m.name);
      return `${s}(${names.length})：${names.join("、") || "-"}`;
    });
    const none = data.members.filter((m) => !e.answers[m.id]).map((m) => m.name);
    return `【${e.date} ${e.title}】\n${lines.join("\n")}\n未回答(${none.length})：${none.join("、") || "-"}`;
  };

  const copy = async (e: Event) => {
    try {
      await navigator.clipboard.writeText(shareText(e));
      alert("LINE用の集計をコピーしました");
    } catch {
      alert(shareText(e));
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-6">
      <div className="max-w-xl mx-auto">
        <p className="text-xs text-blue-600 font-semibold">デモ｜チーム向け出欠管理</p>
        <h1 className="text-2xl font-bold text-gray-800 mb-1">出欠ボード</h1>
        <p className="text-sm text-gray-500 mb-6">
          タップで出欠を入力、集計はワンタップでLINEに貼れます。
        </p>

        {data.events.map((e) => {
          const count = (s: Status) => data.members.filter((m) => e.answers[m.id] === s).length;
          return (
            <section key={e.id} className="bg-white border border-gray-200 rounded-xl p-4 mb-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-bold text-gray-800">
                    {e.date}　{e.title}
                  </p>
                  <p className="text-xs text-gray-500">
                    出席 {count("出席")}／遅刻 {count("遅刻")}／欠席 {count("欠席")}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => copy(e)} className="text-xs bg-green-600 text-white px-3 py-1.5 rounded-lg">
                    LINE用コピー
                  </button>
                  <button onClick={() => removeEvent(e.id)} className="text-xs text-gray-400 px-2">
                    削除
                  </button>
                </div>
              </div>
              <ul className="divide-y divide-gray-100">
                {data.members.map((m) => {
                  const cur = e.answers[m.id] ?? "未回答";
                  return (
                    <li key={m.id} className="flex items-center justify-between py-2">
                      <span className="text-gray-800">{m.name}</span>
                      <div className="flex gap-1">
                        {STATUSES.map((s) => (
                          <button
                            key={s}
                            onClick={() => setAnswer(e.id, m.id, s)}
                            className={`text-xs px-2.5 py-1.5 rounded-md ${
                              cur === s ? COLORS[s] : COLORS["未回答"]
                            }`}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}

        <section className="bg-white border border-gray-200 rounded-xl p-4 mb-4 space-y-3">
          <p className="font-bold text-gray-800 text-sm">予定を追加</p>
          <div className="flex gap-2">
            <input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)}
              className="border border-gray-200 rounded-lg px-2 py-2 text-sm flex-1" />
            <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="練習/試合"
              className="border border-gray-200 rounded-lg px-2 py-2 text-sm w-28" />
            <button onClick={addEvent} className="bg-blue-600 text-white text-sm px-3 rounded-lg">追加</button>
          </div>
          <p className="font-bold text-gray-800 text-sm pt-2">メンバーを追加</p>
          <div className="flex gap-2">
            <input value={newMember} onChange={(e) => setNewMember(e.target.value)} placeholder="名前"
              className="border border-gray-200 rounded-lg px-2 py-2 text-sm flex-1" />
            <button onClick={addMember} className="bg-blue-600 text-white text-sm px-3 rounded-lg">追加</button>
          </div>
        </section>

        <p className="text-xs text-gray-400 text-center">
          ※デモ版はこの端末内にのみ保存されます。本番版ではチーム全員で共有できます。
        </p>
      </div>
    </main>
  );
}
