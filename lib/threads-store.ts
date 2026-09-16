import { useSyncExternalStore } from "react";
import {
  DEFAULT_SETTINGS,
  KnowledgeInsight,
  NgExpression,
  Product,
  ThreadsPost,
  ThreadsSettings,
} from "./threads-types";

const KEYS = {
  posts: "tatsupot:threads:posts",
  products: "tatsupot:threads:products",
  settings: "tatsupot:threads:settings",
  knowledge: "tatsupot:threads:knowledge",
  customNg: "tatsupot:threads:customNg",
} as const;

const CHANGE_EVENT = "tatsupot:threads-changed";

function isBrowser() {
  return typeof window !== "undefined";
}

function readJson<T>(key: string, fallback: T): T {
  if (!isBrowser()) return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function subscribe(callback: () => void) {
  window.addEventListener(CHANGE_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(CHANGE_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

// ---- Posts ----

export function listPosts(): ThreadsPost[] {
  return readJson<ThreadsPost[]>(KEYS.posts, []);
}

export function listPostsByDate(date: string): ThreadsPost[] {
  return listPosts()
    .filter((p) => p.postDate === date)
    .sort((a, b) => a.postTime.localeCompare(b.postTime));
}

export function getPost(id: string): ThreadsPost | null {
  return listPosts().find((p) => p.id === id) ?? null;
}

export function savePost(post: ThreadsPost): void {
  const posts = listPosts();
  const idx = posts.findIndex((p) => p.id === post.id);
  const next =
    idx >= 0 ? posts.map((p, i) => (i === idx ? post : p)) : [...posts, post];
  writeJson(KEYS.posts, next);
}

export function savePosts(newPosts: ThreadsPost[]): void {
  const posts = listPosts();
  const byId = new Map(posts.map((p) => [p.id, p]));
  for (const p of newPosts) byId.set(p.id, p);
  writeJson(KEYS.posts, Array.from(byId.values()));
}

export function deletePost(id: string): void {
  writeJson(
    KEYS.posts,
    listPosts().filter((p) => p.id !== id)
  );
}

const EMPTY_POSTS: ThreadsPost[] = [];

export function useThreadsPosts(): ThreadsPost[] {
  return useSyncExternalStore(subscribe, listPosts, () => EMPTY_POSTS);
}

export function useThreadsPost(id: string): ThreadsPost | null {
  return useSyncExternalStore(
    subscribe,
    () => getPost(id),
    () => null
  );
}

// ---- Products ----

export function listProducts(): Product[] {
  return readJson<Product[]>(KEYS.products, []);
}

export function saveProduct(product: Product): void {
  const products = listProducts();
  const idx = products.findIndex((p) => p.id === product.id);
  const next =
    idx >= 0
      ? products.map((p, i) => (i === idx ? product : p))
      : [...products, product];
  writeJson(KEYS.products, next);
}

export function deleteProduct(id: string): void {
  writeJson(
    KEYS.products,
    listProducts().filter((p) => p.id !== id)
  );
}

const EMPTY_PRODUCTS: Product[] = [];

export function useThreadsProducts(): Product[] {
  return useSyncExternalStore(subscribe, listProducts, () => EMPTY_PRODUCTS);
}

// ---- Settings ----

export function getSettings(): ThreadsSettings {
  return readJson<ThreadsSettings>(KEYS.settings, DEFAULT_SETTINGS);
}

export function saveSettings(settings: ThreadsSettings): void {
  writeJson(KEYS.settings, settings);
}

export function useThreadsSettings(): ThreadsSettings {
  return useSyncExternalStore(subscribe, getSettings, () => DEFAULT_SETTINGS);
}

// ---- Knowledge ----

export function listKnowledge(): KnowledgeInsight[] {
  return readJson<KnowledgeInsight[]>(KEYS.knowledge, []);
}

export function addKnowledge(insight: KnowledgeInsight): void {
  writeJson(KEYS.knowledge, [...listKnowledge(), insight]);
}

export function deleteKnowledge(id: string): void {
  writeJson(
    KEYS.knowledge,
    listKnowledge().filter((k) => k.id !== id)
  );
}

const EMPTY_KNOWLEDGE: KnowledgeInsight[] = [];

export function useThreadsKnowledge(): KnowledgeInsight[] {
  return useSyncExternalStore(subscribe, listKnowledge, () => EMPTY_KNOWLEDGE);
}

export function knowledgeSummaryText(): string {
  const items = listKnowledge();
  if (items.length === 0) return "(まだ蓄積された勝ちパターンはありません)";
  return items
    .slice(-10)
    .map((k) => `- ${k.summary}`)
    .join("\n");
}

// ---- Custom NG expressions ----

export function listCustomNg(): NgExpression[] {
  return readJson<NgExpression[]>(KEYS.customNg, []);
}

export function addCustomNg(entry: NgExpression): void {
  writeJson(KEYS.customNg, [...listCustomNg(), entry]);
}

export function deleteCustomNg(phrase: string): void {
  writeJson(
    KEYS.customNg,
    listCustomNg().filter((n) => n.phrase !== phrase)
  );
}

const EMPTY_NG: NgExpression[] = [];

export function useThreadsCustomNg(): NgExpression[] {
  return useSyncExternalStore(subscribe, listCustomNg, () => EMPTY_NG);
}
