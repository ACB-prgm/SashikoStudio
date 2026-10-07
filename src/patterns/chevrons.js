registerPattern({
  id: 'chevrons',
  order: 50,
  name: 'Chevron rows',
  note: 'Parallel zigzags. Stitches stop short of each peak and valley.',
  aspect: 0.5,
  build(W) {
    const H = W / 2, a = [0, H / 4], b = [W / 2, H * 3 / 4], c = [W, H / 4];
    return {W, H, edges: [edge(line(a, b), 'zigzag'), edge(line(b, c), 'zigzag')]};
  }
});
