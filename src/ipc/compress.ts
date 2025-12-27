import { invoke } from "@tauri-apps/api/core";

// 将位于 `srcPath` 的图片进行压缩，并将压缩结果保存到 `dstPath`。
// `dstPath` 会自动添加 data 后缀。
//
// 建议使用相对的 `dstPath`，该路径将相对于应用的 compressed/ 目录进行解析。
export function compressImage(
  srcPath: string,
  dstPath: string,
  maxBytes: number,
  minScale: number = 0.4,
  minQuality: number = 35
): Promise<void> {
  let payload = {
    srcPath: srcPath,
    dstPath: dstPath,
    maxBytes: maxBytes,
    minScale: minScale,
    minQuality: minQuality,
  };

  return invoke<void>("compress_image", payload);
}

// 使用文件对话框选择图片文件
export function selectImageFiles(): Promise<string[]> {
  return invoke<string[]>("select_image_files");
}

// 打开保存压缩图片的目录
export function openCompressDir(): Promise<void> {
  return invoke<void>("open_compress_dir");
}
