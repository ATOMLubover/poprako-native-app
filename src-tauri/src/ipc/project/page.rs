use crate::{
    ipc::get_ipc_request_id,
    model::po::project as po_project,
    model::project as model_project,
    repository::{self as repo, project::page as repo_page},
    result_trace::ResultTrace,
};

#[tauri::command]
#[tracing::instrument]
pub async fn get_project_pages(
    project_id: String,
) -> Result<Vec<model_project::LocalPage>, String> {
    let ipc_id = get_ipc_request_id();

    tracing::info!(ipc_id = ipc_id, "ipc.project.page.get_project_pages.start");

    let mut conn = repo::acquire_connection().await?;

    let pages = repo_page::get_project_pages(&mut conn, project_id.as_str())
        .await
        .trace_error("获取项目页列表时失败")
        .map_err(|e| e.to_string())?;

    let result: Vec<model_project::LocalPage> = pages
        .into_iter()
        .map(|p| model_project::LocalPage {
            id: p.id,
            local_image_path: p.local_image_path,
        })
        .collect();

    tracing::info!(
        ipc_id = ipc_id,
        "ipc.project.page.get_project_pages.success"
    );

    Ok(result)
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

    if pages.is_empty() {
        return Ok(());
    }

    let po_pages: Vec<po_project::LocalPage> = pages
        .into_iter()
        .enumerate()
        .map(|(idx, p)| po_project::LocalPage {
            id: p.id,
            project_id: project_id.clone(),
            index_in_project: idx as u32,
            local_image_path: p.local_image_path,
        })
        .collect();

    let mut conn = repo::acquire_connection().await?;

    let mut trx = repo::aquire_transaction(&mut conn)
        .await
        .trace_error("开始创建项目页事务失败")
        .map_err(|e| e.to_string())?;

    repo_page::save_project_pages(&mut trx, po_pages.as_slice())
        .await
        .trace_error("创建项目页时失败")
        .map_err(|e| e.to_string())?;

    trx.commit()
        .await
        .trace_error("提交创建项目页事务失败")
        .map_err(|e| e.to_string())?;

    tracing::info!(
        ipc_id = ipc_id,
        "ipc.project.page.create_project_pages.success"
    );

    Ok(())
}

#[tauri::command]
#[tracing::instrument]
pub async fn update_project_pages(
    project_id: String,
    pages: Vec<model_project::LocalPage>,
) -> Result<(), String> {
    let ipc_id = get_ipc_request_id();

    tracing::info!(
        ipc_id = ipc_id,
        "ipc.project.page.update_project_pages.start"
    );

    if pages.is_empty() {
        return Ok(());
    }

    let po_pages: Vec<po_project::LocalPage> = pages
        .into_iter()
        .enumerate()
        .map(|(idx, p)| po_project::LocalPage {
            id: p.id,
            project_id: project_id.clone(),
            index_in_project: idx as u32,
            local_image_path: p.local_image_path,
        })
        .collect();

    let mut conn = repo::acquire_connection().await?;

    let mut trx = repo::aquire_transaction(&mut conn)
        .await
        .trace_error("开始更新项目页事务失败")
        .map_err(|e| e.to_string())?;

    repo_page::save_project_pages(&mut trx, po_pages.as_slice())
        .await
        .trace_error("更新项目页时失败")
        .map_err(|e| e.to_string())?;

    trx.commit()
        .await
        .trace_error("提交更新项目页事务失败")
        .map_err(|e| e.to_string())?;

    tracing::info!(
        ipc_id = ipc_id,
        "ipc.project.page.update_project_pages.success"
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

    if page_ids.is_empty() {
        return Ok(());
    }

    let id_refs: Vec<&str> = page_ids.iter().map(|s| s.as_str()).collect();

    let mut conn = repo::acquire_connection().await?;

    repo_page::delete_project_pages(&mut conn, id_refs.as_slice())
        .await
        .trace_error("删除项目页时失败")
        .map_err(|e| e.to_string())?;

    tracing::info!(
        ipc_id = ipc_id,
        "ipc.project.page.delete_project_pages.success"
    );

    Ok(())
}
