/** Reconstructed continuous geometry from 15_293_chidori-tsunagi.jpg. No border or labels. */
registerPattern({
  id: "chidori-tsunagi",
  order: 115,
  name: "Chidori tsunagi",
  note: "Long scalloped paths join a sparse grid of crossings. Smooth semicircle joins do not restart the stitch rhythm.",
  reference: "15_293_chidori-tsunagi.jpg",
  aspect: 1,
  build(W) {
    const R=W/4;
    const h=path([arc([R,0],R,Math.PI,0),arc([3*R,0],R,Math.PI,TAU)],{route:'horizontal-scallop'});
    const v=path([arc([0,R],R,-Math.PI/2,-3*Math.PI/2),arc([0,3*R],R,-Math.PI/2,Math.PI/2)],{route:'vertical-scallop'});
    return {W,H:W,edges:[h,v]};
  }
});
