CREATE TABLE unit_tbl (
    id TEXT PRIMARY KEY,
    
    page_id TEXT NOT NULL REFERENCES page_tbl(id),
    index_in_page INTEGER NOT NULL,

    x_coordinate REAL NOT NULL,
    y_coordinate REAL NOT NULL,
    
    is_inbox BOOLEAN NOT NULL,
    translated_text TEXT,
    is_prooved BOOLEAN NOT NULL,
    proofread_text TEXT,
    
    comment TEXT,
    
    is_local BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
