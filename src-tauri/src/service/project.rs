use std::path::PathBuf;

use anyhow::anyhow;
use time::OffsetDateTime;

pub mod page;
pub mod port;
pub mod unit;

use crate::{
    model::{
        po::project as po_project,
        project::{NewLocalProject, Project, SelectedProjectDir},
    },
    repository::{
        acquire_connection, aquire_transaction,
        project::{self as repo_project, page as repo_page},
    },
    util::file::{select_dir, select_file},
};

/// Opens a directory selection dialog and returns the count of selected image files within the chosen directory.
pub fn select_project_dir() -> anyhow::Result<SelectedProjectDir> {
    let dir = select_dir(false)?
        .pop()
        .ok_or_else(|| anyhow!("未选择任何目录"))?;

    let mut image_count = 0;

    let entries = std::fs::read_dir(&dir)?;

    for e in entries {
        let entry = e.map_err(|e| anyhow!("解析项目目录项时失败: {}", e))?;

        let path = entry.path();

        if !path.is_file() {
            continue;
        }

        if let Some(ext) = path.extension() {
            if ext.eq_ignore_ascii_case("png")
                || ext.eq_ignore_ascii_case("jpg")
                || ext.eq_ignore_ascii_case("jpeg")
            {
                image_count += 1;
            }
        }
    }

    Ok(SelectedProjectDir {
        dir_path: dir.to_string_lossy().to_string(),
        image_count,
    })
}

/// Opens a file selection dialog and returns the path where the selected project file is located.
pub fn select_project_file() -> anyhow::Result<PathBuf> {
    select_file(&["zip", "json", "txt"], false)?
        .pop()
        .ok_or_else(|| anyhow!("未选择任何文件"))
}

/// Creates a new local project based on the provided project details.
pub async fn create_local_project(project: NewLocalProject) -> anyhow::Result<()> {
    // Scan project directory for image files
    let project_dir = PathBuf::from(&project.local_image_dir);

    let mut images_pathes = vec![];

    let entries = std::fs::read_dir(&project_dir)?;

    for ent in entries {
        let entry = ent.map_err(|e| anyhow!("解析项目目录项时失败: {}", e))?;

        let path = entry.path();

        if !path.is_file() {
            continue;
        }

        if let Some(ext) = path.extension() {
            if ext.eq_ignore_ascii_case("png")
                || ext.eq_ignore_ascii_case("jpg")
                || ext.eq_ignore_ascii_case("jpeg")
            {
                let filename = path
                    .file_name()
                    .ok_or_else(|| anyhow!("获取图片文件名时失败"))?
                    .to_string_lossy()
                    .to_string();

                let dst_path = project_dir.clone().join(&filename);

                images_pathes.push(dst_path);
            }
        }
    }

    images_pathes.sort_by_key(|p| p.file_name().map(|s| s.to_os_string()));

    // Prepare new project and pages

    let new_project_id = uuid::Uuid::new_v4().to_string();

    let mut pages = vec![];
    let page_count = images_pathes.len();

    for (idx, path) in images_pathes.into_iter().enumerate() {
        let path = path.to_string_lossy().to_string();

        let page_id = uuid::Uuid::new_v4().to_string();

        pages.push(po_project::NewLocalPage {
            id: page_id,
            project_id: new_project_id.clone(),
            index_in_project: idx as u32,
            local_image_path: path,
        });
    }

    // Insert into database

    let new_project = po_project::NewLocalProject {
        id: new_project_id,
        author: project.author,
        title: project.title,
        local_image_dir: project.local_image_dir,
        page_count: 0,
    };

    let mut conn = acquire_connection()
        .await
        .map_err(|e| anyhow!("获取数据库连接时失败: {}", e))?;

    let mut trx = aquire_transaction(&mut conn)
        .await
        .map_err(|e| anyhow!("开启数据库事务时失败: {}", e))?;

    repo_project::create_local_project(&mut trx, &new_project)
        .await
        .map_err(|e| anyhow!("创建本地项目时失败: {}", e))?;

    let mut new_pages = vec![];

    for page in pages.into_iter() {
        // TODO: Cut down clones.
        new_pages.push(po_project::LocalPage {
            id: page.id.clone(),
            project_id: page.project_id.clone(),
            index_in_project: page.index_in_project,
            local_image_path: page.local_image_path.clone(),
        });
    }

    if !new_pages.is_empty() {
        repo_page::save_project_pages(&mut trx, &new_pages)
            .await
            .map_err(|e| anyhow!("创建本地项目页面时失败: {}", e))?;
    }

    trx.commit()
        .await
        .map_err(|e| anyhow!("提交数据库事务时失败: {}", e))?;

    Ok(())
}

