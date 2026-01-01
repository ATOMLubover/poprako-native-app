use std::collections::HashMap;
use std::sync::LazyLock;

use sqlx::SqlitePool;

use crate::{
    model::po::project::{CachedProject, LocalPage, LocalProject, LocalUnit, NewLocalProject},
    repository::DATABASE,
    result_trace::ResultTrace as _,
};

static LOCAL_DB: LazyLock<SqlitePool> =
    LazyLock::new(|| DATABASE.lock().unwrap().as_ref().unwrap().clone());

pub async fn select_local_project(project_id: &str) -> Result<LocalProject, String> {
    let project: LocalProject = sqlx::query_as(
        r#"
        SELECT
            id,
            author,
            title,
            local_image_dir,
            related_comic_id,
            unit_count,
            translated_unit_count,
            prooved_unit_count,
            inbox_unit_count,
            outbox_unit_count,
            page_count,
            updated_at
        FROM local_project_tbl
        WHERE id = ?
        "#,
    )
    .bind(project_id)
    .fetch_one(&*LOCAL_DB)
    .await
    .trace_error("获取项目时失败")
    .map_err(|e| e.to_string())?;

    Ok(project)
}

pub async fn select_cached_project(project_id: &str) -> Result<CachedProject, String> {
    let project: CachedProject = sqlx::query_as(
        r#"
        SELECT
            id,
            author,
            title,
            local_image_dir,
            related_comic_id,
            unit_count,
            translated_unit_count,
            prooved_unit_count,
            inbox_unit_count,
            outbox_unit_count,
            page_count,
            updated_at
        FROM cached_project_tbl
        WHERE id = ?
        "#,
    )
    .bind(project_id)
    .fetch_one(&*LOCAL_DB)
    .await
    .trace_error("获取缓存项目时失败")
    .map_err(|e| e.to_string())?;

    Ok(project)
}

pub async fn get_cached_projects() -> Result<Vec<CachedProject>, String> {
    let project_list: Vec<CachedProject> = sqlx::query_as(
        r#"
        SELECT
            id, 
            author, 
            title, 
            local_image_dir, 
            related_comic_id, 
            unit_count, 
            translated_unit_count, 
            prooved_unit_count, 
            inbox_unit_count, 
            outbox_unit_count, 
            page_count,
            updated_at
         FROM cached_project_tbl
         ORDER BY created_at DESC
        "#,
    )
    .fetch_all(&*LOCAL_DB)
    .await
    .trace_error("获取项目列表时失败")
    .map_err(|e| e.to_string())?;

    Ok(project_list)
}

pub async fn get_local_projects() -> Result<Vec<LocalProject>, String> {
    let project_list: Vec<LocalProject> = sqlx::query_as(
        r#"
        SELECT
            id, 
            author, 
            title, 
            local_image_dir, 
            related_comic_id,
            unit_count, 
            translated_unit_count, 
            prooved_unit_count, 
            inbox_unit_count, 
            outbox_unit_count, 
            page_count,
            updated_at
         FROM local_project_tbl
         ORDER BY created_at DESC
        "#,
    )
    .fetch_all(&*LOCAL_DB)
    .await
    .trace_error("获取本地项目列表时失败")
    .map_err(|e| e.to_string())?;

    Ok(project_list)
}

pub async fn create_local_project(project: &NewLocalProject) -> Result<(), String> {
    sqlx::query(
        "INSERT INTO local_project_tbl (id, author, title, local_image_dir, page_count)
         VALUES (?, ?, ?, ?, ?)",
    )
    .bind(&project.id)
    .bind(&project.author)
    .bind(&project.title)
    .bind(&project.local_image_dir)
    .bind(project.page_count)
    .execute(&*LOCAL_DB)
    .await
    .trace_error("创建本地项目时失败")
    .map_err(|e| e.to_string())?;

    Ok(())
}

