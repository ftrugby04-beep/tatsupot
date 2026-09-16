"use client";

import Link from "next/link";

type Current = "dashboard" | "analytics" | "settings";

export default function ThreadsHeader({ current }: { current?: Current }) {
  return (
    <header className="border-b border-gray-200 bg-white sticky top-0 z-10">
      <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between">
        <Link href="/threads" className="flex items-center gap-2">
          <span className="text-xl">🧵</span>
          <span className="font-bold text-gray-800">Threads AI編集部</span>
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link
            href="/threads"
            className={
              current === "dashboard"
                ? "font-semibold text-blue-600"
                : "text-gray-500 hover:text-gray-800"
            }
          >
            ダッシュボード
          </Link>
          <Link
            href="/threads/analytics"
            className={
              current === "analytics"
                ? "font-semibold text-blue-600"
                : "text-gray-500 hover:text-gray-800"
            }
          >
            分析
          </Link>
          <Link
            href="/threads/settings"
            className={
              current === "settings"
                ? "font-semibold text-blue-600"
                : "text-gray-500 hover:text-gray-800"
            }
          >
            設定
          </Link>
        </nav>
      </div>
    </header>
  );
}
