use crate::{ipc::get_ipc_request_id, result_trace::ResultTrace, service};

/// Get the list of special symbols stored in the repository.
#[tauri::command]
#[tracing::instrument]
pub async fn get_special_symbols() -> Result<Vec<String>, String> {
    let ipc_id = get_ipc_request_id();

    tracing::info!(
        ipc_id = ipc_id,
        "ipc.specail_symbols.get_special_symbols.start"
    );

    let symbols = service::special_symbol::get_special_symbols()
        .await
        .trace_error("获取 special_symbols 失败")
        .map_err(|e| e.to_string())?;

    tracing::info!(
        ipc_id = ipc_id,
        "ipc.specail_symbols.get_special_symbols.success"
    );

    Ok(symbols)
}

/// Save the provided list of special symbols to the repository.
#[tauri::command]
#[tracing::instrument]
pub async fn save_specail_symbols(symbols: Vec<String>) -> Result<(), String> {
    let ipc_id = get_ipc_request_id();

    tracing::info!(
        ipc_id = ipc_id,
        "ipc.specail_symbols.save_specail_symbols.start"
    );

    service::special_symbol::save_specail_symbols(symbols)
        .await
        .trace_error("保存 special_symbols 失败")
        .map_err(|e| e.to_string())?;

    tracing::info!(
        ipc_id = ipc_id,
        "ipc.specail_symbols.save_specail_symbols.success"
    );

    Ok(())
}
