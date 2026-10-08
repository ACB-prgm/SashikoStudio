/** Reconstructed continuous geometry from 14_209_yabane.jpg. No border or labels. */
registerPattern({
  id: "yabane",
  order: 114,
  name: "Yabane",
  note: "Parallel diagonal shafts crossed by regularly staggered stair-step feathers.",
  reference: "14_209_yabane.jpg",
  aspect: 1,
  build(W) {
    const g=W/6, E=[];
    for(let k=0;k<6;k++) E.push(edge(line([k*g,0],[k*g-W,W]),'diagonal'));
    // A stair repeats by (g,g); neighboring stairs are displaced by (1.5g,-1.5g).
    // Six grid units give an axis-aligned repeat without reversing the stair phase.
    for(let j=-3;j<=3;j++) for(let k=-6;k<=9;k++){
      const a=[(k+1.5*j)*g,(k-1.5*j)*g], b=[a[0]+g,a[1]], c=[a[0]+g,a[1]+g];
      for(const [p,q] of [[a,b],[b,c]]){
        const m=lerp(p,q,.5);
        if(m[0]>=-1e-8&&m[0]<W-1e-8&&m[1]>=-1e-8&&m[1]<W-1e-8) E.push(edge(line(p,q),'feather'));
      }
    }
    return patternGraph(W,W,E);
  }
});
