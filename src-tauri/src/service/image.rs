use std::{collections::HashMap, path::PathBuf};

use anyhow::anyhow;
use tauri::Url;

use crate::{http, local_image};

/// Proxies a local image file and returns a Base64 data string if successful.
pub async fn proxy_local_image(path: PathBuf) -> anyhow::Result<String> {
    let data_url = local_image::proxy_local_image(path)
        .await
        .map_err(|e| anyhow!("代理本地图片时失败: {}", e))?;

    Ok(data_url)
}

/// Proxies a remote image URL and returns a Base64 data string if successful.
pub async fn proxy_remote_image(
    url: Url,
    headers: HashMap<String, String>,
) -> anyhow::Result<String> {
    let data_url = http::get(url, Some(headers))
        .await
        .map_err(|e| anyhow!("代理本地图片时失败: {}", e))?;

    Ok(data_url)
}
