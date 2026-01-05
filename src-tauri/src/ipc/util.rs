// Utility IPC commands for window management and other system operations
// English comments for Rust backend code

use tauri::{AppHandle, Manager};

/// Minimize the current window
#[tauri::command]
#[tracing::instrument]
pub async fn minimize_window(app: AppHandle) -> Result<(), String> {
    let window = app
        .get_webview_window("main")
        .ok_or_else(|| "Failed to get main window".to_string())?;

    window
        .minimize()
        .map_err(|e| format!("Failed to minimize window: {}", e))?;

    Ok(())
}

/// Toggle maximize/restore the current window
#[tauri::command]
#[tracing::instrument]
pub async fn maximize_window(app: AppHandle) -> Result<(), String> {
    let window = app
        .get_webview_window("main")
        .ok_or_else(|| "Failed to get main window".to_string())?;

    let is_maximized = window
        .is_maximized()
        .map_err(|e| format!("Failed to check maximize state: {}", e))?;

    if is_maximized {
        window
            .unmaximize()
            .map_err(|e| format!("Failed to restore window: {}", e))?;
    } else {
        window
            .maximize()
            .map_err(|e| format!("Failed to maximize window: {}", e))?;
    }

    Ok(())
}

/// Close the current window
#[tauri::command]
#[tracing::instrument]
pub async fn close_window(app: AppHandle) -> Result<(), String> {
    let window = app
        .get_webview_window("main")
        .ok_or_else(|| "Failed to get main window".to_string())?;

    window
        .close()
        .map_err(|e| format!("Failed to close window: {}", e))?;

    Ok(())
}
