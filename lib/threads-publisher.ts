import { ThreadsPost } from "./threads-types";

export type PublishResult = {
  success: boolean;
  externalId?: string;
  error?: string;
};

export interface Publisher {
  publish(post: ThreadsPost): Promise<PublishResult>;
}

/**
 * Threads公式API/Metricool等の実仕様・認証情報が無いため、既定では手動投稿フローとする。
 * 本物のAPI連携を追加する場合は、この Publisher インターフェースを実装するクラスを
 * 新設し getPublisher() の返り値を差し替えること。未検証のエンドポイントを推測して
 * 実装しない。
 */
export class ManualPublisher implements Publisher {
  async publish(): Promise<PublishResult> {
    return { success: true };
  }
}

export function getPublisher(): Publisher {
  return new ManualPublisher();
}

export async function copyPostToClipboard(post: ThreadsPost): Promise<void> {
  if (typeof navigator !== "undefined" && navigator.clipboard) {
    await navigator.clipboard.writeText(post.body);
  }
}
