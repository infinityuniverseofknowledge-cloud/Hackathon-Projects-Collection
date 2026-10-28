use anyhow::Result;
use forge_core::Runner;
use indicatif::{ProgressBar, ProgressStyle};

pub fn execute(runner: &Runner, task: &str) -> Result<()> {
    let spinner = ProgressBar::new_spinner();
    spinner.set_style(
        ProgressStyle::with_template("{spinner:.green} {msg}")?
            .tick_chars("⠁⠂⠄⡀⢀⠠⠐⠈ "),
    );
    spinner.set_message(format!("running task '{}'…", task));
    spinner.enable_steady_tick(std::time::Duration::from_millis(80));

    let report = runner.run(task)?;
    spinner.finish_and_clear();

    println!();
    println!("  task outcomes:");
    println!("  {:<24} {:>10} {:>12} {}", "TASK", "STATUS", "TIME", "CACHE");
    println!("  {}", "─".repeat(60));
    for o in &report.outcomes {
        let status = match o.status {
            forge_core::runner::TaskStatus::Success => "ok",
            forge_core::runner::TaskStatus::Failed => "FAILED",
            forge_core::runner::TaskStatus::Skipped => "skipped",
        };
        let cache = if o.from_cache { "HIT" } else { "miss" };
        println!(
            "  {:<24} {:>10} {:>12} {}",
            o.name,
            status,
            format!("{:?}", o.duration),
            cache
        );
    }
    println!();
    println!(
        "  {} tasks · {} cache hits · {} cache misses · total {:?}",
        report.outcomes.len(),
        report.cache_hits,
        report.cache_misses,
        report.total_duration
    );
    Ok(())
}
