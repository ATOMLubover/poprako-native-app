use std::{path::PathBuf, process::Command, sync::LazyLock};

use crate::{compress, result_trace::ResultTrace, APP_CACHE_DIR};

static COMPRESS_DIR: LazyLock<PathBuf> = LazyLock::new(|| {
    // APP_CACHE_DIR is expected to be initialized before use.
    APP_CACHE_DIR
        .read()
        .expect("无法锁定 APP_CACHE_DIR")
        .as_ref()
        .expect("APP_CACHE_DIR 未初始化")
        .join("compressed")
});

#[tauri::command]
#[tracing::instrument]
pub async fn compress_image(
    src_path: &str,
    dst_path: &str,
    max_bytes: usize,
    min_scale: f32,
    min_quality: u8,
) -> Result<String, String> {
    let ipc_id = rand::random::<u32>() % 10000;

    tracing::info!(ipc_id = ipc_id, "ipc.compress.compress_image.start");

    let src_path = PathBuf::from(src_path);

    let dst_path = PathBuf::from(dst_path);

    let dst_path = if dst_path.is_absolute() {
        dst_path
    } else {
        let compress_dir = COMPRESS_DIR.clone();

        // Ensure compressed directory exists
        std::fs::create_dir_all(&compress_dir)
            .map_err(|e| format!("无法创建压缩目录 {:?}: {}", compress_dir, e))
            .trace_error("创建压缩目录失败")
            .map_err(|_| "无法创建压缩目录".to_string())?;

        compress_dir.join(dst_path)
    };

    let dst_path_clone = dst_path.clone();

    tauri::async_runtime::spawn_blocking(move || {
        compress::compress_image(src_path, dst_path_clone, max_bytes, min_scale, min_quality)
            .trace_error("压缩图片失败")
            .map_err(|e| e.to_string())
    })
    .await
    .trace_error("等待压缩任务完成时失败")
    .map_err(|_| format!("构建压缩任务时失败"))??;

    tracing::info!(ipc_id = ipc_id, "ipc.compress.compress_image.success");

    Ok(dst_path
        .to_str()
        .ok_or_else(|| "无法转换目标路径为字符串".to_string())?
        .to_string())
}

/// Opens the directory where compressed images are stored.
#[tauri::command]
#[tracing::instrument]
pub async fn open_compress_dir() -> Result<(), String> {
    let ipc_id = rand::random::<u32>() % 10000;

    tracing::info!(ipc_id = ipc_id, "ipc.compress.open_compress_dir.start");

    // The directory we expose to the user is COMPRESS_DIR/compressed
    let dir = COMPRESS_DIR.clone();

    // Ensure directory exists
    std::fs::create_dir_all(&dir)
        .map_err(|e| format!("无法创建压缩目录 {:?}: {}", dir, e))
        .trace_error("创建压缩目录失败")?;

    let dir_str = dir
        .to_str()
        .ok_or_else(|| "无法转换压缩目录为字符串".to_string())?;

    Command::new("explorer")
        .arg(dir_str)
        .spawn()
        .map_err(|e| format!("无法打开目录 {}: {}", dir_str, e))
        .trace_error("打开压缩目录失败")?;

    tracing::info!(ipc_id = ipc_id, "ipc.compress.open_compress_dir.success");

    Ok(())
}

/// 使用 Windows 原生文件选择对话框让用户多选图片文件
#[tauri::command]
#[tracing::instrument]
pub async fn select_image_files() -> Result<Vec<String>, String> {
    let ipc_id = rand::random::<u32>() % 10000;

    tracing::info!(ipc_id = ipc_id, "ipc.compress.select_image_files.start");

    // PowerShell 脚本：调用 .NET 的 OpenFileDialog
    let script = r#"
        Add-Type -AssemblyName System.Windows.Forms
        $dialog = New-Object System.Windows.Forms.OpenFileDialog
        $dialog.Filter = "图片文件|*.png;*.jpg;*.jpeg"
        $dialog.Multiselect = $true
        $dialog.Title = "选择图片文件"
        $result = $dialog.ShowDialog()
        if ($result -eq 'OK') {
            $dialog.FileNames
        }
    "#;

    let output = Command::new("powershell")
        .args(&["-NoProfile", "-Command", script])
        .output()
        .map_err(|e| format!("无法启动 PowerShell: {}", e))
        .trace_error("启动文件选择对话框失败")?;

    if !output.status.success() {
        tracing::info!(
            ipc_id = ipc_id,
            "ipc.compress.select_image_files.cancelled_or_failed"
        );
        return Ok(vec![]);
    }

    let paths_str = String::from_utf8_lossy(&output.stdout);
    let paths: Vec<String> = paths_str
        .lines()
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
        .collect();

    tracing::info!(
        ipc_id = ipc_id,
        selected_count = paths.len(),
        "ipc.compress.select_image_files.success"
    );

    Ok(paths)
}