/// Create a local project and associated pages in a single transaction.
pub async fn create_local_project_with_pages(
    project: &NewLocalProject,
    pages: &[LocalPage],
) -> Result<(), String> {
    let mut tx = (&*LOCAL_DB)
        .begin()
        .await
        .trace_error("开始创建本地项目事务失败")
        .map_err(|e| e.to_string())?;

    sqlx::query(
        "INSERT INTO local_project_tbl (id, author, title, local_image_dir, page_count)
         VALUES (?, ?, ?, ?, ?)",
    )
    .bind(&project.id)
    .bind(&project.author)
    .bind(&project.title)
    .bind(&project.local_image_dir)
    .bind(project.page_count)
    .execute(tx.as_mut())
    .await
    .trace_error("创建本地项目时失败")
    .map_err(|e| e.to_string())?;

    if !pages.is_empty() {
        for page in pages.iter() {
            sqlx::query(
                "INSERT INTO local_page_tbl (id, project_id, index_in_project, local_image_path)
                 VALUES (?, ?, ?, ?)",
            )
            .bind(&page.id)
            .bind(&page.project_id)
            .bind(page.index_in_project)
            .bind(&page.local_image_path)
            .execute(tx.as_mut())
            .await
            .trace_error("批量创建项目页时失败")
            .map_err(|e| e.to_string())?;
        }

        // update page_count to pages.len() (or increment if needed)
        let add_pages = pages.len() as i64;

        sqlx::query(
            "UPDATE local_project_tbl
             SET page_count = page_count + ?, updated_at = CURRENT_TIMESTAMP
             WHERE id = ?",
        )
        .bind(add_pages)
        .bind(&project.id)
        .execute(tx.as_mut())
        .await
        .trace_error("更新项目页计数时失败")
        .map_err(|e| e.to_string())?;
    }

    tx.commit()
        .await
        .trace_error("提交创建本地项目事务失败")
        .map_err(|e| e.to_string())?;

    Ok(())
}

pub async fn update_local_project(project: &NewLocalProject) -> Result<(), String> {
    sqlx::query(
        "UPDATE local_project_tbl
         SET author = ?, title = ?, local_image_dir = ?, page_count = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?",
    )
    .bind(&project.author)
    .bind(&project.title)
    .bind(&project.local_image_dir)
    .bind(project.page_count)
    .bind(&project.id)
    .execute(&*LOCAL_DB)
    .await
    .trace_error("更新本地项目时失败")
    .map_err(|e| e.to_string())?;

    Ok(())
}

// ------- Page CRUD -------
pub async fn get_project_pages(project_id: &str) -> Result<Vec<LocalPage>, String> {
    let pages: Vec<LocalPage> = sqlx::query_as(
        "SELECT id, project_id, index_in_project, local_image_path
         FROM local_page_tbl
         WHERE project_id = ?
         ORDER BY index_in_project ASC",
    )
    .bind(project_id)
    .fetch_all(&*LOCAL_DB)
    .await
    .trace_error("获取项目页列表时失败")
    .map_err(|e| e.to_string())?;

    Ok(pages)
}

pub async fn create_project_pages(pages: &[LocalPage]) -> Result<(), String> {
    if pages.is_empty() {
        return Ok(());
    }

    let mut tx = (&*LOCAL_DB)
        .begin()
        .await
        .trace_error("开始创建项目页批量事务失败")
        .map_err(|e| e.to_string())?;

    let mut counts_by_project: HashMap<String, i64> = HashMap::new();

    for page in pages.iter() {
        sqlx::query(
            "INSERT INTO local_page_tbl (id, project_id, index_in_project, local_image_path)
             VALUES (?, ?, ?, ?)",
        )
        .bind(&page.id)
        .bind(&page.project_id)
        .bind(page.index_in_project)
        .bind(&page.local_image_path)
        .execute(tx.as_mut())
        .await
        .trace_error("批量创建项目页时失败")
        .map_err(|e| e.to_string())?;

        *counts_by_project
            .entry(page.project_id.clone())
            .or_insert(0) += 1;
    }

    for (project_id, add_pages) in counts_by_project.into_iter() {
        sqlx::query(
            "UPDATE local_project_tbl
             SET page_count = page_count + ?, updated_at = CURRENT_TIMESTAMP
             WHERE id = ?",
        )
        .bind(add_pages)
        .bind(&project_id)
        .execute(tx.as_mut())
        .await
        .trace_error("更新项目页计数时失败")
        .map_err(|e| e.to_string())?;
    }

    tx.commit()
        .await
        .trace_error("提交创建项目页批量事务失败")
        .map_err(|e| e.to_string())?;

    Ok(())
}

