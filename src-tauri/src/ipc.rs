pub mod compress;
pub mod http;
pub mod image;
pub mod project;
pub mod special_symbol;
pub mod util;

pub(crate) fn get_ipc_request_id() -> u32 {
    rand::random::<u32>() % 10000
}

#[tauri::command]
pub fn check_dev_mode() -> bool {
    #[cfg(debug_assertions)]
    {
        true
    }
    #[cfg(not(debug_assertions))]
    {
        false
    }
}
