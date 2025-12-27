import { invoke } from "@tauri-apps/api/core";

// 代理 GET 请求
export function proxyGet(url: string, headers: Record<string, string>): Promise<string> {
  return invoke<string>("proxy_get", { url, headers });
}

// 代理 POST 请求
export function proxyPost(
  url: string,
  headers: Record<string, string>,
  body: Uint8Array
): Promise<string> {
  return invoke<string>("proxy_post", { url, headers, body });
}

// 代理 PUT 请求
export function proxyPut(
  url: string,
  headers: Record<string, string>,
  body: Uint8Array
): Promise<string> {
  return invoke<string>("proxy_put", { url, headers, body });
}

// 代理 PATCH 请求
export function proxyPatch(
  url: string,
  headers: Record<string, string>,
  body: Uint8Array
): Promise<string> {
  return invoke<string>("proxy_patch", { url, headers, body });
}

// 代理 DELETE 请求
export function proxyDelete(
  url: string,
  headers: Record<string, string>,
  body?: Uint8Array
): Promise<string> {
  return invoke<string>("proxy_delete", { url, headers, body });
}