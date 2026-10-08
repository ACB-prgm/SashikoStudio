/** Reconstructed continuous geometry from 06_H-1142_kasane-rindou.jpg. No border or labels. */
registerPattern({
  id: "kasane-rindou",
  order: 106,
  name: "Kasane rindou",
  note: "Overlapping folded triangles inside a hexagonal radial lattice. Crossings are split into open junctions.",
  reference: "06_H-1142_kasane-rindou.jpg",
  aspect: Math.sqrt(3),
  build(W) {
    const R=W/Math.sqrt(3), H=3*R, E=[];
    for(const c of [[0,0],[W/2,H/2]]){
      const v=Array.from({length:6},(_,i)=>[c[0]+R*Math.sin(i*Math.PI/3),c[1]-R*Math.cos(i*Math.PI/3)]);
      E.push(...patternLines([...v,v[0]],'hexagon'));
      for(let i=0;i<3;i++) E.push(edge(line(v[i],v[i+3]),'radial'));
      for(let parity=0;parity<2;parity++) for(let k=0;k<3;k++){
        const a=v[(parity+2*k)%6], b=v[(parity+2*k+2)%6];
        const m=[0,1].map(j=>c[j]+.7*((a[j]+b[j])/2-c[j]));
        E.push(...patternLines([a,m,b],'folded-triangle'));
      }
    }
    return patternGraph(W,H,E);
  }
});
