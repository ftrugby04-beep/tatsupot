"use client";

import Link from "next/link";
import { useState } from "react";
import ComplianceBadge from "./ComplianceBadge";
import { copyPostToClipboard } from "@/lib/threads-publisher";
import {
  POST_GENRE_LABELS,
  POST_STATUS_LABELS,
  ThreadsPost,
} from "@/lib/threads-types";

export default function PostCard({
  post,
  onApprove,
  onReject,
  onRegenerate,
  onPublish,
}: {
  post: ThreadsPost;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onRegenerate: (id: string) => Promise<void>;
  onPublish: (id: string) => void;
}) {
  const [regenerating, setRegenerating] = useState(false);

  const handleRegenerate = async () => {
    setRegenerating(true);
    try {
      await onRegenerate(post.id);
    } finally {
      setRegenerating(false);
    }
  };

  const handleCopyAndPublish = async () => {
    await copyPostToClipboard(post);
    onPublish(post.id);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm text-gray-500">{post.postTime}</span>
          <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
            {POST_GENRE_LABELS[post.genre]}
          </span>
          {post.isPr && (
            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
              PR
            </span>
          )}
          <ComplianceBadge compliance={post.compliance} />
        </div>
        <span className="text-xs text-gray-400">{POST_STATUS_LABELS[post.status]}</span>
      </div>

      <Link href={`/threads/posts/${post.id}`} className="block mb-3">
        <p className="font-semibold text-gray-800 line-clamp-1">{post.hook}</p>
        <p className="text-sm text-gray-600 line-clamp-2 mt-1">{post.body}</p>
      </Link>

      {post.compliance && post.compliance.flags.length > 0 && (
        <p className="text-xs text-red-600 mb-3">
          ⚠️ {post.compliance.flags.length}件の懸念表現あり（詳細は編集画面で確認）
        </p>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        {post.status === "pending_approval" && (
          <button
            onClick={() => onApprove(post.id)}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-3 py-1.5 rounded-lg"
          >
            承認
          </button>
        )}
        <Link
          href={`/threads/posts/${post.id}`}
          className="border border-gray-300 text-gray-700 text-sm font-semibold px-3 py-1.5 rounded-lg hover:bg-gray-50"
        >
          編集
        </Link>
        <button
          onClick={handleRegenerate}
          disabled={regenerating}
          className="border border-gray-300 text-gray-700 text-sm font-semibold px-3 py-1.5 rounded-lg hover:bg-gray-50 disabled:opacity-50"
        >
          {regenerating ? "再生成中..." : "再生成"}
        </button>
        {post.status !== "rejected" && post.status !== "published" && (
          <button
            onClick={() => onReject(post.id)}
            className="text-red-500 hover:text-red-700 text-sm px-2"
          >
            投稿中止
          </button>
        )}
        {(post.status === "approved" || post.status === "scheduled") && (
          <button
            onClick={handleCopyAndPublish}
            className="bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-3 py-1.5 rounded-lg ml-auto"
          >
            コピーして投稿
          </button>
        )}
      </div>
    </div>
  );
}
