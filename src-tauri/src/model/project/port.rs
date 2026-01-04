use serde::{Deserialize, Serialize};

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
    #[serde(skip_serializing_if = "PortUnit::is_text_empty")]
    pub translated_text: Option<String>,
    #[serde(skip_serializing_if = "PortUnit::is_text_empty")]
    pub prooved_text: Option<String>,
    pub is_prooved: bool,
    #[serde(skip_serializing_if = "PortUnit::is_text_empty")]
    pub comment: Option<String>,
}

impl PortUnit {
    fn is_text_empty(value: &Option<String>) -> bool {
        match value {
            Some(text) => text.is_empty(),
            None => true,
        }
    }
}
