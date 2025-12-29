use std::sync::LazyLock;

use sqlx::SqlitePool;

use crate::{
    model::po::project::{
        CachedProject, LocalPage, LocalProject, LocalUnit, NewCachedProject, NewLocalProject,
    },
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
            page_count
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
            page_count
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

pub async fn create_cached_project(project: &NewCachedProject) -> Result<(), String> {
    sqlx::query(
        "INSERT INTO cached_project_tbl (id, author, title, local_image_dir, related_comic_id, unit_count, translated_unit_count, prooved_unit_count, inbox_unit_count, outbox_unit_count, page_count)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    )
    .bind(&project.id)
    .bind(&project.author)
    .bind(&project.title)
    .bind(&project.local_image_dir)
    .bind(&project.related_comic_id)
    .bind(project.unit_count)
    .bind(project.translated_unit_count)
    .bind(project.prooved_unit_count)
    .bind(project.inbox_unit_count)
    .bind(project.outbox_unit_count)
    .bind(project.page_count)
    .execute(&*LOCAL_DB)
    .await
    .trace_error("创建缓存项目时失败")
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

pub async fn create_project_page(page: &LocalPage) -> Result<(), String> {
    sqlx::query(
        "INSERT INTO local_page_tbl (id, project_id, index_in_project, local_image_path)
         VALUES (?, ?, ?, ?)",
    )
    .bind(&page.id)
    .bind(&page.project_id)
    .bind(page.index_in_project)
    .bind(&page.local_image_path)
    .execute(&*LOCAL_DB)
    .await
    .trace_error("创建项目页时失败")
    .map_err(|e| e.to_string())?;

    Ok(())
}

pub async fn update_project_page(page: &LocalPage) -> Result<(), String> {
    sqlx::query(
        "UPDATE local_page_tbl
         SET project_id = ?, index_in_project = ?, local_image_path = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?",
    )
    .bind(&page.project_id)
    .bind(page.index_in_project)
    .bind(&page.local_image_path)
    .bind(&page.id)
    .execute(&*LOCAL_DB)
    .await
    .trace_error("更新项目页时失败")
    .map_err(|e| e.to_string())?;

    Ok(())
}

pub async fn delete_project_page(page_id: &str) -> Result<(), String> {
    sqlx::query("DELETE FROM local_page_tbl WHERE id = ?")
        .bind(page_id)
        .execute(&*LOCAL_DB)
        .await
        .trace_error("删除项目页时失败")
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

pub async fn create_page_unit(unit: &LocalUnit) -> Result<(), String> {
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
    .execute(&*LOCAL_DB)
    .await
    .trace_error("创建页面单元时失败")
    .map_err(|e| e.to_string())?;

    Ok(())
}

pub async fn update_page_unit(unit: &LocalUnit) -> Result<(), String> {
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
    .execute(&*LOCAL_DB)
    .await
    .trace_error("更新页面单元时失败")
    .map_err(|e| e.to_string())?;

    Ok(())
}

pub async fn delete_page_unit(unit_id: &str) -> Result<(), String> {
    sqlx::query("DELETE FROM local_unit_tbl WHERE id = ?")
        .bind(unit_id)
        .execute(&*LOCAL_DB)
        .await
        .trace_error("删除页面单元时失败")
        .map_err(|e| e.to_string())?;

    Ok(())
}
