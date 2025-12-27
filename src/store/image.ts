import { proxyLocalImage, proxyRemoteImage } from "../ipc/image";

const MAX_CACHE_SIZE = 10;

type ImageCacheEntry = {
  key: string;
  objectUrl: string;
  blob: Blob;
};

type HeadersMap = Record<string, string>;

type ImageResult = {
  objectUrl: string;
  blob: Blob;
};

// LRU 近似实现：命中后删除再插入，使最新访问在 Map 尾部
class ImageCache {
  private cache = new Map<string, ImageCacheEntry>();

  get(key: string): ImageResult | null {
    const hit = this.cache.get(key);
    if (!hit) return null;

    this.cache.delete(key);
    this.cache.set(key, hit);

    return { objectUrl: hit.objectUrl, blob: hit.blob };
  }

  set(key: string, blob: Blob, objectUrl: string): ImageResult {
    if (this.cache.has(key)) {
      const existing = this.cache.get(key)!;
      URL.revokeObjectURL(existing.objectUrl);
      this.cache.delete(key);
    }

    this.cache.set(key, { key, blob, objectUrl });

    if (this.cache.size > MAX_CACHE_SIZE) {
      const oldestKey = this.cache.keys().next().value as string | undefined;
      if (oldestKey) {
        const oldest = this.cache.get(oldestKey);
        if (oldest) {
          URL.revokeObjectURL(oldest.objectUrl);
        }
        this.cache.delete(oldestKey);
      }
    }

    return { objectUrl, blob };
  }

  clear(): void {
    for (const entry of this.cache.values()) {
      URL.revokeObjectURL(entry.objectUrl);
    }
    this.cache.clear();
  }
}

const cache = new ImageCache();

function dataUrlToBlob(dataUrl: string): Blob {
  const match = /^data:([^;]+);base64,(.*)$/.exec(dataUrl);
  if (!match) {
    throw new Error("无法解析图片数据");
  }

  const mime = match[1];
  const base64 = match[2];
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }

  return new Blob([bytes], { type: mime });
}

function makeKeyForLocal(path: string): string {
  return `local:${path}`;
}

function makeKeyForRemote(url: string, headers: HeadersMap): string {
  const headerPart = JSON.stringify(headers || {});
  return `remote:${url}|${headerPart}`;
}

async function fetchAndCache(
  key: string,
  loader: () => Promise<string>
): Promise<ImageResult> {
  const cached = cache.get(key);
  if (cached) return cached;

  const dataUrl = await loader();
  const blob = dataUrlToBlob(dataUrl);
  const objectUrl = URL.createObjectURL(blob);

  return cache.set(key, blob, objectUrl);
}

export async function getLocalImage(path: string): Promise<ImageResult> {
  return fetchAndCache(makeKeyForLocal(path), () => proxyLocalImage(path));
}

export async function getRemoteImage(
  url: string,
  headers: HeadersMap
): Promise<ImageResult> {
  return fetchAndCache(makeKeyForRemote(url, headers), () =>
    proxyRemoteImage(url, headers)
  );
}

export function clearImageCache(): void {
  cache.clear();
}
