/** Reconstructed continuous geometry from 17_H-2039_kaki-no-hana.jpg. No border or labels. */
registerPattern({
  id: "kaki-no-hana",
  order: 117,
  name: "Kaki no hana",
  note: "Stepped flower outlines with small square centers on staggered rows.",
  reference: "17_H-2039_kaki-no-hana.jpg",
  aspect: 0.75,
  build(W) {
    const g=W/8,H=6*g,E=[];
    const flower=[[-.5,-2.5],[.5,-2.5],[.5,-1.5],[1.5,-1.5],[1.5,-.5],[2.5,-.5],[2.5,.5],[1.5,.5],[1.5,1.5],[.5,1.5],[.5,2.5],[-.5,2.5],[-.5,1.5],[-1.5,1.5],[-1.5,.5],[-2.5,.5],[-2.5,-.5],[-1.5,-.5],[-1.5,-1.5],[-.5,-1.5],[-.5,-2.5]];
    const square=[[-.5,-.5],[.5,-.5],[.5,.5],[-.5,.5],[-.5,-.5]];
    for(const c of [[0,0],[4*g,3*g]]) for(const shape of [flower,square]) E.push(...patternLines(shape.map(p=>[c[0]+p[0]*g,c[1]+p[1]*g]),shape===flower?'flower':'center'));
    return patternGraph(W,H,E);
  }
});
