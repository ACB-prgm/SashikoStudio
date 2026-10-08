/* Sashiko Pattern Studio: dependency-free stencil geometry. Units are mm.
 * Input: rounded slots, circular dots, or unioned continuous cuts on a periodic lattice.
 * Algorithm: subtract holes by a horizontal sweep; merge unchanged material
 * intervals into trapezoids; split ALL shared horizontal edges identically;
 * triangulate each convex cell, then extrude its boundary. This avoids the
 * non-conforming hole bridges/T-junctions possible with a rendering-only
 * triangulator. Separate stitch holes are checked for collision; solid cuts are
 * explicitly unioned. All exports still require one connected, closed plate.
 */
(function(root) {
'use strict';
const GRID=10000, EPS=1/GRID, TOL=.003, MAX_SLOTS=10000, MAX_VERTICES=400000;
const snap=n=>Math.round(n*GRID)/GRID;
const key=p=>`${Math.round(p[0]*GRID)},${Math.round(p[1]*GRID)}`;
const area=p=>p.reduce((s,a,i)=>{const b=p[(i+1)%p.length];return s+a[0]*b[1]-b[0]*a[1];},0)/2;
const dist=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
const bounds=p=>p.reduce((b,a)=>[Math.min(b[0],a[0]),Math.min(b[1],a[1]),Math.max(b[2],a[0]),Math.max(b[3],a[1])],[Infinity,Infinity,-Infinity,-Infinity]);
const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
function clean(p) {const out=[];for(const a of p){const b=a.map(snap);if(!out.length||key(b)!==key(out.at(-1)))out.push(b);}if(out.length>1&&key(out[0])===key(out.at(-1)))out.pop();return out;}
function unit(a,b) {const d=dist(a,b);if(d<1e-10)return [1,0];return [(b[0]-a[0])/d,(b[1]-a[1])/d];}
function roundedSlot(points,width) {
 const r=width/2,p=points.filter((a,i)=>!i||dist(a,points[i-1])>1e-8);
 if(p.length<2)throw new Error('A stitch is too short for this slot width.');
 const ts=[];for(let i=0;i<p.length-1;i++)ts.push(unit(p[i],p[i+1]));
 const left=[],right=[];
 for(let i=0;i<p.length;i++){
  const u=ts[Math.max(0,i-1)],v=ts[Math.min(ts.length-1,i)],t=unit([0,0],[u[0]+v[0],u[1]+v[1]]),factor=1/Math.max(.7,t[0]*v[0]+t[1]*v[1]);
  left.push([p[i][0]-t[1]*r*factor,p[i][1]+t[0]*r*factor]);
  right.push([p[i][0]+t[1]*r*factor,p[i][1]-t[0]*r*factor]);
 }
 const out=[...left],n=Math.max(10,Math.ceil(Math.PI/(2*Math.acos(Math.max(-1,1-TOL/r)))));
 const cap=(c,t,atEnd)=>{const a=Math.atan2(t[1],t[0])+(atEnd?Math.PI/2:-Math.PI/2);for(let i=1;i<n;i++){const angle=a-Math.PI*i/n;out.push([c[0]+r*Math.cos(angle),c[1]+r*Math.sin(angle)]);}};
 cap(p.at(-1),ts.at(-1),true);out.push(...right.reverse());cap(p[0],ts[0],false);
 return clean(out);
}
function clipRing(ring,W,H) {
 let out=ring;
 for(const [axis,val,sign] of [[0,0,1],[0,W,-1],[1,0,1],[1,H,-1]]){
  const input=out;out=[];if(!input.length)break;
  for(let i=0;i<input.length;i++){
   const a=input[i],b=input[(i+1)%input.length],ina=sign*(a[axis]-val)>=0,inb=sign*(b[axis]-val)>=0;
   if(ina)out.push(a);
   if(ina!==inb){const t=(val-a[axis])/(b[axis]-a[axis]),p=[a[0]+t*(b[0]-a[0]),a[1]+t*(b[1]-a[1])];p[axis]=val;out.push(p);}
  }
 }
 return clean(out);
}
function inside(p,ring) {let hit=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const a=ring[i],b=ring[j];if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])hit=!hit;}return hit;}
function pointSegment(p,a,b) {const dx=b[0]-a[0],dy=b[1]-a[1],t=Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/(dx*dx+dy*dy||1))),q=[a[0]+t*dx,a[1]+t*dy];return {d:dist(p,q),p,q};}
function segmentDistance(a,b,c,d) {
 const ab=[b[0]-a[0],b[1]-a[1]],cd=[d[0]-c[0],d[1]-c[1]],det=ab[0]*cd[1]-ab[1]*cd[0];
 if(Math.abs(det)>1e-14){const ca=[c[0]-a[0],c[1]-a[1]],t=(ca[0]*cd[1]-ca[1]*cd[0])/det,u=(ca[0]*ab[1]-ca[1]*ab[0])/det;if(t>=0&&t<=1&&u>=0&&u<=1){const p=[a[0]+t*ab[0],a[1]+t*ab[1]];return {d:0,p,q:p};}}
 let best=pointSegment(a,c,d);
 for(const v of [pointSegment(b,c,d),pointSegment(c,a,b),pointSegment(d,a,b)])if(v.d<best.d)best=v;
 return best;
}
function ringDistance(a,b,limit) {
 if(inside(a[0],b)||inside(b[0],a))return {d:0,p:a[0],q:a[0]};
 let best={d:limit,p:null,q:null};
 for(let i=0;i<a.length;i++)for(let j=0;j<b.length;j++){
  const p=a[i],q=a[(i+1)%a.length],r=b[j],s=b[(j+1)%b.length];
  if(Math.max(Math.min(p[0],q[0])-Math.max(r[0],s[0]),Math.min(r[0],s[0])-Math.max(p[0],q[0]),Math.min(p[1],q[1])-Math.max(r[1],s[1]),Math.min(r[1],s[1])-Math.max(p[1],q[1]))>best.d)continue;
  const v=segmentDistance(p,q,r,s);if(v.d<best.d){best=v;if(v.d<1e-9)return best;}
 }
 return best;
}
function selfCrosses(ring) {for(let i=0;i<ring.length;i++)for(let j=i+2;j<ring.length;j++){if(i===0&&j===ring.length-1)continue;if(segmentDistance(ring[i],ring[(i+1)%ring.length],ring[j],ring[(j+1)%ring.length]).d<1e-8)return true;}return false;}
function circleRing(center,r) {
 const n=Math.max(24,Math.ceil(Math.PI/Math.acos(Math.max(-1,1-TOL/r))));
 return clean(Array.from({length:n},(_,i)=>[center[0]+r*Math.cos(2*Math.PI*i/n),center[1]+r*Math.sin(2*Math.PI*i/n)]));
}
function roundedRectangle(W,H,r=0) {
 r=Math.max(0,Math.min(r,W/2,H/2));if(r<EPS)return [[0,0],[W,0],[W,H],[0,H]];
 const n=Math.max(6,Math.ceil((Math.PI/2)/(2*Math.acos(Math.max(-1,1-TOL/r))))),out=[];
 for(const [cx,cy,a0]of [[W-r,r,-Math.PI/2],[W-r,H-r,0],[r,H-r,Math.PI/2],[r,r,Math.PI]])for(let i=0;i<=n;i++){const a=a0+i*Math.PI/(2*n);out.push([cx+r*Math.cos(a),cy+r*Math.sin(a)]);}
 return clean(out);
}
function prepareSlots(input) {
 const tileW=snap(input.tileW),tileH=snap(input.tileH),contentW=snap(tileW*input.columns),contentH=snap(tileH*input.rows);
 const rim=input.rimEnabled?input.rimWidth:0,W=snap(input.outerW??(contentW+2*rim)),H=snap(input.outerH??(contentH+2*rim));
 if(W+EPS*4<contentW+2*rim||H+EPS*4<contentH+2*rim)throw new Error('The complete tile array and rim do not fit the selected export size.');
 const ox=snap((W-contentW)/2),oy=snap((H-contentH)/2),slots=[],original=[];
 // A radius no larger than the reserved rim cannot round into the design area.
 const radius=input.rimEnabled?Math.min(input.cornerRadius||0,rim,W/2,H/2):0;
 for(let i=0;i<input.paths.length;i++){
  const ring=input.style==='dots'?circleRing(input.paths[i][0],input.slotWidth/2):roundedSlot(input.paths[i],input.slotWidth),b=bounds(ring);
  if(selfCrosses(ring))throw new Error('A cut outline folds over itself. Reduce its width or increase tile size.');
  original.push(ring);
  const x0=Math.ceil(-b[2]/tileW),x1=Math.floor((contentW-b[0])/tileW),y0=Math.ceil(-b[3]/tileH),y1=Math.floor((contentH-b[1])/tileH);
  for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){
   const shifted=ring.map(p=>[snap(p[0]+x*tileW),snap(p[1]+y*tileH)]),clipped=clipRing(shifted,contentW,contentH).map(p=>[snap(p[0]+ox),snap(p[1]+oy)]);
   if(clipped.length<3||Math.abs(area(clipped))<EPS*EPS)continue;
   slots.push({ring:clipped,full:clipped,b:bounds(clipped),id:`${i}:${x}:${y}`});
   if(slots.length>MAX_SLOTS)throw new Error(`This selection exceeds ${MAX_SLOTS.toLocaleString()} cutouts. Choose a smaller panel.`);
  }
 }
 if(!slots.length)throw new Error('No openings fit this selection. Increase tile size or reduce the junction opening.');
 if(slots.reduce((n,s)=>n+s.ring.length,0)>MAX_VERTICES)throw new Error('This panel is too complex for the browser mesh limit. Export fewer tiles.');
 return {W,H,tileW,tileH,contentW,contentH,offset:[ox,oy],rim,cornerRadius:radius,outerRing:roundedRectangle(W,H,radius),slots,original};
}
function spacingCheck(slots,W,H,threshold) {
 const limit=Math.max(3,threshold*2),sorted=[...slots].sort((a,b)=>a.b[0]-b.b[0]),near=[],marks=[];let min=limit,minFound=false,collisions=0,thin=0,edgeMin=Infinity,edgeCuts=0;
 for(const s of sorted){
  for(let i=near.length-1;i>=0;i--)if(near[i].b[2]+limit<s.b[0])near.splice(i,1);
  for(const a of near){const lower=Math.hypot(Math.max(0,s.b[0]-a.b[2],a.b[0]-s.b[2]),Math.max(0,s.b[1]-a.b[3],a.b[1]-s.b[3]));if(lower>Math.max(min,threshold))continue;
   const v=ringDistance(a.ring,s.ring,Math.max(min,threshold));
   if(v.p&&v.d<min){min=v.d;minFound=true;}
   if(v.d<EPS*1.5)collisions++;
   if(v.p&&v.d+EPS<threshold){thin++;if(marks.length<80)marks.push([v.p,v.q]);}
  }
  near.push(s);
  const b=s.b,ds=[b[0],W-b[2],b[1],H-b[3]],cuts=ds.some(d=>d<=EPS);
  if(cuts)edgeCuts++;
  // Crossing the boundary is intentional. Only a positive rim is measured.
  for(let i=0;i<4;i++)if(ds[i]>EPS){
   if(ds[i]<edgeMin)edgeMin=ds[i];
   if(ds[i]+EPS<threshold&&marks.length<80){const axis=i<2?0:1,sign=i%2===0?1:-1,p=s.ring.reduce((best,p)=>sign*p[axis]<sign*best[axis]?p:best),q=[...p];q[axis]=i===0||i===2?0:i===1?W:H;marks.push([p,q]);}
  }
 }
 return {minWeb:min,minWebExact:minFound,thinPairs:thin,collisions,edgeMin:Number.isFinite(edgeMin)?edgeMin:null,edgeCuts,marks};
}
function lowerBound(a,v){let lo=0,hi=a.length;while(lo<hi){const m=(lo+hi)>>1;if(a[m]<v)lo=m+1;else hi=m;}return lo;}
/** Split crossings at a common quantized vertex before sweeping solid unions. */
function splitCrossings(segments) {
 if(segments.length>50000)throw new Error('Solid-line geometry is too complex. Use a smaller panel or stitch slots.');
 const ordered=segments.map(e=>({...e,box:bounds([e.a,e.b]),cuts:[{t:0,p:e.a},{t:1,p:e.b}]})).sort((a,b)=>a.box[0]-b.box[0]),near=[];
 let checks=0;
 for(const e of ordered){
  for(let i=near.length-1;i>=0;i--)if(near[i].box[2]<e.box[0]-EPS)near.splice(i,1);
  for(const f of near){
   if(e.group===f.group||e.box[3]<f.box[1]-EPS||f.box[3]<e.box[1]-EPS)continue;
   if(++checks>4000000)throw new Error('Solid union reached its intersection limit. Use fewer tiles.');
   const u=[e.b[0]-e.a[0],e.b[1]-e.a[1]],v=[f.b[0]-f.a[0],f.b[1]-f.a[1]],d=u[0]*v[1]-u[1]*v[0];if(Math.abs(d)<1e-12)continue;
   const q=[f.a[0]-e.a[0],f.a[1]-e.a[1]],t=(q[0]*v[1]-q[1]*v[0])/d,z=(q[0]*u[1]-q[1]*u[0])/d;
   if(t<-1e-9||t>1+1e-9||z<-1e-9||z>1+1e-9)continue;
   const p=[snap(e.a[0]+t*u[0]),snap(e.a[1]+t*u[1])];
   if(t>1e-9&&t<1-1e-9)e.cuts.push({t,p});if(z>1e-9&&z<1-1e-9)f.cuts.push({t:z,p});
  }
  near.push(e);
 }
 const out=[];
 for(const e of ordered){e.cuts.sort((a,b)=>a.t-b.t);for(let i=0;i<e.cuts.length-1;i++){const a=e.cuts[i].p,b=e.cuts[i+1].p;if(key(a)!==key(b))out.push({a,b,group:e.group});}}
 return out;
}
/** Scanline subtraction from a convex rounded plate; solid mode unions cut spans. */
function triangulatePlate(slots,W,H,progress=()=>{},options={}) {
 const outer=options.outerRing||roundedRectangle(W,H),levels=new Set([0,Math.round(H*GRID)]),events=new Map();let nextId=0;
 const at=(e,y)=>snap(e.a[0]+(y-e.a[1])*(e.b[0]-e.a[0])/(e.b[1]-e.a[1]));
 let segments=[];
 for(const [group,ring] of [[-1,outer],...slots.map((s,i)=>[i,s.ring])])for(let i=0;i<ring.length;i++)segments.push({a:ring[i],b:ring[(i+1)%ring.length],group});
 if(options.union)segments=splitCrossings(segments);
 const addEvent=(y,type,e)=>{const yi=Math.round(y*GRID);levels.add(yi);if(!events.has(yi))events.set(yi,{start:[],end:[]});events.get(yi)[type].push(e);};
 for(const seg of segments){
  levels.add(Math.round(seg.a[1]*GRID));levels.add(Math.round(seg.b[1]*GRID));
  if(Math.abs(seg.a[1]-seg.b[1])<EPS*.5)continue;
  const e={...seg,id:nextId++};addEvent(Math.min(e.a[1],e.b[1]),'start',e);addEvent(Math.max(e.a[1],e.b[1]),'end',e);
 }
 const ys=[...levels].sort((a,b)=>a-b),active=new Set(),cells=[];let open=new Map(),integratedArea=0;
 function finish(cell){if(cell.y1-cell.y0<EPS*.5)return;const pts=clean([[at(cell.l,cell.y0),cell.y0],[at(cell.r,cell.y0),cell.y0],[at(cell.r,cell.y1),cell.y1],[at(cell.l,cell.y1),cell.y1]]);if(pts.length>=3&&Math.abs(area(pts))>EPS*EPS*.1)cells.push(pts);}
 for(let j=0;j<ys.length-1;j++){
  const y0=ys[j]/GRID,y1=ys[j+1]/GRID,ev=events.get(ys[j]);if(ev){for(const e of ev.end)active.delete(e);for(const e of ev.start)active.add(e);}
  if(y1-y0<EPS*.5)continue;
  const mid=(y0+y1)/2,groups=new Map();
  for(const e of active){if(!groups.has(e.group))groups.set(e.group,[]);groups.get(e.group).push({e,x:e.a[0]+(mid-e.a[1])*(e.b[0]-e.a[0])/(e.b[1]-e.a[1])});}
  const spans=[];let leftWall,rightWall;
  for(const [group,xs] of groups){
   xs.sort((a,b)=>a.x-b.x);if(xs.length%2)throw new Error('An outline is not closed at mesh precision. Slightly adjust the size or line width.');
   if(group===-1){leftWall=xs[0];rightWall=xs.at(-1);continue;}
   for(let k=0;k<xs.length;k+=2)spans.push({a:xs[k],b:xs[k+1]});
  }
  const ranges=[];
  if(leftWall&&rightWall){
   spans.sort((a,b)=>a.a.x-b.a.x||b.b.x-a.b.x);
   let prev=leftWall;
   for(const span of spans){
    if(span.b.x<=prev.x+1e-10||span.a.x>=rightWall.x)continue;
    if(span.a.x>prev.x+1e-10)ranges.push({l:prev.e,r:span.a.e});
    if(span.b.x>=rightWall.x){prev=rightWall;break;}
    if(span.b.x>prev.x)prev=span.b;
   }
   if(prev.x<rightWall.x-1e-10)ranges.push({l:prev.e,r:rightWall.e});
  }
  const now=new Map();for(const r of ranges){const id=`${r.l.id}:${r.r.id}`,c=open.get(id)||{...r,y0,y1};c.y1=y1;now.set(id,c);integratedArea+=((at(r.r,y0)-at(r.l,y0))+(at(r.r,y1)-at(r.l,y1)))*(y1-y0)/2;}
  for(const [id,c]of open)if(!now.has(id))finish(c);open=now;
  if(j%500===0)progress(`Building surface: ${Math.round(j/ys.length*100)}%`);
 }
 for(const c of open.values())finish(c);
 // Split both sides of every horizontal join at the same vertices.
 const splits=new Map();for(const c of cells)for(const p of c){const y=Math.round(p[1]*GRID);if(!splits.has(y))splits.set(y,new Set());splits.get(y).add(Math.round(p[0]*GRID));}
 for(const [y,xs] of splits)splits.set(y,[...xs].sort((a,b)=>a-b));
 const vertices=[],vmap=new Map(),triangles=[];
 function vertex(p){const k=key(p);if(vmap.has(k))return vmap.get(k);const id=vertices.length;vmap.set(k,id);vertices.push(p);return id;}
 for(const cell of cells){
  const ring=[];
  for(let i=0;i<cell.length;i++){
   const a=cell[i],b=cell[(i+1)%cell.length];ring.push(a);
   if(Math.abs(a[1]-b[1])<EPS*.5){const xs=splits.get(Math.round(a[1]*GRID)),lo=Math.round(Math.min(a[0],b[0])*GRID),hi=Math.round(Math.max(a[0],b[0])*GRID),part=[];for(let k=lowerBound(xs,lo+1);k<xs.length&&xs[k]<hi;k++)part.push([xs[k]/GRID,a[1]]);if(b[0]<a[0])part.reverse();ring.push(...part);}
  }
  if(area(ring)<0)ring.reverse();
  const ids=ring.map(vertex),center=cell.reduce((p,a)=>[p[0]+a[0]/cell.length,p[1]+a[1]/cell.length],[0,0]),ci=vertices.length;vertices.push(center);
  for(let i=0;i<ids.length;i++){const a=ids[i],b=ids[(i+1)%ids.length];if(cross(center,vertices[a],vertices[b])>1e-12)triangles.push([ci,a,b]);}
  if(triangles.length>400000)throw new Error('The surface exceeds the browser mesh limit. Export a smaller panel.');
 }
 if(!triangles.length)throw new Error('The slots remove the entire plate. Reduce slot width.');
 const surfaceEdges=new Map(),parent=triangles.map((_,i)=>i);const find=i=>{while(parent[i]!==i){parent[i]=parent[parent[i]];i=parent[i];}return i;};
 const union=(a,b)=>{a=find(a);b=find(b);if(a!==b)parent[b]=a;};
 for(let f=0;f<triangles.length;f++)for(let k=0;k<3;k++){const a=triangles[f][k],b=triangles[f][(k+1)%3],id=a<b?`${a},${b}`:`${b},${a}`;if(!surfaceEdges.has(id))surfaceEdges.set(id,{a,b,f,count:1});else{const e=surfaceEdges.get(id);e.count++;if(e.count>2||e.a===a)throw new Error('The surface triangulation could not be validated. Adjust the repeat or slot width.');union(e.f,f);}}
 const boundary=[...surfaceEdges.values()].filter(e=>e.count===1),components=new Set(triangles.map((_,i)=>find(i))).size;
 const actualArea=triangles.reduce((sum,t)=>sum+cross(vertices[t[0]],vertices[t[1]],vertices[t[2]])/2,0),expectedArea=options.union?integratedArea:Math.abs(area(outer))-slots.reduce((sum,s)=>sum+Math.abs(area(s.ring)),0);
 if(Math.abs(actualArea-expectedArea)>Math.max(.015,W*H*2e-5))throw new Error('The generated surface failed its area check. No STL was created.');
 const outgoing=new Map();for(const e of boundary){if(outgoing.has(e.a))throw new Error('A slot creates a point-touching boundary. Increase the spacing.');outgoing.set(e.a,e.b);}
 const seen=new Set(),outlineRings=[];
 for(const e of boundary){if(seen.has(e.a))continue;const ring=[];let v=e.a;do{if(seen.has(v)||!outgoing.has(v))throw new Error('The stencil outline is not a closed loop.');seen.add(v);ring.push(vertices[v]);v=outgoing.get(v);}while(v!==e.a);outlineRings.push(ring);}
 return {vertices,triangles,boundary,components,outlineRings,area:actualArea,cells:cells.length};
}
function extrude(surface,W,H,thickness) {
 const n=surface.vertices.length,vertices=[];
 // Reflect SVG's downward Y into a right-handed, upward-Y STL coordinate system.
 for(const z of [0,thickness])for(const p of surface.vertices)vertices.push([p[0],H-p[1],z]);
 const faces=[];
 for(const t of surface.triangles){faces.push([t[0],t[1],t[2]]);faces.push([t[0]+n,t[2]+n,t[1]+n]);}
 for(const e of surface.boundary){const a=e.b,b=e.a;faces.push([a,b,b+n],[a,b+n,a+n]);}
 if(faces.length>900000)throw new Error('The mesh exceeds the export limit. Export fewer repeats.');
 // Match vertices after Float32 serialization, not merely before it.
 const unique=new Map(),mapped=[],points=[];
 for(const v of vertices){const p=v.map(Math.fround),id=p.join(',');if(!unique.has(id)){unique.set(id,points.length);points.push(p);}mapped.push(unique.get(id));}
 const edgeCounts=new Map();let volume=0;
 const position=new Float32Array(faces.length*9),buffer=new ArrayBuffer(84+faces.length*50),view=new DataView(buffer);
 const title=`Sashiko stencil; mm; ${W}x${H}x${thickness}; rounded through slots`;
 for(let i=0;i<Math.min(80,title.length);i++)view.setUint8(i,title.charCodeAt(i));view.setUint32(80,faces.length,true);
 for(let i=0;i<faces.length;i++){
  const ids=faces[i].map(v=>mapped[v]),[a,b,c]=ids.map(v=>points[v]),u=b.map((v,k)=>v-a[k]),v=c.map((val,k)=>val-a[k]),normal=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]],len=Math.hypot(...normal);
  if(len<1e-12)throw new Error('A triangle collapsed at STL precision. Slightly change the repeat size or slot width.');
  const offset=84+i*50;normal.forEach((v,k)=>view.setFloat32(offset+k*4,v/len,true));
  [a,b,c].forEach((p,j)=>p.forEach((v,k)=>{view.setFloat32(offset+12+(j*3+k)*4,v,true);position[i*9+j*3+k]=v;}));
  volume+=(a[0]*(b[1]*c[2]-b[2]*c[1])-a[1]*(b[0]*c[2]-b[2]*c[0])+a[2]*(b[0]*c[1]-b[1]*c[0]))/6;
  for(let k=0;k<3;k++){const a=ids[k],b=ids[(k+1)%3],id=a<b?`${a},${b}`:`${b},${a}`,e=edgeCounts.get(id)||[0,0];e[0]++;e[1]+=a<b?1:-1;edgeCounts.set(id,e);}
 }
 for(const e of edgeCounts.values())if(e[0]!==2||e[1]!==0)throw new Error('The STL failed its closed-mesh check. No file was created. Slightly adjust repeat size.');
 if(volume<=0||Math.abs(volume-surface.area*thickness)>Math.max(.015,volume*2e-5))throw new Error('The STL volume check failed. No file was created.');
 return {position,buffer,triangles:faces.length,volume,watertight:true};
}
function generate(input,progress=()=>{}) {
 if(!input||!Array.isArray(input.paths)||!Number.isFinite(input.tileW)||!Number.isFinite(input.tileH)||input.tileW<=0||input.tileH<=0)throw new Error('Invalid stencil input.');
 for(const [k,lo,hi]of [['slotWidth',.3,3],['thickness',.4,5],['minWeb',.2,3]])if(!Number.isFinite(input[k])||input[k]<lo||input[k]>hi)throw new Error('Stencil settings are outside the supported limits.');
 if(!Number.isInteger(input.columns)||!Number.isInteger(input.rows)||input.columns<1||input.rows<1||input.columns>200||input.rows>300)throw new Error('No complete tile fits, or too many tiles were requested.');
 input={style:'slots',rimEnabled:false,rimWidth:1,cornerRadius:.6,...input};
 if(!['slots','dots','solid'].includes(input.style))throw new Error('Unsupported stencil line style.');
 if(!Number.isFinite(input.rimWidth)||input.rimWidth<.1||input.rimWidth>10||!Number.isFinite(input.cornerRadius)||input.cornerRadius<0||input.cornerRadius>10)throw new Error('Invalid rim or corner radius.');
 for(const k of ['outerW','outerH'])if(input[k]!==undefined&&(!Number.isFinite(input[k])||input[k]<=0||input[k]>2500))throw new Error('Invalid outer plate size.');
 for(const path of input.paths)if(!Array.isArray(path)||path.length<(input.style==='dots'?1:2)||path.some(p=>!Array.isArray(p)||p.length!==2||!p.every(Number.isFinite)))throw new Error('Invalid cut path.');
 progress('Creating through-cut outlines...');
 const plate=prepareSlots(input),{W,H,slots,outerRing}=plate,solid=input.style==='solid';
 progress('Checking cut spacing and rim...');
 const spacing=solid?{minWeb:null,minWebExact:false,thinPairs:0,collisions:0,edgeMin:plate.rim||null,edgeCuts:0,marks:[]}:spacingCheck(slots,W,H,input.minWeb),warnings=[],errors=[];
 if(spacing.collisions)errors.push(`${spacing.collisions} cutout pair(s) touch or overlap. Reduce opening width, increase junction opening, or enlarge the tile. Separate stitch marks must remain separate holes.`);
 if(spacing.thinPairs)warnings.push(`${spacing.thinPairs} cutout pair(s) leave less than ${input.minWeb.toFixed(2)} mm of plastic. Smallest measured web: ${spacing.minWeb.toFixed(2)} mm.`);
 if(spacing.edgeMin!==null&&spacing.edgeMin+EPS<input.minWeb)warnings.push(`A rim near an outer edge is only ${spacing.edgeMin.toFixed(2)} mm thick.`);
 if(solid)warnings.push('Solid lines are unioned continuous cuts. Closed loops can create loose islands; disconnected plates are blocked. Internal web thickness is not measured in solid mode.');
 if(input.rimEnabled&&input.cornerRadius>plate.cornerRadius+EPS)warnings.push(`Corner radius limited to ${plate.cornerRadius.toFixed(2)} mm so rounding stays within the reserved rim.`);
 const base={W,H,thickness:input.thickness,slotWidth:input.slotWidth,style:input.style,slotCount:slots.length,spacing,warnings,errors,previewRings:slots.map(s=>s.ring),outerRing,components:null,tolerance:TOL,quantization:EPS,geometryVersion:2,layout:{contentW:plate.contentW,contentH:plate.contentH,offset:plate.offset,rim:plate.rim,cornerRadius:plate.cornerRadius}};
 if(errors.length)return base;
 progress(solid?'Unioning continuous cuts and building the plate...':'Triangulating the perforated plate...');
 const surface=triangulatePlate(slots,W,H,progress,{outerRing,union:solid});base.components=surface.components;
 if(surface.components!==1){base.errors.push(`This cut pattern separates the plate into ${surface.components} pieces. ${solid?'Choose stitch slots or dots; a rim cannot retain islands inside closed loops.':'Reduce opening width or enlarge the tile.'}`);return base;}
 progress('Extruding and validating the STL...');
 return {...base,...extrude(surface,W,H,input.thickness),outlineRings:surface.outlineRings,area:surface.area,cells:surface.cells};
}
root.StencilEngine=Object.freeze({generate,roundedSlot,circleRing,roundedRectangle,prepareSlots,clipRing,spacingCheck,triangulatePlate,extrude,GRID,TOL});
})(typeof globalThis==='undefined'?self:globalThis);
