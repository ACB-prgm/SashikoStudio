/** Reconstructed continuous geometry from 07_H-1141_kamon.jpg. No border or labels. */
registerPattern({
  id: "kamon",
  order: 107,
  name: "Kamon",
  note: "Four-leaf crests with diagonal veins and fitted cubic petal shoulders.",
  reference: "07_H-1141_kamon.jpg",
  aspect: 1,
  build(W) {
    const g=W/2, E=[];
    for(let y=0;y<2;y++) for(let x=0;x<2;x++) {
      const ox=x*g, oy=y*g, reverse=(x+y)%2===1;
      const P=([a,b])=>[ox+(reverse?1-a:a)*g,oy+b*g];
      // Fuller than circular quadrants: fitted cubic sides reproduce the
      // reference's almost-square petal shoulders. Only endpoints intersect.
      E.push(edge(cubic([[0,0],[.9,0],[1,.1],[1,1]].map(P)),'petal'));
      E.push(edge(cubic([[0,0],[0,.9],[.1,1],[1,1]].map(P)),'petal'));
      E.push(edge(line(P([0,0]),P([1,1])),'vein'));
    }
    return {W,H:W,edges:E};
  }
});
