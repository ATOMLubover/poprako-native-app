import { invoke } from "@tauri-apps/api/core";

// Compress an image located at `srcPath` and saves the compressed image to `dstPath`.
// dstPath will be automically added with a data suffix.
//
// A relative dstPath is preferred. It will be resolved relative to the app's compressed/ directory.
export function compressImage(
  srcPath: string,
  dstPath: string,
  maxBytes: number,
  minScale: number = 0.4,
  minQuality: number = 35
): Promise<void> {
  // Convert camelCase to snake_case for Tauri IPC.
  let payload = {
    srcPath: srcPath,
    dstPath: dstPath,
    maxBytes: maxBytes,
    minScale: minScale,
    minQuality: minQuality,
  };

  return invoke<void>("compress_image", payload);
}

// Select image files using a file dialog.
export function selectImageFiles(): Promise<string[]> {
  return invoke<string[]>("select_image_files");
}

// Open the directory containing compressed images.
export function openCompressDir(): Promise<void> {
  return invoke<void>("open_compress_dir");
}
