/** Reconstructed continuous geometry from 13_211_fundou-tsunagi.jpg. No border or labels. */
registerPattern({
  id: "fundou-tsunagi",
  order: 113,
  name: "Fundou tsunagi",
  note: "Linked counterweight curves, built from alternating quarter circles on a staggered lattice.",
  reference: "13_211_fundou-tsunagi.jpg",
  aspect: 1,
  build(W) {
    const g=W/2;
    // The two node types have opposite curvature. Reusing one node type
    // would create scallop rows instead of the reference's crossing S-curves.
    const E=[
      edge(arc([g,0],g,Math.PI,Math.PI/2),'down-curve'),
      edge(arc([0,-g],g,Math.PI/2,0),'up-curve'),
      edge(arc([g,2*g],g,-Math.PI/2,0),'down-curve'),
      edge(arc([2*g,g],g,Math.PI,1.5*Math.PI),'up-curve')
    ];
    return {W,H:W,edges:E};
  }
});
