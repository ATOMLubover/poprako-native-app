use std::{collections::HashMap, sync::LazyLock};

use anyhow::anyhow;
use sqlx::{Acquire, SqliteConnection};
use tauri::async_runtime::Mutex;

use crate::model::po::project::LocalPage;

static PAGE_UPSERT_LOCK: LazyLock<Mutex<()>> = LazyLock::new(|| Mutex::new(()));

pub async fn get_project_pages(
    conn: &mut SqliteConnection,
    project_id: &str,
) -> anyhow::Result<Vec<LocalPage>> {
    let pages: Vec<LocalPage> = sqlx::query_as(
        r#"
        SELECT id, project_id, index_in_project, local_image_path
        FROM local_page_tbl
        WHERE project_id = ?
        ORDER BY index_in_project ASC
        "#,
    )
    .bind(project_id)
    .fetch_all(&mut *conn)
    .await
    .map_err(|e| anyhow!("获取项目页列表时失败: {}", e))?;

    Ok(pages)
}

/// 保存项目页，调用方负责开启与提交事务
pub async fn save_project_pages(
    conn: &mut SqliteConnection,
    pages: &[LocalPage],
) -> anyhow::Result<()> {
    if pages.is_empty() {
        return Ok(());
    }

    // Respect the same upsert lock to avoid concurrent upserts
    let _lock_guard = PAGE_UPSERT_LOCK.lock().await;

    let mut counts_by_project: HashMap<String, i64> = HashMap::new();

    for page in pages.iter() {
        let update_res = sqlx::query(
            r#"
            UPDATE local_page_tbl
            SET project_id = ?, index_in_project = ?, local_image_path = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
            "#,
        )
        .bind(&page.project_id)
        .bind(page.index_in_project)
        .bind(&page.local_image_path)
        .bind(&page.id)
        .execute(&mut *conn)
        .await
        .map_err(|e| anyhow!("保存项目页时更新失败: {}", e))?;

        if update_res.rows_affected() == 0 {
            sqlx::query(
                r#"
                INSERT INTO local_page_tbl (id, project_id, index_in_project, local_image_path)
                VALUES (?, ?, ?, ?)
                "#,
            )
            .bind(&page.id)
            .bind(&page.project_id)
            .bind(page.index_in_project)
            .bind(&page.local_image_path)
            .execute(&mut *conn)
            .await
            .map_err(|e| anyhow!("保存项目页时插入失败: {}", e))?;

            *counts_by_project
                .entry(page.project_id.clone())
                .or_insert(0) += 1;
        }
    }

    for (project_id, add_pages) in counts_by_project.into_iter() {
        sqlx::query(
            r#"
            UPDATE local_project_tbl
            SET page_count = page_count + ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
            "#,
        )
        .bind(add_pages)
        .bind(&project_id)
        .execute(&mut *conn)
        .await
        .map_err(|e| anyhow!("更新项目页计数时失败: {}", e))?;
    }

    Ok(())
}

pub async fn delete_project_pages(
    conn: &mut SqliteConnection,
    page_ids: &[&str],
) -> anyhow::Result<()> {
    if page_ids.is_empty() {
        return Ok(());
    }

    let mut trx = conn
        .begin()
        .await
        .map_err(|e| anyhow!("开始删除项目页批量事务失败: {}", e))?;

    for page_id in page_ids.iter() {
        let project_id: String = sqlx::query_scalar(
            r#"
            SELECT project_id FROM local_page_tbl WHERE id = ?
            "#,
        )
        .bind(page_id)
        .fetch_one(trx.as_mut())
        .await
        .map_err(|e| anyhow!("查询要删除页面的 project_id 失败: {}", e))?;

        let (units_cnt, translated_cnt, prooved_cnt, inbox_cnt): (
            i64,
            Option<i64>,
            Option<i64>,
            Option<i64>,
        ) = sqlx::query_as(
            r#"
            SELECT
                COUNT(*) as cnt,
                SUM(CASE WHEN translated_text IS NOT NULL AND translated_text != '' THEN 1 ELSE 0 END) as translated_sum,
                SUM(CASE WHEN is_prooved = 1 THEN 1 ELSE 0 END) as prooved_sum,
                SUM(CASE WHEN is_inbox = 1 THEN 1 ELSE 0 END) as inbox_sum
            FROM local_unit_tbl
            WHERE page_id = ?
            "#,
        )
        .bind(page_id)
        .fetch_one(trx.as_mut())
        .await
        .map_err(|e| anyhow!("聚合页面单元统计失败: {}", e))?;

        let translated_cnt = translated_cnt.unwrap_or(0);
        let prooved_cnt = prooved_cnt.unwrap_or(0);
        let inbox_cnt = inbox_cnt.unwrap_or(0);
        let outbox_cnt = units_cnt - inbox_cnt;

        sqlx::query(
            r#"
            DELETE FROM local_page_tbl WHERE id = ?
            "#,
        )
        .bind(page_id)
        .execute(trx.as_mut())
        .await
        .map_err(|e| anyhow!("批量删除项目页时失败: {}", e))?;

        sqlx::query(
            r#"
            UPDATE local_project_tbl
            SET page_count = page_count - 1,
                unit_count = unit_count - ?,
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
        .execute(trx.as_mut())
        .await
        .map_err(|e| anyhow!("更新项目元数据时失败: {}", e))?;
    }

    trx.commit()
        .await
        .map_err(|e| anyhow!("提交删除项目页批量事务失败: {}", e))?;

    Ok(())
}
