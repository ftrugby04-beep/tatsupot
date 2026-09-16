import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { buildOptimizationPrompt, extractJson, OptimizationInsight } from "@/lib/threads-agents";
import { ThreadsPost } from "@/lib/threads-types";

const client = new Anthropic();

type RequestBody = {
  posts: ThreadsPost[];
};

export async function POST(request: NextRequest) {
  try {
    const { posts }: RequestBody = await request.json();
    const withMetrics = (posts ?? []).filter((p) => p.metrics);

    if (withMetrics.length === 0) {
      return NextResponse.json(
        { error: "指標が入力された投稿がありません。分析画面で指標を入力してください。" },
        { status: 400 }
      );
    }

    const catalog = withMetrics.map((p) => ({
      id: p.id,
      genre: p.genre,
      target: p.target,
      hookType: p.tags.hookType,
      contentType: p.tags.contentType,
      ctaType: p.ctaType,
      category: p.tags.category,
      metrics: {
        views: p.metrics!.views,
        likes: p.metrics!.likes,
        saves: p.metrics!.saves,
        linkClicks: p.metrics!.linkClicks,
      },
    }));

    const message = await client.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 1536,
      messages: [{ role: "user", content: buildOptimizationPrompt(catalog) }],
    });

    const rawText =
      message.content[0].type === "text" ? message.content[0].text : "";
    const insights = extractJson<OptimizationInsight[]>(rawText, "array") ?? [];

    return NextResponse.json({ insights });
  } catch (error) {
    console.error("Optimization agent error:", error);
    return NextResponse.json(
      { error: "分析中にエラーが発生しました。" },
      { status: 500 }
    );
  }
}
