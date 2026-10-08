/** Reconstructed continuous geometry from 10_204_sayagata.jpg. No border or labels. */
registerPattern({
  id: "sayagata",
  order: 110,
  name: "Sayagata",
  note: "Interlocking angular meanders on a diagonal lattice. All corners and crossings retain deliberate gaps.",
  reference: "10_204_sayagata.jpg",
  aspect: 1,
  build(W) {
    const u=W/(5*Math.SQRT2), E=[];
    const connection=[[0,0],[0,-1],[-1,-1],[-1,-2],[6,-2],[6,-1],[5,-1],[5,0]];
    for(const [parity,c] of [[0,[0,0]],[1,[W/2,W/2]]]) for(let k=0;k<2;k++){
      const pts=connection.map(([x,y])=>{if(parity)y=-y;if(k)[x,y]=[-y,x];return [c[0]+(x-y)*u/Math.SQRT2,c[1]+(x+y)*u/Math.SQRT2];});
      E.push(...patternLines(pts,'meander'));
    }
    return patternGraph(W,W,E);
  }
});
