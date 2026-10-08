/** Reconstructed continuous geometry from 08_H-1075_tsubomi.jpg. No border or labels. */
registerPattern({
  id: "tsubomi",
  order: 108,
  name: "Tsubomi",
  note: "Four interlocking square buds. The reference uses solid guides; this version applies the selected running-stitch rhythm.",
  reference: "08_H-1075_tsubomi.jpg",
  aspect: 1,
  build(W) {
    const u=W/(5*Math.SQRT2), E=[];
    const hook=[[1,-1],[1,-2],[-1,-2],[-1,0],[1,0]];
    for(const c of [[0,0],[W/2,W/2]]) for(let k=0;k<4;k++){
      const a=k*Math.PI/2, ca=Math.cos(a), sa=Math.sin(a);
      const pts=hook.map(([x,y])=>{const X=(x*ca-y*sa)*u,Y=(x*sa+y*ca)*u;return [c[0]+(X-Y)/Math.SQRT2,c[1]+(X+Y)/Math.SQRT2];});
      E.push(...patternLines(pts,'square-bud'));
    }
    return patternGraph(W,W,E);
  }
});
