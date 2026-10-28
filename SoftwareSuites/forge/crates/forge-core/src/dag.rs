//! Directed acyclic graph with topological sort.
//!
//! Uses **Kahn's algorithm** (1962) for topological sort in O(V + E).
//! Detects cycles via leftover nodes after the sort.

use std::collections::{HashMap, HashSet, VecDeque};

use crate::error::{Error, Result};

/// A DAG where each node has a list of dependencies (nodes it depends on).
#[derive(Debug, Default, Clone)]
pub struct Dag {
    /// node name -> set of dependencies
    edges: HashMap<String, HashSet<String>>,
}

impl Dag {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn add_node(&mut self, name: impl Into<String>) {
        self.edges.entry(name.into()).or_default();
    }

    /// `from` depends on `to`. Adds both nodes if not present.
    pub fn add_edge(&mut self, from: impl Into<String>, to: impl Into<String>) {
        let from = from.into();
        let to = to.into();
        self.edges.entry(from.clone()).or_default().insert(to.clone());
        self.edges.entry(to).or_default();
    }

    pub fn nodes(&self) -> impl Iterator<Item = &String> {
        self.edges.keys()
    }

    pub fn dependencies_of(&self, node: &str) -> Option<&HashSet<String>> {
        self.edges.get(node)
    }

    pub fn len(&self) -> usize {
        self.edges.len()
    }

    pub fn is_empty(&self) -> bool {
        self.edges.is_empty()
    }

    /// Topological sort using Kahn's algorithm.
    ///
    /// Returns nodes in **dependency order**: dependencies come before
    /// their dependents. Errors on cycles.
    pub fn topo_sort(&self) -> Result<Vec<String>> {
        // Build reverse edges and in-degree
        let mut in_degree: HashMap<String, usize> =
            self.edges.keys().map(|k| (k.clone(), 0)).collect();
        let mut reverse: HashMap<String, Vec<String>> = HashMap::new();

        for (node, deps) in &self.edges {
            for dep in deps {
                reverse
                    .entry(dep.clone())
                    .or_default()
                    .push(node.clone());
                *in_degree.get_mut(node).unwrap() += 1;
            }
        }

        // Seed queue with zero in-degree nodes
        let mut queue: VecDeque<String> = in_degree
            .iter()
            .filter(|(_, &d)| d == 0)
            .map(|(n, _)| n.clone())
            .collect();

        // Sort seed for determinism
        let mut seed: Vec<String> = queue.into_iter().collect();
        seed.sort();
        let mut queue: VecDeque<String> = seed.into();

        let mut result = Vec::with_capacity(self.edges.len());

        while let Some(node) = queue.pop_front() {
            result.push(node.clone());
            if let Some(dependents) = reverse.get(&node) {
                let mut sorted = dependents.clone();
                sorted.sort();
                for dep in sorted {
                    let deg = in_degree.get_mut(&dep).unwrap();
                    *deg -= 1;
                    if *deg == 0 {
                        queue.push_back(dep);
                    }
                }
            }
        }

        if result.len() != self.edges.len() {
            // Find a cycle for a helpful error message
            let in_result: HashSet<_> = result.iter().cloned().collect();
            let cycle_nodes: Vec<_> = self
                .edges
                .keys()
                .filter(|n| !in_result.contains(*n))
                .cloned()
                .collect();
            return Err(Error::Cycle(cycle_nodes.join(", ")));
        }

        Ok(result)
    }

    /// Detect if the graph has a cycle (DFS three-color).
    pub fn has_cycle(&self) -> bool {
        self.topo_sort().is_err()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn empty_dag() {
        let d = Dag::new();
        assert_eq!(d.topo_sort().unwrap(), Vec::<String>::new());
    }

    #[test]
    fn single_node() {
        let mut d = Dag::new();
        d.add_node("a");
        assert_eq!(d.topo_sort().unwrap(), vec!["a"]);
    }

    #[test]
    fn linear_chain() {
        // c -> b -> a  (c depends on b, b depends on a)
        let mut d = Dag::new();
        d.add_edge("c", "b");
        d.add_edge("b", "a");
        let sorted = d.topo_sort().unwrap();
        assert_eq!(sorted, vec!["a", "b", "c"]);
    }

    #[test]
    fn diamond() {
        // d depends on b and c; both depend on a
        let mut d = Dag::new();
        d.add_edge("d", "b");
        d.add_edge("d", "c");
        d.add_edge("b", "a");
        d.add_edge("c", "a");
        let sorted = d.topo_sort().unwrap();
        let pos = |n: &str| sorted.iter().position(|x| x == n).unwrap();
        assert!(pos("a") < pos("b"));
        assert!(pos("a") < pos("c"));
        assert!(pos("b") < pos("d"));
        assert!(pos("c") < pos("d"));
    }

    #[test]
    fn cycle_detected() {
        let mut d = Dag::new();
        d.add_edge("a", "b");
        d.add_edge("b", "c");
        d.add_edge("c", "a");
        assert!(d.has_cycle());
    }
}
