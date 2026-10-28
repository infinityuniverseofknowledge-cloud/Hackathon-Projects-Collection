//! SHA-256 content-addressed hashing for build inputs.

use std::path::{Path, PathBuf};

use sha2::{Digest, Sha256};
use walkdir::WalkDir;

use crate::error::{Error, Result};

/// SHA-256 hasher for build inputs and task signatures.
pub struct Hasher {
    sha: Sha256,
}

impl Hasher {
    pub fn new() -> Self {
        Self {
            sha: Sha256::new(),
        }
    }

    pub fn update_bytes(&mut self, bytes: &[u8]) {
        self.sha.update(bytes);
    }

    pub fn update_str(&mut self, s: &str) {
        self.sha.update(s.as_bytes());
    }

    pub fn update_separator(&mut self) {
        self.sha.update(b"\x1f"); // ASCII unit separator, cannot appear in UTF-8
    }

    pub fn finalize_hex(self) -> String {
        hex::encode(self.sha.finalize())
    }

    /// Hash a file's content. Returns hex SHA-256.
    pub fn hash_file(path: &Path) -> Result<String> {
        let bytes = std::fs::read(path)?;
        Ok(Self::hash_bytes(&bytes))
    }

    /// Hash an in-memory byte slice.
    pub fn hash_bytes(bytes: &[u8]) -> String {
        let mut h = Sha256::new();
        h.update(bytes);
        hex::encode(h.finalize())
    }

    /// Hash a string.
    pub fn hash_str(s: &str) -> String {
        Self::hash_bytes(s.as_bytes())
    }

    /// Expand a glob pattern relative to a root. Returns sorted file paths.
    pub fn expand_glob(root: &Path, pattern: &str) -> Result<Vec<PathBuf>> {
        let full = root.join(pattern);
        let s = full
            .to_str()
            .ok_or_else(|| Error::Hash("non-UTF8 path".into()))?;

        let mut out = Vec::new();
        for entry in glob::glob(s).map_err(|e| Error::Hash(e.to_string()))? {
            let path = entry.map_err(|e| Error::Hash(e.to_string()))?;
            if path.is_file() {
                out.push(path);
            } else if path.is_dir() {
                for e in WalkDir::new(&path).into_iter().filter_map(|e| e.ok()) {
                    if e.file_type().is_file() {
                        out.push(e.path().to_path_buf());
                    }
                }
            }
        }
        out.sort();
        out.dedup();
        Ok(out)
    }

    /// Compute a task signature from command, env, input files, and dependency hashes.
    ///
    /// Canonical form (each section separated by 0x1f):
    ///     FORGE_VERSION || command || sorted(env) || sorted(path=filehash) || sorted(dep_hash)
    pub fn task_signature(
        root: &Path,
        command: &str,
        env: &[(String, String)],
        input_patterns: &[String],
        dep_hashes: &[String],
    ) -> Result<String> {
        let mut h = Hasher::new();
        h.update_str(crate::VERSION);
        h.update_separator();
        h.update_str(command);
        h.update_separator();

        // Env
        let mut env_sorted = env.to_vec();
        env_sorted.sort();
        for (k, v) in &env_sorted {
            h.update_str(k);
            h.update_separator();
            h.update_str(v);
            h.update_separator();
        }

        // Input files
        let mut all_files: Vec<PathBuf> = Vec::new();
        for pat in input_patterns {
            let files = Self::expand_glob(root, pat)?;
            all_files.extend(files);
        }
        all_files.sort();
        all_files.dedup();

        for f in &all_files {
            let rel = f
                .strip_prefix(root)
                .unwrap_or(f)
                .to_string_lossy()
                .replace('\\', "/");
            h.update_str(&rel);
            h.update_separator();
            let fh = Self::hash_file(f)?;
            h.update_str(&fh);
            h.update_separator();
        }

        // Dependency hashes
        let mut deps = dep_hashes.to_vec();
        deps.sort();
        for d in &deps {
            h.update_str(d);
            h.update_separator();
        }

        Ok(h.finalize_hex())
    }
}

impl Default for Hasher {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::TempDir;

    #[test]
    fn hash_bytes_stable() {
        let h1 = Hasher::hash_bytes(b"hello");
        let h2 = Hasher::hash_bytes(b"hello");
        assert_eq!(h1, h2);
        assert_eq!(h1.len(), 64);
    }

    #[test]
    fn hash_bytes_different() {
        let h1 = Hasher::hash_bytes(b"hello");
        let h2 = Hasher::hash_bytes(b"world");
        assert_ne!(h1, h2);
    }

    #[test]
    fn hash_file_matches_bytes() {
        let dir = TempDir::new().unwrap();
        let path = dir.path().join("test.txt");
        fs::write(&path, b"content").unwrap();
        assert_eq!(
            Hasher::hash_file(&path).unwrap(),
            Hasher::hash_bytes(b"content")
        );
    }

    #[test]
    fn glob_expands() {
        let dir = TempDir::new().unwrap();
        fs::write(dir.path().join("a.rs"), b"a").unwrap();
        fs::write(dir.path().join("b.rs"), b"b").unwrap();
        fs::write(dir.path().join("c.txt"), b"c").unwrap();
        let files = Hasher::expand_glob(dir.path(), "*.rs").unwrap();
        assert_eq!(files.len(), 2);
    }

    #[test]
    fn task_signature_deterministic() {
        let dir = TempDir::new().unwrap();
        fs::write(dir.path().join("a.rs"), b"fn main() {}").unwrap();

        let s1 = Hasher::task_signature(
            dir.path(),
            "cargo build",
            &[("FOO".into(), "bar".into())],
            &["*.rs".into()],
            &["deadbeef".into()],
        )
        .unwrap();

        let s2 = Hasher::task_signature(
            dir.path(),
            "cargo build",
            &[("FOO".into(), "bar".into())],
            &["*.rs".into()],
            &["deadbeef".into()],
        )
        .unwrap();

        assert_eq!(s1, s2);
    }
}
