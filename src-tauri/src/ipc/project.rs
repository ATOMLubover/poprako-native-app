use std::path::PathBuf;
use std::{fs, process::Command, vec};

use crate::{
    ipc::get_ipc_request_id, model::po::project as po_project, model::project as model_project,
    project::export_poprako_project as serv_export_poprako_project,
    repository::project as repo_project, result_trace::ResultTrace, APP_CACHE_DIR,
};

#[tauri::command]
#[tracing::instrument]
pub async fn get_projects() -> Result<Vec<model_project::Project>, String> {
    let ipc_id = get_ipc_request_id();
    tracing::info!(ipc_id = ipc_id, "ipc.project.get_projects.start");

    // collect with numeric timestamps for sorting, keep Project.updated_at as string
    let mut combined: Vec<(i64, model_project::Project)> = Vec::new();

    let local_projects = repo_project::get_local_projects()
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
                local_image_dir: lp.local_image_dir,
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

    let cached_projects = repo_project::get_cached_projects()
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

    // 需要在创建 project 后仍能使用 project id，因此先克隆一些会在后续使用的字段
    let project_id = project.id.clone();
    let author = project.author.clone();
    let title = project.title.clone();

    // create local project record in repository
    let new_project = po_project::NewLocalProject {
        id: project_id.clone(),
        author: author.clone(),
        title: title.clone(),
        local_image_dir: project.local_image_dir.as_deref().unwrap_or("").to_string(),
        page_count: project.page_count,
    };

    repo_project::create_local_project(&new_project)
        .await
        .trace_error("创建本地项目条目时失败")
        .map_err(|e| e.to_string())?;

    // 创建项目成功后，读取 local_image_dir 下的图片并创建对应的页面条目
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

    // Sort images by file name to maintain order.
    images.sort_by_key(|p| p.file_name().map(|s| s.to_os_string()));

    for (i, img_path) in images.into_iter().enumerate() {
        let page_id = format!("{}-page-{}", project_id, i);

        repo_project::create_project_page(&po_project::LocalPage {
            id: page_id,
            project_id: project_id.clone(),
            index_in_project: i as u32,
            local_image_path: img_path.to_string_lossy().to_string(),
        })
        .await
        .trace_error("创建项目页时失败")
        .map_err(|e| e.to_string())?;
    }

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
        let new_project = po_project::NewLocalProject {
            id: project.id.clone(),
            author: project.author.clone(),
            title: project.title.clone(),
            local_image_dir: project.local_image_dir.clone().unwrap_or_default(),
            page_count: project.page_count,
        };

        repo_project::update_local_project(&new_project)
            .await
            .trace_error("更新本地项目条目时失败")
            .map_err(|e| e.to_string())?;
    }

    tracing::info!(ipc_id = ipc_id, "ipc.project.update_project.success");

    Ok(())
}

#[tauri::command]
#[tracing::instrument]
pub async fn get_project_pages(
    project_id: String,
) -> Result<Vec<model_project::LocalPage>, String> {
    let ipc_id = get_ipc_request_id();

    tracing::info!(ipc_id = ipc_id, "ipc.project.get_project_pages.start");

    let pages = repo_project::get_project_pages(project_id.as_str())
        .await
        .trace_error("获取项目页列表时失败")
        .map_err(|e| e.to_string())?;

    let mut result: Vec<model_project::LocalPage> = Vec::new();

    for p in pages {
        let units_po = repo_project::get_page_units(p.id.as_str())
            .await
            .trace_error("获取页面单元时失败")
            .map_err(|e| e.to_string())?;

        let units_model = units_po
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

        result.push(model_project::LocalPage {
            id: p.id,
            local_image_path: p.local_image_path,
            units: units_model,
        });
    }

    tracing::info!(ipc_id = ipc_id, "ipc.project.get_project_pages.success");

    Ok(result)
}

#[tauri::command]
#[tracing::instrument]
pub async fn create_project_page(
    project_id: String,
    index_in_project: u32,
    page: model_project::LocalPage,
) -> Result<(), String> {
    let ipc_id = get_ipc_request_id();

    tracing::info!(ipc_id = ipc_id, "ipc.project.create_project_page.start");

    repo_project::create_project_page(&po_project::LocalPage {
        id: page.id.clone(),
        project_id: project_id.clone(),
        index_in_project,
        local_image_path: page.local_image_path.clone(),
    })
    .await
    .trace_error("创建项目页时失败")
    .map_err(|e| e.to_string())?;

    for u in page.units.iter() {
        repo_project::create_page_unit(&po_project::LocalUnit {
            id: u.id.clone(),
            page_id: page.id.clone(),
            x_coordinate: u.x,
            y_coordinate: u.y,
            index_in_page: u.index_in_page,
            is_inbox: u.is_inbox,
            translated_text: u.translated_text.clone(),
            is_prooved: u.is_prooved,
            prooved_text: u.prooved_text.clone(),
            comment: u.comment.clone(),
            is_local: true,
        })
        .await
        .trace_error("创建页面单元时失败")
        .map_err(|e| e.to_string())?;
    }

    tracing::info!(ipc_id = ipc_id, "ipc.project.create_project_page.success");

    Ok(())
}

