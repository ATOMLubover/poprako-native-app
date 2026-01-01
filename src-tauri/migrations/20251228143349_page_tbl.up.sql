CREATE TABLE local_page_tbl (
    id TEXT PRIMARY KEY,

    project_id TEXT NOT NULL REFERENCES local_project_tbl(id) ON DELETE CASCADE,
    index_in_project INTEGER NOT NULL,

    local_image_path TEXT NOT NULL,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
