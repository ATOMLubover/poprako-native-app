pub struct Project {
    id: String,
    author: String,
    title: String,
    local_image_dir: Option<String>, // 项目在本地的存储路径（可选）
    related_remote_comic_id: Option<String>, // 关联的漫画 ID（可选
    unit_count: u32,                 // 翻校单元总数量
    translated_unit_count: u32,      // 已翻译的翻校单元数量
    prooved_unit_count: u32,         // 已校对的翻校单元数量
    inbox_unit_count: Option<u32>,   // 框内单元总数量
    outbox_unit_count: Option<u32>,  // 框外单元总数量
    page_count: u32,                 // 漫画页总数量
}
