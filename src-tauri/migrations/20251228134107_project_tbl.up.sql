CREATE TABLE cached_project_tbl (
    id TEXT PRIMARY KEY,

    author TEXT NOT NULL,
    title TEXT NOT NULL,

    local_image_dir TEXT NOT NULL,
    related_comic_id TEXT NOT NULL,

    unit_count INTEGER NOT NULL DEFAULT 0,
    translated_unit_count INTEGER NOT NULL DEFAULT 0,
    prooved_unit_count INTEGER NOT NULL DEFAULT 0,
    inbox_unit_count INTEGER DEFAULT 0,
    outbox_unit_count INTEGER DEFAULT 0,

    page_count INTEGER NOT NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE local_project_tbl (
    id TEXT PRIMARY KEY,

    author TEXT NOT NULL,
    title TEXT NOT NULL,

    local_image_dir TEXT NOT NULL,
    -- TODO: maybe valid when the function that uploads
    -- local projects to remote is implemented.
    related_comic_id TEXT,

    unit_count INTEGER NOT NULL DEFAULT 0,
    translated_unit_count INTEGER NOT NULL DEFAULT 0,
    prooved_unit_count INTEGER NOT NULL DEFAULT 0,
    inbox_unit_count INTEGER DEFAULT 0,
    outbox_unit_count INTEGER DEFAULT 0,

    page_count INTEGER NOT NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
