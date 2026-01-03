use crate::{
    ipc::get_ipc_request_id,
    model::po::project as po_project,
    model::project as model_project,
    repository::{self as repo, project::unit as repo_unit},
    result_trace::ResultTrace,
};

#[tauri::command]
#[tracing::instrument]
pub async fn get_page_units(page_id: String) -> Result<Vec<model_project::LocalUnit>, String> {
    let ipc_id = get_ipc_request_id();

    tracing::info!(ipc_id = ipc_id, "ipc.project.unit.get_page_units.start");

    let mut conn = repo::acquire_connection().await?;

    let units = repo_unit::get_page_units(&mut conn, page_id.as_str())
        .await
        .trace_error("获取页面单元列表时失败")
        .map_err(|e| e.to_string())?;

    let result = units
        .into_iter()
        .map(|u| model_project::LocalUnit {
            id: u.id,
            x: u.x_coordinate,
            y: u.y_coordinate,
            index_in_page: u.index_in_page,
            is_inbox: u.is_inbox,
            translated_text: u.translated_text,
            is_prooved: u.is_prooved,
            prooved_text: u.prooved_text,
            comment: u.comment,
        })
        .collect::<Vec<model_project::LocalUnit>>();

    tracing::info!(ipc_id = ipc_id, "ipc.project.unit.get_page_units.success");

    Ok(result)
}

#[tauri::command]
#[tracing::instrument]
pub async fn save_page_units(
    page_id: String,
    units: Vec<model_project::LocalUnit>,
) -> Result<(), String> {
    let ipc_id = get_ipc_request_id();

    tracing::info!(ipc_id = ipc_id, "ipc.project.unit.save_page_units.start");

    if units.is_empty() {
        return Ok(());
    }

    let po_units: Vec<po_project::LocalUnit> = units
        .into_iter()
        .map(|u| po_project::LocalUnit {
            id: u.id,
            page_id: page_id.clone(),
            x_coordinate: u.x,
            y_coordinate: u.y,
            index_in_page: u.index_in_page,
            is_inbox: u.is_inbox,
            translated_text: u.translated_text,
            is_prooved: u.is_prooved,
            prooved_text: u.prooved_text,
            comment: u.comment,
            is_local: true,
        })
        .collect();

    let mut conn = repo::acquire_connection().await?;

    let mut trx = repo::aquire_transaction(&mut conn)
        .await
        .trace_error("开始保存页面单元事务失败")
        .map_err(|e| e.to_string())?;

    repo_unit::save_page_units(&mut trx, po_units.as_slice())
        .await
        .trace_error("保存页面单元时失败")
        .map_err(|e| e.to_string())?;

    trx.commit()
        .await
        .trace_error("提交保存页面单元事务失败")
        .map_err(|e| e.to_string())?;

    tracing::info!(ipc_id = ipc_id, "ipc.project.unit.save_page_units.success");

    Ok(())
}

#[tauri::command]
#[tracing::instrument]
pub async fn delete_page_units(unit_ids: Vec<String>) -> Result<(), String> {
    let ipc_id = get_ipc_request_id();

    tracing::info!(ipc_id = ipc_id, "ipc.project.unit.delete_page_units.start");

    if unit_ids.is_empty() {
        return Ok(());
    }

    let id_refs: Vec<&str> = unit_ids.iter().map(|s| s.as_str()).collect();

    let mut conn = repo::acquire_connection().await?;

    repo_unit::delete_page_units(&mut conn, id_refs.as_slice())
        .await
        .trace_error("删除页面单元时失败")
        .map_err(|e| e.to_string())?;

    tracing::info!(
        ipc_id = ipc_id,
        "ipc.project.unit.delete_page_units.success"
    );

    Ok(())
}
