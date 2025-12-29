use sqlx::FromRow;
use tauri::webview::cookie::time::OffsetDateTime;

#[derive(FromRow)]
pub struct CachedProject {
    pub id: String,

    pub author: String,
    pub title: String,

    pub local_image_dir: String,
    pub related_comic_id: String,

    pub unit_count: u32,
    pub translated_unit_count: u32,
    pub prooved_unit_count: u32,

    pub inbox_unit_count: u32,
    pub outbox_unit_count: u32,

    pub page_count: u32,

    pub updated_at: OffsetDateTime,
}

pub struct NewCachedProject {
    pub id: String,

    pub author: String,
    pub title: String,

    pub local_image_dir: String,
    pub related_comic_id: String,

    pub unit_count: u32,
    pub translated_unit_count: u32,
    pub prooved_unit_count: u32,

    pub inbox_unit_count: u32,
    pub outbox_unit_count: u32,

    pub page_count: u32,
}

#[derive(FromRow)]
pub struct LocalProject {
    pub id: String,

    pub author: String,
    pub title: String,

    pub local_image_dir: Option<String>,
    pub related_comic_id: Option<String>,

    pub unit_count: u32,
    pub translated_unit_count: u32,
    pub prooved_unit_count: u32,

    pub inbox_unit_count: Option<u32>,
    pub outbox_unit_count: Option<u32>,

    pub page_count: u32,

    pub updated_at: OffsetDateTime,
}

pub struct NewLocalProject {
    pub id: String,

    pub author: String,
    pub title: String,

    pub local_image_dir: String,

    pub page_count: u32,
}

#[derive(FromRow)]
pub struct LocalPage {
    pub id: String,

    pub project_id: String,
    pub index_in_project: u32,

    pub local_image_path: String,
}

#[derive(FromRow)]
pub struct LocalUnit {
    pub id: String,

    pub page_id: String,
    pub index_in_page: u32,

    pub x_coordinate: f64,
    pub y_coordinate: f64,

    pub is_inbox: bool,

    pub translated_text: Option<String>,
    pub is_prooved: bool,
    pub prooved_text: Option<String>,

    pub comment: Option<String>,

    pub is_local: bool,
}
