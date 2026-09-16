"use client";

import { useMemo, useState } from "react";
import { useCoachingEntries, saveEntry, deleteEntry } from "@/lib/coaching-store";
import { toDateKey } from "@/lib/coaching-date";
import EntrySheet from "@/components/coaching/EntrySheet";

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

type DayCell = {
  date: Date;
  key: string;
  inCurrentMonth: boolean;
};

function buildMonthGrid(year: number, month: number): DayCell[] {
  const firstOfMonth = new Date(year, month, 1);
  const startWeekday = firstOfMonth.getDay();
  const gridStart = new Date(year, month, 1 - startWeekday);
  return Array.from({ length: 42 }, (_, i) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + i);
    return {
      date,
      key: toDateKey(date),
      inCurrentMonth: date.getMonth() === month,
    };
  });
}

export default function CoachingPage() {
  const entries = useCoachingEntries();
  const [viewDate, setViewDate] = useState(() => new Date());
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const todayKey = toDateKey(new Date());

  const grid = useMemo(() => buildMonthGrid(year, month), [year, month]);

  const monthStats = useMemo(() => {
    let coached = 0;
    let car = 0;
    let train = 0;
    let parked = 0;
    for (const cell of grid) {
      if (!cell.inCurrentMonth) continue;
      const entry = entries[cell.key];
      if (!entry) continue;
      coached += 1;
      if (entry.transport === "car") {
        car += 1;
        if (entry.parkedAtLot) parked += 1;
      } else {
        train += 1;
      }
    }
    return { coached, car, train, parked };
  }, [grid, entries]);

  const changeMonth = (diff: number) => setViewDate(new Date(year, month + diff, 1));
  const goToday = () => setViewDate(new Date());

  const selectedEntry = selectedKey ? entries[selectedKey] ?? null : null;

  return (
    <main className="min-h-screen bg-slate-50 pb-[calc(env(safe-area-inset-bottom)+24px)]">
      <header className="sticky top-0 z-10 bg-white border-b border-slate-200 px-4 pt-[calc(env(safe-area-inset-top)+12px)] pb-3">
        <div className="max-w-md mx-auto">
          <h1 className="text-lg font-bold text-slate-800">🏉 コーチング記録</h1>
        </div>
      </header>

      <div className="max-w-md mx-auto px-4 pt-4">
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => changeMonth(-1)}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-white border border-slate-200 text-slate-600 text-lg active:bg-slate-100"
            aria-label="前の月"
          >
            ‹
          </button>
          <button onClick={goToday} className="text-base font-semibold text-slate-800 px-2 py-1">
            {year}年{month + 1}月
          </button>
          <button
            onClick={() => changeMonth(1)}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-white border border-slate-200 text-slate-600 text-lg active:bg-slate-100"
            aria-label="次の月"
          >
            ›
          </button>
        </div>

        <div className="grid grid-cols-7 text-center text-xs font-medium text-slate-400 mb-1">
          {WEEKDAYS.map((w, i) => (
            <div key={w} className={i === 0 ? "text-red-400" : i === 6 ? "text-blue-400" : ""}>
              {w}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {grid.map((cell) => {
            const entry = entries[cell.key];
            const isToday = cell.key === todayKey;
            const weekday = cell.date.getDay();
            return (
              <button
                key={cell.key}
                onClick={() => setSelectedKey(cell.key)}
                className={`aspect-square rounded-xl flex flex-col items-center justify-center gap-0.5 text-sm ${
                  cell.inCurrentMonth ? "bg-white" : "bg-transparent opacity-40"
                } ${isToday ? "ring-2 ring-blue-500" : "border border-slate-100"} active:bg-slate-100`}
              >
                <span
                  className={`${
                    weekday === 0 ? "text-red-500" : weekday === 6 ? "text-blue-500" : "text-slate-700"
                  } ${isToday ? "font-bold" : ""}`}
                >
                  {cell.date.getDate()}
                </span>
                {entry && (
                  <span className="flex items-center gap-0.5 text-[11px] leading-none">
                    {entry.transport === "car" ? "🚗" : "🚃"}
                    {entry.transport === "car" && entry.parkedAtLot ? "🅿️" : ""}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="mt-5 bg-white border border-slate-200 rounded-xl p-4 text-sm text-slate-600">
          <p className="font-semibold text-slate-800 mb-2">{month + 1}月のまとめ</p>
          <div className="grid grid-cols-2 gap-y-1">
            <span>コーチング日数</span>
            <span className="text-right font-medium text-slate-800">{monthStats.coached}日</span>
            <span>🚗 車</span>
            <span className="text-right font-medium text-slate-800">{monthStats.car}日</span>
            <span>🚃 電車</span>
            <span className="text-right font-medium text-slate-800">{monthStats.train}日</span>
            <span>🅿️ 駐車場利用</span>
            <span className="text-right font-medium text-slate-800">{monthStats.parked}回</span>
          </div>
        </div>
      </div>

      <button
        onClick={() => setSelectedKey(todayKey)}
        className="fixed bottom-[calc(env(safe-area-inset-bottom)+16px)] right-4 bg-blue-600 active:bg-blue-700 text-white font-semibold rounded-full shadow-lg px-5 py-3.5 text-sm"
      >
        ＋ 今日を記録
      </button>

      {selectedKey && (
        <EntrySheet
          dateKey={selectedKey}
          entry={selectedEntry}
          onClose={() => setSelectedKey(null)}
          onSave={(entry) => {
            saveEntry(entry);
            setSelectedKey(null);
          }}
          onDelete={() => {
            deleteEntry(selectedKey);
            setSelectedKey(null);
          }}
        />
      )}
    </main>
  );
}
