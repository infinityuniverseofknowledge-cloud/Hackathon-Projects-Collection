//! Error types for FORGE.

use thiserror::Error as ThisError;

pub type Result<T> = std::result::Result<T, Error>;

#[derive(Debug, ThisError)]
pub enum Error {
    #[error("I/O error: {0}")]
    Io(#[from] std::io::Error),

    #[error("config error: {0}")]
    Config(String),

    #[error("cycle detected in task graph: {0}")]
    Cycle(String),

    #[error("task not found: {0}")]
    TaskNotFound(String),

    #[error("command failed with exit code {code}: {command}")]
    CommandFailed { code: i32, command: String },

    #[error("hash error: {0}")]
    Hash(String),

    #[error("cache error: {0}")]
    Cache(String),

    #[error("remote error: {0}")]
    Remote(String),

    #[error(transparent)]
    Other(#[from] anyhow::Error),
}
