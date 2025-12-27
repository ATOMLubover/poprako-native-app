use std::collections::HashMap;

use crate::{ipc::get_ipc_request_id, result_trace::ResultTrace as _};

#[tauri::command]
#[tracing::instrument]
pub async fn proxy_get(url: &str, headers: HashMap<String, String>) -> Result<String, String> {
    let ipc_id = get_ipc_request_id();

    tracing::info!(ipc_id = ipc_id, "ipc.http.proxy_get.start");

    let data_url = crate::http::get(url, Some(headers))
        .await
        .map_err(|e| format!("代理 GET 请求失败: {}", e))
        .trace_error("代理 GET 请求失败")?;

    tracing::info!(ipc_id = ipc_id, "ipc.http.proxy_get.success");

    Ok(data_url)
}

#[tauri::command]
#[tracing::instrument]
pub async fn proxy_post(
    url: &str,
    headers: HashMap<String, String>,
    body: Vec<u8>,
) -> Result<String, String> {
    let ipc_id = get_ipc_request_id();

    tracing::info!(ipc_id = ipc_id, "ipc.http.proxy_post.start");

    let response = crate::http::post(url, Some(headers), Some(body))
        .await
        .map_err(|e| format!("代理 POST 请求失败: {}", e))
        .trace_error("代理 POST 请求失败")?;

    tracing::info!(ipc_id = ipc_id, "ipc.http.proxy_post.success");

    Ok(response)
}

#[tauri::command]
#[tracing::instrument]
pub async fn proxy_put(
    url: &str,
    headers: HashMap<String, String>,
    body: Vec<u8>,
) -> Result<String, String> {
    let ipc_id = get_ipc_request_id();

    tracing::info!(ipc_id = ipc_id, "ipc.http.proxy_put.start");

    let response = crate::http::put(url, Some(headers), Some(body))
        .await
        .map_err(|e| format!("代理 PUT 请求失败: {}", e))
        .trace_error("代理 PUT 请求失败")?;

    tracing::info!(ipc_id = ipc_id, "ipc.http.proxy_put.success");

    Ok(response)
}

#[tauri::command]
#[tracing::instrument]
pub async fn proxy_patch(
    url: &str,
    headers: HashMap<String, String>,
    body: Vec<u8>,
) -> Result<String, String> {
    let ipc_id = get_ipc_request_id();

    tracing::info!(ipc_id = ipc_id, "ipc.http.proxy_patch.start");

    let response = crate::http::patch(url, Some(headers), Some(body))
        .await
        .map_err(|e| format!("代理 PATCH 请求失败: {}", e))
        .trace_error("代理 PATCH 请求失败")?;

    tracing::info!(ipc_id = ipc_id, "ipc.http.proxy_patch.success");

    Ok(response)
}

#[tauri::command]
#[tracing::instrument]
pub async fn proxy_delete(
    url: &str,
    headers: HashMap<String, String>,
    body: Option<Vec<u8>>,
) -> Result<String, String> {
    let ipc_id = get_ipc_request_id();

    tracing::info!(ipc_id = ipc_id, "ipc.http.proxy_delete.start");

    let response = crate::http::delete(url, Some(headers), body)
        .await
        .map_err(|e| format!("代理 DELETE 请求失败: {}", e))
        .trace_error("代理 DELETE 请求失败")?;

    tracing::info!(ipc_id = ipc_id, "ipc.http.proxy_delete.success");

    Ok(response)
}
