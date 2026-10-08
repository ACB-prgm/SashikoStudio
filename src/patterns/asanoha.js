/** Reconstructed continuous geometry from 02_L-1003_asanoha.jpg. No border or labels. */
registerPattern({
  id: "asanoha",
  order: 102,
  name: "Asanoha",
  note: "Triangular hemp-leaf geometry. Each triangle connects its vertices to its center.",
  reference: "02_L-1003_asanoha.jpg",
  aspect: 1 / Math.sqrt(3),
  build(W) {
    const H=W/Math.sqrt(3), h=W/2, E=[];
    const faces=[[[0,0],[0,H],[h,H/2]],[[0,0],[h,-H/2],[h,H/2]],[[h,H/2],[h,1.5*H],[W,H]],[[h,H/2],[W,0],[W,H]]];
    for(const t of faces){
      E.push(...patternLines([...t,t[0]],'triangular-grid'));
      const c=[0,1].map(k=>t.reduce((s,p)=>s+p[k],0)/3);
      for(const p of t) E.push(edge(line(c,p),'leaf-ray'));
    }
    return patternGraph(W,H,E);
  }
});
