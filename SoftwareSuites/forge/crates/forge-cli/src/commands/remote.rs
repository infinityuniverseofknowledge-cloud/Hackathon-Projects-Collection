use anyhow::{anyhow, Result};
use forge_core::{Cache, Config, RemoteCache};

fn make_remote() -> Result<RemoteCache> {
    let url = std::env::var("FORGE_REMOTE_URL")
        .map_err(|_| anyhow!("FORGE_REMOTE_URL not set"))?;
    let token = std::env::var("FORGE_REMOTE_TOKEN").ok();
    RemoteCache::new(url, token).map_err(|e| anyhow!(e.to_string()))
}

pub fn check(_config: &Config, hash: &str) -> Result<()> {
    let remote = make_remote()?;
    if remote.contains(hash) {
        println!("  {} exists on remote", hash);
    } else {
        println!("  {} not found on remote", hash);
    }
    Ok(())
}

pub fn push(_config: &Config, hash: &str) -> Result<()> {
    let remote = make_remote()?;
    let cache_dir = std::env::var("FORGE_CACHE_DIR").unwrap_or_else(|_| ".forge/cache".into());
    let cache = Cache::new(cache_dir);
    remote.push(hash, &cache).map_err(|e| anyhow!(e.to_string()))?;
    println!("  pushed {} to remote", hash);
    Ok(())
}

pub fn pull(_config: &Config, hash: &str) -> Result<()> {
    let remote = make_remote()?;
    let cache_dir = std::env::var("FORGE_CACHE_DIR").unwrap_or_else(|_| ".forge/cache".into());
    let cache = Cache::new(cache_dir);
    let tmp = tempfile::tempdir()?;
    remote.fetch(hash, tmp.path()).map_err(|e| anyhow!(e.to_string()))?;
    let mut files: Vec<(std::path::PathBuf, String)> = Vec::new();
    for entry in walkdir::WalkDir::new(tmp.path()).into_iter().filter_map(|e| e.ok()) {
        if entry.file_type().is_file() {
            let rel = entry
                .path()
                .strip_prefix(tmp.path())
                .unwrap()
                .to_string_lossy()
                .to_string();
            files.push((entry.path().to_path_buf(), rel));
        }
    }
    cache.store(hash, &files)?;
    println!("  pulled {} into cache", hash);
    Ok(())
}
