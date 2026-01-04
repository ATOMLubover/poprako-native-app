use std::collections::HashMap;
use std::sync::LazyLock;

use anyhow::{anyhow, bail};
use reqwest::header::{HeaderMap, HeaderName, HeaderValue};
use reqwest::Method;
use tauri::Url;

static HTTP_CLIENT: LazyLock<reqwest::Client> = LazyLock::new(|| {
    reqwest::Client::builder()
        .user_agent("poprako-fe-tauri/1.0")
        .build()
        .expect("Failed to build reqwest Client")
});

/// Simple GET wrapper using a shared `reqwest::Client`.
pub async fn get(url: Url, headers: Option<HashMap<String, String>>) -> anyhow::Result<String> {
    do_request(Method::GET, url, headers, None).await
}

/// POST helper, supports optional binary body
pub async fn post(
    url: Url,
    headers: Option<HashMap<String, String>>,
    body: Option<Vec<u8>>,
) -> anyhow::Result<String> {
    do_request(Method::POST, url, headers, body).await
}

/// PUT helper, supports optional binary body
pub async fn put(
    url: Url,
    headers: Option<HashMap<String, String>>,
    body: Option<Vec<u8>>,
) -> anyhow::Result<String> {
    do_request(Method::PUT, url, headers, body).await
}

/// PATCH helper, supports optional binary body
pub async fn patch(
    url: Url,
    headers: Option<HashMap<String, String>>,
    body: Option<Vec<u8>>,
) -> anyhow::Result<String> {
    do_request(Method::PATCH, url, headers, body).await
}

/// DELETE helper, supports optional binary body
pub async fn delete(
    url: Url,
    headers: Option<HashMap<String, String>>,
    body: Option<Vec<u8>>,
) -> anyhow::Result<String> {
    do_request(Method::DELETE, url, headers, body).await
}

/// Internal generic request function, supports optional body
async fn do_request(
    method: Method,
    url: Url,
    headers: Option<HashMap<String, String>>,
    body: Option<Vec<u8>>,
) -> anyhow::Result<String> {
    let client = &*HTTP_CLIENT;

    let mut req = client.request(method, url);

    if let Some(hmap) = headers {
        let mut header_map = HeaderMap::new();

        for (k, v) in hmap {
            let name = HeaderName::from_bytes(k.as_bytes())
                .map_err(|e| anyhow!("无效的请求头 {}: {}", k, e))?;

            let value =
                HeaderValue::from_str(&v).map_err(|e| anyhow!("无效的请求头值 {}: {}", k, e))?;

            header_map.insert(name, value);
        }

        req = req.headers(header_map);
    }

    if let Some(b) = body {
        req = req.body(b);
    }

    let resp = req
        .send()
        .await
        .map_err(|e| anyhow!("请求发生错误: {}", e))?;

    let status = resp.status();

    let text = resp
        .text()
        .await
        .map_err(|e| anyhow!("无法读取请求体为 text: {}", e))?;

    if !status.is_success() {
        bail!("HTTP 状态码错误 {}: {}", status.as_u16(), text);
    }

    Ok(text)
}
