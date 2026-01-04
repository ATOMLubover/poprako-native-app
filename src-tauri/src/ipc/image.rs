use std::collections::HashMap;

use tauri::Url;

use crate::{ipc::get_ipc_request_id, result_trace::ResultTrace as _, service};

/// Proxies a local image file and returns a Base64 data string if successful.
#[tauri::command]
#[tracing::instrument]
pub async fn proxy_local_image(path: &str) -> Result<String, String> {
    let ipc_id = get_ipc_request_id();

    tracing::info!(ipc_id = ipc_id, "ipc.image.proxy_local_image.start");

    let data_url = service::image::proxy_local_image(std::path::PathBuf::from(path))
        .await
        .trace_error("代理本地图片失败")
        .map_err(|e| e.to_string())?;

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

    let url = Url::parse(url).map_err(|e| format!("无效的 URL: {}", e))?;

    let data_url = service::image::proxy_remote_image(url, headers)
        .await
        .trace_error("代理远程图片失败")
        .map_err(|e| e.to_string())?;

    tracing::info!(ipc_id = ipc_id, "ipc.image.proxy_remote_image.success");

    Ok(data_url)
}
