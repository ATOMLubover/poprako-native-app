use std::path::PathBuf;

use crate::{
    ipc::get_ipc_request_id, model::project::plugin as model_plugin, result_trace::ResultTrace,
    service,
};

#[tauri::command]
#[tracing::instrument]
pub async fn get_local_post_processors() -> Result<Vec<model_plugin::PostProcessor>, String> {
    let ipc_id = get_ipc_request_id();

    tracing::info!(
        ipc_id = ipc_id,
        "ipc.project.plugin.get_local_post_processors.start"
    );

    let processors = service::project::plugin::get_local_post_processors()
        .await
        .trace_error("读取本地后处理配置时失败")
        .map_err(|e| e.to_string())?;

    tracing::info!(
        ipc_id = ipc_id,
        "ipc.project.plugin.get_local_post_processors.success"
    );

    Ok(processors)
}

#[tauri::command]
#[tracing::instrument]
pub async fn save_local_post_processor(
    processor: model_plugin::PostProcessor,
) -> Result<(), String> {
    let ipc_id = get_ipc_request_id();

    tracing::info!(
        ipc_id = ipc_id,
        "ipc.project.plugin.save_local_post_processor.start"
    );

    service::project::plugin::save_local_post_processor(&processor)
        .await
        .trace_error("保存本地后处理配置时失败")
        .map_err(|e| e.to_string())?;

    tracing::info!(
        ipc_id = ipc_id,
        "ipc.project.plugin.save_local_post_processor.success"
    );

    Ok(())
}

#[tauri::command]
#[tracing::instrument]
pub fn select_post_processor_file() -> Result<String, String> {
    let ipc_id = get_ipc_request_id();

    tracing::info!(
        ipc_id = ipc_id,
        "ipc.project.plugin.select_post_processor_file.start"
    );

    let path = service::project::plugin::select_post_processor_file().map_err(|e| e.to_string())?;

    tracing::info!(
        ipc_id = ipc_id,
        "ipc.project.plugin.select_post_processor_file.success"
    );

    Ok(path.to_string_lossy().to_string())
}

#[tauri::command]
#[tracing::instrument]
pub async fn import_post_processor(path: String) -> Result<(), String> {
    let ipc_id = get_ipc_request_id();

    tracing::info!(
        ipc_id = ipc_id,
        "ipc.project.plugin.import_post_processor.start"
    );

    let path_buf = PathBuf::from(path);

    service::project::plugin::import_post_processor(path_buf)
        .await
        .trace_error("导入后处理配置时失败")
        .map_err(|e| e.to_string())?;

    tracing::info!(
        ipc_id = ipc_id,
        "ipc.project.plugin.import_post_processor.success"
    );

    Ok(())
}

#[tauri::command]
#[tracing::instrument]
pub fn open_post_processor_dir() -> Result<(), String> {
    let ipc_id = get_ipc_request_id();

    tracing::info!(
        ipc_id = ipc_id,
        "ipc.project.plugin.open_post_processor_dir.start"
    );

    service::project::plugin::open_post_processor_dir().map_err(|e| e.to_string())?;

    tracing::info!(
        ipc_id = ipc_id,
        "ipc.project.plugin.open_post_processor_dir.success"
    );

    Ok(())
}
