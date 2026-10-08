'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..'),out=path.join(root,'test-results/layout');fs.mkdirSync(out,{recursive:true});
require(path.join(root,'src/panel-layout.js'));require(path.join(root,'src/stencil-engine.js'));
let count=0;
function check(name,fn){fn();count++;console.log('PASS:',name);}
const frame={rimEnabled:true,rimWidth:1,cornerRadius:.6};
check('default 3x3 includes rim, independently of tile aspect',()=>{
 const l=SashikoLayout.plan(48,24,{},frame);assert.deepEqual([l.W,l.H,l.columns,l.rows,l.x,l.y],[146,74,3,3,1,1]);
});
check('fit complete tiles into exact editable target, never stretch',()=>{
 const l=SashikoLayout.plan(24,12,{panelAuto:false,panelWidth:100,panelHeight:100},frame);assert.deepEqual([l.W,l.H,l.columns,l.rows,l.contentW,l.contentH],[100,100,4,8,96,96]);assert.equal(l.x,2);
 const r=SashikoLayout.plan(40,20,{panelAuto:false,panelWidth:100,panelHeight:100},frame);assert.deepEqual([r.columns,r.rows,r.W,r.H],[2,4,100,100]);
});
check('exact boundary counts and zero-fit guard',()=>{
 assert.equal(SashikoLayout.plan(33.3,20,{panelAuto:false,panelWidth:101.9,panelHeight:42},frame).columns,3);
 assert.equal(SashikoLayout.plan(100,100,{panelAuto:false,panelWidth:100,panelHeight:100},frame).valid,false);
 assert.equal(SashikoLayout.plan(50,50,{panelAuto:false,panelWidth:100,panelHeight:100},{rimEnabled:false}).columns,2);
});
const base={tileW:10,tileH:10,columns:1,rows:1,slotWidth:.9,thickness:.9,minWeb:.9,...frame};
const results=[];
function save(name,input){
 const r=StencilEngine.generate(input);assert(r.buffer,`${name}: ${r.errors}`);assert(r.watertight);assert.equal(r.components,1);
 fs.writeFileSync(path.join(out,name+'.stl'),Buffer.from(r.buffer));
 fs.writeFileSync(path.join(out,name+'.json'),JSON.stringify({W:r.W,H:r.H,thickness:r.thickness,area:r.area,outer:r.outerRing,holes:r.previewRings}));results.push({name,triangles:r.triangles,volume:r.volume,W:r.W,H:r.H,layout:r.layout});return r;
}
check('round slots, raised plate .9, protected edge openings, corner radius .6',()=>{
 const r=save('rounded-slots',{...base,paths:[[[-1,5],[2,5]]]});assert.deepEqual([r.W,r.H,r.thickness],[12,12,.9]);assert.equal(r.spacing.edgeCuts,0);assert(r.spacing.edgeMin>=.9998);assert.equal(r.layout.cornerRadius,.6);
});
check('dot mode creates circular through holes',()=>{const r=save('round-dots',{...base,style:'dots',slotWidth:1.8,paths:[[[5,5]]]});const analytic=144-(4-Math.PI)*.6*.6-Math.PI*.9*.9;assert(Math.abs(r.area-analytic)<.03);});
check('solid crossings are unions, not rejected as colliding stitch slots',()=>{
 save('solid-cross',{...base,style:'solid',slotWidth:1.8,paths:[[[0,5],[10,5]],[[5,0],[5,10]]]});
});
check('solid crossing mesh at non-axis-aligned intersections',()=>{
 save('solid-diagonals',{...base,style:'solid',slotWidth:.7,paths:[[[0,0],[10,10]],[[0,8],[10,2]],[[0,5],[10,5]]]});
});
check('solid open zigzag with overlapping round corners',()=>{
 save('solid-zigzag',{...base,style:'solid',paths:[[[0,3],[5,7]],[[5,7],[10,3]]]});
});
check('solid closed loops block disconnected islands',()=>{
 const r=StencilEngine.generate({...base,style:'solid',paths:[[[3,3],[7,3]],[[7,3],[7,7]],[[7,7],[3,7]],[[3,7],[3,3]]]});assert(!r.buffer);assert(r.components>1);assert(r.errors.some(t=>t.includes('islands')));
});
check('discrete colliding slots remain blocked',()=>{const r=StencilEngine.generate({...base,paths:[[[3,5],[7,5]],[[5,3],[5,7]]]});assert(!r.buffer);assert(r.spacing.collisions);});
check('rim disabled retains square edge-to-edge repeat size',()=>{const r=save('no-rim',{...base,rimEnabled:false,paths:[[[0,3],[2,3]]]});assert.deepEqual([r.W,r.H],[10,10]);assert.equal(r.layout.cornerRadius,0);assert(r.spacing.edgeCuts);});
check('explicit outer size is not enlarged by the rim',()=>{const r=save('fixed-canvas',{...base,outerW:100,outerH:100,columns:2,rows:2,paths:[[[3,5],[7,5]]]});assert.deepEqual([r.W,r.H],[100,100]);assert.deepEqual(r.layout.offset,[40,40]);});
check('rim radius cannot cut into content, invalid geometry remains blocked',()=>{
 const r=save('clamped-radius',{...base,rimWidth:.4,cornerRadius:2,paths:[[[3,5],[7,5]]]});assert.equal(r.layout.cornerRadius,.4);assert(r.warnings.some(t=>t.includes('limited')));
 assert.throws(()=>StencilEngine.generate({...base,outerW:10,outerH:10,paths:[[[3,5],[7,5]]]}),/do not fit/);
 assert.throws(()=>StencilEngine.generate({...base,thickness:NaN,paths:[[[3,5],[7,5]]]}));
});
fs.writeFileSync(path.join(out,'summary.json'),JSON.stringify({tests:count,results},null,2));
console.log(`${count} layout and geometry checks passed.`);
