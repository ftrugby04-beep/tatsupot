"use client";

import { useMemo, useRef, useState } from "react";
import ThreadsHeader from "@/components/threads/ThreadsHeader";
import AgentPipelineStatus from "@/components/threads/AgentPipelineStatus";
import PostCard from "@/components/threads/PostCard";
import {
  useThreadsPosts,
  useThreadsProducts,
  useThreadsSettings,
  useThreadsCustomNg,
  savePosts,
  savePost,
  knowledgeSummaryText,
} from "@/lib/threads-store";
import { IdeaDraft } from "@/lib/threads-agents";
import {
  ComplianceResult,
  ContentType,
  CtaType,
  HookType,
  ThreadsPost,
  nowIso,
} from "@/lib/threads-types";

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export default function ThreadsDashboard() {
  const allPosts = useThreadsPosts();
  const products = useThreadsProducts();
  const settings = useThreadsSettings();
  const customNg = useThreadsCustomNg();

  const [date, setDate] = useState(todayStr());
  const [researchNotes, setResearchNotes] = useState("");
  const [generating, setGenerating] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const stepTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const posts = useMemo(
    () =>
      allPosts
        .filter((p) => p.postDate === date)
        .sort((a, b) => a.postTime.localeCompare(b.postTime)),
    [allPosts, date]
  );

  const pastPosts = useMemo(
    () =>
      allPosts
        .filter((p) => p.postDate !== date)
        .slice(-30)
        .map((p) => ({ id: p.id, body: p.body })),
    [allPosts, date]
  );

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    setActiveStep(0);
    stepTimer.current = setInterval(() => {
      setActiveStep((s) => Math.min(s + 1, 3));
    }, 2500);

    try {
      const res = await fetch("/api/threads/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          slots: settings.slots,
          products,
          settings,
          researchNotes,
          knowledgeSummary: knowledgeSummaryText(),
          customNg,
          pastPosts,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "生成に失敗しました。");
      savePosts(data.posts as ThreadsPost[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "生成に失敗しました。");
    } finally {
      if (stepTimer.current) clearInterval(stepTimer.current);
      setGenerating(false);
    }
  };

  const updateStatus = (id: string, status: ThreadsPost["status"]) => {
    const post = posts.find((p) => p.id === id);
    if (!post) return;
    savePost({
      ...post,
      status,
      updatedAt: nowIso(),
      history: [...post.history, { action: status, at: nowIso() }],
    });
  };

  const handleApproveAll = () => {
    for (const p of posts) {
      if (p.status === "pending_approval") updateStatus(p.id, "approved");
    }
  };

  const handleRegenerate = async (id: string) => {
    const post = posts.find((p) => p.id === id);
    if (!post) return;

    const idea: IdeaDraft = {
      genre: post.genre,
      theme: post.theme,
      target: post.target,
      purpose: post.purpose,
      category: post.tags.category,
    };
    const product = products.find((p) => p.id === post.productId);

    try {
      const res = await fetch("/api/threads/regenerate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idea, product, settings, customNg, pastPosts }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "再生成に失敗しました。");

      const compliance: ComplianceResult = data.compliance;
      const status: ThreadsPost["status"] =
        compliance.riskScore >= 60 || (post.isPr && !compliance.prDisclosureOk)
          ? "needs_review"
          : "pending_approval";

      savePost({
        ...post,
        hook: data.hook,
        body: data.body,
        cta: data.cta,
        ctaType: data.ctaType as CtaType,
        imageDirection: data.imageDirection,
        videoDirection: data.videoDirection,
        tags: {
          hookType: data.tags.hookType as HookType,
          contentType: data.tags.contentType as ContentType,
          category: data.tags.category,
        },
        compliance,
        status,
        updatedAt: nowIso(),
        history: [...post.history, { action: "regenerated", at: nowIso() }],
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "再生成に失敗しました。");
    }
  };

  return (
    <>
      <ThreadsHeader current="dashboard" />
      <main className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-3xl mx-auto space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">本日の投稿予定</h1>
            <p className="text-sm text-gray-500">
              リサーチ〜Hook強化〜コンプライアンス確認まで自動生成し、最終承認は人間が行います。
            </p>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-3">
              <label className="text-sm text-gray-600">投稿日</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm"
              />
            </div>
            <textarea
              value={researchNotes}
              onChange={(e) => setResearchNotes(e.target.value)}
              placeholder="トレンドメモ（気になっているネタ・最近のコメント傾向などを自由に書いてください）"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm h-20 resize-none"
            />
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-lg disabled:opacity-50"
            >
              {generating ? "AI編集会議 開催中..." : "AI編集会議を開く"}
            </button>
            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>

          {generating && <AgentPipelineStatus activeStep={activeStep} />}

          {posts.length > 0 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">{posts.length}件の投稿</p>
              <button
                onClick={handleApproveAll}
                className="text-sm border border-blue-300 text-blue-700 px-3 py-1.5 rounded-lg hover:bg-blue-50"
              >
                すべて承認
              </button>
            </div>
          )}

          <div className="space-y-3">
            {posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                onApprove={(id) => updateStatus(id, "approved")}
                onReject={(id) => updateStatus(id, "rejected")}
                onRegenerate={handleRegenerate}
                onPublish={(id) => updateStatus(id, "published")}
              />
            ))}
            {posts.length === 0 && !generating && (
              <div className="bg-white border border-gray-200 rounded-xl p-10 text-center text-gray-500">
                この日の投稿はまだありません。「AI編集会議を開く」から生成してください。
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
