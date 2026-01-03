use std::{path::PathBuf, process::Command, sync::LazyLock};

use crate::selector::{select_paths, Filter};
use crate::{compress, ipc::get_ipc_request_id, result_trace::ResultTrace, APP_CACHE_DIR};

static COMPRESS_DIR: LazyLock<PathBuf> = LazyLock::new(|| {
    // APP_CACHE_DIR is expected to be initialized before use.
    APP_CACHE_DIR
        .read()
        .expect("无法锁定 APP_CACHE_DIR")
        .as_ref()
        .expect("APP_CACHE_DIR 未初始化")
        .join("compressed")
});

#[tauri::command]
#[tracing::instrument]
pub async fn compress_image(
    src_path: &str,
    dst_path: &str,
    max_bytes: usize,
    min_scale: f32,
    min_quality: u8,
) -> Result<String, String> {
    let ipc_id = get_ipc_request_id();

    tracing::info!(ipc_id = ipc_id, "ipc.compress.compress_image.start");

    let src_path = PathBuf::from(src_path);

    let dst_path = PathBuf::from(dst_path);

    let dst_path = if dst_path.is_absolute() {
        dst_path
    } else {
        let compress_dir = COMPRESS_DIR.clone();

        // Ensure compressed directory exists
        std::fs::create_dir_all(&compress_dir)
            .map_err(|e| format!("无法创建压缩目录 {:?}: {}", compress_dir, e))
            .trace_error("创建压缩目录失败")
            .map_err(|_| "无法创建压缩目录".to_string())?;

        compress_dir.join(dst_path)
    };

    let dst_path_clone = dst_path.clone();

    tauri::async_runtime::spawn_blocking(move || {
        compress::compress_image(src_path, dst_path_clone, max_bytes, min_scale, min_quality)
            .trace_error("压缩图片失败")
            .map_err(|e| e.to_string())
    })
    .await
    .trace_error("等待压缩任务完成时失败")
    .map_err(|_| format!("构建压缩任务时失败"))??;

    tracing::info!(ipc_id = ipc_id, "ipc.compress.compress_image.success");

    Ok(dst_path
        .to_str()
        .ok_or_else(|| "无法转换目标路径为字符串".to_string())?
        .to_string())
}

/// Opens the directory where compressed images are stored.
#[tauri::command]
#[tracing::instrument]
pub async fn open_compress_dir() -> Result<(), String> {
    let ipc_id = get_ipc_request_id();

    tracing::info!(ipc_id = ipc_id, "ipc.compress.open_compress_dir.start");

    // The directory we expose to the user is COMPRESS_DIR/compressed
    let dir = COMPRESS_DIR.clone();

    // Ensure directory exists
    std::fs::create_dir_all(&dir)
        .map_err(|e| format!("无法创建压缩目录 {:?}: {}", dir, e))
        .trace_error("创建压缩目录失败")?;

    let dir_str = dir
        .to_str()
        .ok_or_else(|| "无法转换压缩目录为字符串".to_string())?;

    Command::new("explorer")
        .arg(dir_str)
        .spawn()
        .map_err(|e| format!("无法打开目录 {}: {}", dir_str, e))
        .trace_error("打开压缩目录失败")?;

    tracing::info!(ipc_id = ipc_id, "ipc.compress.open_compress_dir.success");

    Ok(())
}

/// 通用的路径选择函数，支持自定义筛选条件
///
/// # 参数
/// - `filters`: 筛选条件列表
/// - `allow_multiple`: 是否允许多选
#[allow(dead_code)]

/// Use Windows-only PowerShell to open a file dialog for selecting image files.
#[tauri::command]
#[tracing::instrument]
pub async fn select_image_files() -> Result<Vec<String>, String> {
    let ipc_id = get_ipc_request_id();

    tracing::info!(ipc_id = ipc_id, "ipc.compress.select_image_files.start");

    let filters = vec![Filter::Extension(vec![
        "png".to_string(),
        "jpg".to_string(),
        "jpeg".to_string(),
    ])];

    let paths = select_paths(&filters, true)
        .trace_error("选择图片文件时失败")
        .map_err(|e| e.to_string())?;

    let path_strings: Vec<String> = paths
        .into_iter()
        .filter_map(|p| p.to_str().map(|s| s.to_string()))
        .collect();

    tracing::info!(
        ipc_id = ipc_id,
        selected_count = path_strings.len(),
        "ipc.compress.select_image_files.success"
    );

    Ok(path_strings)
}
