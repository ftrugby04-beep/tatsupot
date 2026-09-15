"use client";

import { useState } from "react";

export default function ConsentModal({
  onConfirm,
  onCancel,
}: {
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const [checked, setChecked] = useState(false);

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-6">
        <h2 className="text-lg font-bold text-gray-800 mb-2">🔐 録音の同意確認</h2>
        <p className="text-sm text-gray-600 mb-4">
          会議の録音・文字起こしを開始する前に、参加者から録音・AI解析についての同意を得てください。
          録音データはこのブラウザ内でのみ処理され、外部保存は行いません（文字起こしのAI解析にはAnthropic
          APIを利用します）。
        </p>
        <label className="flex items-start gap-2 text-sm text-gray-700 mb-5 cursor-pointer">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
            className="mt-0.5"
          />
          参加者に録音・AI解析についての同意を得ました
        </label>
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
          >
            キャンセル
          </button>
          <button
            onClick={onConfirm}
            disabled={!checked}
            className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-semibold rounded-lg"
          >
            同意して録音を開始
          </button>
        </div>
      </div>
    </div>
  );
}
