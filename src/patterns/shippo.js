/** Reconstructed continuous geometry from 01_L-1001_shippo.jpg. No border or labels. */
registerPattern({
  id: "shippo",
  order: 101,
  name: "Shippo",
  note: "Interlocking circles with open junctions; the classic four-petal repeat.",
  reference: "01_L-1001_shippo.jpg",
  aspect: 1,
  build(W) {
    const R=W/2, E=[];
    for (const c of [[0,0],[R,R]]) for(let i=0;i<4;i++) E.push(edge(arc(c,R,i*Math.PI/2,(i+1)*Math.PI/2),'circle'));
    return patternGraph(W,W,E);
  }
});
