registerPattern({
  id: 'circles',
  order: 40,
  name: 'Linked circles',
  note: 'Overlapping circular rows, split only at their true intersections.',
  aspect: 1,
  build(W) {
    const r = 0.6 * W, b = Math.acos(W / (2 * r)), angles = [];
    for (let i = 0; i < 4; i++) angles.push(mod(i * Math.PI / 2 - b, TAU), mod(i * Math.PI / 2 + b, TAU));
    angles.sort((a, b) => a - b);
    return {W, H: W, edges: angles.map((a, i) => edge(arc([W / 2, W / 2], r, a, i === angles.length - 1 ? angles[0] + TAU : angles[i + 1]), 'circle'))};
  }
});
