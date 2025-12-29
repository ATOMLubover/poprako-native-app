use std::process::Command;

use crate::{
    ipc::get_ipc_request_id,
    model::{self},
    repository::project,
    result_trace::ResultTrace,
};

#[tauri::command]
#[tracing::instrument]
pub async fn get_projects(offset: i64, limit: i64) -> Result<Vec<model::project::Project>, String> {
    let ipc_id = get_ipc_request_id();

    tracing::info!(ipc_id = ipc_id, "ipc.project.get_projects.start");

    let project_list = project::get_projects(offset, limit)
        .await
        .trace_error("创建项目时失败")
        .map_err(|e| e.to_string())?;

    tracing::info!(ipc_id = ipc_id, "ipc.project.get_projects.success");

    Ok(project_list
        .into_iter()
        .map(|project| model::project::Project {
            id: project.id,
            author: project.author,
            title: project.title,
            local_image_dir: project.local_image_dir,
            related_remote_comic_id: project.related_remote_comic_id,
            unit_count: project.unit_count,
            translated_unit_count: project.translated_unit_count,
            prooved_unit_count: project.prooved_unit_count,
            inbox_unit_count: project.inbox_unit_count,
            outbox_unit_count: project.outbox_unit_count,
            page_count: project.page_count,
        })
        .collect::<Vec<model::project::Project>>())
}

#[tauri::command]
#[tracing::instrument]
pub async fn create_project(project: model::project::Project) -> Result<(), String> {
    let ipc_id = get_ipc_request_id();

    tracing::info!(ipc_id = ipc_id, "ipc.project.create_project.start");

    project::create_project(&model::po::project::Project {
        id: project.id,
        author: project.author,
        title: project.title,
        local_image_dir: project.local_image_dir,
        related_remote_comic_id: project.related_remote_comic_id,
        unit_count: project.unit_count,
        translated_unit_count: project.translated_unit_count,
        prooved_unit_count: project.prooved_unit_count,
        inbox_unit_count: project.inbox_unit_count,
        outbox_unit_count: project.outbox_unit_count,
        page_count: project.page_count,
    })
    .await
    .trace_error("创建项目时失败")
    .map_err(|e| e.to_string())?;

    tracing::info!(ipc_id = ipc_id, "ipc.project.create_project.success");

    Ok(())
}

#[tauri::command]
#[tracing::instrument]
pub async fn update_project(project: model::project::Project) -> Result<(), String> {
    let ipc_id = get_ipc_request_id();

    tracing::info!(ipc_id = ipc_id, "ipc.project.update_project.start");

    project::update_project(&model::po::project::Project {
        id: project.id,
        author: project.author,
        title: project.title,
        local_image_dir: project.local_image_dir,
        related_remote_comic_id: project.related_remote_comic_id,
        unit_count: project.unit_count,
        translated_unit_count: project.translated_unit_count,
        prooved_unit_count: project.prooved_unit_count,
        inbox_unit_count: project.inbox_unit_count,
        outbox_unit_count: project.outbox_unit_count,
        page_count: project.page_count,
    })
    .await
    .trace_error("更新项目时失败")
    .map_err(|e| e.to_string())?;

    tracing::info!(ipc_id = ipc_id, "ipc.project.update_project.success");

    Ok(())
}

