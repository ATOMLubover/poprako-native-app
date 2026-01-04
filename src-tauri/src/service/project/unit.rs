use anyhow::anyhow;

use crate::{
    model::{po::project as po_project, project as model_project},
    repository::{self as repo, project::unit as repo_unit},
};

/// Gets all units for a specific page.
pub async fn get_page_units(page_id: &str) -> anyhow::Result<Vec<model_project::LocalUnit>> {
    let mut conn = repo::acquire_connection()
        .await
        .map_err(|e| anyhow!("获取数据库连接时失败: {}", e))?;

    let units = repo_unit::get_page_units(&mut conn, page_id)
        .await
        .map_err(|e| anyhow!("获取页面单元列表时失败: {}", e))?;

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

    Ok(result)
}

/// Saves or updates page units.
pub async fn save_page_units(
    page_id: &str,
    units: Vec<model_project::LocalUnit>,
) -> anyhow::Result<()> {
    if units.is_empty() {
        return Ok(());
    }

    let po_units: Vec<po_project::LocalUnit> = units
        .into_iter()
        .map(|u| po_project::LocalUnit {
            id: u.id,
            page_id: page_id.to_string(),
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

    let mut conn = repo::acquire_connection()
        .await
        .map_err(|e| anyhow!("获取数据库连接时失败: {}", e))?;

    let mut trx = repo::aquire_transaction(&mut conn)
        .await
        .map_err(|e| anyhow!("开始保存页面单元事务失败: {}", e))?;

    repo_unit::save_page_units(&mut trx, po_units.as_slice())
        .await
        .map_err(|e| anyhow!("保存页面单元时失败: {}", e))?;

    trx.commit()
        .await
        .map_err(|e| anyhow!("提交保存页面单元事务失败: {}", e))?;

    Ok(())
}

/// Deletes multiple page units by their IDs.
pub async fn delete_page_units(unit_ids: Vec<String>) -> anyhow::Result<()> {
    if unit_ids.is_empty() {
        return Ok(());
    }

    let id_refs: Vec<&str> = unit_ids.iter().map(|s| s.as_str()).collect();

    let mut conn = repo::acquire_connection()
        .await
        .map_err(|e| anyhow!("获取数据库连接时失败: {}", e))?;

    repo_unit::delete_page_units(&mut conn, id_refs.as_slice())
        .await
        .map_err(|e| anyhow!("删除页面单元时失败: {}", e))?;

    Ok(())
}
