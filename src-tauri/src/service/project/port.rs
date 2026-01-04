use std::{collections::HashMap, path::PathBuf};

use anyhow::anyhow;

use crate::{
    model::{
        po::project::{LocalPage, LocalUnit, NewLocalProject},
        project::{
            plugin::{PostProcess, PostProcessor},
            PortPage, PortProject,
        },
    },
    project::{
        plugin::get_local_post_processors,
        port::{
            export_project as port_export, import_project as port_import,
            open_project_dir as port_open, PortMode,
        },
    },
    repository::{
        acquire_connection, aquire_transaction,
        project::{self as repo_project, page as repo_page, unit as repo_unit},
    },
};

/// Exports a project in both PopRaKo and LabelPlus formats.
pub async fn export_project(
    project_id: &str,
    need_compress: bool,
    post_processors: Vec<String>,
) -> anyhow::Result<String> {
    let mut conn = acquire_connection()
        .await
        .map_err(|e| anyhow!("获取数据库连接时失败: {}", e))?;

    let (author, title, local_image_dir) =
        match repo_project::pick_local_project(&mut conn, project_id).await {
            Ok(p) => (p.author, p.title, p.local_image_dir),
            Err(_) => {
                let p = repo_project::pick_cached_project(&mut conn, project_id)
                    .await
                    .map_err(|e| anyhow!("本地和缓存项目均未找到: {}", e))?;

                (p.author, p.title, p.local_image_dir)
            }
        };

    let base_dir = PathBuf::from(&local_image_dir);

    let pages = repo_page::get_project_pages(&mut conn, project_id)
        .await
        .map_err(|e| anyhow!("获取项目页列表时失败: {}", e))?;

    let mut units = vec![];

    for p in &pages {
        let page_units = repo_unit::get_page_units(&mut conn, &p.id)
            .await
            .map_err(|e| anyhow!("获取页面单元时失败: {}", e))?;

        units.push(page_units);
    }

    let export_pages: Vec<PortPage> = pages
        .into_iter()
        .zip(units.into_iter())
        .map(|(p, us)| {
            let image_filename = std::path::Path::new(&p.local_image_path)
                .file_name()
                .and_then(|s| s.to_str())
                .map(|s| s.to_string())
                .unwrap_or(p.local_image_path.clone());

            PortPage {
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

    // Post-process the project if needed
    let export_proj = match post_processors.is_empty() {
        true => export_proj,
        false => post_process(export_proj, post_processors).await?,
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
    .map_err(|e| anyhow!("导出项目失败: {}", e))?;

    Ok(base_dir_clone.to_string_lossy().to_string())
}

/// Imports a PopRaKo project from the specified path.
pub async fn import_project(
    project_path: &str,
    author: Option<String>,
    title: Option<String>,
) -> anyhow::Result<()> {
    let path = PathBuf::from(project_path);

    if !path.exists() {
        return Err(anyhow!("指定的项目路径不存在"));
    }

    let export_proj = if path.is_dir() {
        port_import(path.clone(), PortMode::Dir)
            .await
            .map_err(|e| anyhow!("导入 Poprako 项目失败: {}", e))?
    } else {
        let ext = path
            .extension()
            .and_then(|s| s.to_str())
            .map(|s| s.to_lowercase());

        match ext.as_deref() {
            Some("zip") => port_import(path.clone(), PortMode::Zip)
                .await
                .map_err(|e| anyhow!("导入 Poprako 项目失败: {}", e))?,
            Some("json") | Some("txt") => port_import(path.clone(), PortMode::File)
                .await
                .map_err(|e| anyhow!("导入 Poprako 项目失败: {}", e))?,
            _ => {
                return Err(anyhow!(
                    "不支持的导入文件类型，仅支持 .zip/.json/.txt 或目录"
                ))
            }
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
        .ok_or_else(|| anyhow!("无法确定图片目录"))?;

    let mut conn = acquire_connection()
        .await
        .map_err(|e| anyhow!("获取数据库连接失败: {}", e))?;

    let mut trx = aquire_transaction(&mut conn)
        .await
        .map_err(|e| anyhow!("开始导入事务失败: {}", e))?;

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
        .map_err(|e| anyhow!("创建项目失败: {}", e))?;

    if !pages_to_create.is_empty() {
        save_project_pages(&mut trx, pages_to_create.as_slice())
            .await
            .map_err(|e| anyhow!("创建项目页失败: {}", e))?;
    }

    if !units_to_create.is_empty() {
        save_page_units(&mut trx, units_to_create.as_slice())
            .await
            .map_err(|e| anyhow!("创建单元失败: {}", e))?;
    }

    trx.commit()
        .await
        .map_err(|e| anyhow!("提交导入事务失败: {}", e))?;

    Ok(())
}

pub fn open_project_dir(local_image_dir: PathBuf) -> anyhow::Result<()> {
    port_open(local_image_dir).map_err(|e| anyhow!("打开项目目录时失败: {}", e))
}

async fn post_process(
    project: PortProject,
    processors: Vec<String>,
) -> anyhow::Result<PortProject> {
    let local_processors = get_local_post_processors().await?;

    let mut local_hashmap: HashMap<String, PostProcessor> = HashMap::new();

    for p in local_processors.into_iter() {
        let name = p.name().to_string();
        local_hashmap.insert(name, p);
    }

    if processors.is_empty() {
        return Ok(project);
    }

    let mut selected: Vec<PostProcessor> = Vec::new();
    let mut missing: Vec<String> = Vec::new();

    for name in processors.iter() {
        if let Some(p) = local_hashmap.remove(name) {
            selected.push(p);
        } else {
            missing.push(name.clone());
        }
    }

    if !missing.is_empty() {
        return Err(anyhow!("后处理器未找到: {}", missing.join(", ")));
    }

    let project = tauri::async_runtime::spawn_blocking(move || -> anyhow::Result<PortProject> {
        let mut project = project;

        for proc in selected.into_iter() {
            proc.process(&mut project)?;
        }

        Ok(project)
    })
    .await
    .map_err(|e| anyhow!("执行后处理器时失败: {}", e))??;

    Ok(project)
}
