use anyhow::Result;
use forge_core::Config;

pub fn execute(config: &Config) -> Result<()> {
    println!("digraph forge {{");
    println!("  rankdir=TB;");
    println!("  node [shape=box, style=rounded, fontname=\"Helvetica\"];");
    for (name, task) in &config.graph.tasks {
        let label = format!("{}\\n({})", name, abbreviate(&task.command, 40));
        println!("  \"{}\" [label=\"{}\"];", name, label);
        for dep in &task.depends {
            println!("  \"{}\" -> \"{}\";", dep, name);
        }
    }
    println!("}}");
    Ok(())
}

fn abbreviate(s: &str, max: usize) -> String {
    if s.len() <= max {
        s.to_string()
    } else {
        format!("{}…", &s[..max])
    }
}
