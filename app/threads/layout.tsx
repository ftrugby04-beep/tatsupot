import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Threads AI編集部",
  description:
    "リサーチ→企画→原稿作成→コンプライアンス確認→投稿→分析→改善を循環させるThreads運用AI編集部",
};

export default function ThreadsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
