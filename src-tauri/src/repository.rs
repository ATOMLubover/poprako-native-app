use std::sync::Mutex;

use sqlx::{sqlite::SqlitePoolOptions, SqlitePool};

pub mod project;
pub mod special_symbol;

use crate::APP_DB_PATH;

static DATABASE: Mutex<Option<SqlitePool>> = Mutex::new(None);

pub async fn init_database() -> Result<(), String> {
    let database_path = APP_DB_PATH
        .read()
        .map_err(|e| format!("无法锁定 APP_DB_PATH: {}", e))?
        .clone()
        .ok_or("数据库路径未初始化".to_string())?;

    let database_url = format!("sqlite://{}", database_path.to_string_lossy());

    let pool = SqlitePoolOptions::new()
        .max_connections(5)
        .connect(&database_url)
        .await
        .map_err(|e| format!("无法连接到数据库: {}", e))?;

    // Run migrations
    sqlx::migrate!("./migrations")
        .run(&pool)
        .await
        .map_err(|e| format!("数据库迁移失败: {}", e))?;

    DATABASE
        .lock()
        .map_err(|e| format!("无法锁定 DATABASE: {}", e))?
        .replace(pool);

    tracing::info!(database_path = ?database_path, "setup.database.initialized");

    Ok(())
}
