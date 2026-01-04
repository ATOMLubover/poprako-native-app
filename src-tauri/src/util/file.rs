use std::{path::PathBuf, process::Command};

use crate::result_trace::ResultTrace;

pub fn select_dir(allow_multiple: bool) -> anyhow::Result<Vec<PathBuf>> {
    // Windows implementation using FolderBrowserDialog via PowerShell
    if cfg!(target_os = "windows") {
        let script = if allow_multiple {
            // For multiple folders on Windows, use a small .NET form that supports folder selection multiple times
            r#"
                Add-Type -AssemblyName System.Windows.Forms
                [Console]::OutputEncoding = [System.Text.Encoding]::UTF8

                $dialog = New-Object System.Windows.Forms.FolderBrowserDialog
                $dialog.Description = '选择文件夹'
                $dialog.ShowNewFolderButton = $true
                $result = $dialog.ShowDialog()
                if ($result -eq 'OK') {
                    $dialog.SelectedPath
                }
            "#
        } else {
            r#"
                Add-Type -AssemblyName System.Windows.Forms
                [Console]::OutputEncoding = [System.Text.Encoding]::UTF8

                $dialog = New-Object System.Windows.Forms.FolderBrowserDialog
                $dialog.Description = '选择文件夹'
                $dialog.ShowNewFolderButton = $true
                $result = $dialog.ShowDialog()
                if ($result -eq 'OK') {
                    $dialog.SelectedPath
                }
            "#
        };

        let output = Command::new("powershell")
            .args(&["-NoProfile", "-Command", script])
            .output()
            .trace_error("启动文件夹选择对话框失败")?;

        if !output.status.success() {
            return Ok(vec![]);
        }

        let raw = String::from_utf8_lossy(&output.stdout).to_string();

        let paths: Vec<PathBuf> = raw
            .lines()
            .map(|s| s.trim())
            .filter(|s| !s.is_empty())
            .map(|s| {
                s.trim_matches(|c: char| c.is_whitespace() || c == '"' || c == '\u{0}')
                    .to_string()
            })
            .map(PathBuf::from)
            .collect();

        return Ok(paths);
    }

    // macOS implementation using AppleScript
    if cfg!(target_os = "macos") {
        let osa = if allow_multiple {
            "choose folder with prompt \"选择文件夹\" with multiple selections allowed"
        } else {
            "choose folder with prompt \"选择文件夹\""
        };

        let script = format!(r#"osascript -e '{}' -e 'POSIX path of result'"#, osa);

        let output = Command::new("sh")
            .args(&["-c", &script])
            .output()
            .trace_error("启动 macOS 文件夹选择对话框失败")?;

        if !output.status.success() {
            return Ok(vec![]);
        }

        let raw = String::from_utf8_lossy(&output.stdout).to_string();

        let paths: Vec<PathBuf> = raw
            .lines()
            .map(|s| s.trim())
            .filter(|s| !s.is_empty())
            .map(|s| {
                s.trim_matches(|c: char| c.is_whitespace() || c == '"' || c == '\u{0}')
                    .to_string()
            })
            .map(PathBuf::from)
            .collect();

        return Ok(paths);
    }

    // Linux: try zenity, then kdialog
    if cfg!(target_os = "linux") {
        // zenity
        let zenity_cmd = if allow_multiple {
            "zenity --file-selection --directory --multiple --title=选择文件夹 --separator='\n'"
        } else {
            "zenity --file-selection --directory --title=选择文件夹"
        };

        let output = Command::new("sh").args(&["-c", zenity_cmd]).output();

        if let Ok(output) = output {
            if output.status.success() {
                let raw = String::from_utf8_lossy(&output.stdout).to_string();

                let paths: Vec<PathBuf> = raw
                    .lines()
                    .map(|s| s.trim())
                    .filter(|s| !s.is_empty())
                    .map(|s| {
                        s.trim_matches(|c: char| c.is_whitespace() || c == '"' || c == '\u{0}')
                            .to_string()
                    })
                    .map(PathBuf::from)
                    .collect();

                return Ok(paths);
            }
        }

        // kdialog fallback
        let kdialog_cmd = if allow_multiple {
            "kdialog --getexistingdirectory --separate --title '选择文件夹'"
        } else {
            "kdialog --getexistingdirectory --title '选择文件夹'"
        };

        let output = Command::new("sh")
            .args(&["-c", kdialog_cmd])
            .output()
            .trace_error("启动 Linux 文件夹选择对话框失败")?;

        if !output.status.success() {
            return Ok(vec![]);
        }

        let raw = String::from_utf8_lossy(&output.stdout).to_string();

        let paths: Vec<PathBuf> = raw
            .lines()
            .map(|s| s.trim())
            .filter(|s| !s.is_empty())
            .map(|s| {
                s.trim_matches(|c: char| c.is_whitespace() || c == '"' || c == '\u{0}')
                    .to_string()
            })
            .map(PathBuf::from)
            .collect();

        return Ok(paths);
    }

    Ok(vec![])
}

pub fn select_file(exts: &[&str], allow_multiple: bool) -> anyhow::Result<Vec<PathBuf>> {
    // Build filter string for dialogs that need it from provided extensions
    let mut filter_str = String::new();

    if !exts.is_empty() {
        let ext_patterns = exts
            .iter()
            .map(|e| format!("*.{}", e))
            .collect::<Vec<_>>()
            .join(";");
        let desc = format!("{} 文件|{}", exts.join("、"), ext_patterns);
        filter_str.push_str(&desc);
    }

    // Windows using PowerShell OpenFileDialog
    if cfg!(target_os = "windows") {
        let multiselect = if allow_multiple { "$true" } else { "$false" };

        let title = "选择文件";

        let script = format!(
            r#"
                Add-Type -AssemblyName System.Windows.Forms
                [Console]::OutputEncoding = [System.Text.Encoding]::UTF8

                $dialog = New-Object System.Windows.Forms.OpenFileDialog
                $dialog.Filter = "{filter_str}"
                $dialog.Multiselect = {multiselect}
                $dialog.Title = "{title}"
                $result = $dialog.ShowDialog()
                if ($result -eq 'OK') {{
                    $dialog.FileNames
                }}
            "#,
            filter_str = filter_str,
            multiselect = multiselect,
            title = title
        );

        let output = Command::new("powershell")
            .args(&["-NoProfile", "-Command", &script])
            .output()
            .trace_error("启动文件选择对话框失败")?;

        if !output.status.success() {
            return Ok(vec![]);
        }

        let paths_str = String::from_utf8_lossy(&output.stdout);

        let paths: Vec<PathBuf> = paths_str
            .lines()
            .map(|s| s.trim().to_string())
            .filter(|s| !s.is_empty())
            .map(PathBuf::from)
            .collect();

        return Ok(paths);
    }

    // macOS using AppleScript
    if cfg!(target_os = "macos") {
        let choose = if allow_multiple {
            "choose file with prompt \"选择文件\" with multiple selections allowed"
        } else {
            "choose file with prompt \"选择文件\""
        };

        // Note: macOS file filters via AppleScript are more complex; omit filters for simplicity
        let script = format!(r#"osascript -e '{}' -e 'POSIX path of result'"#, choose);

        let output = Command::new("sh")
            .args(&["-c", &script])
            .output()
            .trace_error("启动 macOS 文件选择对话框失败")?;

        if !output.status.success() {
            tracing::info!("selector.select_file.cancelled_or_failed");

            return Ok(vec![]);
        }

        let paths_str = String::from_utf8_lossy(&output.stdout);

        let paths: Vec<PathBuf> = paths_str
            .lines()
            .map(|s| s.trim().to_string())
            .filter(|s| !s.is_empty())
            .map(PathBuf::from)
            .collect();

        tracing::info!(selected_count = paths.len(), "selector.select_file.success");

        return Ok(paths);
    }

    // Linux: try zenity then kdialog
    if cfg!(target_os = "linux") {
        // If filters provided, try to convert to pattern for zenity
        let zenity_cmd = if allow_multiple {
            "zenity --file-selection --multiple --title=选择文件 --separator='\n'"
        } else {
            "zenity --file-selection --title=选择文件"
        };

        let output = Command::new("sh").args(&["-c", zenity_cmd]).output();

        if let Ok(output) = output {
            if output.status.success() {
                let paths_str = String::from_utf8_lossy(&output.stdout);

                let paths: Vec<PathBuf> = paths_str
                    .lines()
                    .map(|s| s.trim().to_string())
                    .filter(|s| !s.is_empty())
                    .map(PathBuf::from)
                    .collect();

                tracing::info!(selected_count = paths.len(), "selector.select_file.success");

                return Ok(paths);
            }
        }

        // kdialog fallback
        let kdialog_cmd = if allow_multiple {
            "kdialog --getopenfilename --multiple --title '选择文件'"
        } else {
            "kdialog --getopenfilename --title '选择文件'"
        };

        let output = Command::new("sh")
            .args(&["-c", kdialog_cmd])
            .output()
            .trace_error("启动 Linux 文件选择对话框失败")?;

        if !output.status.success() {
            tracing::info!("selector.select_file.cancelled_or_failed");

            return Ok(vec![]);
        }

        let paths_str = String::from_utf8_lossy(&output.stdout);

        // kdialog may return paths separated by ' '\n'
        let paths: Vec<PathBuf> = paths_str
            .lines()
            .flat_map(|line| {
                line.split('\u{1f}')
                    .map(|s| s.to_string())
                    .collect::<Vec<_>>()
            })
            .map(|s| s.trim().to_string())
            .filter(|s| !s.is_empty())
            .map(PathBuf::from)
            .collect();

        tracing::info!(selected_count = paths.len(), "selector.select_file.success");

        return Ok(paths);
    }

    Ok(vec![])
}

/// Opens the given directory in the system's file explorer.
/// Supported: Windows (Explorer), macOS (open), Linux (xdg-open)
pub fn open_dir(dir_path: PathBuf) -> anyhow::Result<()> {
    // Windows: explorer
    if cfg!(target_os = "windows") {
        Command::new("explorer")
            .arg(&dir_path)
            .spawn()
            .trace_error("打开文件夹失败")?;

        tracing::info!(path = %dir_path.display(), "selector.open_dir.success");

        return Ok(());
    }

    // macOS: open
    if cfg!(target_os = "macos") {
        Command::new("open")
            .arg(&dir_path)
            .spawn()
            .trace_error("打开文件夹失败")?;

        tracing::info!(path = %dir_path.display(), "selector.open_dir.success");

        return Ok(());
    }

    // Linux: xdg-open (fallbacks may be added later)
    if cfg!(target_os = "linux") {
        Command::new("xdg-open")
            .arg(&dir_path)
            .spawn()
            .trace_error("打开文件夹失败")?;

        tracing::info!(path = %dir_path.display(), "selector.open_dir.success");

        return Ok(());
    }

    Ok(())
}
