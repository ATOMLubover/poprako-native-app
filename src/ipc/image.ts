import { invoke } from "@tauri-apps/api/core";

// 获取本地图片并返回 data URL 的 Base64 字符串
export function proxyLocalImage(path: string): Promise<string> {
  return invoke<string>("proxy_local_image", { path });
}

// 获取远程图片并返回 data URL 的 Base64 字符串
export function proxyRemoteImage(
  url: string,
  headers: Record<string, string>
): Promise<string> {
  return invoke<string>("proxy_remote_image", { url, headers });
}
