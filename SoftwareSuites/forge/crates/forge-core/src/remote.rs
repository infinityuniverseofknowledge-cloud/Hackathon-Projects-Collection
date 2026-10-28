//! HTTP client for the remote cache server.

use std::path::{Path, PathBuf};

use crate::cache::Cache;
use crate::error::{Error, Result};

pub struct RemoteCache {
    base_url: String,
    token: Option<String>,
    client: reqwest::blocking::Client,
}

impl RemoteCache {
    pub fn new(base_url: impl Into<String>, token: Option<String>) -> Result<Self> {
        let client = reqwest::blocking::Client::builder()
            .timeout(std::time::Duration::from_secs(30))
            .build()
            .map_err(|e| Error::Remote(e.to_string()))?;
        Ok(Self {
            base_url: base_url.into(),
            token,
            client,
        })
    }

    fn auth_header(&self) -> Option<String> {
        self.token.as_ref().map(|t| format!("Bearer {}", t))
    }

    pub fn contains(&self, hash: &str) -> bool {
        let url = format!("{}/cache/{}", self.base_url.trim_end_matches('/'), hash);
        let mut req = self.client.head(&url);
        if let Some(a) = self.auth_header() {
            req = req.header("Authorization", a);
        }
        matches!(req.send(), Ok(r) if r.status().is_success())
    }

    /// Download artifacts for `hash` into `dest_dir`.
    pub fn fetch(&self, hash: &str, dest_dir: &Path) -> Result<()> {
        let url = format!("{}/cache/{}", self.base_url.trim_end_matches('/'), hash);
        let mut req = self.client.get(&url);
        if let Some(a) = self.auth_header() {
            req = req.header("Authorization", a);
        }
        let resp = req.send().map_err(|e| Error::Remote(e.to_string()))?;
        if !resp.status().is_success() {
            return Err(Error::Remote(format!("HTTP {}", resp.status())));
        }
        let bytes = resp.bytes().map_err(|e| Error::Remote(e.to_string()))?;

        // Body is a JSON object: { "path": "base64 content", ... }
        let map: std::collections::HashMap<String, String> =
            serde_json::from_slice(&bytes).map_err(|e| Error::Remote(e.to_string()))?;

        for (rel, b64) in map {
            let content = base64_decode(&b64)?;
            let dest = dest_dir.join(&rel);
            if let Some(p) = dest.parent() {
                std::fs::create_dir_all(p)?;
            }
            std::fs::write(&dest, content)?;
        }
        Ok(())
    }

    /// Upload artifacts for `hash` from local cache.
    pub fn push(&self, hash: &str, cache: &Cache) -> Result<()> {
        let entry = cache.root().join(hash);
        if !entry.is_dir() {
            return Err(Error::Remote("entry not in cache".into()));
        }

        let mut map: std::collections::HashMap<String, String> =
            std::collections::HashMap::new();
        collect_files(&entry, &entry, &mut map)?;

        let url = format!("{}/cache/{}", self.base_url.trim_end_matches('/'), hash);
        let mut req = self.client.put(&url).json(&map);
        if let Some(a) = self.auth_header() {
            req = req.header("Authorization", a);
        }
        let resp = req.send().map_err(|e| Error::Remote(e.to_string()))?;
        if !resp.status().is_success() {
            return Err(Error::Remote(format!("HTTP {}", resp.status())));
        }
        Ok(())
    }
}

fn collect_files(
    base: &Path,
    dir: &Path,
    out: &mut std::collections::HashMap<String, String>,
) -> Result<()> {
    for entry in std::fs::read_dir(dir)? {
        let entry = entry?;
        let path = entry.path();
        if path.is_dir() {
            collect_files(base, &path, out)?;
        } else if path.is_file() {
            let rel = path
                .strip_prefix(base)
                .unwrap_or(&path)
                .to_string_lossy()
                .replace('\\', "/");
            let content = std::fs::read(&path)?;
            out.insert(rel, base64_encode(&content));
        }
    }
    Ok(())
}

/// Minimal base64 encoder (no padding issues for our use case).
fn base64_encode(data: &[u8]) -> String {
    const TABLE: &[u8; 64] =
        b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let mut out = String::new();
    for chunk in data.chunks(3) {
        let b = [
            chunk[0],
            chunk.get(1).copied().unwrap_or(0),
            chunk.get(2).copied().unwrap_or(0),
        ];
        let n = chunk.len();
        out.push(TABLE[(b[0] >> 2) as usize] as char);
        out.push(TABLE[(((b[0] & 0x03) << 4) | (b[1] >> 4)) as usize] as char);
        if n > 1 {
            out.push(TABLE[(((b[1] & 0x0f) << 2) | (b[2] >> 6)) as usize] as char);
        } else {
            out.push('=');
        }
        if n > 2 {
            out.push(TABLE[(b[2] & 0x3f) as usize] as char);
        } else {
            out.push('=');
        }
    }
    out
}

fn base64_decode(s: &str) -> Result<Vec<u8>> {
    fn val(c: u8) -> Option<u8> {
        match c {
            b'A'..=b'Z' => Some(c - b'A'),
            b'a'..=b'z' => Some(c - b'a' + 26),
            b'0'..=b'9' => Some(c - b'0' + 52),
            b'+' => Some(62),
            b'/' => Some(63),
            _ => None,
        }
    }
    let bytes: Vec<u8> = s.bytes().filter(|&c| c != b'=').collect();
    let mut out = Vec::with_capacity((bytes.len() * 3) / 4);
    for chunk in bytes.chunks(4) {
        let v: Vec<u8> = chunk.iter().filter_map(|&c| val(c)).collect();
        if v.len() < 2 {
            break;
        }
        out.push((v[0] << 2) | (v[1] >> 4));
        if v.len() > 2 {
            out.push(((v[1] & 0x0f) << 4) | (v[2] >> 2));
        }
        if v.len() > 3 {
            out.push(((v[2] & 0x03) << 6) | v[3]);
        }
    }
    Ok(out)
}

#[allow(dead_code)]
fn _unused(p: PathBuf) -> PathBuf {
    p
}
