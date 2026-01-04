use crate::{
    ipc::get_ipc_request_id,
    model::project as model_project,
    result_trace::ResultTrace,
    service,
};

#[tauri::command]
#[tracing::instrument]
pub async fn get_page_units(page_id: String) -> Result<Vec<model_project::LocalUnit>, String> {
    let ipc_id = get_ipc_request_id();

    tracing::info!(ipc_id = ipc_id, "ipc.project.unit.get_page_units.start");

    let units = service::project::unit::get_page_units(&page_id)
        .await
        .trace_error("获取页面单元列表时失败")
        .map_err(|e| e.to_string())?;

    tracing::info!(ipc_id = ipc_id, "ipc.project.unit.get_page_units.success");

    Ok(units)
}

#[tauri::command]
#[tracing::instrument]
pub async fn save_page_units(
    page_id: String,
    units: Vec<model_project::LocalUnit>,
) -> Result<(), String> {
    let ipc_id = get_ipc_request_id();

    tracing::info!(ipc_id = ipc_id, "ipc.project.unit.save_page_units.start");

    service::project::unit::save_page_units(&page_id, units)
        .await
        .trace_error("保存页面单元时失败")
        .map_err(|e| e.to_string())?;

    tracing::info!(ipc_id = ipc_id, "ipc.project.unit.save_page_units.success");

    Ok(())
}

#[tauri::command]
#[tracing::instrument]
pub async fn delete_page_units(unit_ids: Vec<String>) -> Result<(), String> {
    let ipc_id = get_ipc_request_id();

    tracing::info!(ipc_id = ipc_id, "ipc.project.unit.delete_page_units.start");
    
    service::project::unit::delete_page_units(unit_ids)
        .await
        .trace_error("删除页面单元时失败")
        .map_err(|e| e.to_string())?;

    tracing::info!(ipc_id = ipc_id, "ipc.project.unit.delete_page_units.success");

    Ok(())
}
