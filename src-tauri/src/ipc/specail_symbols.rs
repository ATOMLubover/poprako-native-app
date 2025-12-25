use crate::{
    ipc::get_ipc_request_id,
    repository::special_symbol::get_special_symbols as repo_get_special_symbols,
    result_trace::ResultTrace,
};

#[tauri::command]
#[tracing::instrument]
pub async fn get_special_symbols() -> Result<Vec<String>, String> {
    let ipc_id = get_ipc_request_id();

    tracing::info!(
        ipc_id = ipc_id,
        "ipc.specail_symbols.get_special_symbols.start"
    );

    let symbols = repo_get_special_symbols()
        .await
        .map_err(|e| format!("获取 special_symbols 失败: {}", e))
        .trace_error("获取 special_symbols 失败")?;

    tracing::info!(
        ipc_id = ipc_id,
        "ipc.specail_symbols.get_special_symbols.success"
    );

    Ok(symbols)
}

#[tauri::command]
#[tracing::instrument]
pub async fn save_specail_symbols(symbols: Vec<String>) -> Result<(), String> {
    let ipc_id = get_ipc_request_id();

    tracing::info!(
        ipc_id = ipc_id,
        "ipc.specail_symbols.save_specail_symbols.start"
    );

    crate::repository::special_symbol::save_specail_symbols(&symbols)
        .await
        .map_err(|e| format!("保存 special_symbols 失败: {}", e))
        .trace_error("保存 special_symbols 失败")?;

    tracing::info!(
        ipc_id = ipc_id,
        "ipc.specail_symbols.save_specail_symbols.success"
    );

    Ok(())
}
