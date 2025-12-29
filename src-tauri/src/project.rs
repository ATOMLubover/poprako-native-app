use std::io::Write as _;
use std::path::PathBuf;

use crate::model::project::ExportProject;
use crate::result_trace::ResultTrace;

pub async fn export_poprako_project(
    project: ExportProject,
    dst_path: PathBuf,
) -> Result<(), String> {
    let dst_path_clone = dst_path.clone();

    tauri::async_runtime::spawn_blocking(move || -> Result<(), String> {
        // Write directly to file, avoiding using too much memory.
        let file = std::fs::File::create(&dst_path_clone).map_err(|e| e.to_string())?;

        let mut writer = std::io::BufWriter::new(file);

        rmp_serde::encode::write_named(&mut writer, &project).map_err(|e| e.to_string())?;

        writer.flush().map_err(|e| e.to_string())?;

        Ok(())
    })
    .await
    .trace_error("等待写入任务完成时失败")
    .map_err(|e| e.to_string())?
    .map_err(|e| format!("写入序列化项目信息时出错: {}", e))?;

    Ok(())
}
