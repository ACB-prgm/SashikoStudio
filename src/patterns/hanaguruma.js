/** Reconstructed continuous geometry from 03_L-1004_hanaguruma.jpg. No border or labels. */
registerPattern({
  id: "hanaguruma",
  order: 103,
  name: "Hanaguruma",
  note: "Six-petal circular flowers on a staggered triangular lattice. Dense junctions benefit from a larger repeat.",
  reference: "03_L-1004_hanaguruma.jpg",
  aspect: Math.sqrt(3),
  build(W) {
    const H=Math.sqrt(3)*W, E=[];
    for(const c of [[0,0],[W/2,H/2]]) for(let i=0;i<6;i++) E.push(edge(arc(c,W,i*Math.PI/3,(i+1)*Math.PI/3),'petal'));
    return patternGraph(W,H,E);
  }
});