/// Gets all projects (local and cached) sorted by updated time.
pub async fn get_projects() -> anyhow::Result<Vec<Project>> {
    let mut conn = acquire_connection()
        .await
        .map_err(|e| anyhow!("获取数据库连接时失败: {}", e))?;

    let mut combined: Vec<(i64, Project)> = Vec::new();

    let local_projects = repo_project::get_local_projects(&mut conn)
        .await
        .map_err(|e| anyhow!("获取本地项目列表时失败: {}", e))?;

    for lp in local_projects {
        let ts = lp.updated_at.unix_timestamp();

        combined.push((
            ts,
            Project {
                id: lp.id,
                author: lp.author,
                title: lp.title,
                local_image_dir: Some(lp.local_image_dir),
                related_comic_id: lp.related_comic_id,
                unit_count: lp.unit_count,
                translated_unit_count: lp.translated_unit_count,
                prooved_unit_count: lp.prooved_unit_count,
                inbox_unit_count: lp.inbox_unit_count,
                outbox_unit_count: lp.outbox_unit_count,
                page_count: lp.page_count,
                updated_at: lp.updated_at.to_string(),
            },
        ));
    }

    let cached_projects = repo_project::get_cached_projects(&mut conn)
        .await
        .map_err(|e| anyhow!("获取缓存项目列表时失败: {}", e))?;

    for cp in cached_projects {
        let ts = cp.updated_at.unix_timestamp();

        combined.push((
            ts,
            Project {
                id: cp.id,
                author: cp.author,
                title: cp.title,
                local_image_dir: Some(cp.local_image_dir),
                related_comic_id: Some(cp.related_comic_id),
                unit_count: cp.unit_count,
                translated_unit_count: cp.translated_unit_count,
                prooved_unit_count: cp.prooved_unit_count,
                inbox_unit_count: Some(cp.inbox_unit_count),
                outbox_unit_count: Some(cp.outbox_unit_count),
                page_count: cp.page_count,
                updated_at: cp.updated_at.to_string(),
            },
        ));
    }

    combined.sort_by(|a, b| b.0.cmp(&a.0));

    let projects = combined
        .into_iter()
        .map(|(_, p)| p)
        .collect::<Vec<Project>>();

    Ok(projects)
}

/// Updates an existing local project.
pub async fn update_local_project(project: Project) -> anyhow::Result<()> {
    if project.local_image_dir.is_none() {
        return Ok(());
    }

    let mut conn = acquire_connection()
        .await
        .map_err(|e| anyhow!("获取数据库连接时失败: {}", e))?;

    let project = po_project::LocalProject {
        id: project.id.clone(),
        author: project.author.clone(),
        title: project.title.clone(),
        local_image_dir: project
            .local_image_dir
            .ok_or(anyhow!("更新项目必须提供 local_image_dir"))?,
        related_comic_id: project.related_comic_id,
        unit_count: project.unit_count,
        translated_unit_count: project.translated_unit_count,
        prooved_unit_count: project.prooved_unit_count,
        inbox_unit_count: project.inbox_unit_count,
        outbox_unit_count: project.outbox_unit_count,
        page_count: project.page_count,
        updated_at: OffsetDateTime::now_utc(),
    };

    repo_project::update_local_project(&mut conn, &project)
        .await
        .map_err(|e| anyhow!("更新本地项目条目时失败: {}", e))?;

    Ok(())
}

/// Deletes a local project by ID.
pub async fn delete_project(project_id: &str) -> anyhow::Result<()> {
    let mut conn = acquire_connection()
        .await
        .map_err(|e| anyhow!("获取数据库连接时失败: {}", e))?;

    repo_project::delete_local_project(&mut conn, project_id)
        .await
        .map_err(|e| anyhow!("删除本地项目时失败: {}", e))?;

    Ok(())
}
