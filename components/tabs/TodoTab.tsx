"use client";

import { ActionItem, ActionItemStatus, Meeting } from "@/lib/types";

const STATUS_LABEL: Record<ActionItemStatus, string> = {
  todo: "未着手",
  doing: "進行中",
  done: "完了",
};

const STATUS_ORDER: ActionItemStatus[] = ["todo", "doing", "done"];

function scheduleReminder(item: ActionItem) {
  if (!item.whenISO) {
    alert("この項目には期限（日付）が設定されていないため、リマインドできません。");
    return;
  }
  if (typeof Notification === "undefined") {
    alert("このブラウザは通知に対応していません。");
    return;
  }
  Notification.requestPermission().then((perm) => {
    if (perm !== "granted") return;
    const due = new Date(item.whenISO!).getTime();
    const remindAt = due - 24 * 60 * 60 * 1000; // 1日前
    const delay = remindAt - Date.now();
    if (delay <= 0) {
      new Notification("ToDoの期限が近づいています", { body: `${item.who}: ${item.what}` });
      return;
    }
    alert(
      `このタブを開いたままにしておくと、期限の1日前（${new Date(remindAt).toLocaleString(
        "ja-JP"
      )}）に通知します。`
    );
    setTimeout(() => {
      new Notification("ToDoの期限が近づいています", { body: `${item.who}: ${item.what}` });
    }, delay);
  });
}

export default function TodoTab({
  meeting,
  onUpdate,
}: {
  meeting: Meeting;
  onUpdate: (meeting: Meeting) => void;
}) {
  const items = meeting.minutes?.actionItems ?? [];

  const updateItem = (id: string, patch: Partial<ActionItem>) => {
    if (!meeting.minutes) return;
    const actionItems = meeting.minutes.actionItems.map((it) =>
      it.id === id ? { ...it, ...patch } : it
    );
    onUpdate({ ...meeting, minutes: { ...meeting.minutes, actionItems } });
  };

  if (!meeting.minutes) {
    return <p className="text-gray-500 text-sm">議事録が未生成です。</p>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {STATUS_ORDER.map((status) => (
        <div key={status} className="bg-gray-50 rounded-xl p-3">
          <h3 className="text-sm font-semibold text-gray-600 mb-2">
            {STATUS_LABEL[status]} ({items.filter((i) => i.status === status).length})
          </h3>
          <div className="space-y-2">
            {items
              .filter((i) => i.status === status)
              .map((item) => (
                <div key={item.id} className="bg-white rounded-lg border border-gray-200 p-3 text-sm">
                  <p className="font-medium text-gray-800">{item.what}</p>
                  <p className="text-gray-500 text-xs mt-1">
                    👤 {item.who} ・ 📅 {item.when}
                  </p>
                  <div className="flex items-center justify-between mt-2">
                    <select
                      value={item.status}
                      onChange={(e) =>
                        updateItem(item.id, { status: e.target.value as ActionItemStatus })
                      }
                      className="text-xs border border-gray-200 rounded px-1.5 py-1"
                    >
                      {STATUS_ORDER.map((s) => (
                        <option key={s} value={s}>
                          {STATUS_LABEL[s]}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => scheduleReminder(item)}
                      className="text-xs text-blue-600 hover:text-blue-800"
                    >
                      🔔 リマインド
                    </button>
                  </div>
                </div>
              ))}
            {items.filter((i) => i.status === status).length === 0 && (
              <p className="text-xs text-gray-400">なし</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
