"use client";

import { useState } from "react";
import { CoachingEntry, TransportMode } from "@/lib/coaching-types";
import { fromDateKey } from "@/lib/coaching-date";

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

type Props = {
  dateKey: string;
  entry: CoachingEntry | null;
  onClose: () => void;
  onSave: (entry: CoachingEntry) => void;
  onDelete: () => void;
};

export default function EntrySheet({ dateKey, entry, onClose, onSave, onDelete }: Props) {
  const [transport, setTransport] = useState<TransportMode>(entry?.transport ?? "car");
  const [parkedAtLot, setParkedAtLot] = useState<boolean>(entry?.parkedAtLot ?? false);

  const date = fromDateKey(dateKey);
  const label = `${date.getMonth() + 1}月${date.getDate()}日(${WEEKDAYS[date.getDay()]})`;

  const handleSave = () => {
    onSave({
      date: dateKey,
      transport,
      parkedAtLot: transport === "car" ? parkedAtLot : false,
    });
  };

  return (
    <div className="fixed inset-0 z-20 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white rounded-t-2xl px-5 pt-4 pb-[calc(env(safe-area-inset-bottom)+20px)] shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-slate-800">{label}</h2>
          <button
            onClick={onClose}
            className="text-slate-400 text-2xl leading-none px-2"
            aria-label="閉じる"
          >
            ×
          </button>
        </div>

        <p className="text-xs font-medium text-slate-500 mb-2">移動手段</p>
        <div className="grid grid-cols-2 gap-2 mb-4">
          <button
            onClick={() => setTransport("car")}
            className={`py-3.5 rounded-xl text-base font-semibold border-2 ${
              transport === "car"
                ? "border-blue-600 bg-blue-50 text-blue-700"
                : "border-slate-200 text-slate-500"
            }`}
          >
            🚗 車
          </button>
          <button
            onClick={() => setTransport("train")}
            className={`py-3.5 rounded-xl text-base font-semibold border-2 ${
              transport === "train"
                ? "border-blue-600 bg-blue-50 text-blue-700"
                : "border-slate-200 text-slate-500"
            }`}
          >
            🚃 電車
          </button>
        </div>

        {transport === "car" && (
          <button
            onClick={() => setParkedAtLot((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-3.5 rounded-xl border-2 border-slate-200 mb-4"
          >
            <span className="text-sm font-medium text-slate-700">🅿️ 駐車場に停めた</span>
            <span
              className={`w-11 h-6 rounded-full relative transition-colors ${
                parkedAtLot ? "bg-blue-600" : "bg-slate-200"
              }`}
            >
              <span
                className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                  parkedAtLot ? "translate-x-[22px]" : "translate-x-0.5"
                }`}
              />
            </span>
          </button>
        )}

        <button
          onClick={handleSave}
          className="w-full bg-blue-600 active:bg-blue-700 text-white font-semibold rounded-xl py-3.5 text-base"
        >
          保存
        </button>

        {entry && (
          <button onClick={onDelete} className="w-full text-red-600 text-sm font-medium py-3 mt-1">
            この日の記録を削除
          </button>
        )}
      </div>
    </div>
  );
}
