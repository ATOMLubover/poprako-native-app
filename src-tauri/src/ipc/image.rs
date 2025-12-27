use std::collections::HashMap;

use crate::{http, ipc::get_ipc_request_id, local_image, result_trace::ResultTrace as _};

/// Proxies a local image file and returns a Base64 data string if successful.
#[tauri::command]
#[tracing::instrument]
pub async fn proxy_local_image(path: &str) -> Result<String, String> {
    let ipc_id = get_ipc_request_id();

    tracing::info!(ipc_id = ipc_id, "ipc.image.proxy_local_image.start");

    let data_url = local_image::proxy_local_image(path)
        .await
        .map_err(|e| format!("代理本地图片失败: {}", e))
        .trace_error("代理本地图片失败")?;

    tracing::info!(ipc_id = ipc_id, "ipc.image.proxy_local_image.success");

    Ok(data_url)
}

/// Proxies a remote image URL and returns a Base64 data string if successful.
#[tauri::command]
#[tracing::instrument]
pub async fn proxy_remote_image(
    url: &str,
    headers: HashMap<String, String>,
) -> Result<String, String> {
    let ipc_id = get_ipc_request_id();

    tracing::info!(ipc_id = ipc_id, "ipc.image.proxy_remote_image.start");

    let data_url = http::get(url, Some(headers))
        .await
        .map_err(|e| format!("代理远程图片失败: {}", e))
        .trace_error("代理远程图片失败")?;

    tracing::info!(ipc_id = ipc_id, "ipc.image.proxy_remote_image.success");

    Ok(data_url)
}
