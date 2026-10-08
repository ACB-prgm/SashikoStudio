/** Shared authoring helpers. All coordinates and tolerances are in mm.
 * These build continuous geometry, never stitches or stencil slots.
 * patternGraph splits LINE / CIRCULAR ARC crossings, including translated
 * neighbors, then removes coincident segments. Cubics must be split by authors.
 */
function patternLines(points, route = '') {
  return points.slice(1).map((p, i) => edge(line(points[i], p), route));
}
function patternGraph(W, H, input) {
  const eps = Math.min(W, H) * 1e-8;
  const cross = (a, b) => a[0] * b[1] - a[1] * b[0];
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
  const shifted = (p, x, y) => [p[0] + x, p[1] + y];
  function moved(p, x, y) {
    if (p.kind === 'line') return line(shifted(p.p0, x, y), shifted(p.p1, x, y));
    if (p.kind === 'arc') return arc(shifted(p.c, x, y), p.r, p.a0, p.a1);
    throw new Error('patternGraph supports lines and circular arcs only. Split other curves explicitly.');
  }
  function canonical(p) {
    const m = p.at(p.L / 2);
    return moved(p, -Math.floor((m[0] + eps) / W) * W, -Math.floor((m[1] + eps) / H) * H);
  }
  function key(p) {
    const pts = [0, .25, .5, .75, 1].map(t => p.at(p.L * t).map(x => Math.round(x / eps)).join(','));
    const a = pts.join(';'), b = pts.reverse().join(';');
    return a < b ? a : b;
  }
  const raw = [], seen = new Set();
  for (const e of input) {
    if (!e.parts || e.parts.length !== 1 || e.periodic) throw new Error('patternGraph expects single-primitive, non-periodic edges.');
    if (e.L <= eps) continue;
    const p = canonical(e.parts[0]), k = key(p);
    if (!seen.has(k)) { seen.add(k); raw.push({p, route:e.route}); }
  }
  // Return a parameter on this finite primitive, not on its supporting circle.
  function parameter(p, v) {
    if (p.kind === 'line') {
      const d = sub(p.p1, p.p0), z = sub(v, p.p0), L2 = p.L * p.L;
      const t = (z[0] * d[0] + z[1] * d[1]) / L2;
      return t >= -1e-8 && t <= 1 + 1e-8 && Math.abs(cross(d, z)) <= eps * p.L * 4 ? clamp(t, 0, 1) : null;
    }
    if (Math.abs(hypot(v, p.c) - p.r) > eps * 4) return null;
    const span = p.a1 - p.a0, a = Math.atan2(v[1] - p.c[1], v[0] - p.c[0]);
    for (let k = -3; k <= 3; k++) {
      const t = (a + k * TAU - p.a0) / span;
      if (t >= -1e-8 && t <= 1 + 1e-8) return clamp(t, 0, 1);
    }
    return null;
  }
  function intersections(a, b) {
    if (a.kind === 'line' && b.kind === 'line') {
      const u = sub(a.p1, a.p0), v = sub(b.p1, b.p0), d = sub(b.p0, a.p0), den = cross(u, v);
      if (Math.abs(den) <= eps * (a.L + b.L)) return [a.p0, a.p1, b.p0, b.p1];
      const t = cross(d, v) / den;
      return [lerp(a.p0, a.p1, t)];
    }
    if (a.kind === 'arc' && b.kind === 'arc') {
      const d = hypot(a.c, b.c);
      if (d < eps) return Math.abs(a.r - b.r) < eps ? [a.p0, a.p1, b.p0, b.p1] : [];
      if (d > a.r + b.r + eps || d < Math.abs(a.r - b.r) - eps) return [];
      const x = (a.r*a.r - b.r*b.r + d*d) / (2*d), h2 = a.r*a.r - x*x;
      if (h2 < -eps * Math.max(a.r, b.r)) return [];
      const h = Math.sqrt(Math.max(0, h2)), u = sub(b.c, a.c).map(v => v/d), m = shifted(a.c, x*u[0], x*u[1]);
      return [[m[0]-h*u[1], m[1]+h*u[0]], [m[0]+h*u[1], m[1]-h*u[0]]];
    }
    const l = a.kind === 'line' ? a : b, c = a.kind === 'arc' ? a : b;
    const v = sub(l.p1, l.p0), z = sub(l.p0, c.c), A = l.L*l.L;
    const B = 2 * (v[0]*z[0] + v[1]*z[1]), C = z[0]*z[0] + z[1]*z[1] - c.r*c.r, D = B*B - 4*A*C;
    if (D < -eps * A) return [];
    const root = Math.sqrt(Math.max(0, D));
    return [(-B-root)/(2*A), (-B+root)/(2*A)].map(t => lerp(l.p0, l.p1, t));
  }
  const out = [], emitted = new Set();
  for (let i = 0; i < raw.length; i++) {
    const {p:a, route} = raw[i], cuts = [0, 1], A = a.bounds;
    for (let j = 0; j < raw.length; j++) {
      const b0 = raw[j].p, B = b0.bounds;
      const xmin = Math.ceil((A[0]-B[2]-eps)/W), xmax = Math.floor((A[2]-B[0]+eps)/W);
      const ymin = Math.ceil((A[1]-B[3]-eps)/H), ymax = Math.floor((A[3]-B[1]+eps)/H);
      for (let x=xmin; x<=xmax; x++) for (let y=ymin; y<=ymax; y++) {
        if (i===j && x===0 && y===0) continue;
        const b = moved(b0, x*W, y*H);
        for (const v of intersections(a,b)) {
          const t = parameter(a,v);
          if (t !== null && parameter(b,v) !== null) cuts.push(t);
        }
      }
    }
    cuts.sort((a,b)=>a-b);
    const unique = cuts.filter((t,i)=>!i || (t-cuts[i-1])*a.L>eps*4);
    for (let k=1; k<unique.length; k++) {
      const u=unique[k-1], v=unique[k];
      if ((v-u)*a.L<=eps*4) continue;
      const part = canonical(a.kind==='line' ? line(a.at(u*a.L),a.at(v*a.L)) : arc(a.c,a.r,a.a0+(a.a1-a.a0)*u,a.a0+(a.a1-a.a0)*v));
      const id = key(part);
      if (!emitted.has(id)) { emitted.add(id); out.push(edge(part,route)); }
    }
  }
  return {W,H,edges:out};
}
