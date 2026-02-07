use crate::update::NATIVE_APP_VERSION;


#[tauri::command]
#[tracing::instrument(skip_all)]
pub fn get_native_app_version() -> &'static str {
    NATIVE_APP_VERSION
}