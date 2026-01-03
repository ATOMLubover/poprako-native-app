use std::fs;
use std::path::PathBuf;

pub mod page;
pub mod port;
pub mod unit;

use crate::{
    ipc::get_ipc_request_id,
    model::po::project as po_project,
    model::project as model_project,
    repository::{acquire_connection, project as repo_project},
    result_trace::ResultTrace,
    selector::{select_paths, Filter as SelectorFilter},
};

#[tauri::command]
#[tracing::instrument]
pub async fn get_projects() -> Result<Vec<model_project::Project>, String> {
    let ipc_id = get_ipc_request_id();

    tracing::info!(ipc_id = ipc_id, "ipc.project.get_projects.start");

    let mut conn = acquire_connection().await?;

    // collect with numeric timestamps for sorting, keep Project.updated_at as string
    let mut combined: Vec<(i64, model_project::Project)> = Vec::new();

    let local_projects = repo_project::get_local_projects(&mut conn)
        .await
        .trace_error("获取本地项目列表时失败")
        .map_err(|e| e.to_string())?;

    for lp in local_projects {
        let ts = lp.updated_at.unix_timestamp();

        combined.push((
            ts,
            model_project::Project {
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
        .trace_error("获取缓存项目列表时失败")
        .map_err(|e| e.to_string())?;

    for cp in cached_projects {
        let ts = cp.updated_at.unix_timestamp();

        combined.push((
            ts,
            model_project::Project {
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

    // sort by timestamp desc
    combined.sort_by(|a, b| b.0.cmp(&a.0));

    let projects = combined
        .into_iter()
        .map(|(_, p)| p)
        .collect::<Vec<model_project::Project>>();

    tracing::info!(ipc_id = ipc_id, "ipc.project.get_projects.success");

    Ok(projects)
}

#[tauri::command]
#[tracing::instrument]
pub async fn create_local_project(project: model_project::Project) -> Result<(), String> {
    let ipc_id = get_ipc_request_id();

    tracing::info!(ipc_id = ipc_id, "ipc.project.create_local_project.start");

    let local_image_dir = project
        .local_image_dir
        .as_ref()
        .ok_or("创建本地项目时，local_image_dir 不能为空")?
        .clone();

    let project_id = project.id.clone();

    let mut images: Vec<PathBuf> = Vec::new();

    let entries = fs::read_dir(&local_image_dir)
        .trace_error("读取项目图片目录失败")
        .map_err(|e| e.to_string())?;

    for entry_res in entries {
        let entry = entry_res
            .trace_error("读取目录条目失败")
            .map_err(|e| e.to_string())?;

        let path = entry.path();

        if !path.is_file() {
            continue;
        }

        if let Some(ext) = path.extension().and_then(|s| s.to_str()) {
            let ext_low = ext.to_lowercase();

            if ext_low == "png" || ext_low == "jpg" || ext_low == "jpeg" || ext_low == "webp" {
                images.push(path);
            }
        }
    }

    images.sort_by_key(|p| p.file_name().map(|s| s.to_os_string()));

    let mut pages_to_create: Vec<po_project::LocalPage> = Vec::new();

    for (i, img_path) in images.into_iter().enumerate() {
        let page_id = format!("{}-page-{}", project_id, i);

        pages_to_create.push(po_project::LocalPage {
            id: page_id,
            project_id: project_id.clone(),
            index_in_project: i as u32,
            local_image_path: img_path.to_string_lossy().to_string(),
        });
    }

    let mut conn = acquire_connection().await?;

    // Start a transaction to ensure create project + pages are atomic
    let mut trx = crate::repository::aquire_transaction(&mut conn).await?;

    let new_project = po_project::NewLocalProject {
        id: project_id.clone(),
        author: project.author.clone(),
        title: project.title.clone(),
        local_image_dir: local_image_dir,
        page_count: 0,
    };

    // Create project within trx
    repo_project::create_local_project(&mut trx, &new_project)
        .await
        .trace_error("创建本地项目条目时失败")
        .map_err(|e| e.to_string())?;

    // Save pages within the same trx
    if !pages_to_create.is_empty() {
        repo_project::page::save_project_pages(&mut trx, pages_to_create.as_slice())
            .await
            .trace_error("创建项目页时失败")
            .map_err(|e| e.to_string())?;
    }

    trx.commit()
        .await
        .trace_error("提交创建本地项目事务失败")
        .map_err(|e| e.to_string())?;

    tracing::info!(ipc_id = ipc_id, "ipc.project.create_local_project.success");

    Ok(())
}

#[tauri::command]
#[tracing::instrument]
pub async fn update_project(project: model_project::Project) -> Result<(), String> {
    let ipc_id = get_ipc_request_id();

    tracing::info!(ipc_id = ipc_id, "ipc.project.update_project.start");

    // update local project in repository
    if project.local_image_dir.is_some() {
        let mut conn = acquire_connection().await?;

        let new_project = po_project::NewLocalProject {
            id: project.id.clone(),
            author: project.author.clone(),
            title: project.title.clone(),
            local_image_dir: project.local_image_dir.clone().unwrap_or_default(),
            page_count: project.page_count,
        };

        repo_project::update_local_project(&mut conn, &new_project)
            .await
            .trace_error("更新本地项目条目时失败")
            .map_err(|e| e.to_string())?;
    }

    tracing::info!(ipc_id = ipc_id, "ipc.project.update_project.success");

    Ok(())
}

/// Opens a folder selection dialog and returns the list of images in the selected directory.
#[tauri::command]
#[tracing::instrument]
pub async fn select_new_project_dir() -> Result<Vec<String>, String> {
    let ipc_id = get_ipc_request_id();

    tracing::info!(ipc_id = ipc_id, "ipc.project.select_project_dir.start");

    // Use selector to pick a directory
    let dirs = select_paths(&[SelectorFilter::Folder], false)
        .trace_debug("选择项目目录时失败")
        .map_err(|e| e.to_string())?;

    if dirs.is_empty() {
        tracing::warn!(
            ipc_id = ipc_id,
            "ipc.project.select_project_dir.no_selection"
        );

        return Ok(vec![]);
    }

    let dir = dirs
        .into_iter()
        .next()
        .expect("至少应有一个目录被选择")
        .to_string_lossy()
        .to_string();

    let mut images: Vec<String> = Vec::new();

    // Normalize path and verify existence before reading
    let dir_path = std::path::Path::new(&dir);

    if !dir_path.exists() {
        tracing::error!(
            ipc_id = ipc_id,
            selected = dir.as_str(),
            "ipc.project.select_project_dir.not_found"
        );

        return Err(format!("读取所选目录失败: 路径不存在: {}", dir));
    }

    let entries = std::fs::read_dir(&dir)
        .trace_error("读取所选目录失败")
        .map_err(|e| e.to_string())?;

    for entry_res in entries {
        let entry = entry_res
            .trace_error("读取目录条目失败")
            .map_err(|e| e.to_string())?;

        let path = entry.path();

        if !path.is_file() {
            continue;
        }

        if let Some(ext) = path.extension().and_then(|s| s.to_str()) {
            let ext_low = ext.to_lowercase();

            if ext_low == "png" || ext_low == "jpg" || ext_low == "jpeg" || ext_low == "webp" {
                images.push(path.to_string_lossy().to_string());
            }
        }
    }

    tracing::info!(
        ipc_id = ipc_id,
        selected = dir.as_str(),
        images = ?images,
        "ipc.project.select_project_dir.success"
    );

    Ok(images)
}

#[tauri::command]
#[tracing::instrument]
pub async fn delete_project(project_id: String) -> Result<(), String> {
    let ipc_id = get_ipc_request_id();

    tracing::info!(ipc_id = ipc_id, "ipc.project.delete_project.start");

    let mut conn = acquire_connection().await?;

    repo_project::delete_local_project(&mut conn, &project_id)
        .await
        .trace_error("删除本地项目时失败")
        .map_err(|e| e.to_string())?;

    tracing::info!(ipc_id = ipc_id, "ipc.project.delete_project.success");

    Ok(())
}

#[tauri::command]
#[tracing::instrument]
pub async fn select_archived_project_path() -> Result<String, String> {
    let ipc_id = get_ipc_request_id();

    tracing::info!(
        ipc_id = ipc_id,
        "ipc.project.select_poprako_archived_path.start"
    );

    let exts = vec!["zip".to_string(), "json".to_string(), "txt".to_string()];

    let paths = select_paths(&[SelectorFilter::Extension(exts)], false)
        .trace_debug("选择 Poprako 项目文件失败")
        .map_err(|e| e.to_string())?;

    if paths.is_empty() {
        tracing::warn!(
            ipc_id = ipc_id,
            "ipc.project.select_poprako_archived_path.no_selection"
        );
        return Ok("".to_string());
    }

    let p = paths.into_iter().next().expect("non-empty");

    let s = p.to_string_lossy().to_string();

    tracing::info!(
        ipc_id = ipc_id,
        selected = s.as_str(),
        "ipc.project.select_poprako_archived_path.success"
    );

    Ok(s)
}
