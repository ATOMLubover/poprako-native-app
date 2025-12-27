import { invoke } from "@tauri-apps/api/core";

// 获取用户自定义特殊符号列表
export function getSpecialSymbols(): Promise<string[]> {
  return invoke<string[]>("get_special_symbols");
}

// 保存用户自定义特殊符号列表
export function saveSpecailSymbols(symbols: string[]): Promise<void> {
  return invoke<void>("save_specail_symbols", { symbols });
}