#[tauri::command]
#[tracing::instrument]
pub async fn update_project_page(
    project_id: String,
    index_in_project: u32,
    page: model_project::LocalPage,
) -> Result<(), String> {
    let ipc_id = get_ipc_request_id();

    tracing::info!(ipc_id = ipc_id, "ipc.project.update_project_page.start");

    repo_project::update_project_page(&po_project::LocalPage {
        id: page.id.clone(),
        project_id,
        index_in_project,
        local_image_path: page.local_image_path.clone(),
    })
    .await
    .trace_error("更新项目页时失败")
    .map_err(|e| e.to_string())?;

    // 注意：单元的增删改最好由客户端分别调用对应的 IPC，这里仅保持对单元的 update 调用（如果需要）
    for u in page.units.iter() {
        repo_project::update_page_unit(&po_project::LocalUnit {
            id: u.id.clone(),
            page_id: page.id.clone(),
            x_coordinate: u.x,
            y_coordinate: u.y,
            index_in_page: u.index_in_page,
            is_inbox: u.is_inbox,
            translated_text: u.translated_text.clone(),
            is_prooved: u.is_prooved,
            prooved_text: u.prooved_text.clone(),
            comment: u.comment.clone(),
            is_local: true,
        })
        .await
        .trace_error("更新页面单元时失败")
        .map_err(|e| e.to_string())?;
    }

    tracing::info!(ipc_id = ipc_id, "ipc.project.update_project_page.success");

    Ok(())
}

#[tauri::command]
#[tracing::instrument]
pub async fn delete_project_page(page_id: String) -> Result<(), String> {
    let ipc_id = get_ipc_request_id();

    tracing::info!(ipc_id = ipc_id, "ipc.project.delete_project_page.start");

    repo_project::delete_project_page(page_id.as_str())
        .await
        .trace_error("删除项目页时失败")
        .map_err(|e| e.to_string())?;

    tracing::info!(ipc_id = ipc_id, "ipc.project.delete_project_page.success");

    Ok(())
}

#[tauri::command]
#[tracing::instrument]
pub async fn get_page_units(page_id: String) -> Result<Vec<model_project::LocalUnit>, String> {
    let ipc_id = get_ipc_request_id();

    tracing::info!(ipc_id = ipc_id, "ipc.project.get_page_units.start");

    let units = repo_project::get_page_units(page_id.as_str())
        .await
        .trace_error("获取页面单元列表时失败")
        .map_err(|e| e.to_string())?;

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

    tracing::info!(ipc_id = ipc_id, "ipc.project.get_page_units.success");

    Ok(result)
}

#[tauri::command]
#[tracing::instrument]
pub async fn create_page_unit(
    page_id: String,
    unit: model_project::LocalUnit,
) -> Result<(), String> {
    let ipc_id = get_ipc_request_id();

    tracing::info!(ipc_id = ipc_id, "ipc.project.create_page_unit.start");

    repo_project::create_page_unit(&po_project::LocalUnit {
        id: unit.id.clone(),
        page_id: page_id.clone(),
        x_coordinate: unit.x,
        y_coordinate: unit.y,
        index_in_page: unit.index_in_page,
        is_inbox: unit.is_inbox,
        translated_text: unit.translated_text.clone(),
        is_prooved: unit.is_prooved,
        prooved_text: unit.prooved_text.clone(),
        comment: unit.comment.clone(),
        is_local: true,
    })
    .await
    .trace_error("创建页面单元时失败")
    .map_err(|e| e.to_string())?;

    tracing::info!(ipc_id = ipc_id, "ipc.project.create_page_unit.success");

    Ok(())
}

#[tauri::command]
#[tracing::instrument]
pub async fn update_page_unit(
    page_id: String,
    unit: model_project::LocalUnit,
) -> Result<(), String> {
    let ipc_id = get_ipc_request_id();

    tracing::info!(ipc_id = ipc_id, "ipc.project.update_page_unit.start");

    repo_project::update_page_unit(&po_project::LocalUnit {
        id: unit.id.clone(),
        page_id: page_id.clone(),
        x_coordinate: unit.x,
        y_coordinate: unit.y,
        index_in_page: unit.index_in_page,
        is_inbox: unit.is_inbox,
        translated_text: unit.translated_text.clone(),
        is_prooved: unit.is_prooved,
        prooved_text: unit.prooved_text.clone(),
        comment: unit.comment.clone(),
        is_local: true,
    })
    .await
    .trace_error("更新页面单元时失败")
    .map_err(|e| e.to_string())?;

    tracing::info!(ipc_id = ipc_id, "ipc.project.update_page_unit.success");

    Ok(())
}

