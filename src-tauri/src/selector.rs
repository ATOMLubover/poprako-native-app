use std::{path::PathBuf, process::Command};

use crate::result_trace::ResultTrace;

/// 文件/文件夹筛选条件
///
/// - `Extension(Vec<String>)`：按后缀筛选，例如 ["json","txt","zip"]
/// - `Folder`：仅选择文件夹
/// - `File`：仅选择文件
#[allow(dead_code)]
#[derive(Clone)]
pub enum Filter {
    #[allow(dead_code)]
    Extension(Vec<String>),

    #[allow(dead_code)]
    Folder,

    #[allow(dead_code)]
    File,
}

/// 通用的路径选择函数，支持自定义筛选条件（Windows PowerShell 对话框）
///
/// # 参数
/// - `filters`: 筛选条件列表
/// - `allow_multiple`: 是否允许多选
pub fn select_paths(filters: &[Filter], allow_multiple: bool) -> anyhow::Result<Vec<PathBuf>> {
    let title = if allow_multiple {
        "选择文件"
    } else {
        "选择文件"
    };

    let mut filter_str = String::new();

    for (idx, f) in filters.iter().enumerate() {
        if idx > 0 {
            filter_str.push_str("|");
        }

        match f {
            Filter::Folder => {
                // 文件夹通过 FolderBrowserDialog 选择，无法在 OpenFileDialog 的 Filter 中指定
            }
            Filter::File => {
                filter_str.push_str("所有文件|*.*");
            }
            Filter::Extension(exts) => {
                let ext_patterns = exts
                    .iter()
                    .map(|e| format!("*.{}", e))
                    .collect::<Vec<_>>()
                    .join(";");

                let desc = format!("{} 文件|{}", exts.join("、"), ext_patterns);

                filter_str.push_str(&desc);
            }
        }
    }

    // 判断是否包含文件夹筛选
    let has_folder = filters.iter().any(|f| matches!(f, Filter::Folder));

    // 判断是否包含任何文件相关筛选（非 Folder）
    let has_file = filters.iter().any(|f| !matches!(f, Filter::Folder));

    if has_folder && !has_file {
        // 仅选择文件夹
        let script = r#"
            Add-Type -AssemblyName System.Windows.Forms
            [Console]::OutputEncoding = [System.Text.Encoding]::UTF8

            $dialog = New-Object System.Windows.Forms.FolderBrowserDialog
            $dialog.Description = '选择文件夹'
            $dialog.ShowNewFolderButton = $true
            $result = $dialog.ShowDialog()
            if ($result -eq 'OK') {
                $dialog.SelectedPath
            }
        "#;

        let output = Command::new("powershell")
            .args(&["-NoProfile", "-Command", script])
            .output()
            .trace_error("启动文件夹选择对话框失败")?;

        if !output.status.success() {
            tracing::info!("selector.select_paths.cancelled_or_failed");

            return Ok(vec![]);
        }

        let raw = String::from_utf8_lossy(&output.stdout).to_string();

        let path_opt = raw
            .lines()
            .map(|s| s.trim())
            .find(|s| !s.is_empty())
            .map(|s| {
                s.trim_matches(|c: char| c.is_whitespace() || c == '"' || c == '\u{0}')
                    .to_string()
            });

        let paths = match path_opt {
            Some(p) => {
                tracing::info!(selected = p.as_str(), "selector.select_paths.success");

                Ok(vec![PathBuf::from(p)])
            }
            None => {
                tracing::warn!("selector.select_paths.no_selection");

                Ok(vec![])
            }
        };

        return paths;
    }
    // 选择文件（可能包含多种后缀）
    let multiselect = if allow_multiple { "$true" } else { "$false" };

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
        tracing::info!("selector.select_paths.cancelled_or_failed");

        return Ok(vec![]);
    }

    let paths_str = String::from_utf8_lossy(&output.stdout);

    let paths: Vec<PathBuf> = paths_str
        .lines()
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
        .map(PathBuf::from)
        .collect();

    tracing::info!(
        selected_count = paths.len(),
        "selector.select_paths.success"
    );

    Ok(paths)
}
