use std::sync::Mutex;

use sqlx::{
    pool::PoolConnection, sqlite::SqlitePoolOptions, Acquire as _, Sqlite, SqlitePool, Transaction,
};

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

pub async fn acquire_connection() -> Result<PoolConnection<Sqlite>, String> {
    let pool = {
        let db = DATABASE
            .lock()
            .map_err(|e| format!("无法锁定 DATABASE: {}", e))?;

        db.as_ref().ok_or("数据库未初始化".to_string())?.clone()
    };

    pool.acquire()
        .await
        .map_err(|e| format!("无法获取数据库连接: {}", e))
}

pub async fn aquire_transaction(
    conn: &mut PoolConnection<Sqlite>,
) -> Result<Transaction<'_, Sqlite>, String> {
    conn.begin()
        .await
        .map_err(|e| format!("无法开始数据库事务: {}", e))
}