#[tauri::command]
#[tracing::instrument]
pub async fn get_project_pages(
    project_id: String,
) -> Result<Vec<model::project::LocalPage>, String> {
    let ipc_id = get_ipc_request_id();

    tracing::info!(ipc_id = ipc_id, "ipc.project.get_project_pages.start");

    let pages = project::get_project_pages(project_id.as_str())
        .await
        .trace_error("获取项目页列表时失败")
        .map_err(|e| e.to_string())?;

    let mut result: Vec<model::project::LocalPage> = Vec::new();

    for p in pages {
        let units_po = project::get_page_units(p.id.as_str())
            .await
            .trace_error("获取页面单元时失败")
            .map_err(|e| e.to_string())?;

        let units_model = units_po
            .into_iter()
            .map(|u| model::project::LocalUnit {
                id: u.id,
                x: u.x,
                y: u.y,
                index_in_page: u.index_in_page,
                is_inbox: u.is_inbox,
                translated_text: u.translated_text,
                is_prooved: u.is_prooved,
                prooved_text: u.prooved_text,
                comment: u.comment,
            })
            .collect::<Vec<model::project::LocalUnit>>();

        result.push(model::project::LocalPage {
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
    page: model::project::LocalPage,
) -> Result<(), String> {
    let ipc_id = get_ipc_request_id();

    tracing::info!(ipc_id = ipc_id, "ipc.project.create_project_page.start");

    project::create_project_page(&model::po::project::LocalPage {
        id: page.id.clone(),
        project_id: project_id.clone(),
        index_in_project,
        local_image_path: page.local_image_path.clone(),
    })
    .await
    .trace_error("创建项目页时失败")
    .map_err(|e| e.to_string())?;

    for u in page.units.iter() {
        project::create_page_unit(&model::po::project::LocalUnit {
            id: u.id.clone(),
            page_id: page.id.clone(),
            x: u.x,
            y: u.y,
            index_in_page: u.index_in_page,
            is_inbox: u.is_inbox,
            translated_text: u.translated_text.clone(),
            is_prooved: u.is_prooved,
            prooved_text: u.prooved_text.clone(),
            comment: u.comment.clone(),
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
    page: model::project::LocalPage,
) -> Result<(), String> {
    let ipc_id = get_ipc_request_id();

    tracing::info!(ipc_id = ipc_id, "ipc.project.update_project_page.start");

    project::update_project_page(&model::po::project::LocalPage {
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
        project::update_page_unit(&model::po::project::LocalUnit {
            id: u.id.clone(),
            page_id: page.id.clone(),
            x: u.x,
            y: u.y,
            index_in_page: u.index_in_page,
            is_inbox: u.is_inbox,
            translated_text: u.translated_text.clone(),
            is_prooved: u.is_prooved,
            prooved_text: u.prooved_text.clone(),
            comment: u.comment.clone(),
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

    project::delete_project_page(page_id.as_str())
        .await
        .trace_error("删除项目页时失败")
        .map_err(|e| e.to_string())?;

    tracing::info!(ipc_id = ipc_id, "ipc.project.delete_project_page.success");

    Ok(())
}

#[tauri::command]
#[tracing::instrument]
pub async fn get_page_units(page_id: String) -> Result<Vec<model::project::LocalUnit>, String> {
    let ipc_id = get_ipc_request_id();

    tracing::info!(ipc_id = ipc_id, "ipc.project.get_page_units.start");

    let units = project::get_page_units(page_id.as_str())
        .await
        .trace_error("获取页面单元列表时失败")
        .map_err(|e| e.to_string())?;

    let result = units
        .into_iter()
        .map(|u| model::project::LocalUnit {
            id: u.id,
            x: u.x,
            y: u.y,
            index_in_page: u.index_in_page,
            is_inbox: u.is_inbox,
            translated_text: u.translated_text,
            is_prooved: u.is_prooved,
            prooved_text: u.prooved_text,
            comment: u.comment,
        })
        .collect::<Vec<model::project::LocalUnit>>();

    tracing::info!(ipc_id = ipc_id, "ipc.project.get_page_units.success");

    Ok(result)
}

#[tauri::command]
#[tracing::instrument]
pub async fn create_page_unit(
    page_id: String,
    unit: model::project::LocalUnit,
) -> Result<(), String> {
    let ipc_id = get_ipc_request_id();

    tracing::info!(ipc_id = ipc_id, "ipc.project.create_page_unit.start");

    project::create_page_unit(&model::po::project::LocalUnit {
        id: unit.id.clone(),
        page_id: page_id.clone(),
        x: unit.x,
        y: unit.y,
        index_in_page: unit.index_in_page,
        is_inbox: unit.is_inbox,
        translated_text: unit.translated_text.clone(),
        is_prooved: unit.is_prooved,
        prooved_text: unit.prooved_text.clone(),
        comment: unit.comment.clone(),
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
    unit: model::project::LocalUnit,
) -> Result<(), String> {
    let ipc_id = get_ipc_request_id();

    tracing::info!(ipc_id = ipc_id, "ipc.project.update_page_unit.start");

    project::update_page_unit(&model::po::project::LocalUnit {
        id: unit.id.clone(),
        page_id: page_id.clone(),
        x: unit.x,
        y: unit.y,
        index_in_page: unit.index_in_page,
        is_inbox: unit.is_inbox,
        translated_text: unit.translated_text.clone(),
        is_prooved: unit.is_prooved,
        prooved_text: unit.prooved_text.clone(),
        comment: unit.comment.clone(),
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

    project::delete_page_unit(unit_id.as_str())
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
