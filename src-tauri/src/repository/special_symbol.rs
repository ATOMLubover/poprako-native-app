use std::sync::LazyLock;

use sqlx::SqlitePool;

use crate::{repository::DATABASE, result_trace::ResultTrace};

static LOCAL_DB: LazyLock<SqlitePool> =
    LazyLock::new(|| DATABASE.lock().unwrap().as_ref().unwrap().clone());

pub async fn get_special_symbols() -> Result<Vec<String>, String> {
    let symbol_list: Vec<String> = sqlx::query_scalar("SELECT symbol FROM special_symbol_tbl")
        .fetch_all(&*LOCAL_DB)
        .await
        .trace_error("获取用户特定 specail_symbols 时失败")
        .map_err(|e| e.to_string())?;

    Ok(symbol_list)
}

pub async fn save_specail_symbols(symbols: &[String]) -> Result<(), String> {
    let mut trx = LOCAL_DB
        .begin()
        .await
        .trace_error("开启保存 special_symbols 事务时失败")
        .map_err(|e| e.to_string())?;

    for symbol in symbols {
        sqlx::query("INSERT OR IGNORE INTO special_symbol_tbl (symbol) VALUES (?)")
            .bind(symbol)
            .execute(trx.as_mut())
            .await
            .trace_error(&format!("保存 special_symbol '{}' 时失败", symbol))
            .map_err(|e| e.to_string())?;
    }

    trx.commit()
        .await
        .trace_error("提交保存 special_symbols 事务时失败")
        .map_err(|e| e.to_string())?;

    Ok(())
}