pub async fn update_project_pages(pages: &[LocalPage]) -> Result<(), String> {
    if pages.is_empty() {
        return Ok(());
    }

    let mut tx = (&*LOCAL_DB)
        .begin()
        .await
        .trace_error("开始更新项目页批量事务失败")
        .map_err(|e| e.to_string())?;

    for page in pages.iter() {
        sqlx::query(
            "UPDATE local_page_tbl
             SET project_id = ?, index_in_project = ?, local_image_path = ?, updated_at = CURRENT_TIMESTAMP
             WHERE id = ?",
        )
        .bind(&page.project_id)
        .bind(page.index_in_project)
        .bind(&page.local_image_path)
        .bind(&page.id)
        .execute(tx.as_mut())
        .await
        .trace_error("批量更新项目页时失败")
        .map_err(|e| e.to_string())?;
    }

    tx.commit()
        .await
        .trace_error("提交更新项目页批量事务失败")
        .map_err(|e| e.to_string())?;

    Ok(())
}

pub async fn delete_project_pages(page_ids: &[&str]) -> Result<(), String> {
    if page_ids.is_empty() {
        return Ok(());
    }

    let mut tx = (&*LOCAL_DB)
        .begin()
        .await
        .trace_error("开始删除项目页批量事务失败")
        .map_err(|e| e.to_string())?;

    for page_id in page_ids.iter() {
        // 复用单页删除逻辑 atomically
        let project_id: String =
            sqlx::query_scalar("SELECT project_id FROM local_page_tbl WHERE id = ?")
                .bind(page_id)
                .fetch_one(tx.as_mut())
                .await
                .trace_error("查询要删除页面的 project_id 失败")
                .map_err(|e| e.to_string())?;

        let (units_cnt, translated_cnt, prooved_cnt, inbox_cnt): (i64, Option<i64>, Option<i64>, Option<i64>) = sqlx::query_as(
            "SELECT
                COUNT(*) as cnt,
                SUM(CASE WHEN translated_text IS NOT NULL AND translated_text != '' THEN 1 ELSE 0 END) as translated_sum,
                SUM(CASE WHEN is_prooved = 1 THEN 1 ELSE 0 END) as prooved_sum,
                SUM(CASE WHEN is_inbox = 1 THEN 1 ELSE 0 END) as inbox_sum
             FROM local_unit_tbl
             WHERE page_id = ?",
        )
        .bind(page_id)
        .fetch_one(tx.as_mut())
        .await
        .trace_error("聚合页面单元统计失败")
        .map_err(|e| e.to_string())?;

        let translated_cnt = translated_cnt.unwrap_or(0);
        let prooved_cnt = prooved_cnt.unwrap_or(0);
        let inbox_cnt = inbox_cnt.unwrap_or(0);
        let outbox_cnt = units_cnt - inbox_cnt;

        sqlx::query("DELETE FROM local_page_tbl WHERE id = ?")
            .bind(page_id)
            .execute(tx.as_mut())
            .await
            .trace_error("批量删除项目页时失败")
            .map_err(|e| e.to_string())?;

        sqlx::query(
            "UPDATE local_project_tbl
             SET page_count = page_count - 1,
                 unit_count = unit_count - ?,
                 translated_unit_count = translated_unit_count - ?,
                 prooved_unit_count = prooved_unit_count - ?,
                 inbox_unit_count = inbox_unit_count - ?,
                 outbox_unit_count = outbox_unit_count - ?,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = ?",
        )
        .bind(units_cnt)
        .bind(translated_cnt)
        .bind(prooved_cnt)
        .bind(inbox_cnt)
        .bind(outbox_cnt)
        .bind(&project_id)
        .execute(tx.as_mut())
        .await
        .trace_error("更新项目元数据时失败")
        .map_err(|e| e.to_string())?;
    }

    tx.commit()
        .await
        .trace_error("提交删除项目页批量事务失败")
        .map_err(|e| e.to_string())?;

    Ok(())
}

// ------- Unit CRUD -------
pub async fn get_page_units(page_id: &str) -> Result<Vec<LocalUnit>, String> {
    let units: Vec<LocalUnit> = sqlx::query_as(
        "SELECT id,
                page_id,
                index_in_page,
                x_coordinate,
                y_coordinate,
                is_inbox,
                translated_text,
                is_prooved,
                prooved_text,
                comment,
                is_local
         FROM local_unit_tbl
         WHERE page_id = ?
         ORDER BY index_in_page ASC",
    )
    .bind(page_id)
    .fetch_all(&*LOCAL_DB)
    .await
    .trace_error("获取页面单元列表时失败")
    .map_err(|e| e.to_string())?;

    Ok(units)
}

