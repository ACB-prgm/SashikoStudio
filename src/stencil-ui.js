/* Browser-only stencil export. Geometry runs in a cancellable, self-contained
 * Blob worker: no CDN, service, build step, upload, or account is required. */
(function(){
'use strict';
const $=id=>document.getElementById(id),studio=window.SashikoStudio;
const defaults=Object.freeze({scope:'panel',thickness:.9,slotWidth:1.8,minWeb:.9,showWarnings:true,style:'slots',rimEnabled:true,rimWidth:1,cornerRadius:.6});
const limits={thickness:[.4,5],slotWidth:[.3,3],minWeb:[.2,3],rimWidth:[.1,10],cornerRadius:[0,10]};
const mm=n=>Number(n).toFixed(2).replace(/\.?0+$/,'');
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
function validate(raw){const s={...defaults};if(!raw||typeof raw!=='object')return s;for(const [k,[lo,hi]]of Object.entries(limits))if(typeof raw[k]==='number'&&Number.isFinite(raw[k]))s[k]=Math.max(lo,Math.min(hi,raw[k]));if(['repeat','panel'].includes(raw.scope))s.scope=raw.scope;if(typeof raw.showWarnings==='boolean')s.showWarnings=raw.showWarnings;if(typeof raw.rimEnabled==='boolean')s.rimEnabled=raw.rimEnabled;if(['slots','dots','solid'].includes(raw.style))s.style=raw.style;return s;}
let settings={...defaults};try{settings=validate(JSON.parse(localStorage.getItem('sashiko-stencil-v3')));}catch(_){}
let worker=null,timer=null,generation=0,result=null,inputSnapshot=null,preview=null,view='top',busy=false,started=0;
function persist(){try{localStorage.setItem('sashiko-stencil-v3',JSON.stringify(settings));}catch(_){}}
// Never normalize the focused number field on an input event: "1." is a valid
// intermediate edit while the user is typing "1.2". Commit on change or Enter.
function sync(){
 for(const key of Object.keys(limits)){const el=$('stencil-'+key);if(document.activeElement!==el)el.value=settings[key];const range=$('stencil-'+key+'-range');if(range)range.value=settings[key];}
 if(document.activeElement!==$('stencil-opening'))$('stencil-opening').value=studio.getState().opening;
 $('stencil-scope').value=settings.scope;$('stencil-style').value=settings.style;$('stencil-showWarnings').checked=settings.showWarnings;$('stencil-rimEnabled').checked=settings.rimEnabled;
 for(const id of ['stencil-rimWidth','stencil-rimWidth-range','stencil-cornerRadius','stencil-cornerRadius-range'])$(id).disabled=!settings.rimEnabled;
 $('stencil-style-note').textContent=settings.style==='solid'?'Continuous geometry is cut without stitch gaps. Closed loops may release islands, in which case export is blocked.':settings.style==='dots'?'One circular opening at the center of each fitted stitch. Opening width is the dot diameter.':'Round-ended through-slots at the fitted stitch positions.';
 $('stencil-opening').disabled=settings.style==='solid';
}
function samplePath(e,a,b){
 const out=[e.at(a)];
 const lineDistance=(p,x,y)=>{const dx=y[0]-x[0],dy=y[1]-x[1],L=dx*dx+dy*dy,t=Math.max(0,Math.min(1,((p[0]-x[0])*dx+(p[1]-x[1])*dy)/(L||1)));return Math.hypot(p[0]-x[0]-t*dx,p[1]-x[1]-t*dy);};
 function split(a,b,p,q,depth){const m=(a+b)/2,c=e.at(m),p1=e.at((3*a+b)/4),p3=e.at((a+3*b)/4),error=Math.max(lineDistance(c,p,q),lineDistance(p1,p,q),lineDistance(p3,p,q));if(depth<14&&(error>.0015||(b-a>.6&&e.parts.some(p=>p.kind!=='line')))){split(a,m,p,c,depth+1);split(m,b,c,q,depth+1);}else out.push(q);}
 split(a,b,out[0],e.at(b),0);return out;
}
function makeInput(m=studio.getModel(),s=settings){
 if(!m)throw new Error('The pattern is not ready.');s=validate(s);
 const l=s.scope==='repeat'?SashikoLayout.oneRepeat(m.W,m.H,s):SashikoLayout.plan(m.W,m.H,m.s,s);
 if(!l.valid)throw new Error('No complete tile fits inside the export size and rim. Enlarge the canvas, reduce the rim, or reduce tile size.');
 let paths;
 if(s.style==='solid'){
  // Each primitive is widened separately, then the mesh engine unions all cuts.
  // Splitting at corners gives round joins and avoids offsetting sharp folds.
  paths=m.edges.flatMap(e=>e.parts.map(p=>samplePath({at:x=>p.at(x),parts:[p]},0,p.L)));
 }else{
  if(m.skipped||m.omitted)throw new Error('The stitch map omits marks that do not fit. Increase tile size or reduce junction opening / line weight before stencil export.');
  if(s.style==='dots')paths=m.dashes.map(d=>[m.edges[d.edge].at((d.from+d.to)/2)]);
  else{
   const tooShort=m.dashes.filter(d=>d.length<=s.slotWidth+.02);
   if(tooShort.length)throw new Error(`${tooShort.length} stitch(es) are not longer than the selected ${mm(s.slotWidth)} mm slot width. Reduce slot width, increase target stitch length, enlarge the tile, or choose dots.`);
   paths=m.dashes.map(d=>samplePath(m.edges[d.edge],d.from+s.slotWidth/2,d.to-s.slotWidth/2));
  }
 }
 return {tileW:m.W,tileH:m.H,columns:l.columns,rows:l.rows,outerW:l.W,outerH:l.H,slotWidth:s.slotWidth,thickness:s.thickness,minWeb:s.minWeb,style:s.style,rimEnabled:s.rimEnabled,rimWidth:s.rimWidth,cornerRadius:s.cornerRadius,paths,pattern:m.s.pattern,settings:{pattern:{...m.s},stencil:{...s}}};
}
function cancel(){generation++;if(worker){worker.terminate();worker=null;}clearTimeout(timer);busy=false;}
function setBusy(message){busy=true;$('stencil-progress').hidden=false;$('stencil-progress-text').textContent=message;$('stencil-download').disabled=true;$('stencil-report').disabled=true;$('stencil-ready').textContent='Working locally in your browser...';}
function issue(text,type){const p=document.createElement('p');p.className='stencil-'+type;p.textContent=text;$('stencil-checks').append(p);}
function showError(message){busy=false;result=null;$('stencil-progress').hidden=true;$('stencil-top').replaceChildren();$('stencil-canvas').hidden=true;$('stencil-top').hidden=false;$('stencil-checks').replaceChildren();issue(message,'error');$('stencil-metrics').replaceChildren();$('stencil-ready').textContent='No STL created. Adjust the settings above.';$('stencil-download').disabled=true;$('stencil-report').disabled=true;$('stencil-ack-row').hidden=true;}
function schedule(){cancel();result=null;$('stencil-ack').checked=false;$('stencil-ack-row').hidden=true;persist();sync();if(!$('stencil-dialog').open)return;setBusy('Preparing stencil...');timer=setTimeout(build,180);}
async function build(){
 cancel();const id=++generation;started=performance.now();setBusy('Creating rounded slots...');$('stencil-checks').replaceChildren();$('stencil-metrics').replaceChildren();
 let input;
 try{input=makeInput();inputSnapshot=input;const W=input.outerW,H=input.outerH;$('stencil-dimensions').textContent=`${mm(W)} x ${mm(H)} x ${mm(input.thickness)} mm`;}catch(e){showError(e.message);return;}
 const finished=r=>{if(id!==generation)return;worker?.terminate();worker=null;result=r;result.elapsedMs=Math.round(performance.now()-started);busy=false;$('stencil-progress').hidden=true;renderResult();};
 const failed=e=>{if(id!==generation)return;worker?.terminate();worker=null;showError(e.message||String(e));};
 try{
  const code=$('stencil-engine-source').textContent+'\nself.onmessage=function(e){try{const r=StencilEngine.generate(e.data,function(text){self.postMessage({type:"progress",text:text});});const t=[];if(r.buffer)t.push(r.buffer);if(r.position)t.push(r.position.buffer);self.postMessage({type:"done",result:r},t);}catch(error){self.postMessage({type:"error",message:error.message||String(error)});}};';
  const url=URL.createObjectURL(new Blob([code],{type:'text/javascript'}));
  try{worker=new Worker(url);}finally{URL.revokeObjectURL(url);}
  worker.onmessage=e=>{if(id!==generation)return;const d=e.data;if(d.type==='progress')$('stencil-progress-text').textContent=d.text;else if(d.type==='done')finished(d.result);else failed(new Error(d.message));};
  worker.onerror=e=>{e.preventDefault();failed(new Error('The geometry worker could not run. Your browser may be blocking local workers. Open the app from a normal website or allow local JavaScript. '+(e.message||'')));};
  worker.postMessage(input);
 }catch(e){
  // Main-thread fallback for older/restricted browsers. Files remain fully local.
  await new Promise(resolve=>setTimeout(resolve,30));if(id!==generation)return;
  try{finished(StencilEngine.generate(input));}catch(error){failed(error);}
 }
}
function drawTop(){if(!result)return;const r=result,W=r.W,H=r.H,id='stencil-cut-mask',path=ring=>'M'+ring.map(p=>p.map(v=>v.toFixed(4)).join(' ')).join('L')+'Z';
 const holes=r.previewRings.map(p=>`<path d="${path(p)}"/>`).join('');
 const markers=settings.showWarnings?r.spacing.marks.map(([a,b])=>`<path d="M${a.join(' ')}L${b.join(' ')}"/><circle cx="${(a[0]+b[0])/2}" cy="${(a[1]+b[1])/2}" r="${Math.max(.45,Math.min(W,H)/130)}"/>`).join(''):'';
 $('stencil-top').innerHTML=`<svg xmlns="http://www.w3.org/2000/svg" width="${W}mm" height="${H}mm" viewBox="0 0 ${W} ${H}" role="img" aria-label="Perforated stencil top view. Dark areas are plastic and light areas are through slots."><defs><mask id="${id}" maskUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="white"/><g fill="black">${holes}</g></mask></defs><rect width="${W}" height="${H}" fill="white"/><path d="${path(r.outerRing||[[0,0],[W,0],[W,H],[0,H]])}" fill="#315e51" mask="url(#${id})"/><g stroke="#be513c" stroke-width="${Math.max(.10,Math.min(W,H)/380)}" fill="none">${markers}</g></svg>`;
}
function updateDownload(){const valid=!!(result?.buffer&&!result.errors.length&&!busy);$('stencil-download').disabled=!valid||(result.warnings.length>0&&!$('stencil-ack').checked);$('stencil-report').disabled=!result||busy;$('stencil-ready').textContent=busy?'Checking geometry...':!valid?'Resolve the geometry errors to enable STL export.':result.warnings.length&&!$('stencil-ack').checked?'Review and acknowledge the thin-plastic warnings before exporting.':`${result.triangles.toLocaleString()} triangles / ${(result.buffer.byteLength/1048576).toFixed(2)} MB / millimeters`;}
function renderResult(){
 if(!result)return;const r=result;drawTop();$('stencil-checks').replaceChildren();
 $('stencil-metrics').innerHTML=`<div class="stencil-metric"><span>SLOT CUTOUTS</span><strong>${r.slotCount.toLocaleString()}</strong></div><div class="stencil-metric"><span>MIN. SLOT WEB</span><strong>${r.spacing.minWeb===null?'Not measured':(r.spacing.minWebExact?'':'&ge; ')+mm(r.spacing.minWeb)+' mm'}</strong></div><div class="stencil-metric"><span>THICKNESS</span><strong>${mm(r.thickness)} mm</strong></div>`;
 for(const text of r.errors)issue(text,'error');for(const text of r.warnings)issue(text,'warning');
 if(r.buffer)issue('One connected plate. Closed mesh, consistent face orientation, and volume checks passed. No floor inside the slots.','ok');
 if(r.spacing.edgeCuts){const p=document.createElement('p');p.className='hint';p.textContent=`${r.spacing.edgeCuts} slot cutout(s) meet the plate boundary. These are intentional seam continuations, not mesh defects.`;$('stencil-checks').append(p);}
 $('stencil-ack-row').hidden=!r.warnings.length||!r.buffer;$('stencil-ack').checked=false;
 if(r.buffer){try{if(!preview)preview=new StencilPreview($('stencil-canvas'));preview.setMesh(r);}catch(e){preview=null;if(view==='3d')issue(e.message,'warning');}}
 if(!r.buffer&&view==='3d')view='top';setView(view);updateDownload();
}
function setView(mode){view=mode;document.querySelectorAll('[data-stencil-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.stencilView===mode)));const is3d=mode==='3d'&&result?.buffer&&preview;$('stencil-top').hidden=!!is3d;$('stencil-canvas').hidden=!is3d;$('stencil-showWarnings').disabled=!!is3d;$('stencil-preview-caption').textContent=is3d?'Actual STL mesh. Drag to rotate; scroll to zoom; double-click to reset.':mode==='3d'&&!preview?'3D preview is unavailable; top view and STL export still work.':'Dark = printed plastic. Openings = no material at any height.';if(is3d)requestAnimationFrame(()=>preview.draw());}
function download(data,name,type){const url=URL.createObjectURL(new Blob([data],{type})),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);}
function report(){if(!result)return null;const {position,buffer,previewRings,outlineRings,...summary}=result;return {app:'Sashiko Pattern Studio',version:'1.3',units:'mm',description:'Flat stencil with through-cut slots, dots, or solid lines and an optional rounded outer rim. No bevel or floor.',createdAt:new Date().toISOString(),settings:inputSnapshot?.settings,...summary};}
function open(){studio.setState({});if(!$('stencil-dialog').open)$('stencil-dialog').showModal();sync();schedule();}
$('export-stencil').addEventListener('click',open);$('stencil-close').addEventListener('click',()=>{cancel();$('stencil-dialog').close();});$('stencil-dialog').addEventListener('cancel',cancel);$('stencil-dialog').addEventListener('close',()=>{cancel();});
$('stencil-scope').addEventListener('change',()=>{settings.scope=$('stencil-scope').value;schedule();});
$('stencil-style').addEventListener('change',()=>{settings.style=$('stencil-style').value;schedule();});
function refreshLayout(){studio.setState({});if(!$('stencil-dialog').open){sync();persist();}}
$('stencil-rimEnabled').addEventListener('change',()=>{settings.rimEnabled=$('stencil-rimEnabled').checked;refreshLayout();});
$('stencil-opening').addEventListener('change',()=>{const n=$('stencil-opening').valueAsNumber;const v=Number.isFinite(n)?Math.max(.2,Math.min(6,n)):1;$('stencil-opening').value=v;studio.setState({opening:v});});
$('stencil-opening').addEventListener('keydown',e=>{if(e.key==='Enter')e.target.blur();});
for(const [k,[lo,hi]]of Object.entries(limits)){
 const el=$('stencil-'+k),range=$('stencil-'+k+'-range'),updated=()=>k==='rimWidth'?refreshLayout():schedule();
 el.addEventListener('input',()=>{
  const n=el.valueAsNumber;if(!Number.isFinite(n)||n<lo||n>hi){cancel();result=null;$('stencil-download').disabled=true;$('stencil-report').disabled=true;$('stencil-ready').textContent=`Enter a value between ${lo} and ${hi} mm.`;return;}
  settings[k]=n;if(range)range.value=n;updated();
 });
 el.addEventListener('change',()=>{settings[k]=Number.isFinite(el.valueAsNumber)?Math.max(lo,Math.min(hi,el.valueAsNumber)):defaults[k];el.value=settings[k];updated();});
 el.addEventListener('keydown',e=>{if(e.key==='Enter')el.blur();});
 if(range)range.addEventListener('input',()=>{settings[k]=Number(range.value);el.value=range.value;updated();});
}
$('stencil-showWarnings').addEventListener('change',()=>{settings.showWarnings=$('stencil-showWarnings').checked;persist();drawTop();});
$('stencil-ack').addEventListener('change',updateDownload);
$('stencil-defaults').addEventListener('click',()=>{settings={...defaults};refreshLayout();});
document.querySelectorAll('[data-stencil-view]').forEach(b=>b.addEventListener('click',()=>setView(b.dataset.stencilView)));
$('stencil-download').addEventListener('click',()=>{if(!result?.buffer||$('stencil-download').disabled)return;download(result.buffer,`sashiko-${inputSnapshot.pattern}-${settings.scope}-${settings.style}-${mm(result.W)}x${mm(result.H)}x${mm(result.thickness)}mm.stl`,'model/stl');$('stencil-ready').textContent='STL saved. Import as millimeters and review the sliced toolpaths.';});
$('stencil-report').addEventListener('click',()=>{if(result)download(JSON.stringify(report(),null,2),'sashiko-stencil-build-report.json','application/json');});
window.addEventListener('sashiko-pattern-change',()=>{if($('stencil-dialog').open)schedule();});
window.addEventListener('resize',()=>{if(preview&&view==='3d')preview.draw();});
if(typeof ResizeObserver!=='undefined')new ResizeObserver(()=>{if(preview&&view==='3d')preview.draw();}).observe($('stencil-viewport'));
window.SashikoStencil=Object.freeze({defaults,validate,makeInput,getSettings:()=>({...settings}),setSettings:raw=>{settings=validate(raw);sync();persist();studio.setState({});if($('stencil-dialog').open)schedule();},open,getResult:()=>result,getReport:report,isBusy:()=>busy});
sync();studio.setState({});
})();
