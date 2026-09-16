"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import ThreadsHeader from "@/components/threads/ThreadsHeader";
import ComplianceBadge from "@/components/threads/ComplianceBadge";
import {
  useThreadsPost,
  useThreadsProducts,
  savePost,
} from "@/lib/threads-store";
import {
  CONTENT_TYPE_LABELS,
  CTA_TYPE_LABELS,
  CtaType,
  HOOK_TYPE_LABELS,
  HookType,
  POST_GENRE_LABELS,
  POST_STATUS_LABELS,
  Product,
  PostMetrics,
  ThreadsPost,
  nowIso,
} from "@/lib/threads-types";

const EMPTY_METRICS: PostMetrics = {
  views: 0,
  likes: 0,
  replies: 0,
  reposts: 0,
  saves: 0,
  linkClicks: 0,
  revenue: 0,
  recordedAt: nowIso(),
};

export default function PostDetailPage() {
  const params = useParams<{ id: string }>();
  const post = useThreadsPost(params.id);
  const products = useThreadsProducts();

  if (!post) {
    return (
      <>
        <ThreadsHeader />
        <main className="min-h-screen bg-gray-50 p-6">
          <div className="max-w-3xl mx-auto text-center text-gray-500 py-20">
            投稿が見つかりませんでした。
            <div className="mt-4">
              <Link href="/threads" className="text-blue-600">
                ダッシュボードへ戻る
              </Link>
            </div>
          </div>
        </main>
      </>
    );
  }

  const product = products.find((p) => p.id === post.productId);

  // postのidが変わるたびに編集フォームの内部状態を作り直したいので、
  // keyにpost.idを指定して子コンポーネントを丸ごと再マウントする。
  return <PostEditor key={post.id} post={post} product={product} />;
}

