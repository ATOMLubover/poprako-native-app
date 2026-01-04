use crate::{ipc::get_ipc_request_id, result_trace::ResultTrace, service};

#[tauri::command]
#[tracing::instrument]
pub async fn export_project(project_id: String, need_compress: bool) -> Result<String, String> {
    let ipc_id = get_ipc_request_id();

    tracing::info!(ipc_id = ipc_id, "ipc.project.port.export_project.start");

    let out = service::project::port::export_project(&project_id, need_compress)
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
