registerPattern({
  id: 'diamonds',
  order: 30,
  name: 'Diamond lattice',
  note: 'Two diagonal families. Each crossing gets its own breathing room.',
  aspect: 1,
  build(W) {
    const p = [W / 2, W / 2];
    return {W, H: W, edges: [[0, 0], [W, 0], [W, W], [0, W]].map((q, i) => edge(line(p, q), `diagonal-${i % 2}`))};
  }
});
