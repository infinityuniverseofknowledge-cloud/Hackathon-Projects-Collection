//! FORGE CLI entry point.

use std::path::PathBuf;

use clap::{Parser, Subcommand};
use forge_core::{Cache, Config, RemoteCache, Runner, VERSION};

mod commands;

#[derive(Parser, Debug)]
#[command(name = "forge", version = VERSION)]
#[command(about = "Fast incremental build system", long_about = None)]
struct Cli {
    /// Path to the project root (default: current directory)
    #[arg(short, long, default_value = ".", env = "FORGE_ROOT")]
    root: PathBuf,

    /// Path to the cache directory
    #[arg(long, env = "FORGE_CACHE_DIR")]
    cache_dir: Option<PathBuf>,

    /// Remote cache server URL
    #[arg(long, env = "FORGE_REMOTE_URL")]
    remote: Option<String>,

    /// Remote cache auth token
    #[arg(long, env = "FORGE_REMOTE_TOKEN")]
    token: Option<String>,

    /// Number of parallel jobs
    #[arg(short, long, env = "FORGE_JOBS")]
    jobs: Option<usize>,

    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand, Debug)]
enum Commands {
    /// Run a task and all its dependencies
    Run {
        /// Task name (from forge.toml)
        task: String,
    },
    /// Print the task graph in DOT format
    Graph,
    /// Clean the local cache
    Clean,
    /// Re-run a task on file changes
    Watch {
        /// Task name
        task: String,
    },
    /// Interact with the remote cache
    Remote {
        #[command(subcommand)]
        cmd: RemoteCmd,
    },
    /// Generate shell completions
    Completions {
        /// Shell name (bash, zsh, fish)
        shell: String,
    },
    /// Show version and build info
    Version,
}

#[derive(Subcommand, Debug)]
enum RemoteCmd {
    /// Check if a hash exists on the remote
    Check { hash: String },
    /// Upload a cache entry to the remote
    Push { hash: String },
    /// Download a cache entry from the remote
    Pull { hash: String },
}

fn main() {
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| tracing_subscriber::EnvFilter::new("forge=info")),
        )
        .init();

    let cli = Cli::parse();
    let jobs = cli.jobs.unwrap_or_else(num_cpus);

    let cache_dir = cli
        .cache_dir
        .clone()
        .unwrap_or_else(|| cli.root.join(".forge").join("cache"));

    let config = match Config::load(&cli.root) {
        Ok(c) => c,
        Err(e) => {
            eprintln!("forge: {}", e);
            std::process::exit(2);
        }
    };

    let cache = Cache::new(cache_dir);
    let remote = cli
        .remote
        .as_ref()
        .and_then(|url| RemoteCache::new(url.clone(), cli.token.clone()).ok());

    let runner = Runner::new(config, cache, remote, jobs);

    let result = match cli.command {
        Commands::Run { task } => commands::run::execute(&runner, &task),
        Commands::Graph => commands::graph::execute(runner.config()),
        Commands::Clean => commands::clean::execute(runner.cache()),
        Commands::Watch { task } => commands::watch::execute(runner, &cli.root, &task),
        Commands::Remote { cmd } => match cmd {
            RemoteCmd::Check { hash } => commands::remote::check(runner.config(), &hash),
            RemoteCmd::Push { hash } => commands::remote::push(runner.config(), &hash),
            RemoteCmd::Pull { hash } => commands::remote::pull(runner.config(), &hash),
        },
        Commands::Completions { shell } => commands::completions::execute(&shell),
        Commands::Version => {
            println!("forge {}", VERSION);
            println!("rustc {}", rustc_version());
            Ok(())
        }
    };

    if let Err(e) = result {
        eprintln!("forge: {}", e);
        std::process::exit(1);
    }
}

fn num_cpus() -> usize {
    std::thread::available_parallelism()
        .map(|n| n.get())
        .unwrap_or(4)
}

fn rustc_version() -> &'static str {
    // Minimal placeholder; real version would be embedded at build time.
    "1.75+"
}
