//! Configuration parsing (`forge.toml`).

use std::collections::HashMap;
use std::path::Path;

use serde::Deserialize;

use crate::error::{Error, Result};
use crate::task::{Task, TaskGraph};

#[derive(Debug, Deserialize)]
struct RawConfig {
    forge: ForgeMeta,
    #[serde(default)]
    task: HashMap<String, RawTask>,
}

#[derive(Debug, Deserialize)]
struct ForgeMeta {
    #[serde(default)]
    version: String,
}

#[derive(Debug, Deserialize)]
struct RawTask {
    command: String,
    #[serde(default)]
    inputs: Vec<String>,
    #[serde(default)]
    outputs: Vec<String>,
    #[serde(default)]
    depends: Vec<String>,
    #[serde(default)]
    env: HashMap<String, String>,
    #[serde(default)]
    dir: Option<String>,
}

/// Parsed FORGE configuration.
#[derive(Debug, Clone)]
pub struct Config {
    pub version: String,
    pub graph: TaskGraph,
    pub root: std::path::PathBuf,
}

impl Config {
    pub fn load(root: impl AsRef<Path>) -> Result<Self> {
        let root = root.as_ref().to_path_buf();
        let path = root.join("forge.toml");
        let contents = std::fs::read_to_string(&path)
            .map_err(|e| Error::Config(format!("cannot read {}: {}", path.display(), e)))?;
        let raw: RawConfig = toml::from_str(&contents)
            .map_err(|e| Error::Config(format!("invalid forge.toml: {}", e)))?;

        let mut graph = TaskGraph::new();
        for (name, rt) in raw.task {
            let task = Task {
                name: name.clone(),
                command: rt.command,
                inputs: rt.inputs,
                outputs: rt.outputs,
                depends: rt.depends,
                env: rt.env,
                dir: rt.dir.map(std::path::PathBuf::from),
            };
            graph.add(task);
        }

        // Validate
        graph.to_dag()?;

        Ok(Self {
            version: if raw.forge.version.is_empty() {
                "1".into()
            } else {
                raw.forge.version
            },
            graph,
            root,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::TempDir;

    #[test]
    fn load_minimal_config() {
        let dir = TempDir::new().unwrap();
        fs::write(
            dir.path().join("forge.toml"),
            r#"
[forge]
version = "1"

[task.build]
command = "echo build"

[task.test]
command = "echo test"
depends = ["build"]
"#,
        )
        .unwrap();

        let cfg = Config::load(dir.path()).unwrap();
        assert_eq!(cfg.graph.tasks.len(), 2);
        assert!(cfg.graph.get("build").is_some());
        assert_eq!(cfg.graph.get("test").unwrap().depends, vec!["build"]);
    }

    #[test]
    fn invalid_toml_errors() {
        let dir = TempDir::new().unwrap();
        fs::write(dir.path().join("forge.toml"), "not valid toml [[[").unwrap();
        assert!(Config::load(dir.path()).is_err());
    }
}
