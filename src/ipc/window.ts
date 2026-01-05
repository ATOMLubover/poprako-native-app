// 窗口管理 IPC 函数封装

import { invoke } from "@tauri-apps/api/core";

/**
 * 最小化当前窗口
 */
export async function minimizeWindow(): Promise<void> {
  await invoke("minimize_window");
}

/**
 * 切换最大化/还原当前窗口
 */
export async function maximizeWindow(): Promise<void> {
  await invoke("maximize_window");
}

/**
 * 关闭当前窗口
 */
export async function closeWindow(): Promise<void> {
  await invoke("close_window");
}
