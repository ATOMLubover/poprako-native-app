use std::collections::HashMap;
use std::sync::LazyLock;

use reqwest::header::{HeaderMap, HeaderName, HeaderValue};
use reqwest::Method;

static HTTP_CLIENT: LazyLock<reqwest::Client> = LazyLock::new(|| {
    reqwest::Client::builder()
        .user_agent("poprako-fe-tauri/1.0")
        .build()
        .expect("Failed to build reqwest Client")
});

/// Simple GET wrapper using a shared `reqwest::Client`.
pub async fn get(url: &str, headers: Option<HashMap<String, String>>) -> Result<String, String> {
    let client = &*HTTP_CLIENT;

    let mut req = client.get(url);

    if let Some(hmap) = headers {
        let mut header_map = HeaderMap::new();

        for (k, v) in hmap {
            let name = HeaderName::from_bytes(k.as_bytes())
                .map_err(|e| format!("Invalid header name {}: {}", k, e))?;

            let value = HeaderValue::from_str(&v)
                .map_err(|e| format!("Invalid header value for {}: {}", k, e))?;

            header_map.insert(name, value);
        }

        req = req.headers(header_map);
    }

    let resp = req
        .send()
        .await
        .map_err(|e| format!("Request error: {}", e))?;

    let status = resp.status();

    // We do not deserialize JSON here, just return the text.
    let text = resp
        .text()
        .await
        .map_err(|e| format!("Failed to read response text: {}", e))?;

    if !status.is_success() {
        return Err(format!("HTTP error {}: {}", status.as_u16(), text));
    }

    Ok(text)
}

/// Internal generic request function, supports optional body
async fn do_request(
    method: Method,
    url: &str,
    headers: Option<HashMap<String, String>>,
    body: Option<Vec<u8>>,
) -> Result<String, String> {
    let client = &*HTTP_CLIENT;

    let mut req = client.request(method, url);

    if let Some(hmap) = headers {
        let mut header_map = HeaderMap::new();

        for (k, v) in hmap {
            let name = HeaderName::from_bytes(k.as_bytes())
                .map_err(|e| format!("Invalid header name {}: {}", k, e))?;

            let value = HeaderValue::from_str(&v)
                .map_err(|e| format!("Invalid header value for {}: {}", k, e))?;

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
        .map_err(|e| format!("Request error: {}", e))?;

    let status = resp.status();

    let text = resp
        .text()
        .await
        .map_err(|e| format!("Failed to read response text: {}", e))?;

    if !status.is_success() {
        return Err(format!("HTTP error {}: {}", status.as_u16(), text));
    }

    Ok(text)
}

/// POST helper, supports optional binary body
pub async fn post(
    url: &str,
    headers: Option<HashMap<String, String>>,
    body: Option<Vec<u8>>,
) -> Result<String, String> {
    do_request(Method::POST, url, headers, body).await
}

/// PUT helper, supports optional binary body
pub async fn put(
    url: &str,
    headers: Option<HashMap<String, String>>,
    body: Option<Vec<u8>>,
) -> Result<String, String> {
    do_request(Method::PUT, url, headers, body).await
}

/// PATCH helper, supports optional binary body
pub async fn patch(
    url: &str,
    headers: Option<HashMap<String, String>>,
    body: Option<Vec<u8>>,
) -> Result<String, String> {
    do_request(Method::PATCH, url, headers, body).await
}

/// DELETE helper, supports optional binary body
pub async fn delete(
    url: &str,
    headers: Option<HashMap<String, String>>,
    body: Option<Vec<u8>>,
) -> Result<String, String> {
    do_request(Method::DELETE, url, headers, body).await
}
