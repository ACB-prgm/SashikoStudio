registerPattern({
  id: 'interlaced',
  order: 10,
  name: 'Interlaced curves',
  note: 'Your reference, rebuilt as curves. Two staggered rows form one complete rectangular repeat.',
  aspect: 70 / 122,
  build(W) {
    const k = W / 122, H = 70 * k, E = [];
    const P = (p, ox = 0, oy = 0, mirror = false) => [(ox + (mirror ? 122 - p[0] : p[0])) * k, (oy + p[1]) * k];
    // Hermite control points preserve smooth tangents through the T junctions.
    const knots = [[12, 0], [34, 15], [49, 35], [50, 62]];
    const tangents = [[25, 7], [20, 17.5], [8, 23.5], [-6, 28]];
    for (let row = 0; row < 2; row++) {
      const ox = row * 61, oy = row * 35;
      for (const mirror of [false, true]) {
        for (let i = 0; i < 3; i++) {
          const a = knots[i], b = knots[i + 1], ta = tangents[i], tb = tangents[i + 1];
          E.push(edge(cubic([
            P(a, ox, oy, mirror),
            P([a[0] + ta[0] / 3, a[1] + ta[1] / 3], ox, oy, mirror),
            P([b[0] - tb[0] / 3, b[1] - tb[1] / 3], ox, oy, mirror),
            P(b, ox, oy, mirror)
          ]), `row-${row}-${mirror ? 'right' : 'left'}`));
        }
      }
      const cy = 12.875, r = Math.hypot(34, 50 - cy);
      const pts = [[27, 50], [50, 62], [72, 62], [95, 50]];
      const angles = pts.map(p => Math.atan2(p[1] - cy, p[0] - 61));
      for (let j = 0; j < 3; j++) E.push(edge(arc(P([61, cy], ox, oy), r * k, angles[j], angles[j + 1]), `row-${row}-cup`));
    }
    return {W, H, edges: E};
  }
});
