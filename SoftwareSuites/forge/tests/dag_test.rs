use forge_core::Dag;

#[test]
fn kahn_topo_sort_linear() {
    let mut d = Dag::new();
    d.add_edge("c", "b");
    d.add_edge("b", "a");
    assert_eq!(d.topo_sort().unwrap(), vec!["a", "b", "c"]);
}

#[test]
fn diamond_topology() {
    let mut d = Dag::new();
    d.add_edge("d", "b");
    d.add_edge("d", "c");
    d.add_edge("b", "a");
    d.add_edge("c", "a");

    let sorted = d.topo_sort().unwrap();
    let p = |n: &str| sorted.iter().position(|x| x == n).unwrap();

    assert!(p("a") < p("b"));
    assert!(p("a") < p("c"));
    assert!(p("b") < p("d"));
    assert!(p("c") < p("d"));
}

#[test]
fn cycle_detection() {
    let mut d = Dag::new();
    d.add_edge("a", "b");
    d.add_edge("b", "c");
    d.add_edge("c", "a");
    assert!(d.topo_sort().is_err());
    assert!(d.has_cycle());
}

#[test]
fn empty_and_single() {
    let d = Dag::new();
    assert_eq!(d.topo_sort().unwrap().len(), 0);

    let mut d = Dag::new();
    d.add_node("solo");
    assert_eq!(d.topo_sort().unwrap(), vec!["solo"]);
}
