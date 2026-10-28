use anyhow::Result;
use forge_core::Cache;

pub fn execute(cache: &Cache) -> Result<()> {
    let count = cache.count().unwrap_or(0);
    cache.clean()?;
    println!("  cleaned {} cache entries from {}", count, cache.root().display());
    Ok(())
}
