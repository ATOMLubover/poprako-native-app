use std::path::PathBuf;

use crate::{
    ipc::get_ipc_request_id,
    model::{
        po::project::{LocalPage, LocalUnit, NewLocalProject},
        project::PortProject,
    },
    project::port::{export_project as port_export, import_project as port_import, PortMode},
    repository::{
        acquire_connection, aquire_transaction,
        project::{
            page::get_project_pages as repo_get_pages, pick_cached_project, pick_local_project,
            unit::get_page_units as repo_get_units,
        },
    },
    result_trace::ResultTrace,
};

/// Export a project in both PopRaKo and LabelPlus formats.
/// If successful, returns the path to the exported project directory.
#[tauri::command]
#[tracing::instrument]
pub async fn export_project(project_id: String, need_compress: bool) -> Result<String, String> {
    let ipc_id = get_ipc_request_id();

    tracing::info!(
        ipc_id = ipc_id,
        "ipc.project.port.export_poprako_project.start"
    );

    let mut conn = acquire_connection().await?;

    let (author, title, local_image_dir) = match pick_local_project(&mut conn, &project_id).await {
        Ok(p) => (p.author, p.title, p.local_image_dir),
        Err(_) => {
            let p = pick_cached_project(&mut conn, &project_id)
                .await
                .trace_error("本地和缓存项目均未找到")
                .map_err(|e| e.to_string())?;

            (p.author, p.title, p.local_image_dir)
        }
    };

    let base_dir = PathBuf::from(&local_image_dir);

    let pages = repo_get_pages(&mut conn, &project_id)
        .await
        .trace_error("获取项目页列表时失败")
        .map_err(|e| e.to_string())?;

    let mut units = vec![];
    for p in &pages {
        let page_units = repo_get_units(&mut conn, &p.id)
            .await
            .trace_error("获取页面单元时失败")
            .map_err(|e| e.to_string())?;

        units.push(page_units);
    }

    let export_pages: Vec<crate::model::project::PortPage> = pages
        .into_iter()
        .zip(units.into_iter())
        .map(|(p, us)| {
            let image_filename = std::path::Path::new(&p.local_image_path)
                .file_name()
                .and_then(|s| s.to_str())
                .map(|s| s.to_string())
                .unwrap_or(p.local_image_path.clone());

            crate::model::project::PortPage {
                image_filename,
                units: us
                    .into_iter()
                    .map(|u| crate::model::project::PortUnit {
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

    let export_proj = PortProject {
        author,
        title,
        pages: export_pages,
    };

    let base_dir_clone = base_dir.clone();

    port_export(
        export_proj.clone(),
        base_dir,
        if need_compress {
            PortMode::Zip
        } else {
            PortMode::Dir
        },
    )
    .await
    .trace_error("导出项目失败")
    .map_err(|e| e.to_string())?;

    tracing::info!(
        ipc_id = ipc_id,
        "ipc.project.port.export_poprako_project.success"
    );

    Ok(base_dir_clone.to_string_lossy().to_string())
}

/// Import a PopRaKo project from the specified path.
/// The path should be .json, .txt of .zip.
#[tauri::command]
#[tracing::instrument]
pub async fn import_project(
    project_path: String,
    author: Option<String>,
    title: Option<String>,
) -> Result<(), String> {
    let ipc_id = get_ipc_request_id();

    tracing::info!(
        ipc_id = ipc_id,
        "ipc.project.port.import_poprako_project.start"
    );

    let path = PathBuf::from(&project_path);

    if !path.exists() {
        return Err("指定的项目路径不存在".to_string());
    }

    // Determine mode by file extension.
    // - .zip => Zip mode, pass the file path itself
    // - .json/.txt => File mode, pass the file path itself
    // - directory => Dir mode, pass the directory
    // - other extensions => invalid
    let export_proj = if path.is_dir() {
        // directory given -> Dir mode
        port_import(path.clone(), PortMode::Dir)
            .await
            .trace_error("导入 Poprako 项目失败")
            .map_err(|e| e.to_string())?
    } else {
        let ext = path
            .extension()
            .and_then(|s| s.to_str())
            .map(|s| s.to_lowercase());

        match ext.as_deref() {
            Some("zip") => port_import(path.clone(), PortMode::Zip)
                .await
                .trace_error("导入 Poprako 项目失败")
                .map_err(|e| e.to_string())?,
            Some("json") | Some("txt") => port_import(path.clone(), PortMode::File)
                .await
                .trace_error("导入 Poprako 项目失败")
                .map_err(|e| e.to_string())?,
            _ => return Err("不支持的导入文件类型，仅支持 .zip/.json/.txt 或目录".to_string()),
        }
    };

    let project_id = uuid::Uuid::new_v4().to_string();

    let mut pages_to_create: Vec<LocalPage> = Vec::new();
    let mut units_to_create: Vec<LocalUnit> = Vec::new();

    for (i, page) in export_proj.pages.iter().enumerate() {
        let page_id = format!("{}-page-{}", project_id, i);

        pages_to_create.push(LocalPage {
            id: page_id.clone(),
            project_id: project_id.clone(),
            index_in_project: i as u32,
            local_image_path: page.image_filename.clone(),
        });

        for unit in &page.units {
            let unit_id = format!("{}-unit-{}", page_id, unit.index_in_page);

            units_to_create.push(LocalUnit {
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

    let image_dir = pages_to_create
        .first()
        .and_then(|p| std::path::Path::new(&p.local_image_path).parent())
        .map(|p| p.to_path_buf())
        .ok_or("无法确定图片目录")?;

    let mut conn = acquire_connection()
        .await
        .trace_error("获取数据库连接失败")
        .map_err(|e| e.to_string())?;

    // Start transaction at IPC layer to ensure atomic import
    let mut trx = aquire_transaction(&mut conn)
        .await
        .trace_error("开始导入事务失败")
        .map_err(|e| e.to_string())?;

    let final_title = title
        .and_then(|t| Some(t.trim().to_string()))
        .and_then(|t| if t.is_empty() { None } else { Some(t) })
        .unwrap_or(export_proj.title.clone());

    let final_author = author
        .and_then(|a| Some(a.trim().to_string()))
        .and_then(|a| if a.is_empty() { None } else { Some(a) })
        .unwrap_or(export_proj.author.clone());

    let new_project = NewLocalProject {
        id: project_id,
        author: final_author,
        title: final_title,
        local_image_dir: image_dir.to_string_lossy().to_string(),
        page_count: 0,
    };

    use crate::repository::project::{page::save_project_pages, unit::save_page_units};

    crate::repository::project::create_local_project(&mut trx, &new_project)
        .await
        .trace_error("创建项目失败")
        .map_err(|e| e.to_string())?;

    if !pages_to_create.is_empty() {
        save_project_pages(&mut trx, pages_to_create.as_slice())
            .await
            .trace_error("创建项目页失败")
            .map_err(|e| e.to_string())?;
    }

    if !units_to_create.is_empty() {
        save_page_units(&mut trx, units_to_create.as_slice())
            .await
            .trace_error("创建单元失败")
            .map_err(|e| e.to_string())?;
    }

    trx.commit()
        .await
        .trace_error("提交导入事务失败")
        .map_err(|e| e.to_string())?;

    tracing::info!(
        ipc_id = ipc_id,
        "ipc.project.port.import_poprako_project.success"
    );

    Ok(())
}
