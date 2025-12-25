-- SQLite migration to create the special_symbol_tbl table
CREATE TABLE IF NOT EXISTS special_symbol_tbl (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    symbol TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
