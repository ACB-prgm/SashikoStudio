
'use strict';
/**
 * Sashiko Pattern Studio - dependency-free, local-first SVG and stencil generator.
 * Units: millimeters, including the SVG viewBox. No raster image is embedded.
 * Architecture: registry -> periodic geometry graph -> junction clearances ->
 * arc-length stitch fitting -> complete paths -> periodic copies -> clipping.
 * IMPORTANT: never dash a cropped tile. Cut only after periodic replication.
 */
(() => {
const VERSION = 3;
const TAU = Math.PI * 2;
const DEFAULTS = Object.freeze({pattern:'interlaced',stitch:2,ratioA:3,ratioB:2,opening:1,tileWidth:48,columns:3,rows:3,panelAuto:true,panelWidth:146,panelHeight:84.623,weight:0.9,transparent:false,paper:'letter',display:'stitches',seams:false,nodes:false,view:'panel'});
const LIMITS = {stitch:[0.5,10],ratioA:[1,10],ratioB:[1,10],opening:[0.2,6],tileWidth:[12,120],panelWidth:[2,1200],panelHeight:[2,1200],weight:[0.15,0.9]};
const $ = id => document.getElementById(id);
const clamp = (n,a,b) => Math.max(a,Math.min(b,n));
const hypot = (a,b) => Math.hypot(a[0]-b[0],a[1]-b[1]);
const lerp = (a,b,t) => [a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];
const mod = (a,n) => ((a%n)+n)%n;
const fmt = n => (Math.abs(n)<0.0000001?0:n).toFixed(5).replace(/\.?0+$/,'');
const mm = n => n.toFixed(2).replace(/\.?0+$/,'');
const point = p => `${fmt(p[0])} ${fmt(p[1])}`;
const xml = s => String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
const unit = v => {const l=Math.hypot(...v);return l>1e-12?v.map(x=>x/l):[1,0];};
let uid=0;

// -- Geometric primitives. Curved stitch fragments remain genuine SVG curves. --
function splitCubic(ps,t){const a=lerp(ps[0],ps[1],t),b=lerp(ps[1],ps[2],t),c=lerp(ps[2],ps[3],t),d=lerp(a,b,t),e=lerp(b,c,t),f=lerp(d,e,t);return [[ps[0],a,d,f],[f,e,c,ps[3]]];}
function cubicPoint(ps,t){const q=1-t;return [0,1].map(i=>q*q*q*ps[0][i]+3*q*q*t*ps[1][i]+3*q*t*t*ps[2][i]+t*t*t*ps[3][i]);}
function cubicSlice(ps,a,b){let out=ps;if(b<1)out=splitCubic(out,b)[0];if(a>0)out=splitCubic(out,a/b)[1];return out;}
function line(p0,p1){const L=hypot(p0,p1);return {kind:'line',p0,p1,L,bounds:[Math.min(p0[0],p1[0]),Math.min(p0[1],p1[1]),Math.max(p0[0],p1[0]),Math.max(p0[1],p1[1])],at:s=>lerp(p0,p1,clamp(s/L,0,1)),tangent:()=>unit([p1[0]-p0[0],p1[1]-p0[1]]),slice(a,b){return `M ${point(this.at(a))} L ${point(this.at(b))}`;}};}
function cubic(ps){
 // A 512-step arc-length table gives sub-0.01 mm accuracy at the allowed sizes.
 const steps=512,ls=new Float64Array(steps+1);let prev=ps[0];
 for(let i=1;i<=steps;i++){const p=cubicPoint(ps,i/steps);ls[i]=ls[i-1]+hypot(p,prev);prev=p;}
 const L=ls[steps];
 function tAt(s){s=clamp(s,0,L);let lo=0,hi=steps;while(hi-lo>1){const mid=(lo+hi)>>1;if(ls[mid]<=s)lo=mid;else hi=mid;}return (lo+(s-ls[lo])/(ls[hi]-ls[lo]||1))/steps;}
 return {kind:'cubic',p0:ps[0],p1:ps[3],L,ps,bounds:[Math.min(...ps.map(p=>p[0])),Math.min(...ps.map(p=>p[1])),Math.max(...ps.map(p=>p[0])),Math.max(...ps.map(p=>p[1]))],at:s=>cubicPoint(ps,tAt(s)),tangent(end){const a=end?ps[2]:ps[0],b=end?ps[3]:ps[1];return unit([b[0]-a[0],b[1]-a[1]]);},slice(a,b){const sub=cubicSlice(ps,tAt(a),tAt(b));return `M ${point(sub[0])} C ${point(sub[1])} ${point(sub[2])} ${point(sub[3])}`;}};
}
function arc(c,r,a0,a1){const L=Math.abs(a1-a0)*r,dir=Math.sign(a1-a0),at=s=>{const a=a0+dir*clamp(s,0,L)/r;return [c[0]+r*Math.cos(a),c[1]+r*Math.sin(a)];};return {kind:'arc',p0:at(0),p1:at(L),L,c,r,a0,a1,bounds:[c[0]-r,c[1]-r,c[0]+r,c[1]+r],at,tangent(end){const a=end?a1:a0;return [-Math.sin(a)*dir,Math.cos(a)*dir];},slice(a,b){return `M ${point(at(a))} A ${fmt(r)} ${fmt(r)} 0 ${b-a>Math.PI*r?1:0} ${dir>0?1:0} ${point(at(b))}`;}};}
function path(parts,options={}){
 const lengths=[0];for(const p of parts)lengths.push(lengths.at(-1)+p.L);
 const L=lengths.at(-1);
 return {parts,L,p0:parts[0].p0,p1:parts.at(-1).p1,periodic:!!options.periodic,route:options.route||'',bounds:[Math.min(...parts.map(p=>p.bounds[0])),Math.min(...parts.map(p=>p.bounds[1])),Math.max(...parts.map(p=>p.bounds[2])),Math.max(...parts.map(p=>p.bounds[3]))],tangent(end){return end?parts.at(-1).tangent(true):parts[0].tangent(false);},at(s){s=clamp(s,0,L);let i=0;while(i<parts.length-1&&lengths[i+1]<s)i++;return parts[i].at(s-lengths[i]);},slice(a,b){a=clamp(a,0,L);b=clamp(b,0,L);let d='';for(let i=0;i<parts.length;i++){const x=Math.max(a,lengths[i]),y=Math.min(b,lengths[i+1]);if(y-x<1e-8)continue;let seg=parts[i].slice(x-lengths[i],y-lengths[i]);if(d)seg=seg.replace(/^M\s+[-\d.]+\s+[-\d.]+\s+/,'');d+=(d?' ':'')+seg;}return d;}};
}
const edge = (primitive,route='') => path([primitive],{route});

// Pattern definitions are separate source files under src/patterns/.
// build.py discovers them and replaces the marker below before bundling.
const PATTERNS = Object.create(null);
function registerPattern(def) {
 const id=def&&def.id;
 if(!def||typeof def!=='object'||Array.isArray(def))throw new TypeError('Pattern definition must be an object.');
 if(typeof id!=='string'||!/^[a-z0-9][a-z0-9-]*$/.test(id))throw new Error('Pattern id must use lowercase letters, numbers, and hyphens.');
 if(Object.hasOwn(PATTERNS,id))throw new Error(`Duplicate pattern id: ${id}`);
 if(typeof def.name!=='string'||!def.name.trim())throw new Error(`Pattern ${id} needs a name.`);
 if(typeof def.note!=='string')throw new Error(`Pattern ${id} needs a note string.`);
 if(!Number.isFinite(def.aspect)||def.aspect<=0)throw new Error(`Pattern ${id} needs a positive aspect ratio.`);
 if(typeof def.build!=='function')throw new Error(`Pattern ${id} needs a build(W) function.`);
 const order=Number.isFinite(def.order)?def.order:1000;
 PATTERNS[id]=Object.freeze({...def,id,order});
}

/* PATTERN_HELPERS */

/* PATTERN_MODULES */

if(!Object.hasOwn(PATTERNS,DEFAULTS.pattern))throw new Error(`Default pattern '${DEFAULTS.pattern}' is not registered.`);
Object.freeze(PATTERNS);

function validate(raw){
 const out={...DEFAULTS};if(!raw||typeof raw!=='object'||Array.isArray(raw))return out;
 for(const [key,[lo,hi]] of Object.entries(LIMITS)){if(typeof raw[key]==='number'&&Number.isFinite(raw[key]))out[key]=clamp(raw[key],lo,hi);}
 // Old JSON files described a tile count instead of a physical canvas.
 if(typeof raw.panelAuto==='boolean')out.panelAuto=raw.panelAuto;
 if(!Object.hasOwn(raw,'panelWidth')&&Number.isFinite(raw.columns)&&Number.isFinite(raw.rows)) {
   const def=PATTERNS[raw.pattern]||PATTERNS[out.pattern];out.panelAuto=false;
   out.panelWidth=out.tileWidth*Math.max(1,Math.min(200,Math.round(raw.columns)));
   out.panelHeight=out.tileWidth*def.aspect*Math.max(1,Math.min(200,Math.round(raw.rows)));
 }
 if(Object.hasOwn(PATTERNS,raw.pattern))out.pattern=raw.pattern;
 for(const key of ['transparent','seams','nodes'])if(typeof raw[key]==='boolean')out[key]=raw[key];
 if(['letter','a4','a3'].includes(raw.paper))out.paper=raw.paper;
 if(['stitches','geometry','overlay'].includes(raw.display))out.display=raw.display;
 if(['panel','tile','seams'].includes(raw.view))out.view=raw.view;
 return out;
}
function getFrame(){return window.SashikoStencil?.getSettings()||SashikoLayout.FRAME;}
function getPanelLayout(m=model,frame=getFrame()){return SashikoLayout.plan(m.W,m.H,m.s,frame);}
function nodeKey(p,W,H){let x=mod(p[0],W),y=mod(p[1],H);if(W-x<1e-5||x<1e-5)x=0;if(H-y<1e-5||y<1e-5)y=0;return `${x.toFixed(4)},${y.toFixed(4)}`;}

/** Fit dashes to geometry, not the viewport. No junction is discovered from pixels. */
function buildModel(raw){
 const s=validate(raw),geo=PATTERNS[s.pattern].build(s.tileWidth),{W,H,edges}=geo,nodes=new Map();
 const layout=SashikoLayout.plan(W,H,s,getFrame());
 s.columns=layout.columns;s.rows=layout.rows;s.panelWidth=layout.W;s.panelHeight=layout.H;
 edges.forEach((e,ei)=>{e.id=ei;if(e.periodic)return;[e.p0,e.p1].forEach((p,end)=>{const key=nodeKey(p,W,H),v=e.tangent(!!end).map(x=>end?-x:x);if(!nodes.has(key))nodes.set(key,{key,p:[mod(p[0],W),mod(p[1],H)],arms:[],clearance:0});nodes.get(key).arms.push({ei,end,v});});});
 for(const n of nodes.values()){
  let angle=Math.PI;for(let i=0;i<n.arms.length;i++)for(let j=i+1;j<n.arms.length;j++){const a=n.arms[i].v,b=n.arms[j].v,dot=clamp(a[0]*b[0]+a[1]*b[1],-1,1);angle=Math.min(angle,Math.acos(dot));}
  // Rounded caps are inset later. This also separates arms at acute angles.
  const separation=Math.min(.2,s.opening/3),angleClearance=(s.weight+separation)/(2*Math.sin(Math.max(.08,angle)/2))-s.weight/2;
  n.clearance=Math.max(s.opening/2,angleClearance);
  // Parallel tangents on different curves do not stay parallel: they diverge
  // quadratically. A straight-ray estimate would unnecessarily erase short
  // intervals between the seigaiha inner-wave contacts and the wave tips.
  if(angle<.15 && n.arms.some(a=>edges[a.ei].parts.some(p=>p.kind!=='line'))) {
    const offsetAt=(arm,d)=>{const e=edges[arm.ei],p=e.at(arm.end?e.L-d:d),q=arm.end?e.p1:e.p0;return [p[0]-q[0],p[1]-q[1]];};
    const separated=c=>{
      const d=c+s.weight/2, points=n.arms.map(a=>offsetAt(a,d));
      for(let i=0;i<points.length;i++)for(let j=i+1;j<points.length;j++)if(hypot(points[i],points[j])<s.weight+separation-1e-9)return false;
      return true;
    };
    let lo=s.opening/2, hi=lo;
    const limit=Math.min(...n.arms.map(a=>edges[a.ei].L))-s.weight/2-.01, step=Math.max(.025,s.weight/4);
    while(hi<limit&&!separated(hi)){lo=hi;hi=Math.min(limit,hi+step);}
    if(hi<=limit&&separated(hi)){
      for(let k=0;k<24;k++){const mid=(lo+hi)/2;if(separated(mid))hi=mid;else lo=mid;}
      n.clearance=Math.max(s.opening/2,hi);
    }
  }
  for(const a of n.arms)edges[a.ei][a.end?'endClear':'startClear']=n.clearance;
 }
 const q=s.ratioA/s.ratioB,targetGap=s.stitch/q,dashes=[],lengths=[],gaps=[],fits=[],warnings=[];let skipped=0,omitted=0;
 for(const e of edges){
  let n,a,g,start;
  if(e.periodic){
   const estimate=e.L/(s.stitch+targetGap),candidates=[Math.max(1,Math.floor(estimate)),Math.max(1,Math.ceil(estimate))];
   n=candidates.reduce((best,x)=>Math.abs(Math.log(e.L/(x*(1+1/q))/s.stitch))<Math.abs(Math.log(e.L/(best*(1+1/q))/s.stitch))?x:best,candidates[0]);
   a=e.L/(n*(1+1/q));g=a/q;start=g/2;
  }else{
   const c0=e.startClear||0,c1=e.endClear||0,D=e.L-c0-c1;
   if(D<=s.weight+.05){skipped++;continue;}
   const estimate=(D+targetGap)/(s.stitch+targetGap),lo=Math.max(1,Math.floor(estimate)),hi=Math.max(1,Math.ceil(estimate));
   const fit=x=>D/(x+(x-1)/q);
   n=Math.abs(Math.log(fit(lo)/s.stitch))<=Math.abs(Math.log(fit(hi)/s.stitch))?lo:hi;
   a=fit(n);g=a/q;start=c0;
  }
  if(!Number.isFinite(a)||a<=0)throw new Error('Unable to fit stitches to this geometry.');
  fits.push({edge:e.id,n,a,g,start});
  for(let j=0;j<n;j++){
   const from=start+j*(a+g),to=from+a;
   // Insets keep round caps from eating the requested gaps. No white masks.
   const inset=s.weight/2;
   if(a<=s.weight+.02){omitted++;continue;}
   const fromInk=from+inset,toInk=to-inset;
   dashes.push({edge:e.id,from,to,fromInk,toInk,length:a,d:e.slice(fromInk,toInk)});lengths.push(a);
  }
  if(n>1||e.periodic)gaps.push(g);
 }
 const min=lengths.length?Math.min(...lengths):0,max=lengths.length?Math.max(...lengths):0,maxDeviation=lengths.length?Math.max(Math.abs(min/s.stitch-1),Math.abs(max/s.stitch-1)):0;
 if(skipped||omitted)warnings.push(`${skipped?skipped+' curve interval'+(skipped===1?' is':'s are')+' too short for the current opening':''}${skipped&&omitted?'; ':''}${omitted?omitted+' stitch'+(omitted===1?' is':'es are')+' shorter than the line weight':''}. Increase repeat size, reduce the opening, or reduce line weight.`);
 if(maxDeviation>.25)warnings.push(`Fitting changes some stitches by up to ${Math.round(maxDeviation*100)}% from the target. A larger repeat or shorter target stitch usually gives a closer fit. The displayed actual lengths are authoritative.`);
 if(q<=1)warnings.push(`The selected ${mm(s.ratioA)}:${mm(s.ratioB)} ratio makes stitches ${q===1?'equal to':'shorter than'} interior gaps. Choose 3:2 for the longer-stitch style.`);
 const bounds=[Math.min(...edges.map(e=>e.bounds[0])),Math.min(...edges.map(e=>e.bounds[1])),Math.max(...edges.map(e=>e.bounds[2])),Math.max(...edges.map(e=>e.bounds[3]))];
 return {s,W,H,layout,edges,nodes:[...nodes.values()],dashes,lengths,gaps,fits,min,max,maxDeviation,warnings,skipped,omitted,bounds};
}

// -- Rendering. A single global clip means no per-tile anti-aliased hairlines. --
function copies(bounds,W,H,rect,pad=0){
 const [x,y,w,h]=rect;
 const x0=Math.ceil((x-bounds[2]-pad)/W),x1=Math.floor((x+w-bounds[0]+pad)/W),y0=Math.ceil((y-bounds[3]-pad)/H),y1=Math.floor((y+h-bounds[1]+pad)/H),out=[];
 for(let j=y0;j<=y1;j++)for(let i=x0;i<=x1;i++)out.push([i*W,j*H]);return out;
}
function sourceMarkup(m,id,mode){
 const geometry=m.edges.map(e=>`<path d="${e.slice(0,e.L)}" data-route="${xml(e.route)}"/>`).join('');
 const stitched=m.dashes.map(d=>`<path d="${d.d}"/>`).join('');
 let body='';if(mode==='geometry'||mode==='overlay')body+=`<g fill="none" stroke="${mode==='overlay'?'#c9cfc5':'#000'}" stroke-width="${fmt(mode==='overlay'?Math.min(.22,m.s.weight*.6):m.s.weight)}" stroke-linecap="round" stroke-linejoin="round">${geometry}</g>`;
 if(mode!=='geometry')body+=`<g fill="none" stroke="#000" stroke-width="${fmt(m.s.weight)}" stroke-linecap="round" stroke-linejoin="round">${stitched}</g>`;
 return `<g id="${id}">${body}</g>`;
}
function svgFor(m,cols=1,rows=1,options={}){
 const id=`sashiko-${++uid}`,fullW=m.W*cols,fullH=m.H*rows,rect=options.rect||[0,0,fullW,fullH],[x,y,w,h]=rect,mode=options.mode||'stitches',pad=m.s.weight;
 const defs=`<defs>${sourceMarkup(m,id+'-source',mode)}<clipPath id="${id}-clip"><rect x="${fmt(x)}" y="${fmt(y)}" width="${fmt(w)}" height="${fmt(h)}"/></clipPath></defs>`;
 const uses=copies(m.bounds,m.W,m.H,rect,pad).map(([tx,ty])=>`<use href="#${id}-source" xlink:href="#${id}-source" transform="translate(${fmt(tx)} ${fmt(ty)})"/>`).join('');
 let guide='';
 if(options.nodes){const circles=m.nodes.map(n=>`<circle cx="${fmt(n.p[0])}" cy="${fmt(n.p[1])}" r="${fmt(n.clearance)}"/>`).join(''),nId=id+'-nodes';guide+=`<defs><g id="${nId}" fill="#e9ad5d" fill-opacity=".15" stroke="#bd8749" stroke-width=".1">${circles}</g></defs>`+copies([0,0,m.W,m.H],m.W,m.H,rect,4).map(([tx,ty])=>`<use href="#${nId}" transform="translate(${fmt(tx)} ${fmt(ty)})"/>`).join('');}
 if(options.seams){let d='';for(let i=0;i<=cols;i++)d+=`M${fmt(i*m.W)} 0V${fmt(fullH)} `;for(let j=0;j<=rows;j++)d+=`M0 ${fmt(j*m.H)}H${fmt(fullW)} `;guide+=`<path d="${d}" fill="none" stroke="#749b8c" stroke-width=".18" stroke-dasharray="1.2 1"/>`;}
 const meta=xml(JSON.stringify({app:'Sashiko Pattern Studio',version:VERSION,units:'mm',tileWidth:m.W,tileHeight:m.H,columns:cols,rows,mode,settings:m.s,actualStitchRange:[m.min,m.max],junctionGaps:'deliberate exceptions to interior stitch:gap ratio'}));
 return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${fmt(w)}mm" height="${fmt(h)}mm" viewBox="${fmt(x)} ${fmt(y)} ${fmt(w)} ${fmt(h)}" role="img" aria-label="${xml(PATTERNS[m.s.pattern].name)} ${mode==='geometry'?'geometry':'stitch pattern'}"><title>${xml(PATTERNS[m.s.pattern].name)} - ${cols} by ${rows} repeats</title><desc>Periodic on both axes. Preserve the exact document size when tiling. No border or watermark.</desc><metadata>${meta}</metadata>${defs}${options.transparent?'':`<rect x="${fmt(x)}" y="${fmt(y)}" width="${fmt(w)}" height="${fmt(h)}" fill="#fff"/>`}<g clip-path="url(#${id}-clip)">${uses}${guide}</g></svg>`;
}

// -- Application state, accessible controls and responsive preview. --
let state={...DEFAULTS};try{const saved=JSON.parse(localStorage.getItem('sashiko-studio-v3')||'null');if(saved)state=validate(saved);}catch(_){/* Private/file contexts may disallow storage. */}
let model=null,zoom=1,renderTimer=null,toastTimer=null;
function toast(message){$('toast').textContent=message;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,4200);}
function persist(){try{localStorage.setItem('sashiko-studio-v3',JSON.stringify(state));}catch(_){/* JSON save/load is always available as a fallback. */}}
function syncControls(){
 for(const key of Object.keys(LIMITS)){if($(key)&&document.activeElement!==$(key))$(key).value=state[key];if($(key+'-range'))$(key+'-range').value=state[key];}
 for(const key of ['transparent','seams','nodes'])$(key).checked=state[key];
 for(const key of ['paper','display'])$(key).value=state[key];
 document.querySelectorAll('[data-pattern]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.pattern===state.pattern)));
 document.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view===state.view)));
 document.querySelectorAll('[data-ratio]').forEach(b=>{const [a,c]=b.dataset.ratio.split(',').map(Number);b.classList.toggle('active',Math.abs(a/c-state.ratioA/state.ratioB)<1e-6);});
}
function dimensionsForView(){return state.view==='tile'?[1,1]:state.view==='seams'?[3,3]:[state.columns,state.rows];}
/** Keep the complete-tile array centered inside the requested physical canvas. */
function panelSVG(m,options={}){
 const l=getPanelLayout(m),[x,y,w,h]=options.rect||[0,0,l.W,l.H];
 let drawing='';
 if(l.valid){const inner=svgFor(m,l.columns,l.rows,{...options,rect:undefined,transparent:true});drawing=inner.replace(`width="${fmt(l.contentW)}mm"`,`width="${fmt(l.contentW)}"`).replace(`height="${fmt(l.contentH)}mm"`,`height="${fmt(l.contentH)}"`).replace('<svg ',`<svg x="${fmt(l.x)}" y="${fmt(l.y)}" overflow="hidden" `);}
 return `<svg xmlns="http://www.w3.org/2000/svg" width="${fmt(w)}mm" height="${fmt(h)}mm" viewBox="${fmt(x)} ${fmt(y)} ${fmt(w)} ${fmt(h)}" role="img" aria-label="Pattern export canvas"><title>${xml(PATTERNS[m.s.pattern].name)} - export canvas</title>${options.transparent?'':`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="white"/>`}${drawing}</svg>`;
}
function drawPreview(){
 if(!model)return;const [cols,rows]=dimensionsForView(),opts={mode:state.display,seams:state.seams||state.view==='seams',nodes:state.nodes,transparent:false};
 $('sheet').innerHTML=state.view==='panel'?panelSVG(model,opts):svgFor(model,cols,rows,opts);sizePreview();
 const l=getPanelLayout(model);
 $('sheet-label').textContent=state.view==='panel'?`${l.columns} x ${l.rows} complete tiles / ${mm(l.W)} x ${mm(l.H)} mm canvas / centered`:`${cols} x ${rows} repeat${cols*rows===1?'':'s'} / ${mm(cols*model.W)} x ${mm(rows*model.H)} mm${state.view==='seams'?' / guides only':''}`;
}
function sizePreview(){
 if(!model)return;const [cols,rows]=dimensionsForView(),l=getPanelLayout(model),w=state.view==='panel'?l.W:cols*model.W,h=state.view==='panel'?l.H:rows*model.H,stage=$('preview-stage'),svg=$('sheet').querySelector('svg');if(!svg)return;
 const availW=Math.max(150,stage.clientWidth-60),availH=Math.max(180,stage.clientHeight-77),scale=Math.min(availW/w,availH/h)*zoom;
 svg.style.width=`${w*scale}px`;svg.style.height=`${h*scale}px`;$('zoom-label').textContent=zoom===1?'Fit':`${Math.round(zoom*100)}%`;
}
function render(){
 try{model=buildModel(state);state=model.s;const p=PATTERNS[state.pattern];$('pattern-title').textContent=p.name;$('pattern-note').textContent=p.note;
 $('target-gap').textContent=`${mm(state.stitch/(state.ratioA/state.ratioB))} mm target gap`;
 const q=state.ratioA/state.ratioB,period=25,a=period*q/(1+q);$('rhythm').innerHTML=`<path d="M2 7.5H139" stroke="#315e51" stroke-width="2" stroke-dasharray="${a} ${period-a}" fill="none"/>`;
 $('tile-dimensions').textContent=`${mm(model.W)} x ${mm(model.H)} mm`;const layout=getPanelLayout(model);$('panel-dimensions').textContent=`${layout.columns} columns x ${layout.rows} rows / ${mm(layout.contentW)} x ${mm(layout.contentH)} mm of pattern`;
 $('tile-height').textContent=`Tile height: ${mm(model.H)} mm (pattern aspect preserved)`;
 $('panel-fit-note').textContent=layout.valid?`${state.panelAuto?'3 x 3 starting layout. ':''}Complete tiles only. Margins: ${mm(layout.x)} mm left/right, ${mm(layout.y)} mm top/bottom. ${layout.rim?'Includes the minimum STL rim.':'No rim reserved.'}`:'No complete tile fits. Increase the canvas or decrease tile size.';
 $('export-panel').disabled=!layout.valid;$('print-panel').disabled=!layout.valid;
 $('actual-length').textContent=model.lengths.length?(model.max-model.min<.015?`${mm(model.min)} mm`:`${mm(model.min)}-${mm(model.max)} mm`):'No stitches';
 $('fit-note').textContent=`Target ${mm(state.stitch)} mm / up to ${Math.round(model.maxDeviation*100)}% fit adjustment`;
 $('stitch-count').textContent=model.dashes.length.toLocaleString();$('gap-range').textContent=model.gaps.length?`Interior gaps ${mm(Math.min(...model.gaps))}-${mm(Math.max(...model.gaps))} mm`:'No interior gaps on these intervals';
 $('notices').replaceChildren();for(const text of model.warnings){const p=document.createElement('p');p.className='notice';p.textContent=text;$('notices').append(p);}
 $('export-caption').textContent=`${state.display==='geometry'?'Solid guides':'Stitch map'} exported in black${state.transparent?' on transparent':' on white'}. True millimeter dimensions. Preview guides never export.`;
 syncControls();drawPreview();persist();window.dispatchEvent(new CustomEvent("sashiko-pattern-change"));
 }catch(error){console.error(error);$('notices').innerHTML='';const p=document.createElement('p');p.className='error';p.textContent='Could not build this pattern. '+error.message;$('notices').append(p);model=null;}
}
function scheduleRender(){clearTimeout(renderTimer);renderTimer=setTimeout(render,70);}
function flush(){clearTimeout(renderTimer);render();if(!model)throw new Error('The pattern is not ready. Reset the settings and try again.');}
function makeCards(){for(const [key,p] of Object.entries(PATTERNS).sort((a,b)=>a[1].order-b[1].order||a[0].localeCompare(b[0]))){const b=document.createElement('button');b.type='button';b.className='pattern-card';b.dataset.pattern=key;b.setAttribute('aria-pressed',String(state.pattern===key));const m=buildModel({...DEFAULTS,pattern:key,tileWidth:24,stitch:1.2,opening:.65,weight:.2});b.innerHTML=svgFor(m,2,key==='interlaced'?2:1,{mode:'stitches'})+`<span class="card-name">${xml(p.name)}</span>`;b.addEventListener('click',()=>{state.pattern=key;zoom=1;render();});$('pattern-list').append(b);}}
function download(text,name,type){const blob=new Blob([text],{type}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);}
function exportSVG(tile){try{
 flush();const mode=state.display==='geometry'?'geometry':'stitches',l=getPanelLayout(model);
 if(!tile&&!l.valid)throw new Error('No complete tile fits the selected export size.');
 const svg=tile?svgFor(model,1,1,{mode,transparent:state.transparent}):panelSVG(model,{mode,transparent:state.transparent});
 const w=tile?model.W:l.W,h=tile?model.H:l.H;
 download('<?xml version="1.0" encoding="UTF-8"?>\n'+svg,`sashiko-${state.pattern}-${tile?'repeat':'panel'}-${mm(w)}x${mm(h)}mm-${mode}.svg`,'image/svg+xml;charset=utf-8');
 toast(tile?'Repeat SVG saved. Preserve its exact size when tiling.':'Panel SVG saved at the selected canvas size.');
 }catch(e){toast(e.message);}}

