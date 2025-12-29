CREATE TABLE project_tbl (
    id TEXT PRIMARY KEY,

    author TEXT NOT NULL,
    title TEXT NOT NULL,

    local_image_dir TEXT,
    related_comic_id TEXT,

    unit_count INTEGER NOT NULL,
    translated_unit_count INTEGER NOT NULL,
    prooved_unit_count INTEGER NOT NULL,
    inbox_unit_count INTEGER,
    outbox_unit_count INTEGER,

    page_count INTEGER NOT NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
