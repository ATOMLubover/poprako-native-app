use anyhow::anyhow;

use crate::{
    model::{po::project as po_project, project as model_project},
    repository::{self as repo, project::page as repo_page, project::unit as repo_unit},
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

/// Searches for text across all units in a project and returns matching page IDs.
pub async fn search_comic_text(project_id: &str, query: &str) -> anyhow::Result<Vec<String>> {
    let mut conn = repo::acquire_connection()
        .await
        .map_err(|e| anyhow!("获取数据库连接时失败: {}", e))?;

    let pages = repo_page::get_project_pages(&mut conn, project_id)
        .await
        .map_err(|e| anyhow!("获取项目页列表时失败: {}", e))?;

    let page_ids: Vec<String> = pages.into_iter().map(|p| p.id).collect();
    if page_ids.is_empty() {
        return Ok(vec![]);
    }

    let chunk_size = ((page_ids.len() as f64) / 3.0).ceil() as usize;

    let chunks: Vec<Vec<String>> = page_ids
        .chunks(chunk_size)
        .map(|chunk| chunk.to_vec())
        .collect();

    let mut tasks = vec![];
    let query = std::sync::Arc::new(query.to_lowercase());

    for chunk in chunks {
        let query_clone = query.clone();
        tasks.push(tauri::async_runtime::spawn(async move {
            let mut conn = match repo::acquire_connection().await {
                Ok(c) => c,
                Err(e) => {
                    tracing::error!("Failed to acquire connection in search task: {}", e);
                    return vec![];
                }
            };

            let mut found_pages = vec![];
            for page_id in chunk {
                let units = match repo_unit::get_page_units(&mut conn, &page_id).await {
                    Ok(u) => u,
                    Err(e) => {
                        tracing::error!("Failed to get units for page {}: {}", page_id, e);
                        continue;
                    }
                };

                let mut found = false;
                for unit in units {
                    if let Some(text) = &unit.translated_text {
                        if text.to_lowercase().contains(query_clone.as_str()) {
                            found = true;
                            break;
                        }
                    }
                    if let Some(text) = &unit.prooved_text {
                        if text.to_lowercase().contains(query_clone.as_str()) {
                            found = true;
                            break;
                        }
                    }
                }
                if found {
                    found_pages.push(page_id);
                }
            }
            found_pages
        }));
    }

    let mut result_pages: Vec<String> = vec![];
    for task in tasks {
        match task.await {
            Ok(mut pages) => result_pages.append(&mut pages),
            Err(e) => tracing::error!("Search task failed: {}", e),
        }
    }

    Ok(result_pages)
}

/// Replaces text in units across specified pages.
pub async fn replace_comic_text(
    _project_id: &str,
    page_ids: Vec<String>,
    original: &str,
    replacement: &str,
) -> anyhow::Result<()> {
    let mut conn = repo::acquire_connection()
        .await
        .map_err(|e| anyhow!("获取数据库连接时失败: {}", e))?;

    let mut updates: Vec<(String, Vec<po_project::LocalUnit>)> = vec![];

    for page_id in page_ids {
        let mut units = repo_unit::get_page_units(&mut conn, &page_id)
            .await
            .map_err(|e| anyhow!("获取页面单元列表时失败: {}", e))?;

        let mut changed = false;
        for unit in &mut units {
            if let Some(text) = &mut unit.translated_text {
                if text.contains(original) {
                    *text = text.replace(original, replacement);
                    changed = true;
                }
            }
            if let Some(text) = &mut unit.prooved_text {
                if text.contains(original) {
                    *text = text.replace(original, replacement);
                    changed = true;
                }
            }
        }

        if changed {
            updates.push((page_id, units));
        }
    }

    if updates.is_empty() {
        return Ok(());
    }

    let mut trx = repo::aquire_transaction(&mut conn)
        .await
        .map_err(|e| anyhow!("开始搜索替换事务失败: {}", e))?;

    for (_page_id, units) in updates {
        repo_unit::save_page_units(&mut trx, &units)
            .await
            .map_err(|e| anyhow!("保存页面单元时失败: {}", e))?;
    }

    trx.commit()
        .await
        .map_err(|e| anyhow!("提交搜索替换事务失败: {}", e))?;

    Ok(())
}
