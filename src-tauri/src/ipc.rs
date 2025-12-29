pub mod compress;
pub mod http;
pub mod image;
pub mod project;
pub mod specail_symbol;

fn get_ipc_request_id() -> u32 {
    rand::random::<u32>() % 10000
}
