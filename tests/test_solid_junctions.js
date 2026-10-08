'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm');
const assert=require('assert');
const root=path.resolve(__dirname,'..'),out=path.join(root,'test-results/solid-junctions');
fs.mkdirSync(out,{recursive:true});
function harness(uiPath=path.join(root,'src/stencil-ui.js')){
 const controls=new Map();
 const context={console,localStorage:{getItem:()=>null},document:{activeElement:null,getElementById(id){if(!controls.has(id))controls.set(id,{});return controls.get(id);}}};
 context.window=context;vm.createContext(context);
 for(const name of ['panel-layout.js','stencil-engine.js'])vm.runInContext(fs.readFileSync(path.join(root,'src',name),'utf8'),context,{filename:name});
 let app=fs.readFileSync(path.join(root,'src/pattern-app.js'),'utf8');
 const patterns=fs.readdirSync(path.join(root,'src/patterns')).filter(n=>n.endsWith('.js')).sort().map(n=>'{\n'+fs.readFileSync(path.join(root,'src/patterns',n),'utf8')+'\n}').join('\n');
 app=app.replace('/* PATTERN_HELPERS */',fs.readFileSync(path.join(root,'src/pattern-helpers.js'),'utf8')).replace('/* PATTERN_MODULES */',patterns);
 const cut=app.indexOf('// -- Application state');if(cut<0)throw Error('App test marker missing');
 vm.runInContext(app.slice(0,cut)+'\nwindow.SashikoStudio={buildModel,defaults:DEFAULTS,patterns:PATTERNS,getState:()=>({...DEFAULTS}),getModel:()=>null};window.Primitives={line,arc,cubic,path,edge};})();',context);
 let ui=fs.readFileSync(uiPath,'utf8');const stop=ui.indexOf('function cancel()');if(stop<0)throw Error('Stencil test marker missing');
 vm.runInContext(ui.slice(0,stop)+'\nwindow.TestStencil={makeInput,defaults,validate,sync,setStyle:style=>{settings=validate({style});sync();}};})();',context);
 return {...context,controls};
}
const c=harness(),studio=c.SashikoStudio,stencil=c.TestStencil,engine=c.StencilEngine;
const options={...stencil.defaults,style:'solid',scope:'repeat'};
const model=(pattern,settings={})=>studio.buildModel({...studio.defaults,pattern,weight:.9,opening:1,tileWidth:48,...settings});
let tests=0;const results=[];
function check(name,fn){fn();tests++;console.log('PASS:',name);}
function close(a,b,tol=1e-7){assert(Math.abs(a-b)<tol,`${a} != ${b}`);}
function distance(a,b){return Math.hypot(a[0]-b[0],a[1]-b[1]);}
function mesh(name,m,opts=options){
 const input=stencil.makeInput(m,opts),r=engine.generate(input);
 assert(r.buffer,`${name}: ${r.errors.join('; ')}`);assert.equal(r.components,1,`${name}: disconnected plate`);assert(r.watertight);
 assert(r.volume>0);close(r.volume,r.area*r.thickness,.02);
 fs.writeFileSync(path.join(out,name+'.stl'),Buffer.from(r.buffer));
 fs.writeFileSync(path.join(out,name+'.json'),JSON.stringify({W:r.W,H:r.H,thickness:r.thickness,area:r.area,outer:r.outerRing,holes:r.previewRings}));
 results.push({name,pattern:m.s.pattern,opening:m.s.opening,tileWidth:m.W,slotWidth:input.slotWidth,columns:input.columns,rows:input.rows,triangles:r.triangles,components:r.components,watertight:r.watertight});
 return r;
}
check('solid mode leaves junction opening editable',()=>{
 stencil.setStyle('solid');assert.equal(c.controls.get('stencil-opening').disabled,false);
 assert(c.controls.get('stencil-style-note').textContent.includes('junction opening'));
 stencil.setStyle('slots');assert.equal(c.controls.get('stencil-opening').disabled,false);
});
check('grid solid spans honor endpoints across periodic boundaries and rounded caps',()=>{
 for(const width of [.3,.9,1.8,3])for(const gap of [.2,1,2,4]){
  const m=model('grid',{opening:gap}),input=stencil.makeInput(m,{...options,slotWidth:width});
  assert.equal(input.paths.length,2);
  const p=input.paths[0],r=width/2;
  assert(p[0][0]-m.edges[0].p0[0]-r>=gap/2-1e-7);
  assert(m.edges[0].p1[0]-p.at(-1)[0]-r>=gap/2-1e-7);
  // Incident endpoints live in different translates of the same repeat.
  for(const node of m.nodes){
   const ps=node.arms.map(a=>{const e=m.edges[a.ei],p=input.paths[a.ei],end=a.end?p.at(-1):p[0],origin=a.end?e.p1:e.p0;return [end[0]-origin[0],end[1]-origin[1]];});
   for(let i=0;i<ps.length;i++)for(let j=i+1;j<ps.length;j++)assert(distance(ps[i],ps[j])-width>=gap-1e-7);
  }
 }
});
check('increasing the junction opening shortens solid cuts, without stitch dashes',()=>{
 for(const id of ['grid','interlaced','diamonds']){
  const length=opening=>stencil.makeInput(model(id,{opening}),options).paths.reduce((s,p)=>s+p.slice(1).reduce((n,q,i)=>n+distance(q,p[i]),0),0);
  assert(length(2)<length(.5),id);
 }
 const m=model('grid');assert(stencil.makeInput(m,options).paths.length<m.dashes.length);
});
check('solid mode is independent of stitch length/ratio and never mutates the source model',()=>{
 const a=model('interlaced',{stitch:.5,ratioA:1,ratioB:1}),b=model('interlaced',{stitch:6,ratioA:3,ratioB:2});
 const snapshot=JSON.stringify({nodes:a.nodes,edges:a.edges.map(e=>[e.startClear,e.endClear]),dashes:a.dashes});
 assert.equal(JSON.stringify(stencil.makeInput(a,options).paths),JSON.stringify(stencil.makeInput(b,options).paths));
 assert.equal(snapshot,JSON.stringify({nodes:a.nodes,edges:a.edges.map(e=>[e.startClear,e.endClear]),dashes:a.dashes}));
});
check('periodic waves retain continuous joins and no artificial tile-edge gaps',()=>{
 const m=model('waves'),paths=stencil.makeInput(m,options).paths;assert.equal(m.nodes.length,0);
 assert.equal(paths.length,m.edges[0].parts.length);
 m.edges[0].parts.forEach((p,i)=>{close(distance(paths[i][0],p.at(0)),0);close(distance(paths[i].at(-1),p.at(p.L)),0);});
 for(let i=1;i<paths.length;i++)close(distance(paths[i-1].at(-1),paths[i][0]),0);
});
check('impossible clearances block export rather than omit a cut or collapse it',()=>{
 assert.throws(()=>stencil.makeInput(model('grid',{tileWidth:12,opening:6}),{...options,slotWidth:3}),/No cuts were omitted/);
});
check('slot and dot outputs retain their original fitted stitch positions',()=>{
 const m=model('grid',{stitch:4}),s={...options,slotWidth:.9,style:'slots'},paths=stencil.makeInput(m,s).paths;
 assert.equal(paths.length,m.dashes.length);
 m.dashes.forEach((d,i)=>{const e=m.edges[d.edge];close(distance(paths[i][0],e.at(d.from+.45)),0);close(distance(paths[i].at(-1),e.at(d.to-.45)),0);});
 const dots=stencil.makeInput(m,{...s,style:'dots'}).paths;
 m.dashes.forEach((d,i)=>{assert.equal(dots[i].length,1);close(distance(dots[i][0],m.edges[d.edge].at((d.from+d.to)/2)),0);});
});
check('a 3x3 grid stays one plate; the prior untrimmed implementation releases islands',()=>{
 const m=model('grid');
 const good=stencil.makeInput(m,{...options,scope:'panel'});
 assert.equal(good.columns,3);assert.equal(good.rows,3);
 const raw={...good,paths:m.edges.map(e=>[e.p0,e.p1])},before=engine.generate(raw);
 assert(!before.buffer);assert(before.components>1);
 mesh('grid-regression-panel',m,{...options,scope:'panel'});
});
check('all 22 registered designs produce connected solid repeats and 3x3 panels',()=>{
 const ids=Object.keys(studio.patterns);assert(ids.length>=22);
 for(const id of ids){
  // The tight tangent arcs in Seigaiha need a larger tile at 1.8 mm width.
  const m=model(id,{tileWidth:id==='seigaiha'?120:48});
  for(const scope of ['repeat','panel'])mesh(`${id}-${scope}`,m,{...options,scope});
 }
});
check('closed cuts without authored junctions still block detached islands',()=>{
 const input={tileW:10,tileH:10,columns:1,rows:1,slotWidth:.9,thickness:.9,minWeb:.9,style:'solid',rimEnabled:true,rimWidth:1,cornerRadius:.6,paths:[[[3,3],[7,3]],[[7,3],[7,7]],[[7,7],[3,7]],[[3,7],[3,3]]]};
 const r=engine.generate(input);assert(!r.buffer);assert(r.components>1);assert(r.errors.some(t=>t.includes('islands')));
});
fs.writeFileSync(path.join(out,'summary.json'),JSON.stringify({tests,results},null,2));
console.log(`${tests} solid-junction checks and ${results.length} connected STL exports passed.`);
