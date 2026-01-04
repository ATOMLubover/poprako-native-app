use crate::{
    ipc::get_ipc_request_id, model::project as model_project, result_trace::ResultTrace, service,
};

#[tauri::command]
#[tracing::instrument]
pub async fn get_project_pages(
    project_id: String,
) -> Result<Vec<model_project::LocalPage>, String> {
    let ipc_id = get_ipc_request_id();

    tracing::info!(ipc_id = ipc_id, "ipc.project.page.get_project_pages.start");

    let pages = service::project::page::get_project_pages(&project_id)
        .await
        .trace_error("获取项目页列表时失败")
        .map_err(|e| e.to_string())?;

    tracing::info!(
        ipc_id = ipc_id,
        "ipc.project.page.get_project_pages.success"
    );

    Ok(pages)
}

#[tauri::command]
#[tracing::instrument]
pub async fn create_project_pages(
    project_id: String,
    pages: Vec<model_project::LocalPage>,
) -> Result<(), String> {
    let ipc_id = get_ipc_request_id();

    tracing::info!(
        ipc_id = ipc_id,
        "ipc.project.page.create_project_pages.start"
    );

    service::project::page::create_project_pages(&project_id, pages)
        .await
        .trace_error("创建项目页时失败")
        .map_err(|e| e.to_string())?;

    tracing::info!(
        ipc_id = ipc_id,
        "ipc.project.page.create_project_pages.success"
    );

    Ok(())
}

#[tauri::command]
#[tracing::instrument]
pub async fn save_project_pages(
    project_id: String,
    pages: Vec<model_project::LocalPage>,
) -> Result<(), String> {
    let ipc_id = get_ipc_request_id();

    tracing::info!(ipc_id = ipc_id, "ipc.project.page.save_project_pages.start");

    service::project::page::save_project_pages(&project_id, pages)
        .await
        .trace_error("更新项目页时失败")
        .map_err(|e| e.to_string())?;

    tracing::info!(
        ipc_id = ipc_id,
        "ipc.project.page.save_project_pages.success"
    );

    Ok(())
}

#[tauri::command]
#[tracing::instrument]
pub async fn delete_project_pages(page_ids: Vec<String>) -> Result<(), String> {
    let ipc_id = get_ipc_request_id();

    tracing::info!(
        ipc_id = ipc_id,
        "ipc.project.page.delete_project_pages.start"
    );

    service::project::page::delete_project_pages(page_ids)
        .await
        .trace_error("删除项目页时失败")
        .map_err(|e| e.to_string())?;

    tracing::info!(
        ipc_id = ipc_id,
        "ipc.project.page.delete_project_pages.success"
    );

    Ok(())
}