function PostEditor({ post, product }: { post: ThreadsPost; product?: Product }) {
  const router = useRouter();

  const [hook, setHook] = useState(post.hook);
  const [bodyText, setBodyText] = useState(post.body);
  const [cta, setCta] = useState(post.cta);
  const [checking, setChecking] = useState(false);
  const [strengtheningHook, setStrengtheningHook] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<PostMetrics>(post.metrics ?? EMPTY_METRICS);

  const persist = (changes: Partial<ThreadsPost>) => {
    savePost({
      ...post,
      ...changes,
      updatedAt: nowIso(),
    });
  };

  const handleSaveEdits = () => {
    persist({
      hook,
      body: bodyText,
      cta,
      history: [...post.history, { action: "edited", at: nowIso() }],
    });
  };

  const handleComplianceCheck = async () => {
    setChecking(true);
    setError(null);
    try {
      const res = await fetch("/api/threads/compliance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hook,
          body: bodyText,
          isPr: post.isPr,
          pastPosts: [],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "確認に失敗しました。");

      const status =
        data.riskScore >= 60 || (post.isPr && !data.prDisclosureOk)
          ? "needs_review"
          : "pending_approval";

      persist({
        hook,
        body: bodyText,
        compliance: data,
        status,
        history: [...post.history, { action: "compliance_checked", at: nowIso() }],
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "確認に失敗しました。");
    } finally {
      setChecking(false);
    }
  };

  const handleApplySuggestion = (phrase: string, suggestion: string) => {
    setBodyText((prev) => prev.split(phrase).join(suggestion));
    setHook((prev) => prev.split(phrase).join(suggestion));
  };

  const handleStrengthenHook = async () => {
    setStrengtheningHook(true);
    setError(null);
    try {
      const res = await fetch("/api/threads/hook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hook, body: bodyText }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Hook強化に失敗しました。");
      setHook(data.hook);
      persist({
        hook: data.hook,
        tags: { ...post.tags, hookType: data.hookType as HookType },
        history: [...post.history, { action: "hook_strengthened", at: nowIso() }],
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Hook強化に失敗しました。");
    } finally {
      setStrengtheningHook(false);
    }
  };

  const handleStatus = (status: ThreadsPost["status"]) => {
    persist({ status, history: [...post.history, { action: status, at: nowIso() }] });
    router.push("/threads");
  };

  const handleSaveMetrics = () => {
    persist({
      metrics: { ...metrics, recordedAt: nowIso() },
      status: post.status === "scheduled" ? "published" : post.status,
    });
  };

  return (
    <>
      <ThreadsHeader />
      <main className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-800">投稿編集</h1>
              <p className="text-sm text-gray-500">
                {post.postDate} {post.postTime} ・ {POST_GENRE_LABELS[post.genre]} ・{" "}
                {POST_STATUS_LABELS[post.status]}
              </p>
            </div>
            <ComplianceBadge compliance={post.compliance} />
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
            <div>
              <label className="text-xs text-gray-500">Hook（1文目）</label>
              <textarea
                value={hook}
                onChange={(e) => setHook(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm h-16 resize-none mt-1"
              />
              <button
                onClick={handleStrengthenHook}
                disabled={strengtheningHook}
                className="mt-2 text-sm border border-gray-300 px-3 py-1 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                {strengtheningHook ? "強化中..." : "Hookを強化"}
              </button>
            </div>

            <div>
              <label className="text-xs text-gray-500">本文</label>
              <textarea
                value={bodyText}
                onChange={(e) => setBodyText(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm h-40 mt-1"
              />
              <p className="text-xs text-gray-400 text-right">{bodyText.length}/500</p>
            </div>

            <div>
              <label className="text-xs text-gray-500">CTA</label>
              <input
                value={cta}
                onChange={(e) => setCta(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1"
              />
            </div>

            <div className="flex flex-wrap gap-2 text-xs text-gray-500">
              <span className="bg-gray-100 px-2 py-1 rounded-full">
                Hook: {HOOK_TYPE_LABELS[post.tags.hookType]}
              </span>
              <span className="bg-gray-100 px-2 py-1 rounded-full">
                形式: {CONTENT_TYPE_LABELS[post.tags.contentType]}
              </span>
              <span className="bg-gray-100 px-2 py-1 rounded-full">
                CTA種別: {CTA_TYPE_LABELS[post.ctaType as CtaType]}
              </span>
              <span className="bg-gray-100 px-2 py-1 rounded-full">
                ターゲット: {post.target}
              </span>
              {product && (
                <span className="bg-purple-50 text-purple-700 px-2 py-1 rounded-full">
                  商品: {product.name}
                </span>
              )}
            </div>

            <button
              onClick={handleSaveEdits}
              className="text-sm bg-gray-800 hover:bg-gray-900 text-white px-3 py-1.5 rounded-lg"
            >
              編集内容を保存
            </button>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-gray-800">コンプライアンスチェック</p>
              <button
                onClick={handleComplianceCheck}
                disabled={checking}
                className="text-sm border border-gray-300 px-3 py-1 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                {checking ? "確認中..." : "再チェック実行"}
              </button>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            {post.compliance && post.compliance.flags.length > 0 ? (
              <ul className="space-y-2">
                {post.compliance.flags.map((f, i) => (
                  <li key={i} className="border border-red-100 bg-red-50 rounded-lg p-3 text-sm">
                    <p className="font-medium text-red-700">
                      「{f.phrase}」({f.law})
                    </p>
                    <p className="text-gray-600 mt-1">{f.reason}</p>
                    <p className="text-gray-700 mt-1">修正候補: {f.suggestion}</p>
                    <button
                      onClick={() => handleApplySuggestion(f.phrase, f.suggestion)}
                      className="mt-2 text-xs text-blue-600 hover:underline"
                    >
                      修正候補を適用
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-500">検出された懸念表現はありません。</p>
            )}
            {post.isPr && (
              <p
                className={`text-sm ${post.compliance?.prDisclosureOk ? "text-green-600" : "text-red-600"}`}
              >
                PR表記: {post.compliance?.prDisclosureOk ? "OK" : "未記載（要修正）"}
              </p>
            )}
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-4 flex gap-2 flex-wrap">
            <button
              onClick={() => handleStatus("approved")}
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg"
            >
              承認する
            </button>
            <button
              onClick={() => handleStatus("rejected")}
              className="border border-gray-300 text-gray-700 text-sm px-4 py-2 rounded-lg hover:bg-gray-50"
            >
              投稿中止
            </button>
            <Link
              href="/threads"
              className="text-sm text-gray-500 px-4 py-2 hover:text-gray-800"
            >
              ダッシュボードへ戻る
            </Link>
          </div>

          {(post.status === "published" || post.status === "scheduled") && (
            <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
              <p className="font-semibold text-gray-800">実績指標（Analytics Agent）</p>
              <div className="grid grid-cols-3 gap-3">
                {(
                  [
                    ["views", "閲覧数"],
                    ["likes", "いいね"],
                    ["replies", "返信"],
                    ["reposts", "再投稿"],
                    ["saves", "保存"],
                    ["linkClicks", "リンククリック"],
                    ["revenue", "売上/成果"],
                  ] as [keyof PostMetrics, string][]
                ).map(([key, label]) => (
                  <label key={key} className="text-xs text-gray-500">
                    {label}
                    <input
                      type="number"
                      value={metrics[key] as number}
                      onChange={(e) =>
                        setMetrics((m) => ({ ...m, [key]: Number(e.target.value) }))
                      }
                      className="w-full border border-gray-200 rounded-lg px-2 py-1 text-sm mt-1"
                    />
                  </label>
                ))}
              </div>
              <button
                onClick={handleSaveMetrics}
                className="text-sm bg-gray-800 hover:bg-gray-900 text-white px-3 py-1.5 rounded-lg"
              >
                指標を保存
              </button>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
