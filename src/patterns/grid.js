registerPattern({
  id: 'grid',
  order: 20,
  name: 'Square lattice',
  note: 'Straight rows and columns, with open spaces at every crossing.',
  aspect: 1,
  build(W) {
    return {W, H: W, edges: [
      edge(line([W / 2, W / 2], [W * 1.5, W / 2]), 'horizontal'),
      edge(line([W / 2, W / 2], [W / 2, W * 1.5]), 'vertical')
    ]};
  }
});
