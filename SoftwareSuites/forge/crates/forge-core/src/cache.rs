//! Local content-addressed cache.

use std::path::{Path, PathBuf};

use crate::error::{Error, Result};

/// Content-addressed cache rooted at a directory.
///
/// Layout:
///     <root>/cache/<hash>/         -> artifact directory
///     <root>/cache/<hash>/.meta    -> metadata JSON
pub struct Cache {
    root: PathBuf,
}

impl Cache {
    pub fn new(root: impl Into<PathBuf>) -> Self {
        Self { root: root.into() }
    }

    pub fn root(&self) -> &Path {
        &self.root
    }

    fn entry_dir(&self, hash: &str) -> PathBuf {
        self.root.join(hash)
    }

    pub fn contains(&self, hash: &str) -> bool {
        self.entry_dir(hash).is_dir()
    }

    /// Store a set of files (identified by (source_path, relative_path)) under `hash`.
    pub fn store(&self, hash: &str, files: &[(PathBuf, String)]) -> Result<()> {
        let dir = self.entry_dir(hash);
        std::fs::create_dir_all(&dir)?;
        for (src, rel) in files {
            let dest = dir.join(rel);
            if let Some(parent) = dest.parent() {
                std::fs::create_dir_all(parent)?;
            }
            std::fs::copy(src, &dest)?;
        }
        Ok(())
    }

    /// Restore files from cache entry `hash` into the workspace.
    ///
    /// `mapping` maps relative path in cache -> absolute path in workspace.
    pub fn restore(&self, hash: &str, mapping: &[(String, PathBuf)]) -> Result<()> {
        let dir = self.entry_dir(hash);
        if !dir.is_dir() {
            return Err(Error::Cache(format!("cache miss for hash {}", hash)));
        }
        for (rel, dest) in mapping {
            let src = dir.join(rel);
            if !src.exists() {
                return Err(Error::Cache(format!(
                    "cache entry {} missing file {}",
                    hash, rel
                )));
            }
            if let Some(parent) = dest.parent() {
                std::fs::create_dir_all(parent)?;
            }
            std::fs::copy(&src, dest)?;
        }
        Ok(())
    }

    /// Delete the whole cache directory.
    pub fn clean(&self) -> Result<()> {
        if self.root.exists() {
            std::fs::remove_dir_all(&self.root)?;
        }
        Ok(())
    }

    /// Number of entries.
    pub fn count(&self) -> Result<usize> {
        if !self.root.exists() {
            return Ok(0);
        }
        let mut n = 0;
        for entry in std::fs::read_dir(&self.root)? {
            let entry = entry?;
            if entry.file_type()?.is_dir() {
                n += 1;
            }
        }
        Ok(n)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::TempDir;

    #[test]
    fn store_and_restore() {
        let dir = TempDir::new().unwrap();
        let cache = Cache::new(dir.path().join("cache"));

        // Create source file
        let src = dir.path().join("source.txt");
        fs::write(&src, "hello").unwrap();

        // Store
        cache
            .store("abc123", &[(src.clone(), "out.txt".into())])
            .unwrap();
        assert!(cache.contains("abc123"));

        // Restore
        let dest = dir.path().join("restored.txt");
        cache
            .restore("abc123", &[("out.txt".into(), dest.clone())])
            .unwrap();
        assert_eq!(fs::read_to_string(&dest).unwrap(), "hello");
    }

    #[test]
    fn cache_miss_errors() {
        let dir = TempDir::new().unwrap();
        let cache = Cache::new(dir.path().join("cache"));
        let dest = dir.path().join("out.txt");
        assert!(cache.restore("nonexistent", &[("f".into(), dest)]).is_err());
    }

    #[test]
    fn clean_removes() {
        let dir = TempDir::new().unwrap();
        let cache = Cache::new(dir.path().join("cache"));
        fs::create_dir_all(cache.root()).unwrap();
        cache.clean().unwrap();
        assert!(!cache.root().exists());
    }
}
