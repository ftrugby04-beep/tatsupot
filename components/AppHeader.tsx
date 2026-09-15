"use client";

import Link from "next/link";

export default function AppHeader({ current }: { current?: "dashboard" | "search" }) {
  return (
    <header className="border-b border-gray-200 bg-white sticky top-0 z-10">
      <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-xl">🎙️</span>
          <span className="font-bold text-gray-800">たつぽっと議事録AI</span>
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link
            href="/"
            className={current === "dashboard" ? "font-semibold text-blue-600" : "text-gray-500 hover:text-gray-800"}
          >
            会議一覧
          </Link>
          <Link
            href="/search"
            className={current === "search" ? "font-semibold text-blue-600" : "text-gray-500 hover:text-gray-800"}
          >
            AI検索
          </Link>
          <Link
            href="/meeting/new"
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-lg"
          >
            + 新規会議
          </Link>
        </nav>
      </div>
    </header>
  );
}
