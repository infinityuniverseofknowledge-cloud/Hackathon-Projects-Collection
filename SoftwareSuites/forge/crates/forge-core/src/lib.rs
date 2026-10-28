//! FORGE core library.
//!
//! Provides the algorithms and data structures behind the `forge` CLI:
//!
//! - [`Dag`]: directed acyclic graph of tasks with topological sort
//! - [`Task`], [`TaskGraph`]: task definitions and dependencies
//! - [`Hasher`]: SHA-256 content-addressed hashing
//! - [`Cache`]: local content-addressed cache
//! - [`RemoteCache`]: HTTP client for a remote cache server
//! - [`Config`]: parsing of `forge.toml`
//! - [`Runner`]: parallel task executor

pub mod cache;
pub mod config;
pub mod dag;
pub mod error;
pub mod hash;
pub mod remote;
pub mod runner;
pub mod task;

pub use cache::Cache;
pub use config::Config;
pub use dag::Dag;
pub use error::{Error, Result};
pub use hash::Hasher;
pub use remote::RemoteCache;
pub use runner::{RunReport, Runner};
pub use task::{Task, TaskGraph};

/// FORGE version, embedded at compile time.
pub const VERSION: &str = env!("CARGO_PKG_VERSION");
