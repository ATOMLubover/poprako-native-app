use std::{
    fs::File,
    io::{self, BufReader, BufWriter, Write as _},
    path::{Path, PathBuf},
    sync::Arc,
};

use anyhow::bail;

use crate::{
    model::project::PortProject,
    project::codec::{decode_export_project, encode_project, Format},
    result_trace::ResultTrace as _,
};

pub enum PortMode {
    Dir,
    Zip,
}

pub async fn export_project(
    project: PortProject,
    dst_dir: PathBuf,
    mode: PortMode,
) -> anyhow::Result<()> {
    if !dst_dir.exists() {
        bail!("指定的路径不存在: {}", dst_dir.display());
    }

    if !dst_dir.is_dir() {
        bail!("路径必须是目录: {}", dst_dir.display());
    }

    let project = Arc::new(project);

    match mode {
        PortMode::Dir => export_project_to_dir(project, dst_dir).await,
        PortMode::Zip => export_project_to_zip(project, dst_dir).await,
    }
}

async fn export_project_to_dir(project: Arc<PortProject>, dst_dir: PathBuf) -> anyhow::Result<()> {
    // Check whether images all exist.
    for page in &project.pages {
        let img_path = dst_dir.join(&page.image_filename);

        if !img_path.exists() {
            bail!("项目中引用的图片文件不存在: {}", page.image_filename);
        }
    }

    // Export project file in both formats.
    export_project_file(project.clone(), dst_dir.clone(), Format::PopRaKo).await?;

    export_project_file(project.clone(), dst_dir.clone(), Format::LabelPlus).await?;

    Ok(())
}

async fn export_project_to_zip(project: Arc<PortProject>, dst_dir: PathBuf) -> anyhow::Result<()> {
    // Verify images exist in `dst_dir` (use filename portion)
    for page in &project.pages {
        let filename = Path::new(&page.image_filename)
            .file_name()
            .and_then(|s| s.to_str())
            .ok_or_else(|| anyhow::anyhow!("无效的图片文件名: {}", page.image_filename))?;

        let img_path = dst_dir.join(filename);

        if !img_path.exists() {
            bail!("项目中引用的图片文件不存在: {}", page.image_filename);
        }
    }

    // Write project files (both formats) directly into dst_dir.
    export_project_file(project.clone(), dst_dir.clone(), Format::PopRaKo).await?;

    export_project_file(project.clone(), dst_dir.clone(), Format::LabelPlus).await?;

    // Prepare list of file names to include in the zip: the two project files and the image file names.
    let poprako_name = format!("【{}】{}.poprako.json", project.author, project.title);

    let labelplus_name = format!("【{}】{}.labelplus.txt", project.author, project.title);

    let mut image_names: Vec<String> = Vec::new();

    for page in &project.pages {
        if let Some(n) = Path::new(&page.image_filename)
            .file_name()
            .and_then(|s| s.to_str())
        {
            image_names.push(n.to_string());
        }
    }

    let zip_filename = format!("【{}】{}.zip", project.author, project.title);

    let zip_path = dst_dir.join(zip_filename);

    let dst_dir_clone = dst_dir.clone();

    let pop_name_clone = poprako_name.clone();

    let label_name_clone = labelplus_name.clone();

    let image_names_clone = image_names.clone();

    // Create the zip in a blocking thread
    tauri::async_runtime::spawn_blocking(move || -> anyhow::Result<()> {
        let zip_file = File::create(&zip_path)?;

        let mut zip = zip::ZipWriter::new(zip_file);

        let options =
            zip::write::FileOptions::default().compression_method(zip::CompressionMethod::Deflated);

        // Helper to add a file by name from dst_dir
        let mut add_file = |name: &str| -> anyhow::Result<()> {
            let path = dst_dir_clone.join(name);

            if !path.is_file() {
                return Ok(());
            }

            zip.start_file(name, options)?;

            let mut file = File::open(&path)?;

            io::copy(&mut file, &mut zip)?;

            Ok(())
        };

        add_file(&pop_name_clone)?;

        add_file(&label_name_clone)?;

        for name in image_names_clone.iter() {
            add_file(name)?;
        }

        zip.finish()?;

        Ok(())
    })
    .await
    .trace_error("压缩任务失败")??;

    // Clean up the generated project files; do not remove images.
    let _ = std::fs::remove_file(dst_dir.join(poprako_name));

    let _ = std::fs::remove_file(dst_dir.join(labelplus_name));

    Ok(())
}

async fn export_project_file(
    project: Arc<PortProject>,
    dst_dir: PathBuf,
    format: Format,
) -> anyhow::Result<()> {
    let dst_filename = match format {
        Format::PopRaKo => format!("【{}】{}.poprako.json", project.author, project.title),
        Format::LabelPlus => format!("【{}】{}.labelplus.txt", project.author, project.title),
    };

    let dst_path = dst_dir.join(dst_filename);

    let dst_path_clone = dst_path.clone();

    tauri::async_runtime::spawn_blocking(move || -> anyhow::Result<()> {
        let file = File::create(&dst_path_clone)?;

        let mut writer = BufWriter::new(file);

        encode_project(&mut writer, &project, format)?;

        writer.flush()?;

        Ok(())
    })
    .await
    .trace_error("等待写入任务完成时失败")??;

    Ok(())
}

pub async fn import_project(src_path: PathBuf, mode: PortMode) -> anyhow::Result<PortProject> {
    match mode {
        PortMode::Dir => import_project_from_dir(src_path).await,
        PortMode::Zip => import_project_from_zip(src_path).await,
    }
}

