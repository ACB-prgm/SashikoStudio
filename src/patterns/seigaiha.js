/** Reconstructed continuous geometry from 11_207_seigaiha.jpg. No border or labels. */
registerPattern({
  id: "seigaiha",
  order: 111,
  name: "Seigaiha",
  note: "Double circular waves. Inner arcs terminate on the following row instead of floating above it.",
  reference: "11_207_seigaiha.jpg",
  aspect: 1,
  build(W) {
    const R=W/2, E=[];
    for(const c of [[0,0],[R,R]]) for(const q of [1,.72]){
      const K=(1+q*q)/2, x=(K+Math.sqrt(2*q*q-K*K))/2, a=Math.atan2(K-x,x);
      E.push(edge(arc(c,q*R,Math.PI-a,TAU+a),q===1?'outer-wave':'inner-wave'));
    }
    return patternGraph(W,W,E);
  }
});
