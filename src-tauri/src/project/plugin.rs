use std::path::PathBuf;

use anyhow::anyhow;

use crate::{
    model::project::plugin::PostProcessor,
    result_trace::ResultTrace,
    util::file::{open_dir, select_file},
    APP_POST_PROC_DIR,
};

pub async fn get_local_post_processors() -> anyhow::Result<Vec<PostProcessor>> {
    let post_proc_dir = APP_POST_PROC_DIR
        .read()
        .map_err(|e| anyhow!("读取后处理目录锁时失败: {}", e))?
        .clone()
        .ok_or_else(|| anyhow!("后处理目录未初始化"))?;

    let processors =
        tauri::async_runtime::spawn_blocking(move || -> anyhow::Result<Vec<PostProcessor>> {
            let mut processors = Vec::new();

            let entries = std::fs::read_dir(&post_proc_dir)?;

            for ent in entries {
                let entry = ent?;
                let path = entry.path();

                if path.is_file() {
                    let content = std::fs::read_to_string(&path)?;

                    let processor: PostProcessor = serde_json::from_str(&content)?;

                    processors.push(processor);
                }
            }

            Ok(processors)
        })
        .await
        .trace_error("读取本地后处理配置时失败")??;

    Ok(processors)
}

pub async fn save_local_post_processor(processor: &PostProcessor) -> anyhow::Result<()> {
    let post_proc_dir = APP_POST_PROC_DIR
        .read()
        .map_err(|e| anyhow!("读取后处理目录锁时失败: {}", e))?
        .clone()
        .ok_or_else(|| anyhow!("后处理目录未初始化"))?;

    let processor_name = match processor {
        PostProcessor::CharConverter(named) => &named.name,
    };

    let file_path = post_proc_dir.join(format!("{}.json", processor_name));

    let content = serde_json::to_string_pretty(processor)?;

    tauri::async_runtime::spawn_blocking(move || -> anyhow::Result<()> {
        std::fs::write(&file_path, content)?;

        Ok(())
    })
    .await
    .trace_error("保存本地后处理配置时失败")??;

    Ok(())
}

pub fn select_post_processor_file() -> anyhow::Result<PathBuf> {
    let path = select_file(&["json"], false)?
        .first()
        .ok_or_else(|| anyhow!("未选择任何文件"))?
        .clone();

    Ok(path)
}

pub async fn import_post_processor(path: PathBuf) -> anyhow::Result<()> {
    tauri::async_runtime::spawn_blocking(move || {
        let content = std::fs::read_to_string(&path)?;

        let processor: PostProcessor =
            serde_json::from_str(&content).map_err(|e| anyhow!("非法的后处理配置: {}", e))?;

        let post_proc_dir = APP_POST_PROC_DIR
            .read()
            .map_err(|e| anyhow!("读取后处理目录锁时失败: {}", e))?
            .clone()
            .ok_or_else(|| anyhow!("后处理目录未初始化"))?;

        let dst_path = post_proc_dir.join(format!("{}.post-processor.json", processor.name()));

        std::fs::write(&dst_path, content)?;

        Ok(())
    })
    .await
    .trace_error("导入后处理配置时失败")?
}

pub fn open_post_processor_dir() -> anyhow::Result<()> {
    let post_proc_dir = APP_POST_PROC_DIR
        .read()
        .map_err(|e| anyhow!("读取后处理目录锁时失败: {}", e))?
        .clone()
        .ok_or_else(|| anyhow!("后处理目录未初始化"))?;

    open_dir(post_proc_dir)?;

    Ok(())
}
