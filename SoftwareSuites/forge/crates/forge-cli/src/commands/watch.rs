use std::path::Path;
use std::sync::mpsc::channel;
use std::time::Duration;

use anyhow::Result;
use forge_core::Runner;
use notify::{Config as NotifyConfig, RecommendedWatcher, RecursiveMode, Watcher};

pub fn execute(runner: Runner, root: &Path, task: &str) -> Result<()> {
    let (tx, rx) = channel();

    let mut watcher = RecommendedWatcher::new(
        move |res| {
            let _ = tx.send(res);
        },
        NotifyConfig::default(),
    )?;

    watcher.watch(root, RecursiveMode::Recursive)?;
    println!("  watching {} for changes…", root.display());
    println!("  task: {}", task);
    println!("  press Ctrl-C to stop");

    // Initial run
    let _ = runner.run(task);

    loop {
        match rx.recv() {
            Ok(Ok(event)) => {
                // Debounce
                std::thread::sleep(Duration::from_millis(150));
                while rx.try_recv().is_ok() {}

                let paths: Vec<_> = event.paths.iter().map(|p| p.display().to_string()).collect();
                println!("  change detected: {}", paths.join(", "));
                println!("  re-running task '{}'…", task);
                match runner.run(task) {
                    Ok(r) => println!(
                        "  done in {:?} ({} hits, {} misses)",
                        r.total_duration, r.cache_hits, r.cache_misses
                    ),
                    Err(e) => eprintln!("  error: {}", e),
                }
            }
            Ok(Err(e)) => eprintln!("  watch error: {}", e),
            Err(e) => {
                eprintln!("  channel error: {}", e);
                break;
            }
        }
    }
    Ok(())
}
