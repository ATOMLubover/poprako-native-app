use sqlx::SqliteConnection;

pub mod page;
pub mod unit;

use crate::{
    model::po::project::{CachedProject, LocalProject, NewCachedProject, NewLocalProject},
    // result_trace::ResultTrace as _,
};

use anyhow::anyhow;

pub async fn pick_local_project(
    conn: &mut SqliteConnection,
    project_id: &str,
) -> anyhow::Result<LocalProject> {
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
    .fetch_one(&mut *conn)
    .await
    .map_err(|e| anyhow!("获取项目时失败: {}", e))?;

    Ok(project)
}

pub async fn pick_cached_project(
    conn: &mut SqliteConnection,
    project_id: &str,
) -> anyhow::Result<CachedProject> {
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
    .fetch_one(&mut *conn)
    .await
    .map_err(|e| anyhow!("获取缓存项目时失败: {}", e))?;

    Ok(project)
}

pub async fn get_cached_projects(
    conn: &mut SqliteConnection,
) -> anyhow::Result<Vec<CachedProject>> {
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
    .fetch_all(&mut *conn)
    .await
    .map_err(|e| anyhow!("获取项目列表时失败: {}", e))?;

    Ok(project_list)
}

pub async fn get_local_projects(conn: &mut SqliteConnection) -> anyhow::Result<Vec<LocalProject>> {
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
    .fetch_all(&mut *conn)
    .await
    .map_err(|e| anyhow!("获取本地项目列表时失败: {}", e))?;

    Ok(project_list)
}

#[allow(dead_code)]
pub async fn create_cached_project(
    conn: &mut SqliteConnection,
    project: &NewCachedProject,
) -> anyhow::Result<()> {
    sqlx::query(
        r#"
        INSERT INTO cached_project_tbl (id, author, title, local_image_dir, page_count)
        VALUES (?, ?, ?, ?, ?)
        "#,
    )
    .bind(&project.id)
    .bind(&project.author)
    .bind(&project.title)
    .bind(&project.local_image_dir)
    .bind(project.page_count)
    .execute(&mut *conn)
    .await
    .map_err(|e| anyhow!("创建缓存项目时失败: {}", e))?;

    Ok(())
}

pub async fn create_local_project(
    conn: &mut SqliteConnection,
    project: &NewLocalProject,
) -> anyhow::Result<()> {
    sqlx::query(
        r#"
        INSERT INTO local_project_tbl (id, author, title, local_image_dir, page_count)
        VALUES (?, ?, ?, ?, ?)
        "#,
    )
    .bind(&project.id)
    .bind(&project.author)
    .bind(&project.title)
    .bind(&project.local_image_dir)
    .bind(project.page_count)
    .execute(&mut *conn)
    .await
    .map_err(|e| anyhow!("创建本地项目时失败: {}", e))?;

    Ok(())
}

pub async fn update_local_project(
    conn: &mut SqliteConnection,
    project: &LocalProject,
) -> anyhow::Result<()> {
    sqlx::query(
        r#"
        UPDATE local_project_tbl
        SET author = ?, title = ?, local_image_dir = ?, page_count = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
        "#,
    )
    .bind(&project.author)
    .bind(&project.title)
    .bind(&project.local_image_dir)
    .bind(project.page_count)
    .bind(&project.id)
    .execute(&mut *conn)
    .await
    .map_err(|e| anyhow!("更新本地项目时失败: {}", e))?;

    Ok(())
}

pub async fn delete_local_project(
    conn: &mut SqliteConnection,
    project_id: &str,
) -> anyhow::Result<()> {
    sqlx::query(
        r#"
        DELETE FROM local_project_tbl
        WHERE id = ?
        "#,
    )
    .bind(project_id)
    .execute(&mut *conn)
    .await
    .map_err(|e| anyhow!("删除本地项目时失败: {}", e))?;

    Ok(())
}
