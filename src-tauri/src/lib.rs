use std::{path::PathBuf, sync::RwLock};

use tauri::{App, Manager as _};
use tracing::Level;

mod compress;
mod http;
mod ipc;
mod local_image;
mod model;
mod project;
mod repository;
mod result_trace;
mod service;
mod util;

/// Memo:
/// setup.logger.initialized level=Level(Debug)
/// setup.data_dir.initialized data_dir="C:\\Users\\{user_id}\\AppData\\Roaming\\com.poprako.hatsu1ki"
/// setup.cache_dir.initialized cache_dir="C:\\Users\\{user_id}\\AppData\\Local\\com.poprako.hatsu1ki"

// A simple enum to represent the environment.
#[derive(PartialEq, Debug)]
pub enum Environment {
    Development,
    Production,
}

// Use conditional compilation to set the environment.
// 此静态变量可能暂时未被使用，允许 dead_code 以避免未使用警告
static APP_ENV: Environment = {
    #[cfg(debug_assertions)]
    {
        Environment::Development
    }
    #[cfg(not(debug_assertions))]
    {
        Environment::Production
    }
};

static APP_DATA_DIR: RwLock<Option<PathBuf>> = RwLock::new(None);
static APP_CACHE_DIR: RwLock<Option<PathBuf>> = RwLock::new(None);
static APP_DB_PATH: RwLock<Option<PathBuf>> = RwLock::new(None);
static APP_COMPRESS_DIR: RwLock<Option<PathBuf>> = RwLock::new(None);
static APP_POST_PROC_DIR: RwLock<Option<PathBuf>> = RwLock::new(None);

static BIN_SUB_DIR: &str = "bin";
static STORAGE_SUB_DIR: &str = "storage";

static DB_SUB_PATH: &str = "data.db";
static PLUGIN_SUB_DIR: &str = "plugins";
static POST_PROC_SUB_DIR: &str = "post_processors";
static COMPRESS_SUB_DIR: &str = "compressed";

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            // Initialize the application log directory.
            init_log_dir(app)?;

            // Initialize logging based on the environment.
            // The level is decided when compiling.
            init_logger(app)?;

            // Initialize the application data directory.
            init_data_dir(app)?;
            // Initialize the application cache directory.
            init_cache_dir(app)?;

            // Initialize the database path.
            init_database_path(app)?;

            // Initialize the image compress directory.
            init_compress_dir(app)?;

            // Initialize the post processor directory.
            init_post_proc_dir(app)?;

            // Initialize the database.
            tauri::async_runtime::block_on(async { repository::init_database().await })?;

            Ok(())
        })
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            ipc::check_dev_mode,
            ipc::compress::compress_image,
            ipc::compress::open_compress_dir,
            ipc::compress::select_image_files,
            ipc::special_symbol::get_special_symbols,
            ipc::special_symbol::save_specail_symbols,
            ipc::image::proxy_local_image,
            ipc::image::proxy_remote_image,
            ipc::http::proxy_get,
            ipc::http::proxy_post,
            ipc::http::proxy_put,
            ipc::http::proxy_patch,
            ipc::http::proxy_delete,
            ipc::project::get_projects,
            ipc::project::create_local_project,
            ipc::project::update_project,
            ipc::project::delete_project,
            ipc::project::page::get_project_pages,
            ipc::project::page::create_project_pages,
            ipc::project::page::save_project_pages,
            ipc::project::page::delete_project_pages,
            ipc::project::unit::get_page_units,
            ipc::project::unit::save_page_units,
            ipc::project::unit::delete_page_units,
            ipc::project::select_project_dir,
            ipc::project::select_project_archive,
            ipc::project::plugin::get_local_post_processors,
            ipc::project::plugin::save_local_post_processor,
            ipc::project::plugin::select_post_processor_file,
            ipc::project::plugin::import_post_processor,
            ipc::project::plugin::open_post_processor_dir,
            ipc::project::port::export_project,
            ipc::project::port::import_project,
            ipc::project::port::open_project_dir,
        ])
        .run(tauri::generate_context!())
        .expect("无法启动 Tauri 应用程序");
}

// init_log_dir should be called before init_logger.
fn init_logger(app: &App) -> Result<(), String> {
    if APP_ENV == Environment::Production {
        let log_dir = app
            .path()
            .app_log_dir()
            .map_err(|e| format!("无法获取 log 目录: {}", e))?;

        // Create a daily rolling file appender.
        let file_appender = tracing_appender::rolling::daily(log_dir, "app.log");

        let (non_blocking, _guard) = tracing_appender::non_blocking(file_appender);

        let subscriber = tracing_subscriber::fmt()
            .with_max_level(Level::WARN)
            .with_writer(non_blocking)
            .with_ansi(false)
            .finish();

        tracing::subscriber::set_global_default(subscriber)
            .map_err(|e| format!("设置全局日志器失败: {}", e))?;

        // We have to keep _guard alive to ensure logs are flushed.
        app.manage(_guard);

        tracing::info!("setup.logger.production.initialized");

        return Ok(());
    }

    let subscriber = tracing_subscriber::fmt()
        .with_max_level(Level::DEBUG)
        .with_ansi(true)
        .finish();

    tracing::subscriber::set_global_default(subscriber)
        .map_err(|e| format!("设置全局日志器失败: {}", e))?;

    tracing::info!("setup.logger.debug.initialized");

    Ok(())
}

