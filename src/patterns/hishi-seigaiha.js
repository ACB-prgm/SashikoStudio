/** Reconstructed continuous geometry from 16_H-2037_hishi-seigaiha.jpg. No border or labels. */
registerPattern({
  id: "hishi-seigaiha",
  order: 116,
  name: "Hishi seigaiha",
  note: "Four nested angular waves inside a staggered diamond lattice.",
  reference: "16_H-2037_hishi-seigaiha.jpg",
  aspect: 0.5,
  build(W) {
    const a=W/2,b=W/4,H=W/2,E=[];
    for(const [x,y] of [[0,0],[a,b]]) for(let k=0;k<4;k++){
      const h=k*b/2, dx=a*(1-h/(2*b)), base=b+h/2;
      E.push(...patternLines([[x-dx,y+base],[x,y+h],[x+dx,y+base]],'diamond-wave'));
    }
    return patternGraph(W,H,E);
  }
});
