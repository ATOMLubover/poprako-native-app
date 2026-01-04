use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize, Serialize)]
pub struct LocalUnit {
    pub id: String,
    pub x: f64,
    pub y: f64,
    pub index_in_page: u32,
    pub is_inbox: bool,
    pub translated_text: Option<String>,
    pub prooved_text: Option<String>,
    pub is_prooved: bool,
    pub comment: Option<String>,
}
