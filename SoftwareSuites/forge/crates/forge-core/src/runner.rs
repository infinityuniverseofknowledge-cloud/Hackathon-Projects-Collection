//! Parallel task runner based on the dependency DAG.

use std::collections::HashMap;
use std::path::PathBuf;
use std::process::Command;
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};

use rayon::prelude::*;

use crate::cache::Cache;
use crate::config::Config;
use crate::error::{Error, Result};
use crate::hash::Hasher;
use crate::remote::RemoteCache;
use crate::task::Task;

/// Result of running a task.
#[derive(Debug, Clone)]
pub struct TaskOutcome {
    pub name: String,
    pub hash: String,
    pub from_cache: bool,
    pub duration: Duration,
    pub status: TaskStatus,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum TaskStatus {
    Success,
    Failed,
    Skipped,
}

/// Summary report for a full `forge run`.
#[derive(Debug, Clone)]
pub struct RunReport {
    pub outcomes: Vec<TaskOutcome>,
    pub total_duration: Duration,
    pub cache_hits: usize,
    pub cache_misses: usize,
}

pub struct Runner {
    config: Config,
    cache: Cache,
    remote: Option<RemoteCache>,
    jobs: usize,
}

impl Runner {
    pub fn new(config: Config, cache: Cache, remote: Option<RemoteCache>, jobs: usize) -> Self {
        Self {
            config,
            cache,
            remote,
            jobs,
        }
    }

    /// Run a target task and all its dependencies.
    pub fn run(&self, target: &str) -> Result<RunReport> {
        let order = self.config.graph.execution_order()?;
        if !order.iter().any(|n| n == target) {
            return Err(Error::TaskNotFound(target.into()));
        }

        let start = Instant::now();
        let pool = rayon::ThreadPoolBuilder::new()
            .num_threads(self.jobs)
            .build()
            .map_err(|e| Error::Other(e.into()))?;

        // Shared outcome map
        let outcomes: Arc<Mutex<HashMap<String, TaskOutcome>>> =
            Arc::new(Mutex::new(HashMap::new()));

        // Compute the reachable set of tasks for the target
        let reachable = self.reachable_tasks(target)?;

        // Run each task in the reachable set, but only if its deps succeeded
        // Rayon drives the parallelism; we exploit the "already sorted" order
        // and use `par_iter` with a batch approach. For simplicity and
        // correctness, we use a simple level-based scheduler.
        let levels = self.compute_levels(&reachable)?;

        for level in levels {
            let results: Vec<Result<TaskOutcome>> = pool.install(|| {
                level
                    .par_iter()
                    .map(|name| self.run_one(name, &outcomes))
                    .collect()
            });

            for r in results {
                let outcome = r?;
                outcomes.lock().unwrap().insert(outcome.name.clone(), outcome);
            }
        }

        let outcomes_map = outcomes.lock().unwrap().clone();
        let mut outcomes_vec: Vec<TaskOutcome> = outcomes_map.into_values().collect();
        outcomes_vec.sort_by(|a, b| a.name.cmp(&b.name));

        let cache_hits = outcomes_vec.iter().filter(|o| o.from_cache).count();
        let cache_misses = outcomes_vec.iter().filter(|o| !o.from_cache).count();

        Ok(RunReport {
            outcomes: outcomes_vec,
            total_duration: start.elapsed(),
            cache_hits,
            cache_misses,
        })
    }

    /// Set of tasks reachable from `target` (including target itself).
    fn reachable_tasks(&self, target: &str) -> Result<Vec<String>> {
        let mut visited = std::collections::HashSet::new();
        let mut stack = vec![target.to_string()];
        while let Some(n) = stack.pop() {
            if visited.insert(n.clone()) {
                if let Some(t) = self.config.graph.get(&n) {
                    for d in &t.depends {
                        stack.push(d.clone());
                    }
                }
            }
        }
        Ok(visited.into_iter().collect())
    }

    /// Group reachable tasks into levels: level N depends only on levels < N.
    fn compute_levels(&self, reachable: &[String]) -> Result<Vec<Vec<String>>> {
        use std::collections::HashMap;
        let set: std::collections::HashSet<_> = reachable.iter().cloned().collect();
        let mut level_of: HashMap<String, usize> = HashMap::new();

        // Iteratively assign level = 1 + max(level of deps)
        let order = self.config.graph.execution_order()?;
        for name in order {
            if !set.contains(&name) {
                continue;
            }
            let task = self.config.graph.get(&name).unwrap();
            let mut lvl = 0;
            for d in &task.depends {
                if let Some(dl) = level_of.get(d) {
                    lvl = lvl.max(dl + 1);
                }
            }
            level_of.insert(name, lvl);
        }

        let max_level = level_of.values().copied().max().unwrap_or(0);
        let mut levels: Vec<Vec<String>> = vec![Vec::new(); max_level + 1];
        for (name, lvl) in level_of {
            levels[lvl].push(name);
        }
        for l in &mut levels {
            l.sort();
        }
        Ok(levels)
    }