async fn resolve_project_file(src_path: PathBuf) -> anyhow::Result<PortProject> {
    if !src_path.exists() {
        bail!("指定的路径不存在: {}", src_path.display());
    }

    if !src_path.is_file() {
        bail!("路径必须是文件: {}", src_path.display());
    }

    let src_path_clone = src_path.clone();

    // Try to resolve the project file format.
    let ext = src_path
        .extension()
        .and_then(|s| s.to_str())
        .unwrap_or_default()
        .to_lowercase();

    let format = match ext.as_str() {
        "json" => Format::PopRaKo,
        "txt" => Format::LabelPlus,
        _ => bail!("暂不支持的项目文件后缀名: {}", ext),
    };

    let project = tauri::async_runtime::spawn_blocking(move || -> anyhow::Result<PortProject> {
        let file = File::open(&src_path_clone)?;

        let mut reader = BufReader::new(file);

        let project = decode_export_project(&mut reader, format)?;

        Ok(project)
    })
    .await
    .trace_error("等待读取任务完成时失败")??;

    Ok(project)
}

async fn import_project_from_zip(src_path: PathBuf) -> anyhow::Result<PortProject> {
    // Validate path and extension
    if !src_path.exists() {
        bail!("指定的路径不存在: {}", src_path.display());
    }

    if !src_path.is_file() {
        bail!("路径必须是文件: {}", src_path.display());
    }

    if let Some(ext) = src_path.extension().and_then(|s| s.to_str()) {
        if ext.to_lowercase() != "zip" {
            bail!("文件必须是 .zip 格式: {}", src_path.display());
        }
    } else {
        bail!("文件必须是 .zip 格式: {}", src_path.display());
    }

    // Create extraction dir next to the zip: <zip-parent>/PopRaKo-<zip-stem>.
    let parent = src_path
        .parent()
        .map(|p| p.to_path_buf())
        .unwrap_or_else(|| std::env::current_dir().unwrap_or_else(|_| PathBuf::from(".")));

    let stem = src_path
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("project");

    let extract_dir = parent.join(format!("PopRako-{}", stem));

    std::fs::create_dir_all(&extract_dir).trace_error("创建解压目录失败")?;

    // Extract zip in blocking thread
    decompress_zip(src_path, extract_dir.clone())
        .await
        .trace_error("解压任务失败")?;

    reconstruct_project(extract_dir.clone()).await
}

async fn import_project_from_dir(src_dir: PathBuf) -> anyhow::Result<PortProject> {
    // Validate path
    if !src_dir.exists() {
        bail!("指定的路径不存在: {}", src_dir.display());
    }

    if !src_dir.is_dir() {
        bail!("路径必须是目录: {}", src_dir.display());
    }

    reconstruct_project(src_dir).await
}

async fn decompress_zip(zip_path: PathBuf, extract_dir: PathBuf) -> anyhow::Result<()> {
    let extract_dir_clone = extract_dir.clone();

    let result = tauri::async_runtime::spawn_blocking(move || -> anyhow::Result<()> {
        let file = File::open(&zip_path)?;

        let mut archive = zip::ZipArchive::new(file)?;

        for i in 0..archive.len() {
            let mut entry = archive.by_index(i)?;

            // Skip directory entries
            if entry.name().ends_with('/') {
                continue;
            }

            // Only use the file name portion; ignore any directories inside the archive
            let filename_opt = Path::new(entry.name()).file_name().and_then(|s| s.to_str());

            let filename = match filename_opt {
                Some(n) => n,
                None => continue,
            };

            let outpath = extract_dir_clone.join(filename);

            let mut outfile = File::create(&outpath)?;

            io::copy(&mut entry, &mut outfile)?;
        }

        Ok(())
    })
    .await
    .trace_error("解压任务失败")?;

    if result.is_err() {
        // Try to clean up extraction dir on error; ignore cleanup errors.
        let _ = std::fs::remove_dir_all(&extract_dir);
    }

    Ok(())
}

async fn reconstruct_project(src_dir: PathBuf) -> anyhow::Result<PortProject> {
    // Find project file (.json or .txt) at top level of extracted dir
    let project_files: Vec<PathBuf> = std::fs::read_dir(&src_dir)
        .trace_error("读取解压目录失败")?
        .filter_map(|e| e.ok())
        .map(|e| e.path())
        .filter(|p| {
            p.is_file()
                && p.extension()
                    .and_then(|s| s.to_str())
                    .map(|s| {
                        let s = s.to_lowercase();
                        s == "json" || s == "txt"
                    })
                    .unwrap_or(false)
        })
        .collect();

    if project_files.is_empty() {
        bail!("未找到项目文件 (.json 或 .txt) 在: {}", src_dir.display());
    }

    if project_files.len() > 1 {
        bail!("目录中存在多个可能的项目文件: {}", src_dir.display());
    }

    let project_file = &project_files[0];

    // Reuse existing file importer to decode project DTO
    let mut project = resolve_project_file(project_file.clone()).await?;

    // Verify referenced images exist inside extracted dir
    for page in &project.pages {
        let img_path = src_dir.join(&page.image_filename);

        if !img_path.exists() {
            bail!("项目中引用的图片文件不存在: {}", page.image_filename);
        }
    }

    // Convert local_image_path to absolute paths in DTO
    for page in &mut project.pages {
        page.image_filename = src_dir
            .join(&page.image_filename)
            .to_string_lossy()
            .to_string();
    }

    Ok(project)
}
