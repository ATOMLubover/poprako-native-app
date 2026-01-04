use serde::{Deserialize, Serialize};

pub mod page;
pub mod plugin;
pub mod port;
pub mod unit;

pub use page::LocalPage;
pub use port::{PortPage, PortProject, PortUnit};
pub use unit::LocalUnit;

#[derive(Debug, Deserialize, Serialize)]
pub struct Project {
    pub id: String,
    pub author: String,
    pub title: String,
    pub local_image_dir: Option<String>, // 项目在本地的存储路径（可选）
    pub related_comic_id: Option<String>, // 关联的漫画 ID（可选）
    pub unit_count: u32,                 // 翻校单元总数量
    pub translated_unit_count: u32,      // 已翻译的翻校单元数量
    pub prooved_unit_count: u32,         // 已校对的翻校单元数量
    pub inbox_unit_count: Option<u32>,   // 框内单元总数量
    pub outbox_unit_count: Option<u32>,  // 框外单元总数量
    pub page_count: u32,                 // 漫画页总数量
    pub updated_at: String,              // 最后更新时间（ISO 8601 格式）
}

#[derive(Debug, Deserialize, Serialize)]
pub struct SelectedProjectDir {
    pub dir_path: String,
    pub image_count: usize,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct NewLocalProject {
    pub author: String,
    pub title: String,
    pub local_image_dir: String,
}