/** Generate exact-scale printable crops, with 5 mm overlap between pages. */
function buildPrint(m){
 const s=m.s,l=getPanelLayout(m),mode=s.display==='geometry'?'geometry':'stitches';
 if(!l.valid)throw new Error('No complete tile fits the selected export size.');
 const [paperW,paperH]=s.paper==='a4'?[210,297]:s.paper==='a3'?[297,420]:[215.9,279.4];
 const fits=l.W<=paperW+1e-7&&l.H<=paperH+1e-7;
 const cropW=fits?paperW:paperW-20,cropH=fits?paperH:paperH-40,overlap=5,W=l.W,H=l.H;
 const nx=W<=cropW?1:1+Math.ceil((W-cropW)/(cropW-overlap)),ny=H<=cropH?1:1+Math.ceil((H-cropH)/(cropH-overlap));
 if(nx*ny>64)throw new Error(`This canvas needs ${nx*ny} pages. Reduce the size or export SVG instead.`);
 const pages=[];
 for(let iy=0;iy<ny;iy++)for(let ix=0;ix<nx;ix++){
  const x=ix*(cropW-overlap),y=iy*(cropH-overlap),w=Math.min(cropW,W-x),h=Math.min(cropH,H-y);
  const drawing=panelSVG(m,{mode,rect:[x,y,w,h],transparent:false});
  const heading=fits?'':`<div class="print-heading"><strong>${xml(PATTERNS[s.pattern].name)}</strong> / ${mm(W)} x ${mm(H)} mm canvas<br>Row ${iy+1}, column ${ix+1} / 5 mm overlap</div>`;
  const style=fits?`padding:0;display:flex;align-items:center;justify-content:center;`:'';
  pages.push(`<section class="print-page" style="width:${paperW}mm;height:${paperH}mm;${style}">${heading}<div class="print-map">${drawing}</div></section>`);
 }
 return {html:pages.join(''),count:pages.length,paperW,paperH,nx,ny,cropW,cropH,overlap};
}

