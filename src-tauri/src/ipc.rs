pub mod compress;
pub mod specail_symbols;

fn get_ipc_request_id() -> u32 {
    rand::random::<u32>() % 10000
}
