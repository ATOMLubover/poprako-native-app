use std::path::PathBuf;

use anyhow::anyhow;

use crate::{model::project::plugin::PostProcessor, project::plugin as internal_plugin};

pub async fn get_local_post_processors() -> anyhow::Result<Vec<PostProcessor>> {
    internal_plugin::get_local_post_processors()
        .await
        .map_err(|e| anyhow!("读取本地后处理配置时失败: {}", e))
}

pub async fn save_local_post_processor(processor: &PostProcessor) -> anyhow::Result<()> {
    internal_plugin::save_local_post_processor(processor)
        .await
        .map_err(|e| anyhow!("保存本地后处理配置时失败: {}", e))
}

pub fn select_post_processor_file() -> anyhow::Result<PathBuf> {
    internal_plugin::select_post_processor_file()
        .map_err(|e| anyhow!("选择后处理配置文件时失败: {}", e))
}

pub async fn import_post_processor(path: PathBuf) -> anyhow::Result<()> {
    internal_plugin::import_post_processor(path)
        .await
        .map_err(|e| anyhow!("导入后处理配置时失败: {}", e))
}

pub fn open_post_processor_dir() -> anyhow::Result<()> {
    internal_plugin::open_post_processor_dir().map_err(|e| anyhow!("打开后处理目录时失败: {}", e))
}
