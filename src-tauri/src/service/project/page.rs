use anyhow::anyhow;

use crate::{
    model::{po::project as po_project, project as model_project},
    repository::{self as repo, project::page as repo_page},
};

/// Gets all pages for a specific project.
pub async fn get_project_pages(project_id: &str) -> anyhow::Result<Vec<model_project::LocalPage>> {
    let mut conn = repo::acquire_connection()
        .await
        .map_err(|e| anyhow!("获取数据库连接时失败: {}", e))?;

    let pages = repo_page::get_project_pages(&mut conn, project_id)
        .await
        .map_err(|e| anyhow!("获取项目页列表时失败: {}", e))?;

    let result: Vec<model_project::LocalPage> = pages
        .into_iter()
        .map(|p| model_project::LocalPage {
            id: p.id,
            local_image_path: p.local_image_path,
        })
        .collect();

    Ok(result)
}

/// Creates new project pages.
pub async fn create_project_pages(
    project_id: &str,
    pages: Vec<model_project::LocalPage>,
) -> anyhow::Result<()> {
    if pages.is_empty() {
        return Ok(());
    }

    let po_pages: Vec<po_project::LocalPage> = pages
        .into_iter()
        .enumerate()
        .map(|(idx, p)| po_project::LocalPage {
            id: p.id,
            project_id: project_id.to_string(),
            index_in_project: idx as u32,
            local_image_path: p.local_image_path,
        })
        .collect();

    let mut conn = repo::acquire_connection()
        .await
        .map_err(|e| anyhow!("获取数据库连接时失败: {}", e))?;

    let mut trx = repo::aquire_transaction(&mut conn)
        .await
        .map_err(|e| anyhow!("开始创建项目页事务失败: {}", e))?;

    repo_page::save_project_pages(&mut trx, po_pages.as_slice())
        .await
        .map_err(|e| anyhow!("创建项目页时失败: {}", e))?;

    trx.commit()
        .await
        .map_err(|e| anyhow!("提交创建项目页事务失败: {}", e))?;

    Ok(())
}

/// Updates existing project pages.
pub async fn save_project_pages(
    project_id: &str,
    pages: Vec<model_project::LocalPage>,
) -> anyhow::Result<()> {
    if pages.is_empty() {
        return Ok(());
    }

    let po_pages: Vec<po_project::LocalPage> = pages
        .into_iter()
        .enumerate()
        .map(|(idx, p)| po_project::LocalPage {
            id: p.id,
            project_id: project_id.to_string(),
            index_in_project: idx as u32,
            local_image_path: p.local_image_path,
        })
        .collect();

    let mut conn = repo::acquire_connection()
        .await
        .map_err(|e| anyhow!("获取数据库连接时失败: {}", e))?;

    let mut trx = repo::aquire_transaction(&mut conn)
        .await
        .map_err(|e| anyhow!("开始更新项目页事务失败: {}", e))?;

    repo_page::save_project_pages(&mut trx, po_pages.as_slice())
        .await
        .map_err(|e| anyhow!("更新项目页时失败: {}", e))?;

    trx.commit()
        .await
        .map_err(|e| anyhow!("提交更新项目页事务失败: {}", e))?;

    Ok(())
}

/// Deletes multiple project pages by their IDs.
pub async fn delete_project_pages(page_ids: Vec<String>) -> anyhow::Result<()> {
    if page_ids.is_empty() {
        return Ok(());
    }

    let id_refs: Vec<&str> = page_ids.iter().map(|s| s.as_str()).collect();

    let mut conn = repo::acquire_connection()
        .await
        .map_err(|e| anyhow!("获取数据库连接时失败: {}", e))?;

    repo_page::delete_project_pages(&mut conn, id_refs.as_slice())
        .await
        .map_err(|e| anyhow!("删除项目页时失败: {}", e))?;

    Ok(())
}
