mod result_trace;

#[tauri::command]
#[tracing::instrument]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

// A simple enum to represent the environment.
pub enum Environment {
    Development,
    Production,
}

// Use conditional compilation to set the environment.
// 此静态变量可能暂时未被使用，允许 dead_code 以避免未使用警告
#[allow(dead_code)]
static ENVIRONMENT: Environment = {
    #[cfg(debug_assertions)]
    {
        Environment::Development
    }
    #[cfg(not(debug_assertions))]
    {
        Environment::Production
    }
};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![greet])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
