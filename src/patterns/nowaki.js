/** Reconstructed continuous geometry from 09_201_nowaki.jpg. No border or labels. */
registerPattern({
  id: "nowaki",
  order: 109,
  name: "Nowaki",
  note: "Staggered wave fans with two short interior wind strokes. Interior curves are fitted Beziers.",
  reference: "09_201_nowaki.jpg",
  aspect: 1,
  build(W) {
    const R=W/2, E=[];
    for(const [x,y] of [[0,0],[R,R]]){
      E.push(edge(arc([x,y],R,Math.PI,1.5*Math.PI),'wave'),edge(arc([x,y],R,1.5*Math.PI,2*Math.PI),'wave'));
      const P=([a,b])=>[x+a*R,y+b*R];
      E.push(edge(cubic([[-1,0],[-.82,-.43],[-.48,-.77],[0,-.72]].map(P)),'wind'));
      E.push(edge(cubic([[-1,0],[-.70,-.30],[-.35,-.50],[0,-.45]].map(P)),'wind'));
    }
    return {W,H:W,edges:E};
  }
});
