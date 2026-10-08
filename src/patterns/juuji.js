/** Reconstructed continuous geometry from 12_208_juuji.jpg. No border or labels. */
registerPattern({
  id: "juuji",
  order: 112,
  name: "Juuji",
  note: "Offset crosses and steps on a five-unit lattice. Junctions are opened where the reference stitches cross.",
  reference: "12_208_juuji.jpg",
  aspect: 1,
  build(W) {
    const g=W/5, E=[];
    // Continuous unit-grid edges reconstructed from one complete 5 x 5 repeat.
    // The five-unit phase is important: a two-cross checkerboard is NOT this design.
    const horizontal=['11.1.','1.11.','1.1.1','.11.1','.1.11'];
    const vertical=['.111.','1..11','111..','..111','11..1'];
    for(let y=0;y<5;y++) for(let x=0;x<5;x++) {
      if(horizontal[y][x]==='1') E.push(edge(line([x*g,y*g],[(x+1)*g,y*g]),'horizontal-step'));
      if(vertical[y][x]==='1') E.push(edge(line([x*g,y*g],[x*g,(y+1)*g]),'vertical-step'));
    }
    return patternGraph(W,W,E);
  }
});