#[tauri::command]
#[tracing::instrument]
pub async fn delete_page_unit(unit_id: String) -> Result<(), String> {
    let ipc_id = get_ipc_request_id();

    tracing::info!(ipc_id = ipc_id, "ipc.project.delete_page_unit.start");

    repo_project::delete_page_unit(unit_id.as_str())
        .await
        .trace_error("删除页面单元时失败")
        .map_err(|e| e.to_string())?;

    tracing::info!(ipc_id = ipc_id, "ipc.project.delete_page_unit.success");

    Ok(())
}

/// Opens a folder selection dialog and returns the list of images in the selected directory.
#[tauri::command]
#[tracing::instrument]
pub async fn select_project_dir() -> Result<Vec<String>, String> {
    tracing::info!("ipc.project.select_project_dir.start");

    let script = r#"
        Add-Type -AssemblyName System.Windows.Forms
        $dialog = New-Object System.Windows.Forms.FolderBrowserDialog
        $dialog.Description = "选择项目目录"
        $dialog.ShowNewFolderButton = $true
        $result = $dialog.ShowDialog()
        if ($result -eq 'OK') {
            $dialog.SelectedPath
        }
    "#;

    let output = Command::new("powershell")
        .args(&["-NoProfile", "-Command", script])
        .output()
        .map_err(|e| format!("无法启动 PowerShell: {}", e))
        .trace_error("启动项目目录选择对话框失败")?;

    if !output.status.success() {
        tracing::warn!("ipc.project.select_project_dir.cancelled_or_failed");
        return Ok(vec![]);
    }

    let dir = String::from_utf8_lossy(&output.stdout);

    let dir_opt = dir
        .lines()
        .map(|s| s.trim())
        .find(|s| !s.is_empty())
        .map(|s| s.to_string());

    let dir = match dir_opt {
        Some(p) => p,
        None => {
            tracing::warn!("ipc.project.select_project_dir.no_selection");
            return Ok(vec![]);
        }
    };

    let mut images: Vec<String> = Vec::new();

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
        selected = dir.as_str(),
        images = ?images,
        "ipc.project.select_project_dir.success"
    );

    Ok(images)
}

/// Exports the project data to a file in Poprako format.
/// If successful, returns the path to the exported file.
#[tauri::command]
#[tracing::instrument]
pub async fn export_poprako_project(project_id: String) -> Result<String, String> {
    let ipc_id = get_ipc_request_id();

    tracing::info!(ipc_id = ipc_id, "ipc.project.export_poprako_project.start");

    let project = repo_project::select_local_project(&project_id).await?;

    let pages = repo_project::get_project_pages(&project_id).await?;

    let mut units = vec![];

    for p in &pages {
        let page_units = repo_project::get_page_units(&p.id).await?;
        units.push(page_units);
    }

    let local_pages = pages
        .into_iter()
        .zip(units.into_iter())
        .map(|(p, us)| model_project::ExportPage {
            local_image_path: p.local_image_path,
            units: us
                .into_iter()
                .map(|u| model_project::ExportUnit {
                    x: u.x_coordinate,
                    y: u.y_coordinate,
                    index_in_page: u.index_in_page,
                    is_inbox: u.is_inbox,
                    translated_text: u.translated_text,
                    is_prooved: u.is_prooved,
                    prooved_text: u.prooved_text,
                    comment: u.comment,
                })
                .collect(),
        })
        .collect();

    let export_project = model_project::ExportProject {
        author: project.author,
        title: project.title,
        pages: local_pages,
    };

    let cache_dir = APP_CACHE_DIR
        .read()
        .trace_error("读取应用缓存目录失败")
        .map_err(|e| e.to_string())?
        .clone()
        .ok_or("应用缓存目录未设置".to_string())?;

    let dst_path = cache_dir.join(format!("project-{}.poprako.dat", project_id));

    serv_export_poprako_project(export_project, dst_path.clone())
        .await
        .trace_error("导出 Poprako 项目失败")
        .map_err(|e| e.to_string())?;

    Ok(dst_path.to_string_lossy().to_string())
}

/// Exports the project data to a file in LabelPlus format.
/// If successful, returns the path to the exported file.
#[tauri::command]
#[tracing::instrument]
pub async fn export_labelplus_project(project_id: String) -> Result<String, String> {
    todo!()
}
