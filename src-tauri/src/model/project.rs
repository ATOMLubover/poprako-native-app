use serde::{Deserialize, Serialize};

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
pub struct LocalPage {
    pub id: String,
    pub local_image_path: String,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct LocalUnit {
    pub id: String,
    pub x: f64,
    pub y: f64,
    pub index_in_page: u32,
    pub is_inbox: bool,
    pub translated_text: Option<String>,
    pub is_prooved: bool,
    pub prooved_text: Option<String>,
    pub comment: Option<String>,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct PortProject {
    pub author: String,
    pub title: String,
    pub pages: Vec<PortPage>,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct PortPage {
    pub image_filename: String,
    pub units: Vec<PortUnit>,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct PortUnit {
    pub x: f64,
    pub y: f64,
    pub index_in_page: u32,
    pub is_inbox: bool,
    pub translated_text: Option<String>,
    pub is_prooved: bool,
    pub prooved_text: Option<String>,
    pub comment: Option<String>,
}
