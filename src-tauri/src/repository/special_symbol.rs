use std::sync::LazyLock;

use anyhow::anyhow;
use sqlx::SqlitePool;

use crate::repository::DATABASE;

static LOCAL_DB: LazyLock<SqlitePool> =
    LazyLock::new(|| DATABASE.lock().unwrap().as_ref().unwrap().clone());

pub async fn get_special_symbols() -> anyhow::Result<Vec<String>> {
    let symbol_list: Vec<String> = sqlx::query_scalar("SELECT symbol FROM special_symbol_tbl")
        .fetch_all(&*LOCAL_DB)
        .await
        .map_err(|e| anyhow!("获取用户特定 specail_symbols 时失败: {}", e))?;

    Ok(symbol_list)
}

pub async fn save_specail_symbols(symbols: &[String]) -> anyhow::Result<()> {
    let mut trx = LOCAL_DB
        .begin()
        .await
        .map_err(|e| anyhow!("开启保存 special_symbols 事务时失败: {}", e))?;

    for symbol in symbols {
        sqlx::query("INSERT OR IGNORE INTO special_symbol_tbl (symbol) VALUES (?)")
            .bind(symbol)
            .execute(trx.as_mut())
            .await
            .map_err(|e| anyhow!("保存 special_symbol '{}' 时失败: {}", symbol, e))?;
    }

    trx.commit()
        .await
        .map_err(|e| anyhow!("提交保存 special_symbols 事务时失败: {}", e))?;

    Ok(())
}
