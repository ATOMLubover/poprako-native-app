use std::path::PathBuf;

use crate::{ipc::get_ipc_request_id, result_trace::ResultTrace as _, service};

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

    let dst_path =
        service::compress::compress_image(src_path, dst_path, max_bytes, min_scale, min_quality)
            .await
            .trace_error("压缩图片失败")
            .map_err(|e| e.to_string())?;

    tracing::info!(ipc_id = ipc_id, "ipc.compress.compress_image.success");

    Ok(dst_path)
}

/// Opens the directory where compressed images are stored.
#[tauri::command]
#[tracing::instrument]
pub async fn open_compress_dir() -> Result<(), String> {
    let ipc_id = get_ipc_request_id();

    tracing::info!(ipc_id = ipc_id, "ipc.compress.open_compress_dir.start");

    service::compress::open_compress_dir()
        .trace_error("打开文件浏览器失败")
        .map_err(|e| e.to_string())?;

    tracing::info!(ipc_id = ipc_id, "ipc.compress.open_compress_dir.success");

    Ok(())
}

/// Use explorer to open a file dialog for selecting image files.
#[tauri::command]
#[tracing::instrument]
pub async fn select_image_files() -> Result<Vec<String>, String> {
    let ipc_id = get_ipc_request_id();

    tracing::info!(ipc_id = ipc_id, "ipc.compress.select_image_files.start");

    let images = service::compress::select_images()
        .trace_error("选择图片文件失败")
        .map_err(|e| e.to_string())?;

    tracing::info!(
        ipc_id = ipc_id,
        selected_count = images.len(),
        "ipc.compress.select_image_files.success"
    );

    Ok(images
        .into_iter()
        .map(|p| p.to_string_lossy().to_string())
        .collect())
}
