use sqlx::SqliteConnection;

pub mod page;
pub mod unit;

use crate::{
    model::po::project::{CachedProject, LocalProject, NewCachedProject, NewLocalProject},
    result_trace::ResultTrace as _,
};

pub async fn pick_local_project(
    conn: &mut SqliteConnection,
    project_id: &str,
) -> Result<LocalProject, String> {
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
    .trace_error("获取项目时失败")
    .map_err(|e| e.to_string())?;

    Ok(project)
}

pub async fn pick_cached_project(
    conn: &mut SqliteConnection,
    project_id: &str,
) -> Result<CachedProject, String> {
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
    .trace_error("获取缓存项目时失败")
    .map_err(|e| e.to_string())?;

    Ok(project)
}

pub async fn get_cached_projects(
    conn: &mut SqliteConnection,
) -> Result<Vec<CachedProject>, String> {
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
    .trace_error("获取项目列表时失败")
    .map_err(|e| e.to_string())?;

    Ok(project_list)
}

pub async fn get_local_projects(conn: &mut SqliteConnection) -> Result<Vec<LocalProject>, String> {
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
    .trace_error("获取本地项目列表时失败")
    .map_err(|e| e.to_string())?;

    Ok(project_list)
}

#[allow(dead_code)]
pub async fn create_cached_project(
    conn: &mut SqliteConnection,
    project: &NewCachedProject,
) -> Result<(), String> {
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
    .trace_error("创建缓存项目时失败")
    .map_err(|e| e.to_string())?;

    Ok(())
}

pub async fn create_local_project(
    conn: &mut SqliteConnection,
    project: &NewLocalProject,
) -> Result<(), String> {
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
    .trace_error("创建本地项目时失败")
    .map_err(|e| e.to_string())?;

    Ok(())
}

pub async fn update_local_project(
    conn: &mut SqliteConnection,
    project: &NewLocalProject,
) -> Result<(), String> {
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
    .trace_error("更新本地项目时失败")
    .map_err(|e| e.to_string())?;

    Ok(())
}

pub async fn delete_local_project(
    conn: &mut SqliteConnection,
    project_id: &str,
) -> Result<(), String> {
    sqlx::query(
        r#"
        DELETE FROM local_project_tbl
        WHERE id = ?
        "#,
    )
    .bind(project_id)
    .execute(&mut *conn)
    .await
    .trace_error("删除本地项目时失败")
    .map_err(|e| e.to_string())?;

    Ok(())
}