for(const [key,[lo,hi]] of Object.entries(LIMITS)){
 const el=$(key);el.addEventListener('input',()=>{const value=el.valueAsNumber;if(!Number.isFinite(value)||value<lo||value>hi)return;state[key]=value;if(key==='panelWidth'||key==='panelHeight')state.panelAuto=false;if($(key+'-range'))$(key+'-range').value=state[key];scheduleRender();});
 el.addEventListener('change',()=>{const value=el.valueAsNumber;state[key]=Number.isFinite(value)?clamp(value,lo,hi):DEFAULTS[key];if(key==='panelWidth'||key==='panelHeight')state.panelAuto=false;el.value=state[key];render();});
 const range=$(key+'-range');if(range)range.addEventListener('input',()=>{state[key]=Number(range.value);el.value=state[key];scheduleRender();});
}
document.querySelectorAll('[data-ratio]').forEach(b=>b.addEventListener('click',()=>{[state.ratioA,state.ratioB]=b.dataset.ratio.split(',').map(Number);render();}));
document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>{state.view=b.dataset.view;zoom=1;syncControls();drawPreview();persist();window.dispatchEvent(new CustomEvent("sashiko-pattern-change"));}));
for(const key of ['transparent','seams','nodes'])$(key).addEventListener('change',()=>{state[key]=$(key).checked;render();});
for(const key of ['display','paper'])$(key).addEventListener('change',()=>{state[key]=$(key).value;render();});
$('zoom-in').addEventListener('click',()=>{zoom=Math.min(6,zoom*1.4);sizePreview();});$('zoom-out').addEventListener('click',()=>{zoom=Math.max(.5,zoom/1.4);sizePreview();});$('zoom-fit').addEventListener('click',()=>{zoom=1;sizePreview();});
$('export-tile').addEventListener('click',()=>exportSVG(true));$('export-panel').addEventListener('click',()=>exportSVG(false));
$('save-preset').addEventListener('click',()=>{flush();download(JSON.stringify({app:'Sashiko Pattern Studio',version:VERSION,settings:state,stencil:window.SashikoStencil?.getSettings()},null,2),'sashiko-settings.json','application/json');toast('Settings saved. Load this JSON file to restore the design.');});
$('load-preset').addEventListener('click',()=>$('preset-file').click());
$('preset-file').addEventListener('change',async event=>{const file=event.target.files[0];if(!file)return;try{if(file.size>100000)throw new Error('Settings files must be smaller than 100 KB.');const parsed=JSON.parse(await file.text());if(parsed.app!=='Sashiko Pattern Studio'||![1,2,3].includes(parsed.version)||!parsed.settings)throw new Error('This is not a supported Sashiko Pattern Studio settings file.');state=validate(parsed.settings);if(window.SashikoStencil)window.SashikoStencil.setSettings(parsed.version<3?{scope:'repeat',thickness:1.4,slotWidth:.9,rimEnabled:false,cornerRadius:0,...parsed.stencil}:parsed.stencil||{});zoom=1;render();toast('Settings loaded.');}catch(e){toast('Could not load settings: '+e.message);}finally{event.target.value='';}});
$('reset').addEventListener('click',()=>{state={...DEFAULTS};window.SashikoStencil?.setSettings({});zoom=1;render();toast('Default design restored.');});
$('print-panel').addEventListener('click',()=>{try{flush();const pages=buildPrint(model);$('print-root').innerHTML=pages.html;$('print-size').textContent=`@media print{@page{size:${pages.paperW}mm ${pages.paperH}mm;margin:0}}`;setTimeout(()=>window.print(),120);}catch(e){toast(e.message);}});
window.addEventListener('resize',sizePreview);
if(typeof ResizeObserver!=='undefined')new ResizeObserver(sizePreview).observe($('preview-stage'));
// A small read-only testing/extension surface. All exported files remain standalone.
window.SashikoStudio=Object.freeze({version:VERSION,defaults:DEFAULTS,patterns:PATTERNS,validate,buildModel,svgFor,panelSVG,getPanelLayout,buildPrint,getState:()=>({...state}),getModel:()=>model,setState:raw=>{const next={...state,...raw};
 if((Object.hasOwn(raw,'columns')||Object.hasOwn(raw,'rows'))&&!Object.hasOwn(raw,'panelWidth')){const w=next.tileWidth,h=w*PATTERNS[next.pattern].aspect,r=getFrame().rimEnabled?getFrame().rimWidth:0;next.panelAuto=false;next.panelWidth=(raw.columns??state.columns)*w+2*r;next.panelHeight=(raw.rows??state.rows)*h+2*r;}
 else if((Object.hasOwn(raw,'panelWidth')||Object.hasOwn(raw,'panelHeight'))&&!Object.hasOwn(raw,'panelAuto'))next.panelAuto=false;
 state=validate(next);render();}});

$('size-preset').addEventListener('change',()=>{
 const value=$('size-preset').value;if(!value)return;
 if(value==='auto')state.panelAuto=true;
 else{const [w,h]=value.split(',').map(Number);state.panelAuto=false;state.panelWidth=w;state.panelHeight=h;if(value==='215.9,279.4')state.paper='letter';if(value==='210,297')state.paper='a4';if(value==='297,420')state.paper='a3';}
 $('size-preset').value='';zoom=1;render();
});
makeCards();syncControls();render();
})();
