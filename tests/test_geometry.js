'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert');
const root=path.resolve(__dirname,'..'),out=path.join(root,'test-results');
require(path.join(root,'src/stencil-engine.js'));
const report=[];
for(const name of ['interlaced','grid','diamonds','circles','chevrons','waves']){
 const base=JSON.parse(fs.readFileSync(path.join(out,name+'-input.json'),'utf8'));
 for(const [columns,rows,label] of [[1,1,'repeat'],[2,2,'2x2']]){
  const input={...base,columns,rows,outerW:undefined,outerH:undefined},start=Date.now(),r=StencilEngine.generate(input);
  assert.equal(r.errors.length,0,JSON.stringify(r.errors));assert(r.watertight);assert.equal(r.components,1);
  assert(r.buffer.byteLength===84+50*r.triangles);
  fs.writeFileSync(path.join(out,`${name}-${label}.stl`),Buffer.from(r.buffer));
  fs.writeFileSync(path.join(out,`${name}-${label}-geometry.json`),JSON.stringify({W:r.W,H:r.H,thickness:r.thickness,rings:r.previewRings,area:r.area}));
  report.push({pattern:name,layout:label,triangles:r.triangles,volume:r.volume,ms:Date.now()-start,errors:r.errors,warnings:r.warnings});
 }
}
const base=JSON.parse(fs.readFileSync(path.join(out,'interlaced-input.json'),'utf8'));
let start=Date.now();const panel=StencilEngine.generate({...base,columns:4,rows:6,outerW:undefined,outerH:undefined});
assert(panel.watertight);assert(!panel.errors.length);fs.writeFileSync(path.join(out,'interlaced-full-panel.stl'),Buffer.from(panel.buffer));
report.push({pattern:'interlaced',layout:'4x6',triangles:panel.triangles,ms:Date.now()-start,watertight:panel.watertight});
const basic={tileW:10,tileH:10,columns:1,rows:1,slotWidth:.9,thickness:1.4,minWeb:.9};
const collision=StencilEngine.generate({...basic,paths:[[[3,5],[7,5]],[[5,3],[5,7]]]});assert(collision.errors.length>0);assert(!collision.buffer);
const curve=[];for(let i=0;i<=30;i++){const a=-Math.PI/2+Math.PI*i/30;curve.push([-.3+3*Math.cos(a),5+3*Math.sin(a)]);}
const detached=StencilEngine.generate({...basic,paths:[curve]});assert(detached.components>1);assert(!detached.buffer);
const capsule=StencilEngine.generate({...basic,paths:[[[3,3],[7,3]]]});const idealArea=100-(4*.9+Math.PI*.45*.45);assert(Math.abs(capsule.area-idealArea)<.01);
assert.throws(()=>StencilEngine.generate({...basic,paths:[]}));
assert.throws(()=>StencilEngine.generate({...base,columns:20,rows:20,outerW:undefined,outerH:undefined}),/slots|cutouts|limit|complex/);
fs.writeFileSync(path.join(out,'geometry-tests.json'),JSON.stringify({cases:report,collisionBlocked:true,detachedPlateBlocked:true,capsuleAreaError:capsule.area-idealArea,emptyBlocked:true,oversizeBlocked:true},null,2));
console.log(JSON.stringify(report.map(({pattern,layout,triangles,ms})=>({pattern,layout,triangles,ms})),null,2));
console.log('PASS: export mesh, overlap/island guards, capsule geometry and limits');
