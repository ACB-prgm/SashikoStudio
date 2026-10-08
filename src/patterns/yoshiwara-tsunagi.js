/** Reconstructed continuous geometry from 04_H-2148_yoshiwara-tsunagi.jpg. No border or labels. */
registerPattern({
  id: "yoshiwara-tsunagi",
  order: 104,
  name: "Yoshiwara tsunagi",
  note: "Interlocking, open-ended square links, rotated into a diagonal chain.",
  reference: "04_H-2148_yoshiwara-tsunagi.jpg",
  aspect: 1 / 3,
  build(W) {
    const H=W/3, u=W*Math.SQRT2/15, E=[];
    const left=[[-1,-2],[-2,-2],[-2,2],[0,2]], right=[[0,-2],[2,-2],[2,2],[1,2]];
    // Parallel chains need a 3:1 rectangular repeat, not a square tile.
    // In the unrotated construction lattice: translations (2.5,2.5) and (5,-2.5).
    for(const C of [[0,0],[W/2,H/2]]) {
      const P=([x,y])=>[C[0]+(x-y)*u/Math.SQRT2,C[1]+(x+y)*u/Math.SQRT2];
      E.push(...patternLines(left.map(P),'left-hook'),...patternLines(right.map(P),'right-hook'));
    }
    return patternGraph(W,H,E);
  }
});
