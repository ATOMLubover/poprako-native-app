use std::collections::HashMap;

use anyhow::Result;
use tauri::Url;

use crate::http as internal_http;

/// Wrapper around lower-level `crate::http` helpers so IPC calls the service layer.
pub async fn get(url: Url, headers: Option<HashMap<String, String>>) -> Result<String> {
    internal_http::get(url, headers).await
}

pub async fn post(
    url: Url,
    headers: Option<HashMap<String, String>>,
    body: Option<Vec<u8>>,
) -> Result<String> {
    internal_http::post(url, headers, body).await
}

pub async fn put(
    url: Url,
    headers: Option<HashMap<String, String>>,
    body: Option<Vec<u8>>,
) -> Result<String> {
    internal_http::put(url, headers, body).await
}

pub async fn patch(
    url: Url,
    headers: Option<HashMap<String, String>>,
    body: Option<Vec<u8>>,
) -> Result<String> {
    internal_http::patch(url, headers, body).await
}

pub async fn delete(
    url: Url,
    headers: Option<HashMap<String, String>>,
    body: Option<Vec<u8>>,
) -> Result<String> {
    internal_http::delete(url, headers, body).await
}
