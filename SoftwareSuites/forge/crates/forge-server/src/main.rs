//! FORGE remote cache server.
//!
//! Endpoints:
//!   PUT    /cache/:hash    upload artifacts (JSON map: path -> base64 content)
//!   GET    /cache/:hash    download artifacts
//!   HEAD   /cache/:hash    check existence
//!   GET    /health         liveness

use std::collections::HashMap;
use std::net::SocketAddr;
use std::path::PathBuf;
use std::sync::Arc;

use axum::{
    body::Bytes,
    extract::{Path, State},
    http::{HeaderMap, StatusCode},
    response::IntoResponse,
    routing::{get, head, put},
    Router,
};
use tracing::info;

#[derive(Clone)]
struct AppState {
    cache_dir: Arc<PathBuf>,
    token: Option<Arc<String>>,
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| tracing_subscriber::EnvFilter::new("forge_server=info")),
        )
        .init();

    let cache_dir: PathBuf = std::env::var("FORGE_CACHE_DIR")
        .unwrap_or_else(|_| "./.forge-cache".into())
        .into();
    std::fs::create_dir_all(&cache_dir)?;

    let token = std::env::var("FORGE_REMOTE_TOKEN").ok();
    if token.is_none() {
        tracing::warn!("FORGE_REMOTE_TOKEN not set — server is unauthenticated");
    }

    let state = AppState {
        cache_dir: Arc::new(cache_dir.clone()),
        token: token.map(Arc::new),
    };

    let app = Router::new()
        .route("/health", get(health))
        .route("/cache/:hash", put(put_cache).get(get_cache).head(head_cache))
        .with_state(state);

    let addr: SocketAddr = std::env::var("FORGE_LISTEN")
        .unwrap_or_else(|_| "127.0.0.1:8080".into())
        .parse()?;

    info!("forge-server listening on {}", addr);
    info!("cache dir: {}", cache_dir.display());

    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app).await?;
    Ok(())
}

async fn health() -> &'static str {
    "ok"
}

fn check_auth(headers: &HeaderMap, state: &AppState) -> Result<(), StatusCode> {
    if let Some(expected) = &state.token {
        let got = headers
            .get("authorization")
            .and_then(|v| v.to_str().ok())
            .unwrap_or("");
        if got != format!("Bearer {}", expected.as_str()) {
            return Err(StatusCode::UNAUTHORIZED);
        }
    }
    Ok(())
}

fn is_hex_hash(s: &str) -> bool {
    s.len() == 64 && s.bytes().all(|b| b.is_ascii_hexdigit())
}

async fn put_cache(
    State(state): State<AppState>,
    Path(hash): Path<String>,
    headers: HeaderMap,
    body: Bytes,
) -> impl IntoResponse {
    if let Err(code) = check_auth(&headers, &state) {
        return code.into_response();
    }
    if !is_hex_hash(&hash) {
        return (StatusCode::BAD_REQUEST, "invalid hash").into_response();
    }

    let map: HashMap<String, String> = match serde_json::from_slice(&body) {
        Ok(m) => m,
        Err(_) => return (StatusCode::BAD_REQUEST, "invalid JSON").into_response(),
    };

    let dir = state.cache_dir.join(&hash);
    if let Err(e) = std::fs::create_dir_all(&dir) {
        return (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response();
    }

    for (rel, b64) in map {
        // Prevent path traversal
        if rel.contains("..") || rel.starts_with('/') {
            return (StatusCode::BAD_REQUEST, "invalid path").into_response();
        }
        let content = match base64_decode(&b64) {
            Ok(c) => c,
            Err(_) => return (StatusCode::BAD_REQUEST, "invalid base64").into_response(),
        };
        let dest = dir.join(&rel);
        if let Some(parent) = dest.parent() {
            if let Err(e) = std::fs::create_dir_all(parent) {
                return (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response();
            }
        }
        if let Err(e) = std::fs::write(&dest, content) {
            return (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response();
        }
    }

    info!("stored {}", hash);
    StatusCode::OK.into_response()
}

async fn get_cache(
    State(state): State<AppState>,
    Path(hash): Path<String>,
    headers: HeaderMap,
) -> impl IntoResponse {
    if let Err(code) = check_auth(&headers, &state) {
        return code.into_response();
    }
    let dir = state.cache_dir.join(&hash);
    if !dir.is_dir() {
        return StatusCode::NOT_FOUND.into_response();
    }

    let mut map: HashMap<String, String> = HashMap::new();
    if collect(&dir, &dir, &mut map).is_err() {
        return StatusCode::INTERNAL_SERVER_ERROR.into_response();
    }

    match serde_json::to_vec(&map) {
        Ok(v) => (StatusCode::OK, v).into_response(),
        Err(_) => StatusCode::INTERNAL_SERVER_ERROR.into_response(),
    }
}

async fn head_cache(
    State(state): State<AppState>,
    Path(hash): Path<String>,
    headers: HeaderMap,
) -> impl IntoResponse {
    if let Err(code) = check_auth(&headers, &state) {
        return code.into_response();
    }
    if state.cache_dir.join(&hash).is_dir() {
        StatusCode::OK.into_response()
    } else {
        StatusCode::NOT_FOUND.into_response()
    }
}

fn collect(
    base: &PathBuf,
    dir: &PathBuf,
    out: &mut HashMap<String, String>,
) -> std::io::Result<()> {
    for entry in std::fs::read_dir(dir)? {
        let entry = entry?;
        let path = entry.path();
        if path.is_dir() {
            collect(base, &path, out)?;
        } else if path.is_file() {
            let rel = path
                .strip_prefix(base)
                .unwrap()
                .to_string_lossy()
                .replace('\\', "/");
            let content = std::fs::read(&path)?;
            out.insert(rel, base64_encode(&content));
        }
    }
    Ok(())
}

fn base64_encode(data: &[u8]) -> String {
    const T: &[u8; 64] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let mut out = String::new();
    for chunk in data.chunks(3) {
        let b = [
            chunk[0],
            chunk.get(1).copied().unwrap_or(0),
            chunk.get(2).copied().unwrap_or(0),
        ];
        let n = chunk.len();
        out.push(T[(b[0] >> 2) as usize] as char);
        out.push(T[(((b[0] & 3) << 4) | (b[1] >> 4)) as usize] as char);
        if n > 1 { out.push(T[(((b[1] & 15) << 2) | (b[2] >> 6)) as usize] as char) } else { out.push('='); }
        if n > 2 { out.push(T[(b[2] & 63) as usize] as char) } else { out.push('='); }
    }
    out
}

fn base64_decode(s: &str) -> Result<Vec<u8>, ()> {
    fn v(c: u8) -> Option<u8> {
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
        let vs: Vec<u8> = chunk.iter().filter_map(|&c| v(c)).collect();
        if vs.len() < 2 { return Err(()); }
        out.push((vs[0] << 2) | (vs[1] >> 4));
        if vs.len() > 2 { out.push(((vs[1] & 15) << 4) | (vs[2] >> 2)); }
        if vs.len() > 3 { out.push(((vs[2] & 3) << 6) | vs[3]); }
    }
    Ok(out)
}
