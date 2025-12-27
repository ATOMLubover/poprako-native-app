use base64::{engine::general_purpose, Engine as _};

/// Proxies a local image file and returns a Base64 data string if successful.
pub async fn proxy_local_image(path: &str) -> Result<String, String> {
    use std::fs;
    use std::path::Path;

    let p = Path::new(path);

    if !p.exists() {
        return Err(format!("File not found: {}", p.display()));
    }

    let ext = p
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

    let bytes = fs::read(p).map_err(|e| format!("Failed to read file {}: {}", p.display(), e))?;

    let encoded = general_purpose::STANDARD.encode(&bytes);

    let data_url = format!("data:{};base64,{}", mime, encoded);

    Ok(data_url)
}
