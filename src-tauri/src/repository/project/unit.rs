use std::{collections::HashMap, sync::LazyLock};

use sqlx::{Acquire, SqliteConnection};
use tauri::async_runtime::Mutex;

use crate::{model::po::project::LocalUnit, result_trace::ResultTrace as _};

static UNIT_UPSERT_LOCK: LazyLock<Mutex<()>> = LazyLock::new(|| Mutex::new(()));

pub async fn get_page_units(
    conn: &mut SqliteConnection,
    page_id: &str,
) -> Result<Vec<LocalUnit>, String> {
    let units: Vec<LocalUnit> = sqlx::query_as(
        r#"
         SELECT id,
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
         ORDER BY index_in_page ASC
         "#,
    )
    .bind(page_id)
    .fetch_all(&mut *conn)
    .await
    .trace_error("获取页面单元列表时失败")
    .map_err(|e| e.to_string())?;

    Ok(units)
}

/// 保存页面单元，调用方负责开启与提交事务
pub async fn save_page_units(
    conn: &mut SqliteConnection,
    units: &[LocalUnit],
) -> Result<(), String> {
    if units.is_empty() {
        return Ok(());
    }

    // Ensure only one save_page_units runs at a time
    let _lock_guard = UNIT_UPSERT_LOCK.lock().await;

    let mut page_project_cache: HashMap<String, String> = HashMap::new();
    let mut stats_by_project: HashMap<String, (i64, i64, i64, i64)> = HashMap::new();

    for unit in units.iter() {
        // try update
        let update_res = sqlx::query(
            r#"
            UPDATE local_unit_tbl
            SET page_id = ?, index_in_page = ?, x_coordinate = ?, y_coordinate = ?, is_inbox = ?, translated_text = ?, is_prooved = ?, prooved_text = ?, comment = ?, is_local = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
            "#,
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
        .execute(&mut *conn)
        .await
        .trace_error("保存页面单元时更新失败")
        .map_err(|e| e.to_string())?;

        if update_res.rows_affected() == 0 {
            // need to insert
            let project_id = if let Some(pid) = page_project_cache.get(&unit.page_id) {
                pid.clone()
            } else {
                let pid: String = sqlx::query_scalar(
                    r#"
                    SELECT project_id FROM local_page_tbl WHERE id = ?
                    "#,
                )
                .bind(&unit.page_id)
                .fetch_one(&mut *conn)
                .await
                .trace_error("查询所属 project_id 失败")
                .map_err(|e| e.to_string())?;

                page_project_cache.insert(unit.page_id.clone(), pid.clone());

                pid
            };

            sqlx::query(
                r#"
                INSERT INTO local_unit_tbl (id, page_id, index_in_page, x_coordinate, y_coordinate, is_inbox, translated_text, is_prooved, prooved_text, comment, is_local)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                "#,
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
            .execute(&mut *conn)
            .await
            .trace_error("保存页面单元时插入失败")
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

            entry.3 += inc_inbox;
        }
    }

    for (project_id, (units_cnt, translated_cnt, prooved_cnt, inbox_cnt)) in
        stats_by_project.into_iter()
    {
        let outbox_cnt = units_cnt - inbox_cnt;

        sqlx::query(
            r#"
            UPDATE local_project_tbl
            SET unit_count = unit_count + ?,
                translated_unit_count = translated_unit_count + ?,
                prooved_unit_count = prooved_unit_count + ?,
                inbox_unit_count = inbox_unit_count + ?,
                outbox_unit_count = outbox_unit_count + ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
            "#,
        )
        .bind(units_cnt)
        .bind(translated_cnt)
        .bind(prooved_cnt)
        .bind(inbox_cnt)
        .bind(outbox_cnt)
        .bind(&project_id)
        .execute(&mut *conn)
        .await
        .trace_error("更新项目单元计数时失败")
        .map_err(|e| e.to_string())?;
    }

    Ok(())
}

pub async fn delete_page_units(
    conn: &mut SqliteConnection,
    unit_ids: &[&str],
) -> Result<(), String> {
    if unit_ids.is_empty() {
        return Ok(());
    }

    let mut tx = conn
        .begin()
        .await
        .trace_error("开始删除页面单元批量事务失败")
        .map_err(|e| e.to_string())?;

    let mut page_project_cache: HashMap<String, String> = HashMap::new();
    let mut stats_by_project: HashMap<String, (i64, i64, i64, i64)> = HashMap::new();

    for unit_id in unit_ids.iter() {
        let (page_id, is_inbox, translated_text, is_prooved): (String, bool, Option<String>, bool) =
                sqlx::query_as(
                    r#"
                    SELECT page_id, is_inbox, translated_text, is_prooved FROM local_unit_tbl WHERE id = ?
                    "#,
                )
            .bind(unit_id)
            .fetch_one(tx.as_mut())
            .await
            .trace_error("查询要删除单元信息失败")
            .map_err(|e| e.to_string())?;

        let project_id = if let Some(pid) = page_project_cache.get(&page_id) {
            pid.clone()
        } else {
            let pid: String = sqlx::query_scalar(
                r#"
                SELECT project_id FROM local_page_tbl WHERE id = ?
                "#,
            )
            .bind(&page_id)
            .fetch_one(tx.as_mut())
            .await
            .trace_error("查询所属 project_id 失败")
            .map_err(|e| e.to_string())?;

            page_project_cache.insert(page_id.clone(), pid.clone());

            pid
        };

        sqlx::query(
            r#"
            DELETE FROM local_unit_tbl WHERE id = ?
            "#,
        )
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
    }

    for (project_id, (units_cnt, translated_cnt, prooved_cnt, inbox_cnt)) in
        stats_by_project.into_iter()
    {
        let outbox_cnt = units_cnt - inbox_cnt;

        sqlx::query(
            r#"
            UPDATE local_project_tbl
            SET unit_count = unit_count - ?,
                translated_unit_count = translated_unit_count - ?,
                prooved_unit_count = prooved_unit_count - ?,
                inbox_unit_count = inbox_unit_count - ?,
                outbox_unit_count = outbox_unit_count - ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
            "#,
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
