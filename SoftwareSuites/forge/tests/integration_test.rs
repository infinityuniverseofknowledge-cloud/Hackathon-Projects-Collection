//! End-to-end integration test: build a small project and run it.

use std::fs;
use std::process::Command;

use tempfile::TempDir;

fn forge_bin() -> std::path::PathBuf {
    // Assume cargo test runs from workspace root; the binary is at target/debug/forge
    let mut p = std::env::current_exe().unwrap();
    p.pop(); // remove test binary name
    if p.ends_with("deps") {
        p.pop();
    }
    p.push("forge");
    p
}

#[test]
fn end_to_end_run_and_cache() {
    let dir = TempDir::new().unwrap();
    let root = dir.path();

    // Create a minimal forge.toml with a task that writes a file
    fs::write(
        root.join("forge.toml"),
        r#"
[forge]
version = "1"

[task.generate]
command = "echo hello > out.txt"
inputs = ["forge.toml"]
outputs = ["out.txt"]
"#,
    )
    .unwrap();

    let bin = forge_bin();
    if !bin.exists() {
        eprintln!("skipping: {} not built yet", bin.display());
        return;
    }

    // First run — should be a cache miss
    let out1 = Command::new(&bin)
        .arg("--root")
        .arg(root)
        .arg("run")
        .arg("generate")
        .output()
        .unwrap();
    assert!(out1.status.success(), "first run failed: {:?}", out1);
    assert!(root.join("out.txt").exists());

    // Remove output to force restore from cache
    fs::remove_file(root.join("out.txt")).unwrap();

    // Second run — should be a cache hit and restore the file
    let out2 = Command::new(&bin)
        .arg("--root")
        .arg(root)
        .arg("run")
        .arg("generate")
        .output()
        .unwrap();
    assert!(out2.status.success(), "second run failed");
    assert!(root.join("out.txt").exists(), "output not restored from cache");

    let stdout = String::from_utf8_lossy(&out2.stdout);
    assert!(
        stdout.contains("HIT") || stdout.contains("hit"),
        "second run should have been a cache hit, got: {}",
        stdout
    );
}
