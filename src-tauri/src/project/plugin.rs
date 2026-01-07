use std::path::PathBuf;

use anyhow::anyhow;

use crate::{
    model::project::{
        plugin::{PostProcessor, StrConverter},
        PortProject,
    },
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
        PostProcessor::StrConverter(named) => &named.name,
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

pub trait PostProcess {
    fn process(&self, project: &mut PortProject) -> anyhow::Result<()>;
}

pub trait NamedProcessor {
    fn name(&self) -> &str;
}

impl NamedProcessor for PostProcessor {
    fn name(&self) -> &str {
        match self {
            PostProcessor::StrConverter(named) => &named.name,
        }
    }
}

impl PostProcess for PostProcessor {
    fn process(&self, project: &mut PortProject) -> anyhow::Result<()> {
        match self {
            PostProcessor::StrConverter(named) => named.processor.process(project),
        }
    }
}

impl PostProcess for StrConverter {
    fn process(&self, project: &mut PortProject) -> anyhow::Result<()> {
        let converter = |text: &mut String| {
            if text.is_empty() || self.mapping.is_empty() {
                return;
            }

            // 步骤 1: 预查询所有可能的匹配项
            // 按 mapping 的顺序遍历，这样自然保证了优先级
            #[derive(Debug)]
            struct MatchSpan<'a> {
                start: usize,
                end: usize,
                value: &'a str,
            }

            let mut all_matches: Vec<MatchSpan> = Vec::new();

            for (key, value) in &self.mapping {
                if key.is_empty() {
                    continue;
                }

                let mut search_start = 0;
                while let Some(idx) = text[search_start..].find(key.as_str()) {
                    let real_start = search_start + idx;
                    all_matches.push(MatchSpan {
                        start: real_start,
                        end: real_start + key.len(),
                        value: value.as_str(),
                    });

                    // Advance to the next valid char boundary after the match start
                    // to avoid slicing inside a multibyte character.
                    let next_char_len = text[real_start..]
                        .chars()
                        .next()
                        .map(|c| c.len_utf8())
                        .unwrap_or(1);

                    search_start = real_start + next_char_len;
                }
            }

            // 步骤 2: 快速返回检查
            if all_matches.is_empty() {
                return;
            }

            // 步骤 3: 冲突解决 (根据原始下标优先级)
            // 由于我们是按 mapping 顺序 push 到 all_matches 的，
            // all_matches 内部已经隐含了优先级（先进入的优先级高）
            let mut occupied = vec![false; text.len()];
            let mut valid_matches = Vec::with_capacity(all_matches.len());

            for m in all_matches {
                let mut is_overlap = false;
                for i in m.start..m.end {
                    if occupied[i] {
                        is_overlap = true;
                        break;
                    }
                }

                if !is_overlap {
                    for i in m.start..m.end {
                        occupied[i] = true;
                    }
                    valid_matches.push(m);
                }
            }

            // 步骤 4: 构建结果
            // 最终替换时需要按字符串位置顺序排序
            valid_matches.sort_by(|a, b| a.start.cmp(&b.start));

            let mut new_string = String::with_capacity(text.len());
            let mut cursor = 0;

            for m in valid_matches {
                if m.start > cursor {
                    new_string.push_str(&text[cursor..m.start]);
                }
                new_string.push_str(m.value);
                cursor = m.end;
            }

            if cursor < text.len() {
                new_string.push_str(&text[cursor..]);
            }

            *text = new_string;
        };

        for page in &mut project.pages {
            for unit in &mut page.units {
                if let Some(ref mut txt) = unit.prooved_text {
                    converter(txt);
                }

                if let Some(ref mut txt) = unit.translated_text {
                    converter(txt);
                }

                // Comment has no need to be converted.
            }
        }

        Ok(())
    }
}
