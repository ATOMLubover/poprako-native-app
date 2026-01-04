use std::path::PathBuf;

use anyhow::{anyhow, bail};
use base64::{engine::general_purpose, Engine as _};

/// Proxies a local image file and returns a Base64 data string if successful.
pub async fn proxy_local_image(path: PathBuf) -> anyhow::Result<String> {
    if !path.exists() {
        bail!("本地图片文件不存在: {}", path.display());
    }

    let ext = path
        .extension()
        .and_then(|s| s.to_str())
        .map(|s| s.to_lowercase());

    let mime = match ext.as_deref() {
        Some("png") => "image/png",
        Some("jpg") | Some("jpeg") => "image/jpeg",
        Some("gif") => "image/gif",
        Some("webp") => "image/webp",
        Some("svg") => "image/svg+xml",
        Some("bmp") => "image/bmp",
        Some("ico") => "image/x-icon",
        Some("avif") => "image/avif",
        _ => "application/octet-stream",
    };

    let bytes =
        std::fs::read(&path).map_err(|e| anyhow!("读取文件 {} 时失败: {}", path.display(), e))?;

    let encoded = general_purpose::STANDARD.encode(&bytes);

    let data_url = format!("data:{};base64,{}", mime, encoded);

    Ok(data_url)
}
