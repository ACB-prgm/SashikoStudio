registerPattern({
  id: 'waves',
  order: 60,
  name: 'Wave rows',
  note: 'Smooth, continuous waves. A whole number of stitch periods fits each wavelength.',
  aspect: 0.4,
  build(W) {
    const H = W * 0.4, A = H * 0.27, parts = [], n = 8;
    for (let i = 0; i < n; i++) {
      const x0 = W * i / n, x1 = W * (i + 1) / n, dx = x1 - x0;
      const y0 = H / 2 + A * Math.sin(TAU * x0 / W), y1 = H / 2 + A * Math.sin(TAU * x1 / W);
      const d0 = A * TAU / W * Math.cos(TAU * x0 / W), d1 = A * TAU / W * Math.cos(TAU * x1 / W);
      parts.push(cubic([[x0, y0], [x0 + dx / 3, y0 + d0 * dx / 3], [x1 - dx / 3, y1 - d1 * dx / 3], [x1, y1]]));
    }
    return {W, H, edges: [path(parts, {periodic: true, route: 'wave'})]};
  }
});
