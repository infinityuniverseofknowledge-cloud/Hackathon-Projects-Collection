//! Task definition and graph.

use std::collections::HashMap;
use std::path::PathBuf;

use serde::{Deserialize, Serialize};

use crate::dag::Dag;
use crate::error::{Error, Result};

/// A single build task (equivalent to a `[task.name]` section in forge.toml).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Task {
    pub name: String,
    pub command: String,
    #[serde(default)]
    pub inputs: Vec<String>,
    #[serde(default)]
    pub outputs: Vec<String>,
    #[serde(default)]
    pub depends: Vec<String>,
    #[serde(default)]
    pub env: HashMap<String, String>,
    /// Optional working directory (relative to project root).
    #[serde(default)]
    pub dir: Option<PathBuf>,
}

impl Task {
    pub fn new(name: impl Into<String>, command: impl Into<String>) -> Self {
        Self {
            name: name.into(),
            command: command.into(),
            inputs: Vec::new(),
            outputs: Vec::new(),
            depends: Vec::new(),
            env: HashMap::new(),
            dir: None,
        }
    }
}

/// A graph of tasks, ready for execution.
#[derive(Debug, Clone, Default)]
pub struct TaskGraph {
    pub tasks: HashMap<String, Task>,
}

impl TaskGraph {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn add(&mut self, task: Task) {
        self.tasks.insert(task.name.clone(), task);
    }

    pub fn get(&self, name: &str) -> Option<&Task> {
        self.tasks.get(name)
    }

    /// Build a DAG from the task dependencies.
    pub fn to_dag(&self) -> Result<Dag> {
        let mut dag = Dag::new();
        for (name, task) in &self.tasks {
            dag.add_node(name);
            for dep in &task.depends {
                if !self.tasks.contains_key(dep) {
                    return Err(Error::Config(format!(
                        "task '{}' depends on unknown task '{}'",
                        name, dep
                    )));
                }
                dag.add_edge(name, dep);
            }
        }
        // Verify no cycles
        dag.topo_sort()?;
        Ok(dag)
    }

    /// Return tasks in execution order (dependencies first).
    pub fn execution_order(&self) -> Result<Vec<String>> {
        let dag = self.to_dag()?;
        dag.topo_sort()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn simple_graph_order() {
        let mut g = TaskGraph::new();
        let mut a = Task::new("a", "echo a");
        a.depends.push("b".into());
        let mut b = Task::new("b", "echo b");
        b.depends.push("c".into());
        let c = Task::new("c", "echo c");
        g.add(a);
        g.add(b);
        g.add(c);

        let order = g.execution_order().unwrap();
        assert_eq!(order, vec!["c", "b", "a"]);
    }

    #[test]
    fn missing_dependency_errors() {
        let mut g = TaskGraph::new();
        let mut a = Task::new("a", "echo");
        a.depends.push("does_not_exist".into());
        g.add(a);
        assert!(g.to_dag().is_err());
    }
}