fn init_data_dir(app: &App) -> Result<(), String> {
    let data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("无法获取应用 data 目录: {}", e))?;

    // Create the data directory.
    // Data directory has some sub-directories.
    std::fs::create_dir_all(&data_dir)
        .map_err(|e| format!("无法创建 data 目录 {:?}: {}", data_dir, e))?;

    // Create storage directory.
    let storage_dir = data_dir.join(STORAGE_SUB_DIR);

    std::fs::create_dir_all(&storage_dir)
        .map_err(|e| format!("无法创建 storage 目录 {:?}: {}", storage_dir, e))?;

    // Create binary directory.
    let bin_dir = data_dir.join(BIN_SUB_DIR);

    std::fs::create_dir_all(&bin_dir)
        .map_err(|e| format!("无法创建 bin 目录 {:?}: {}", bin_dir, e))?;

    APP_DATA_DIR
        .write()
        .map_err(|e| format!("无法锁定 APP_DATA_DIR: {}", e))?
        .replace(data_dir.clone());

    tracing::info!(data_dir = ?data_dir, "setup.data_dir.initialized");

    Ok(())
}

fn init_cache_dir(app: &App) -> Result<(), String> {
    let cache_dir = app
        .path()
        .app_cache_dir()
        .map_err(|e| format!("无法获取应用 cache 目录: {}", e))?;

    std::fs::create_dir_all(&cache_dir)
        .map_err(|e| format!("无法创建 cache 目录 {:?}: {}", cache_dir, e))?;

    APP_CACHE_DIR
        .write()
        .map_err(|e| format!("无法锁定 APP_CACHE_DIR: {}", e))?
        .replace(cache_dir.clone());

    tracing::info!(cache_dir = ?cache_dir, "setup.cache_dir.initialized");

    Ok(())
}

fn init_log_dir(app: &App) -> Result<(), String> {
    if APP_ENV == Environment::Development {
        // In development mode, we do not create log directory.
        return Ok(());
    }

    let log_dir = app
        .path()
        .app_log_dir()
        .map_err(|e| format!("无法获取应用 log 目录: {}", e))?;

    std::fs::create_dir_all(&log_dir)
        .map_err(|e| format!("无法创建 log 目录 {:?}: {}", log_dir, e))?;

    tracing::info!(log_dir = ?log_dir, "setup.log_dir.initialized");

    Ok(())
}

fn init_database_path(app: &App) -> Result<(), String> {
    let data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("无法获取应用 data 目录: {}", e))?;

    let database_path = data_dir.join(STORAGE_SUB_DIR).join(DB_SUB_PATH);

    // Create the DB file if it does not already exist. If it exists, ignore.
    if !database_path.exists() {
        std::fs::File::create(&database_path)
            .map_err(|e| format!("无法创建数据库文件 {:?}: {}", database_path, e))?;
    }

    APP_DB_PATH
        .write()
        .map_err(|e| format!("无法锁定 APP_DB_PATH: {}", e))?
        .replace(database_path.clone());

    tracing::info!(db_path = ?database_path, "setup.database_path.initialized");

    Ok(())
}

fn init_compress_dir(app: &App) -> Result<(), String> {
    let cache_dir = app
        .path()
        .app_cache_dir()
        .map_err(|e| format!("无法获取应用 cache 目录: {}", e))?;

    let compress_dir = cache_dir.join(COMPRESS_SUB_DIR);

    std::fs::create_dir_all(&compress_dir)
        .map_err(|e| format!("无法创建 compress 目录 {:?}: {}", compress_dir, e))?;

    APP_COMPRESS_DIR
        .write()
        .map_err(|e| format!("无法锁定 APP_COMPRESS_DIR: {}", e))?
        .replace(compress_dir.clone());

    tracing::info!(compress_dir = ?compress_dir, "setup.compress_dir.initialized");

    Ok(())
}

fn init_post_proc_dir(app: &App) -> Result<(), String> {
    let data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("无法获取应用 data 目录: {}", e))?;

    let post_proc_dir = data_dir.join(STORAGE_SUB_DIR).join(POST_PROC_SUB_DIR);

    std::fs::create_dir_all(&post_proc_dir)
        .map_err(|e| format!("无法创建 post_processors 目录 {:?}: {}", post_proc_dir, e))?;

    APP_POST_PROC_DIR
        .write()
        .map_err(|e| format!("无法锁定 APP_POST_PROC_DIR: {}", e))?
        .replace(post_proc_dir.clone());

    tracing::info!(post_proc_dir = ?post_proc_dir, "setup.post_proc_dir.initialized");

    Ok(())
}
