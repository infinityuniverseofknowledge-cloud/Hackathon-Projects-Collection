use std::fs;
use tempfile::TempDir;

use forge_core::Hasher;

#[test]
fn content_addressing_is_stable() {
    let dir = TempDir::new().unwrap();
    fs::write(dir.path().join("a.rs"), b"fn main() {}").unwrap();
    fs::write(dir.path().join("b.rs"), b"fn foo() {}").unwrap();

    let sig1 = Hasher::task_signature(
        dir.path(),
        "cargo build",
        &[],
        &["*.rs".into()],
        &[],
    )
    .unwrap();

    let sig2 = Hasher::task_signature(
        dir.path(),
        "cargo build",
        &[],
        &["*.rs".into()],
        &[],
    )
    .unwrap();

    assert_eq!(sig1, sig2);
}

#[test]
fn content_change_changes_hash() {
    let dir = TempDir::new().unwrap();
    fs::write(dir.path().join("a.rs"), b"fn main() {}").unwrap();

    let sig1 = Hasher::task_signature(dir.path(), "build", &[], &["*.rs".into()], &[]).unwrap();

    fs::write(dir.path().join("a.rs"), b"fn main() { println!(); }").unwrap();
    let sig2 = Hasher::task_signature(dir.path(), "build", &[], &["*.rs".into()], &[]).unwrap();

    assert_ne!(sig1, sig2, "changing file content must change the hash");
}

#[test]
fn mtime_does_not_change_hash() {
    // This is the key property: content addressing ignores mtime.
    let dir = TempDir::new().unwrap();
    let path = dir.path().join("a.rs");
    fs::write(&path, b"same content").unwrap();

    let sig1 = Hasher::task_signature(dir.path(), "build", &[], &["*.rs".into()], &[]).unwrap();

    // Sleep a bit and rewrite the same content (mtime changes)
    std::thread::sleep(std::time::Duration::from_millis(1100));
    fs::write(&path, b"same content").unwrap();

    let sig2 = Hasher::task_signature(dir.path(), "build", &[], &["*.rs".into()], &[]).unwrap();

    assert_eq!(sig1, sig2, "same content must produce same hash regardless of mtime");
}

#[test]
fn env_changes_hash() {
    let dir = TempDir::new().unwrap();
    fs::write(dir.path().join("a.rs"), b"x").unwrap();

    let sig1 = Hasher::task_signature(
        dir.path(),
        "build",
        &[("PROFILE".into(), "debug".into())],
        &["*.rs".into()],
        &[],
    )
    .unwrap();

    let sig2 = Hasher::task_signature(
        dir.path(),
        "build",
        &[("PROFILE".into(), "release".into())],
        &["*.rs".into()],
        &[],
    )
    .unwrap();

    assert_ne!(sig1, sig2, "changing env must change the hash");
}
