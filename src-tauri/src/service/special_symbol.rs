use anyhow::anyhow;

use crate::repository::special_symbol as repo_special_symbol;

/// Get the list of special symbols stored in the repository.
pub async fn get_special_symbols() -> anyhow::Result<Vec<String>> {
    let symbols = repo_special_symbol::get_special_symbols()
        .await
        .map_err(|e| anyhow!("获取 special_symbols 失败: {}", e))?;

    Ok(symbols)
}

/// Save the provided list of special symbols to the repository.
pub async fn save_specail_symbols(symbols: Vec<String>) -> anyhow::Result<()> {
    repo_special_symbol::save_specail_symbols(&symbols)
        .await
        .map_err(|e| anyhow!("保存 special_symbols 失败: {}", e))?;

    Ok(())
}
