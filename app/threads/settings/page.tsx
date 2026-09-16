"use client";

import { useState } from "react";
import ThreadsHeader from "@/components/threads/ThreadsHeader";
import {
  useThreadsProducts,
  saveProduct,
  deleteProduct,
  useThreadsSettings,
  saveSettings,
  useThreadsCustomNg,
  addCustomNg,
  deleteCustomNg,
} from "@/lib/threads-store";
import {
  ComplianceLaw,
  POST_GENRE_LABELS,
  Product,
  ProductPlatform,
  PostGenre,
  ScheduleSlot,
  createId,
} from "@/lib/threads-types";

const GENRES = Object.keys(POST_GENRE_LABELS) as PostGenre[];
const LAWS: ComplianceLaw[] = ["薬機法", "景表法", "PR表記", "誇大表現", "商標/権利", "重複投稿"];

export default function ThreadsSettingsPage() {
  const products = useThreadsProducts();
  const settings = useThreadsSettings();
  const customNg = useThreadsCustomNg();

  const [newProduct, setNewProduct] = useState({
    name: "",
    url: "",
    category: "",
    isAffiliate: true,
    platform: "rakuten" as ProductPlatform,
  });
  const [targetAudience, setTargetAudience] = useState(settings.targetAudience);
  const [brandVoice, setBrandVoice] = useState(settings.brandVoice);
  const [slots, setSlots] = useState<ScheduleSlot[]>(settings.slots);
  const [newNg, setNewNg] = useState({ phrase: "", law: "薬機法" as ComplianceLaw, suggestion: "" });

  const handleAddProduct = () => {
    if (!newProduct.name || !newProduct.category) return;
    const product: Product = { id: createId(), ...newProduct };
    saveProduct(product);
    setNewProduct({ name: "", url: "", category: "", isAffiliate: true, platform: "rakuten" });
  };

  const handleSaveSettings = () => {
    saveSettings({ targetAudience, brandVoice, slots });
  };

  const handleSlotChange = (index: number, changes: Partial<ScheduleSlot>) => {
    setSlots((prev) => prev.map((s, i) => (i === index ? { ...s, ...changes } : s)));
  };

  const handleAddSlot = () => {
    setSlots((prev) => [...prev, { time: "12:00", genre: "beauty" }]);
  };

  const handleRemoveSlot = (index: number) => {
    setSlots((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddNg = () => {
    if (!newNg.phrase || !newNg.suggestion) return;
    addCustomNg(newNg);
    setNewNg({ phrase: "", law: "薬機法", suggestion: "" });
  };

  return (
    <>
      <ThreadsHeader current="settings" />
      <main className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-3xl mx-auto space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">設定</h1>
            <p className="text-sm text-gray-500">
              商品マスタ・投稿スロット・ターゲット像・追加NG表現を管理します。
            </p>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
            <p className="font-semibold text-gray-800">ターゲット像・ブランドボイス</p>
            <label className="block text-xs text-gray-500">
              ターゲット像
              <textarea
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm h-16 mt-1"
              />
            </label>
            <label className="block text-xs text-gray-500">
              ブランドボイス
              <textarea
                value={brandVoice}
                onChange={(e) => setBrandVoice(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm h-16 mt-1"
              />
            </label>

            <p className="font-semibold text-gray-800 pt-2">投稿スロット（時間×ジャンル）</p>
            <div className="space-y-2">
              {slots.map((slot, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    type="time"
                    value={slot.time}
                    onChange={(e) => handleSlotChange(i, { time: e.target.value })}
                    className="border border-gray-200 rounded-lg px-2 py-1 text-sm"
                  />
                  <select
                    value={slot.genre}
                    onChange={(e) =>
                      handleSlotChange(i, { genre: e.target.value as PostGenre })
                    }
                    className="border border-gray-200 rounded-lg px-2 py-1 text-sm flex-1"
                  >
                    {GENRES.map((g) => (
                      <option key={g} value={g}>
                        {POST_GENRE_LABELS[g]}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => handleRemoveSlot(i)}
                    className="text-red-500 hover:text-red-700 text-sm px-2"
                  >
                    削除
                  </button>
                </div>
              ))}
              <button
                onClick={handleAddSlot}
                className="text-sm border border-gray-300 px-3 py-1 rounded-lg hover:bg-gray-50"
              >
                + スロット追加
              </button>
            </div>

            <button
              onClick={handleSaveSettings}
              className="bg-gray-800 hover:bg-gray-900 text-white text-sm font-semibold px-4 py-2 rounded-lg"
            >
              設定を保存
            </button>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
            <p className="font-semibold text-gray-800">商品マスタ</p>
            <div className="space-y-2">
              {products.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between border border-gray-100 rounded-lg px-3 py-2 text-sm"
                >
                  <div>
                    <span className="font-medium">{p.name}</span>
                    <span className="text-gray-400 ml-2">
                      {p.category} / {p.platform}
                      {p.isAffiliate ? " / PR" : ""}
                    </span>
                  </div>
                  <button
                    onClick={() => deleteProduct(p.id)}
                    className="text-red-500 hover:text-red-700"
                  >
                    削除
                  </button>
                </div>
              ))}
              {products.length === 0 && (
                <p className="text-sm text-gray-400">まだ商品が登録されていません。</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <input
                placeholder="商品名"
                value={newProduct.name}
                onChange={(e) => setNewProduct((p) => ({ ...p, name: e.target.value }))}
                className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm"
              />
              <input
                placeholder="カテゴリ（例: フォームローラー）"
                value={newProduct.category}
                onChange={(e) => setNewProduct((p) => ({ ...p, category: e.target.value }))}
                className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm"
              />
              <input
                placeholder="商品URL"
                value={newProduct.url}
                onChange={(e) => setNewProduct((p) => ({ ...p, url: e.target.value }))}
                className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm col-span-2"
              />
              <select
                value={newProduct.platform}
                onChange={(e) =>
                  setNewProduct((p) => ({
                    ...p,
                    platform: e.target.value as ProductPlatform,
                  }))
                }
                className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm"
              >
                <option value="rakuten">楽天</option>
                <option value="amazon">Amazon</option>
                <option value="other">その他</option>
              </select>
              <label className="flex items-center gap-2 text-sm text-gray-600">
                <input
                  type="checkbox"
                  checked={newProduct.isAffiliate}
                  onChange={(e) =>
                    setNewProduct((p) => ({ ...p, isAffiliate: e.target.checked }))
                  }
                />
                アフィリエイト（PR表記必須）
              </label>
            </div>
            <button
              onClick={handleAddProduct}
              className="text-sm border border-gray-300 px-3 py-1.5 rounded-lg hover:bg-gray-50"
            >
              + 商品を追加
            </button>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
            <p className="font-semibold text-gray-800">追加NG表現（Compliance Agent用）</p>
            <div className="space-y-2">
              {customNg.map((ng) => (
                <div
                  key={ng.phrase}
                  className="flex items-center justify-between border border-gray-100 rounded-lg px-3 py-2 text-sm"
                >
                  <span>
                    「{ng.phrase}」({ng.law}) → {ng.suggestion}
                  </span>
                  <button
                    onClick={() => deleteCustomNg(ng.phrase)}
                    className="text-red-500 hover:text-red-700"
                  >
                    削除
                  </button>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
                placeholder="NG表現"
                value={newNg.phrase}
                onChange={(e) => setNewNg((n) => ({ ...n, phrase: e.target.value }))}
                className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm"
              />
              <select
                value={newNg.law}
                onChange={(e) => setNewNg((n) => ({ ...n, law: e.target.value as ComplianceLaw }))}
                className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm"
              >
                {LAWS.map((law) => (
                  <option key={law} value={law}>
                    {law}
                  </option>
                ))}
              </select>
              <input
                placeholder="修正候補"
                value={newNg.suggestion}
                onChange={(e) => setNewNg((n) => ({ ...n, suggestion: e.target.value }))}
                className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm col-span-2"
              />
            </div>
            <button
              onClick={handleAddNg}
              className="text-sm border border-gray-300 px-3 py-1.5 rounded-lg hover:bg-gray-50"
            >
              + NG表現を追加
            </button>
          </div>
        </div>
      </main>
    </>
  );
}