pub async fn create_page_units(units: &[LocalUnit]) -> Result<(), String> {
    if units.is_empty() {
        return Ok(());
    }

    let mut tx = (&*LOCAL_DB)
        .begin()
        .await
        .trace_error("开始创建页面单元批量事务失败")
        .map_err(|e| e.to_string())?;

    let mut page_project_cache: HashMap<String, String> = HashMap::new();
    let mut stats_by_project: HashMap<String, (i64, i64, i64, i64)> = HashMap::new();

    for unit in units.iter() {
        let project_id = if let Some(pid) = page_project_cache.get(&unit.page_id) {
            pid.clone()
        } else {
            let pid: String =
                sqlx::query_scalar("SELECT project_id FROM local_page_tbl WHERE id = ?")
                    .bind(&unit.page_id)
                    .fetch_one(tx.as_mut())
                    .await
                    .trace_error("查询所属 project_id 失败")
                    .map_err(|e| e.to_string())?;

            page_project_cache.insert(unit.page_id.clone(), pid.clone());

            pid
        };

        sqlx::query(
            "INSERT INTO local_unit_tbl (id, page_id, index_in_page, x_coordinate, y_coordinate, is_inbox, translated_text, is_prooved, prooved_text, comment, is_local)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        )
        .bind(&unit.id)
        .bind(&unit.page_id)
        .bind(unit.index_in_page)
        .bind(unit.x_coordinate)
        .bind(unit.y_coordinate)
        .bind(unit.is_inbox)
        .bind(&unit.translated_text)
        .bind(unit.is_prooved)
        .bind(&unit.prooved_text)
        .bind(&unit.comment)
        .bind(unit.is_local)
        .execute(tx.as_mut())
        .await
        .trace_error("批量创建页面单元时失败")
        .map_err(|e| e.to_string())?;

        let inc_translated: i64 = if unit
            .translated_text
            .as_ref()
            .map(|s| !s.is_empty())
            .unwrap_or(false)
        {
            1
        } else {
            0
        };

        let inc_prooved: i64 = if unit.is_prooved { 1 } else { 0 };

        let inc_inbox: i64 = if unit.is_inbox { 1 } else { 0 };

        let entry = stats_by_project.entry(project_id).or_insert((0, 0, 0, 0));
        entry.0 += 1;
        entry.1 += inc_translated;
        entry.2 += inc_prooved;
        entry.3 += inc_inbox - 0; // inbox stored, outbox computed below

        // store outbox by adding to translated slot temporarily; we'll compute outbox when updating
        // (we'll instead compute outbox as units - inbox when updating project)
    }

    for (project_id, (units_cnt, translated_cnt, prooved_cnt, inbox_cnt)) in
        stats_by_project.into_iter()
    {
        let outbox_cnt = units_cnt - inbox_cnt;

        sqlx::query(
            "UPDATE local_project_tbl
             SET unit_count = unit_count + ?,
                 translated_unit_count = translated_unit_count + ?,
                 prooved_unit_count = prooved_unit_count + ?,
                 inbox_unit_count = inbox_unit_count + ?,
                 outbox_unit_count = outbox_unit_count + ?,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = ?",
        )
        .bind(units_cnt)
        .bind(translated_cnt)
        .bind(prooved_cnt)
        .bind(inbox_cnt)
        .bind(outbox_cnt)
        .bind(&project_id)
        .execute(tx.as_mut())
        .await
        .trace_error("更新项目单元计数时失败")
        .map_err(|e| e.to_string())?;
    }

    tx.commit()
        .await
        .trace_error("提交创建页面单元批量事务失败")
        .map_err(|e| e.to_string())?;

    Ok(())
}

pub async fn update_page_units(units: &[LocalUnit]) -> Result<(), String> {
    if units.is_empty() {
        return Ok(());
    }

    let mut tx = (&*LOCAL_DB)
        .begin()
        .await
        .trace_error("开始更新页面单元批量事务失败")
        .map_err(|e| e.to_string())?;

    for unit in units.iter() {
        sqlx::query(
            "UPDATE local_unit_tbl
             SET page_id = ?, index_in_page = ?, x_coordinate = ?, y_coordinate = ?, is_inbox = ?, translated_text = ?, is_prooved = ?, prooved_text = ?, comment = ?, is_local = ?, updated_at = CURRENT_TIMESTAMP
             WHERE id = ?",
        )
        .bind(&unit.page_id)
        .bind(unit.index_in_page)
        .bind(unit.x_coordinate)
        .bind(unit.y_coordinate)
        .bind(unit.is_inbox)
        .bind(&unit.translated_text)
        .bind(unit.is_prooved)
        .bind(&unit.prooved_text)
        .bind(&unit.comment)
        .bind(unit.is_local)
        .bind(&unit.id)
        .execute(tx.as_mut())
        .await
        .trace_error("批量更新页面单元时失败")
        .map_err(|e| e.to_string())?;
    }

    tx.commit()
        .await
        .trace_error("提交更新页面单元批量事务失败")
        .map_err(|e| e.to_string())?;

    Ok(())
}

pub async fn delete_page_units(unit_ids: &[&str]) -> Result<(), String> {
    if unit_ids.is_empty() {
        return Ok(());
    }

    let mut tx = (&*LOCAL_DB)
        .begin()
        .await
        .trace_error("开始删除页面单元批量事务失败")
        .map_err(|e| e.to_string())?;

    let mut page_project_cache: HashMap<String, String> = HashMap::new();
    let mut stats_by_project: HashMap<String, (i64, i64, i64, i64)> = HashMap::new();

    for unit_id in unit_ids.iter() {
        let (page_id, is_inbox, translated_text, is_prooved): (String, bool, Option<String>, bool) = sqlx::query_as(
            "SELECT page_id, is_inbox, translated_text, is_prooved FROM local_unit_tbl WHERE id = ?",
        )
        .bind(unit_id)
        .fetch_one(tx.as_mut())
        .await
        .trace_error("查询要删除单元信息失败")
        .map_err(|e| e.to_string())?;

        let project_id = if let Some(pid) = page_project_cache.get(&page_id) {
            pid.clone()
        } else {
            let pid: String =
                sqlx::query_scalar("SELECT project_id FROM local_page_tbl WHERE id = ?")
                    .bind(&page_id)
                    .fetch_one(tx.as_mut())
                    .await
                    .trace_error("查询所属 project_id 失败")
                    .map_err(|e| e.to_string())?;

            page_project_cache.insert(page_id.clone(), pid.clone());

            pid
        };

        sqlx::query("DELETE FROM local_unit_tbl WHERE id = ?")
            .bind(unit_id)
            .execute(tx.as_mut())
            .await
            .trace_error("删除页面单元时失败")
            .map_err(|e| e.to_string())?;

        let dec_translated: i64 = if translated_text
            .as_ref()
            .map(|s| !s.is_empty())
            .unwrap_or(false)
        {
            1
        } else {
            0
        };

        let dec_prooved: i64 = if is_prooved { 1 } else { 0 };

        let dec_inbox: i64 = if is_inbox { 1 } else { 0 };

        let entry = stats_by_project.entry(project_id).or_insert((0, 0, 0, 0));
        entry.0 += 1;
        entry.1 += dec_translated;
        entry.2 += dec_prooved;
        entry.3 += dec_inbox;

        // outbox computed later as units - inbox
    }

    for (project_id, (units_cnt, translated_cnt, prooved_cnt, inbox_cnt)) in
        stats_by_project.into_iter()
    {
        let outbox_cnt = units_cnt - inbox_cnt;

        sqlx::query(
            "UPDATE local_project_tbl
             SET unit_count = unit_count - ?,
                 translated_unit_count = translated_unit_count - ?,
                 prooved_unit_count = prooved_unit_count - ?,
                 inbox_unit_count = inbox_unit_count - ?,
                 outbox_unit_count = outbox_unit_count - ?,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = ?",
        )
        .bind(units_cnt)
        .bind(translated_cnt)
        .bind(prooved_cnt)
        .bind(inbox_cnt)
        .bind(outbox_cnt)
        .bind(&project_id)
        .execute(tx.as_mut())
        .await
        .trace_error("更新项目单元计数时失败")
        .map_err(|e| e.to_string())?;
    }

    tx.commit()
        .await
        .trace_error("提交删除页面单元批量事务失败")
        .map_err(|e| e.to_string())?;

    Ok(())
}