    fn run_one(
        &self,
        name: &str,
        outcomes: &Arc<Mutex<HashMap<String, TaskOutcome>>>,
    ) -> Result<TaskOutcome> {
        let task = self
            .config
            .graph
            .get(name)
            .ok_or_else(|| Error::TaskNotFound(name.into()))?;

        let start = Instant::now();

        // Collect dependency hashes
        let dep_hashes: Vec<String> = {
            let map = outcomes.lock().unwrap();
            task.depends
                .iter()
                .filter_map(|d| map.get(d).map(|o| o.hash.clone()))
                .collect()
        };

        // Compute signature
        let env_vec: Vec<(String, String)> = task
            .env
            .iter()
            .map(|(k, v)| (k.clone(), v.clone()))
            .collect();
        let hash = Hasher::task_signature(
            &self.config.root,
            &task.command,
            &env_vec,
            &task.inputs,
            &dep_hashes,
        )?;

        // Check local cache
        if !task.outputs.is_empty() && self.cache.contains(&hash) {
            // Restore
            let mapping: Vec<(String, PathBuf)> = task
                .outputs
                .iter()
                .map(|o| (o.clone(), self.config.root.join(o)))
                .collect();
            self.cache.restore(&hash, &mapping)?;

            return Ok(TaskOutcome {
                name: name.into(),
                hash,
                from_cache: true,
                duration: start.elapsed(),
                status: TaskStatus::Success,
            });
        }

        // Check remote cache
        if let Some(remote) = &self.remote {
            if !task.outputs.is_empty() && remote.contains(&hash) {
                // Download to a temp dir, then store locally and restore
                let tmp = tempfile::tempdir()?;
                remote.fetch(&hash, tmp.path())?;

                // Copy to local cache
                let files: Vec<(PathBuf, String)> = task
                    .outputs
                    .iter()
                    .filter_map(|o| {
                        let src = tmp.path().join(o);
                        if src.exists() {
                            Some((src, o.clone()))
                        } else {
                            None
                        }
                    })
                    .collect();
                self.cache.store(&hash, &files)?;

                // Restore to workspace
                let mapping: Vec<(String, PathBuf)> = task
                    .outputs
                    .iter()
                    .map(|o| (o.clone(), self.config.root.join(o)))
                    .collect();
                self.cache.restore(&hash, &mapping)?;

                return Ok(TaskOutcome {
                    name: name.into(),
                    hash,
                    from_cache: true,
                    duration: start.elapsed(),
                    status: TaskStatus::Success,
                });
            }
        }

        // Cache miss: run the command
        let workdir = match &task.dir {
            Some(d) => self.config.root.join(d),
            None => self.config.root.clone(),
        };

        let mut cmd = Command::new("sh");
        cmd.arg("-c").arg(&task.command).current_dir(&workdir);
        for (k, v) in &task.env {
            cmd.env(k, v);
        }

        let output = cmd.output()?;
        if !output.status.success() {
            let code = output.status.code().unwrap_or(-1);
            // Print stderr for user
            eprint!("{}", String::from_utf8_lossy(&output.stderr));
            return Err(Error::CommandFailed {
                code,
                command: task.command.clone(),
            });
        }

        // Store outputs in cache
        if !task.outputs.is_empty() {
            let files: Vec<(PathBuf, String)> = task
                .outputs
                .iter()
                .filter_map(|o| {
                    let p = self.config.root.join(o);
                    if p.exists() {
                        Some((p, o.clone()))
                    } else {
                        None
                    }
                })
                .collect();
            self.cache.store(&hash, &files)?;

            // Push to remote
            if let Some(remote) = &self.remote {
                let _ = remote.push(&hash, &self.cache);
            }
        }

        Ok(TaskOutcome {
            name: name.into(),
            hash,
            from_cache: false,
            duration: start.elapsed(),
            status: TaskStatus::Success,
        })
    }

    pub fn config(&self) -> &Config {
        &self.config
    }
    pub fn cache(&self) -> &Cache {
        &self.cache
    }
}
