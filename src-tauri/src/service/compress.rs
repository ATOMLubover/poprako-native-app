use std::path::PathBuf;

use anyhow::anyhow;

use crate::{
    util::file::{open_dir, select_file},
    APP_COMPRESS_DIR,
};

/// Opens a file selection dialog and returns the selected image file paths.
pub fn select_images() -> anyhow::Result<Vec<PathBuf>> {
    select_file(&["png", "jpg", "jpeg"], true)
}

/// Open compress directory.
pub fn open_compress_dir() -> anyhow::Result<()> {
    let dir = APP_COMPRESS_DIR
        .read()
        .map_err(|e| anyhow!("无法锁定 APP_COMPRESS_DIR: {}", e))?
        .clone()
        .ok_or_else(|| anyhow!("压缩目录未初始化"))?;

    open_dir(dir).map_err(|e| anyhow!("无法打开压缩目录: {}", e))?;

    Ok(())
}

/// Compress an image located at `src_path` and save the result to `dst_path`.
pub async fn compress_image(
    src_path: PathBuf,
    dst_path: PathBuf,
    max_bytes: usize,
    min_scale: f32,
    min_quality: u8,
) -> anyhow::Result<String> {
    let dst_path = match dst_path.is_absolute() {
        true => dst_path,
        false => {
            let compress_dir = APP_COMPRESS_DIR
                .read()
                .map_err(|e| anyhow!("无法锁定 APP_COMPRESS_DIR: {}", e))?
                .clone()
                .ok_or_else(|| anyhow!("压缩目录未初始化"))?;

            compress_dir.join(dst_path)
        }
    };

    let dst_path_clone = dst_path.clone();

    tauri::async_runtime::spawn_blocking(move || {
        crate::compress::compress_image(
            src_path,
            dst_path_clone,
            max_bytes,
            min_scale,
            min_quality,
        )
        .map_err(|e| anyhow!("压缩图片失败: {}", e))
    })
    .await
    .map_err(|e| anyhow!("等待压缩任务完成时失败: {}", e))??;

    Ok(dst_path
        .to_str()
        .ok_or_else(|| anyhow!("无法转换目标路径为字符串"))?
        .to_string())
}
