#[allow(dead_code)]
pub trait ResultTrace {
    fn trace_debug(self, msg: &str) -> Self;
    fn trace_info(self, msg: &str) -> Self;
    fn trace_warn(self, msg: &str) -> Self;
    fn trace_error(self, msg: &str) -> Self;
}

impl<T, E: std::fmt::Debug> ResultTrace for Result<T, E> {
    fn trace_debug(self, msg: &str) -> Self {
        if let Err(ref e) = self {
            tracing::debug!("[Debug] {}: {:?}", msg, e);
        }

        self
    }

    fn trace_info(self, msg: &str) -> Self {
        if let Err(ref e) = self {
            tracing::info!("[Info] {}: {:?}", msg, e);
        }

        self
    }

    fn trace_warn(self, msg: &str) -> Self {
        if let Err(ref e) = self {
            tracing::warn!("[Warn] {}: {:?}", msg, e);
        }

        self
    }

    fn trace_error(self, msg: &str) -> Self {
        if let Err(ref e) = self {
            tracing::error!("[Error] {}: {:?}", msg, e);
        }

        self
    }
}
