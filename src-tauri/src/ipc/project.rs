use std::{fs, io::BufReader, path::PathBuf, process::Command, vec};
use zip::{write::FileOptions, CompressionMethod, ZipArchive, ZipWriter};

use crate::{
    ipc::get_ipc_request_id, model::po::project as po_project, model::project as model_project,
    project::export_poprako_project as serv_export_poprako_project,
    repository::project as repo_project, result_trace::ResultTrace,
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

    // create pages in batch
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

    if !pages_to_create.is_empty() {
        repo_project::create_project_pages(pages_to_create.as_slice())
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
pub async fn create_project_pages(
    project_id: String,
    pages: Vec<model_project::LocalPage>,
) -> Result<(), String> {
    let ipc_id = get_ipc_request_id();

    tracing::info!(ipc_id = ipc_id, "ipc.project.create_project_pages.start");

    if pages.is_empty() {
        return Ok(());
    }

    let po_pages: Vec<po_project::LocalPage> = pages
        .into_iter()
        .map(|p| po_project::LocalPage {
            id: p.id,
            project_id: project_id.clone(),
            index_in_project: p.units.get(0).map(|_| 0).unwrap_or(0),
            local_image_path: p.local_image_path,
        })
        .collect();

    repo_project::create_project_pages(po_pages.as_slice())
        .await
        .trace_error("创建项目页时失败")
        .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
#[tracing::instrument]
pub async fn update_project_pages(
    project_id: String,
    pages: Vec<model_project::LocalPage>,
) -> Result<(), String> {
    let ipc_id = get_ipc_request_id();

    tracing::info!(ipc_id = ipc_id, "ipc.project.update_project_pages.start");

    if pages.is_empty() {
        return Ok(());
    }

    let po_pages: Vec<po_project::LocalPage> = pages
        .into_iter()
        .map(|p| po_project::LocalPage {
            id: p.id,
            project_id: project_id.clone(),
            index_in_project: p.units.get(0).map(|_| 0).unwrap_or(0),
            local_image_path: p.local_image_path,
        })
        .collect();

    repo_project::update_project_pages(po_pages.as_slice())
        .await
        .trace_error("更新项目页时失败")
        .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
#[tracing::instrument]
pub async fn delete_project_pages(page_ids: Vec<String>) -> Result<(), String> {
    let ipc_id = get_ipc_request_id();

    tracing::info!(ipc_id = ipc_id, "ipc.project.delete_project_pages.start");

    if page_ids.is_empty() {
        return Ok(());
    }

    let id_refs: Vec<&str> = page_ids.iter().map(|s| s.as_str()).collect();

    repo_project::delete_project_pages(id_refs.as_slice())
        .await
        .trace_error("删除项目页时失败")
        .map_err(|e| e.to_string())?;

    tracing::info!(ipc_id = ipc_id, "ipc.project.delete_project_pages.success");

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
pub async fn create_page_units(
    page_id: String,
    units: Vec<model_project::LocalUnit>,
) -> Result<(), String> {
    let ipc_id = get_ipc_request_id();

    tracing::info!(ipc_id = ipc_id, "ipc.project.create_page_units.start");

    if units.is_empty() {
        return Ok(());
    }

    let po_units: Vec<po_project::LocalUnit> = units
        .into_iter()
        .map(|u| po_project::LocalUnit {
            id: u.id,
            page_id: page_id.clone(),
            x_coordinate: u.x,
            y_coordinate: u.y,
            index_in_page: u.index_in_page,
            is_inbox: u.is_inbox,
            translated_text: u.translated_text,
            is_prooved: u.is_prooved,
            prooved_text: u.prooved_text,
            comment: u.comment,
            is_local: true,
        })
        .collect();

    repo_project::create_page_units(po_units.as_slice())
        .await
        .trace_error("创建页面单元时失败")
        .map_err(|e| e.to_string())?;

    tracing::info!(ipc_id = ipc_id, "ipc.project.create_page_units.success");

    Ok(())
}

#[tauri::command]
#[tracing::instrument]
pub async fn update_page_units(
    page_id: String,
    units: Vec<model_project::LocalUnit>,
) -> Result<(), String> {
    let ipc_id = get_ipc_request_id();

    tracing::info!(ipc_id = ipc_id, "ipc.project.update_page_units.start");

    if units.is_empty() {
        return Ok(());
    }

    let po_units: Vec<po_project::LocalUnit> = units
        .into_iter()
        .map(|u| po_project::LocalUnit {
            id: u.id,
            page_id: page_id.clone(),
            x_coordinate: u.x,
            y_coordinate: u.y,
            index_in_page: u.index_in_page,
            is_inbox: u.is_inbox,
            translated_text: u.translated_text,
            is_prooved: u.is_prooved,
            prooved_text: u.prooved_text,
            comment: u.comment,
            is_local: true,
        })
        .collect();

    repo_project::update_page_units(po_units.as_slice())
        .await
        .trace_error("更新页面单元时失败")
        .map_err(|e| e.to_string())?;

    tracing::info!(ipc_id = ipc_id, "ipc.project.update_page_units.success");

    Ok(())
}

#[tauri::command]
#[tracing::instrument]
pub async fn delete_page_units(unit_ids: Vec<String>) -> Result<(), String> {
    let ipc_id = get_ipc_request_id();

    tracing::info!(ipc_id = ipc_id, "ipc.project.delete_page_units.start");

    if unit_ids.is_empty() {
        return Ok(());
    }

    let id_refs: Vec<&str> = unit_ids.iter().map(|s| s.as_str()).collect();

    repo_project::delete_page_units(id_refs.as_slice())
        .await
        .trace_error("删除页面单元时失败")
        .map_err(|e| e.to_string())?;

    tracing::info!(ipc_id = ipc_id, "ipc.project.delete_page_units.success");

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

/// Opens a dialog to select a Poprako archive: either a `.zip` file or a folder.
/// Returns the selected path as `String`; returns an empty string if the user
/// cancels the dialogs.
#[tauri::command]
#[tracing::instrument]
pub async fn select_poprako_archived_path() -> Result<String, String> {
    tracing::info!("ipc.project.select_poprako_archived_path.start");

    let script = r#"
        Add-Type -AssemblyName System.Windows.Forms

        $ofd = New-Object System.Windows.Forms.OpenFileDialog
        $ofd.Filter = 'Poprako Archive (*.zip)|*.zip'
        $ofd.Title = '选择 Poprako 项目文件 (.zip)，或 取消 后 选择文件夹'
        $ofd.Multiselect = $false

        if ($ofd.ShowDialog() -eq 'OK') {
            $ofd.FileName
            exit
        }

        $dialog = New-Object System.Windows.Forms.FolderBrowserDialog
        $dialog.Description = '选择项目目录'
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
        .trace_error("启动 Poprako 项目选择对话框失败")?;

    if !output.status.success() {
        tracing::warn!("ipc.project.select_poprako_archived_path.cancelled_or_failed");
        return Ok("".to_string());
    }

    let path = String::from_utf8_lossy(&output.stdout);

    let path_opt = path
        .lines()
        .map(|s| s.trim())
        .find(|s| !s.is_empty())
        .map(|s| s.to_string());

    match path_opt {
        Some(p) => {
            tracing::info!(
                selected = p.as_str(),
                "ipc.project.select_poprako_archived_path.success"
            );
            Ok(p)
        }
        None => {
            tracing::warn!("ipc.project.select_poprako_archived_path.no_selection");
            Ok("".to_string())
        }
    }
}

/// Exports the project data to a file in Poprako format.
/// If successful, returns the path to the exported file.
#[tauri::command]
#[tracing::instrument]
pub async fn export_poprako_project(project_id: String) -> Result<String, String> {
    let ipc_id = get_ipc_request_id();

    tracing::info!(ipc_id = ipc_id, "ipc.project.export_poprako_project.start");

    let project_fetched = repo_project::select_local_project(&project_id).await;

    let (author, title, local_image_dir) = match project_fetched {
        Ok(p) => {
            tracing::debug!(
                ipc_id = ipc_id,
                "ipc.project.export_poprako_project.use_local_project"
            );

            (p.author, p.title, p.local_image_dir)
        }
        Err(local_err) => {
            let cached = repo_project::select_cached_project(&project_id).await;

            match cached {
                Ok(p) => {
                    tracing::debug!(
                        ipc_id = ipc_id,
                        "ipc.project.export_poprako_project.use_cached_project"
                    );

                    (p.author, p.title, p.local_image_dir)
                }
                Err(cached_err) => {
                    tracing::error!(
                        ipc_id = ipc_id,
                        local_err = %local_err,
                        cached_err = %cached_err,
                        "ipc.project.export_poprako_project.project_not_found"
                    );

                    return Err("本地和缓存项目均未找到或读取失败".to_string());
                }
            }
        }
    };

    let base_dir = PathBuf::from(&local_image_dir);

    let pages = repo_project::get_project_pages(&project_id)
        .await
        .trace_error("获取项目页列表时失败")?;

    let mut units = vec![];

    for p in &pages {
        let page_units = repo_project::get_page_units(&p.id)
            .await
            .trace_error("获取页面单元时失败")?;

        units.push(page_units);
    }

    let local_pages = pages
        .into_iter()
        .zip(units.into_iter())
        .map(|(p, us)| {
            let local_image_rel = std::path::Path::new(&p.local_image_path)
                .file_name()
                .and_then(|s| s.to_str())
                .map(|s| s.to_string())
                .unwrap_or(p.local_image_path.clone());

            model_project::ExportPage {
                local_image_path: local_image_rel,
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
            }
        })
        .collect();

    let export_project = model_project::ExportProject {
        author,
        title,
        pages: local_pages,
    };

    let export_file_name = format!(
        "project-[{}]{}.ppr",
        export_project.author, export_project.title
    );

    let dat_path = base_dir.join(export_file_name.clone());

    serv_export_poprako_project(export_project, dat_path.clone())
        .await
        .trace_error("导出 Poprako 项目失败")
        .map_err(|e| e.to_string())?;

    let archive_path = base_dir.join(format!("project-{}.ppr.zip", project_id));

    let zip_base_dir = base_dir.clone();
    let zip_dat_path = dat_path.clone();
    let zip_archive_path = archive_path.clone();

    let zip_task = tauri::async_runtime::spawn_blocking(move || -> Result<(), String> {
        let file = std::fs::File::create(&zip_archive_path).map_err(|e| e.to_string())?;

        let mut zip_writer = ZipWriter::new(file);

        let options = FileOptions::default().compression_method(CompressionMethod::Deflated);

        let mut dat_reader = std::fs::File::open(&zip_dat_path).map_err(|e| e.to_string())?;

        let dat_name = zip_dat_path
            .file_name()
            .and_then(|s| s.to_str())
            .ok_or("无法获取导出数据文件名")?
            .to_string();

        zip_writer
            .start_file(dat_name, options)
            .map_err(|e| e.to_string())?;

        std::io::copy(&mut dat_reader, &mut zip_writer).map_err(|e| e.to_string())?;

        let mut image_files: Vec<PathBuf> = std::fs::read_dir(&zip_base_dir)
            .map_err(|e| e.to_string())?
            .filter_map(|entry_res| entry_res.ok())
            .map(|entry| entry.path())
            .filter(|p| {
                if !p.is_file() {
                    return false;
                }

                if let Some(ext) = p.extension().and_then(|s| s.to_str()) {
                    let ext_low = ext.to_lowercase();
                    ext_low == "png" || ext_low == "jpg" || ext_low == "jpeg" || ext_low == "webp"
                } else {
                    false
                }
            })
            .collect();

        image_files.sort_by(|a, b| a.file_name().cmp(&b.file_name()));

        for img_path in image_files.into_iter() {
            let Some(file_name) = img_path.file_name().and_then(|s| s.to_str()) else {
                continue;
            };

            let mut reader =
                BufReader::new(std::fs::File::open(&img_path).map_err(|e| e.to_string())?);

            zip_writer
                .start_file(file_name, options)
                .map_err(|e| e.to_string())?;

            std::io::copy(&mut reader, &mut zip_writer).map_err(|e| e.to_string())?;
        }

        zip_writer.finish().map_err(|e| e.to_string())?;

        Ok(())
    });

    zip_task
        .await
        .trace_error("等待压缩任务完成时失败")
        .map_err(|e| e.to_string())?
        .map_err(|e| format!("压缩导出项目失败: {}", e))?;

    tracing::info!(
        ipc_id = ipc_id,
        "ipc.project.export_poprako_project.success"
    );

    Ok(archive_path.to_string_lossy().to_string())
}

/// Exports the project data to a file in LabelPlus format.
/// If successful, returns the path to the exported file.
#[tauri::command]
#[tracing::instrument]
pub async fn export_labelplus_project(project_id: String) -> Result<String, String> {
    todo!()
}

/// Imports a Poprako project from a zip archive or folder.
/// If the path is a zip file, it will be extracted and validated.
/// If the path is a folder, it will be validated directly.
/// Returns Ok if the project was imported successfully.
#[tauri::command]
#[tracing::instrument]
pub async fn import_poprako_project(project_path: String) -> Result<(), String> {
    let ipc_id = get_ipc_request_id();

    tracing::info!(ipc_id = ipc_id, "ipc.project.import_poprako_project.start");

    let path = PathBuf::from(&project_path);

    if !path.exists() {
        return Err("指定的路径不存在".to_string());
    }

    let (work_dir, is_temp) = if path.is_file() {
        if let Some(ext) = path.extension().and_then(|s| s.to_str()) {
            if ext.to_lowercase() != "zip" {
                return Err("文件必须是 .zip 格式".to_string());
            }
        } else {
            return Err("文件必须是 .zip 格式".to_string());
        }

        let temp_dir =
            std::env::temp_dir().join(format!("poprako_import_{}", uuid::Uuid::new_v4()));

        fs::create_dir_all(&temp_dir)
            .trace_error("创建临时解压目录失败")
            .map_err(|e| e.to_string())?;

        let zip_path = path.clone();
        let extract_to = temp_dir.clone();

        tauri::async_runtime::spawn_blocking(move || -> Result<(), String> {
            let file = fs::File::open(&zip_path).map_err(|e| e.to_string())?;

            let mut archive = ZipArchive::new(file).map_err(|e| e.to_string())?;

            for i in 0..archive.len() {
                let mut file = archive.by_index(i).map_err(|e| e.to_string())?;

                let outpath = match file.enclosed_name() {
                    Some(p) => extract_to.join(p),
                    None => continue,
                };

                if file.name().ends_with('/') {
                    fs::create_dir_all(&outpath).map_err(|e| e.to_string())?;
                } else {
                    if let Some(p) = outpath.parent() {
                        if !p.exists() {
                            fs::create_dir_all(p).map_err(|e| e.to_string())?;
                        }
                    }

                    let mut outfile = fs::File::create(&outpath).map_err(|e| e.to_string())?;

                    std::io::copy(&mut file, &mut outfile).map_err(|e| e.to_string())?;
                }
            }

            Ok(())
        })
        .await
        .trace_error("等待解压任务完成时失败")
        .map_err(|e| e.to_string())?
        .map_err(|e| format!("解压项目文件失败: {}", e))?;

        (temp_dir, true)
    } else {
        (path, false)
    };

    let ppr_files: Vec<PathBuf> = fs::read_dir(&work_dir)
        .trace_error("读取工作目录失败")
        .map_err(|e| e.to_string())?
        .filter_map(|entry_res| entry_res.ok())
        .map(|entry| entry.path())
        .filter(|p| {
            p.is_file()
                && p.extension()
                    .and_then(|s| s.to_str())
                    .map(|s| s.to_lowercase() == "ppr")
                    .unwrap_or(false)
        })
        .collect();

    if ppr_files.is_empty() {
        if is_temp {
            let _ = fs::remove_dir_all(&work_dir);
        }

        return Err("未找到 .ppr 项目文件".to_string());
    }

    if ppr_files.len() > 1 {
        if is_temp {
            let _ = fs::remove_dir_all(&work_dir);
        }

        return Err("目录中存在多个 .ppr 文件".to_string());
    }

    let ppr_file = &ppr_files[0];

    let export_project: model_project::ExportProject = tauri::async_runtime::spawn_blocking({
        let ppr_path = ppr_file.clone();

        move || -> Result<model_project::ExportProject, String> {
            let file = fs::File::open(&ppr_path).map_err(|e| e.to_string())?;

            let reader = BufReader::new(file);

            let project: model_project::ExportProject =
                rmp_serde::from_read(reader).map_err(|e| e.to_string())?;

            Ok(project)
        }
    })
    .await
    .trace_error("等待反序列化任务完成时失败")
    .map_err(|e| e.to_string())?
    .map_err(|e| format!("读取项目元数据失败: {}", e))?;

    for page in &export_project.pages {
        let img_path = work_dir.join(&page.local_image_path);

        if !img_path.exists() {
            if is_temp {
                let _ = fs::remove_dir_all(&work_dir);
            }

            return Err(format!("图片文件不存在: {}", page.local_image_path));
        }
    }

    let project_id = uuid::Uuid::new_v4().to_string();

    let new_project = po_project::NewLocalProject {
        id: project_id.clone(),
        author: export_project.author.clone(),
        title: export_project.title.clone(),
        local_image_dir: work_dir.to_string_lossy().to_string(),
        page_count: export_project.pages.len() as u32,
    };

    repo_project::create_local_project(&new_project)
        .await
        .trace_error("创建本地项目条目时失败")
        .map_err(|e| {
            if is_temp {
                let _ = fs::remove_dir_all(&work_dir);
            }

            e.to_string()
        })?;

    let mut pages_to_create: Vec<po_project::LocalPage> = Vec::new();

    for (i, page) in export_project.pages.iter().enumerate() {
        let page_id = format!("{}-page-{}", project_id, i);

        let img_path = work_dir.join(&page.local_image_path);

        pages_to_create.push(po_project::LocalPage {
            id: page_id,
            project_id: project_id.clone(),
            index_in_project: i as u32,
            local_image_path: img_path.to_string_lossy().to_string(),
        });
    }

    if !pages_to_create.is_empty() {
        repo_project::create_project_pages(pages_to_create.as_slice())
            .await
            .trace_error("创建项目页时失败")
            .map_err(|e| {
                if is_temp {
                    let _ = fs::remove_dir_all(&work_dir);
                }

                e.to_string()
            })?;
    }

    let mut units_to_create: Vec<po_project::LocalUnit> = Vec::new();

    for (page_idx, page) in export_project.pages.iter().enumerate() {
        let page_id = format!("{}-page-{}", project_id, page_idx);

        for unit in &page.units {
            let unit_id = format!("{}-unit-{}", page_id, unit.index_in_page);

            units_to_create.push(po_project::LocalUnit {
                id: unit_id,
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
            });
        }
    }

    if !units_to_create.is_empty() {
        repo_project::create_page_units(units_to_create.as_slice())
            .await
            .trace_error("创建页面单元时失败")
            .map_err(|e| {
                if is_temp {
                    let _ = fs::remove_dir_all(&work_dir);
                }

                e.to_string()
            })?;
    }

    tracing::info!(
        ipc_id = ipc_id,
        "ipc.project.import_poprako_project.success"
    );

    Ok(())
}
