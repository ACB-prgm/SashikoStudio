'use strict';
// Run test_reference_patterns.py first. Examples are checked, not certified prints.
const fs=require('fs'),path=require('path'),assert=require('assert');
const root=path.resolve(__dirname,'..'),out=path.join(root,'test-results/references');
require(path.join(root,'src/stencil-engine.js'));
const names=JSON.parse(fs.readFileSync(path.join(out,'browser.json'),'utf8')).patterns.map(p=>p.name);
const reports=[];
for(const name of names) {
 for(const example of [false,true]) {
  const label=example?'verified':'defaults';
  const file=`${name}${example?'-verified':''}-input.json`;
  const input=JSON.parse(fs.readFileSync(path.join(out,file),'utf8'));
  for(const count of [1,2]) {
   const begin=Date.now(),r=StencilEngine.generate({...input,columns:count,rows:count});
   const info={pattern:name,settings:label,layout:`${count}x${count}`,triangles:r.triangles||0,watertight:!!r.watertight,components:r.components,errors:r.errors,warnings:r.warnings,ms:Date.now()-begin};
   if(example) assert(r.buffer && !r.errors.length,`${name}: checked example failed: ${r.errors}`);
   if(r.buffer) {
    assert(r.watertight && r.components===1 && !r.errors.length,`${name}: invalid successful mesh`);
    assert.equal(r.buffer.byteLength,84+50*r.triangles);
    if(example) {
     const stem=`${name}-verified-${count}x${count}`;
     fs.writeFileSync(path.join(out,`${stem}.stl`),Buffer.from(r.buffer));
     fs.writeFileSync(path.join(out,`${stem}-mesh.json`),JSON.stringify({W:r.W,H:r.H,area:r.area,thickness:r.thickness,rings:r.previewRings}));
    }
   } else assert(r.errors.length,`${name}: missing buffer without an explanation`);
   console.log(name,label,info.layout,info.triangles,r.errors.length?'BLOCKED AS DESIGNED':'PASS');
   reports.push(info);
  }
 }
}
fs.writeFileSync(path.join(out,'meshes.json'),JSON.stringify(reports,null,2));
console.log('PASS: all checked example meshes; default-setting guards respected.');
