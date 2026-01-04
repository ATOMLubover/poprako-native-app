use std::path::PathBuf;

use crate::{ipc::get_ipc_request_id, result_trace::ResultTrace, service};

#[tauri::command]
#[tracing::instrument]
pub async fn export_project(
    project_id: String,
    need_compress: bool,
    post_processors: Vec<String>,
) -> Result<String, String> {
    let ipc_id = get_ipc_request_id();

    tracing::info!(ipc_id = ipc_id, "ipc.project.port.export_project.start");

    let out = service::project::port::export_project(&project_id, need_compress, post_processors)
        .await
        .trace_error("导出项目失败")
        .map_err(|e| e.to_string())?;

    tracing::info!(ipc_id = ipc_id, "ipc.project.port.export_project.success");

    Ok(out)
}

#[tauri::command]
#[tracing::instrument]
pub async fn import_project(
    project_path: String,
    author: Option<String>,
    title: Option<String>,
) -> Result<(), String> {
    let ipc_id = get_ipc_request_id();

    tracing::info!(ipc_id = ipc_id, "ipc.project.port.import_project.start");

    service::project::port::import_project(&project_path, author, title)
        .await
        .trace_error("导入 Poprako 项目失败")
        .map_err(|e| e.to_string())?;

    tracing::info!(ipc_id = ipc_id, "ipc.project.port.import_project.success");

    Ok(())
}

#[tauri::command]
#[tracing::instrument]
pub fn open_project_dir(local_image_dir: String) -> Result<(), String> {
    let ipc_id = get_ipc_request_id();

    tracing::info!(ipc_id = ipc_id, "ipc.project.port.open_project_dir.start");

    let local_image_dir = PathBuf::from(local_image_dir);

    service::project::port::open_project_dir(local_image_dir)
        .trace_error("打开项目目录时失败")
        .map_err(|e| e.to_string())?;

    tracing::info!(ipc_id = ipc_id, "ipc.project.port.open_project_dir.success");

    Ok(())
}
