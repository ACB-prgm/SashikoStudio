/* A small local WebGL preview of the actual exported triangles, not an SVG relief. */
(function(root){
'use strict';
class StencilPreview {
 constructor(canvas){
  this.canvas=canvas;this.gl=canvas.getContext('webgl',{antialias:true,alpha:false});this.yaw=-.32;this.pitch=.48;this.zoom=1;this.count=0;
  if(!this.gl)return new CanvasStencilPreview(canvas);
  const gl=this.gl;
  const shader=(type,src)=>{const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error('The 3D preview shader could not start.');return s;};
  const vs=shader(gl.VERTEX_SHADER,`attribute vec3 position; attribute vec3 normal; uniform vec3 center; uniform vec2 angle; uniform vec3 viewScale; varying float light;
  vec3 rotate(vec3 p){float cy=cos(angle.x),sy=sin(angle.x),cx=cos(angle.y),sx=sin(angle.y); vec3 q=vec3(cy*p.x-sy*p.y,sy*p.x+cy*p.y,p.z); return vec3(q.x,cx*q.y-sx*q.z,sx*q.y+cx*q.z);}
  void main(){vec3 p=rotate(position-center);vec3 n=rotate(normal);light=.48+.52*max(0.,dot(normalize(n),normalize(vec3(-.3,.7,1.))));gl_Position=vec4(p*viewScale,1.);}`);
  const fs=shader(gl.FRAGMENT_SHADER,'precision mediump float; varying float light; void main(){gl_FragColor=vec4(vec3(.27,.43,.36)*light,1.);}');
  this.program=gl.createProgram();gl.attachShader(this.program,vs);gl.attachShader(this.program,fs);gl.linkProgram(this.program);if(!gl.getProgramParameter(this.program,gl.LINK_STATUS))throw new Error('The 3D preview could not start.');
  gl.useProgram(this.program);this.pos=gl.createBuffer();this.normal=gl.createBuffer();
  this.center=gl.getUniformLocation(this.program,'center');this.angle=gl.getUniformLocation(this.program,'angle');this.scale=gl.getUniformLocation(this.program,'viewScale');
  this.positionAttr=gl.getAttribLocation(this.program,'position');this.normalAttr=gl.getAttribLocation(this.program,'normal');
  gl.enable(gl.DEPTH_TEST);gl.enable(gl.CULL_FACE);gl.cullFace(gl.BACK);gl.clearColor(.94,.94,.91,1);
  let drag=null;
  canvas.addEventListener('pointerdown',e=>{drag=[e.clientX,e.clientY];canvas.setPointerCapture(e.pointerId);});
  canvas.addEventListener('pointermove',e=>{if(!drag)return;this.yaw+=(e.clientX-drag[0])*.008;this.pitch=this.pitch+(e.clientY-drag[1])*.008;drag=[e.clientX,e.clientY];this.draw();});
  const stop=()=>{drag=null;};canvas.addEventListener('pointerup',stop);canvas.addEventListener('pointercancel',stop);
  canvas.addEventListener('wheel',e=>{e.preventDefault();this.zoom=Math.max(.5,Math.min(5,this.zoom*Math.exp(-e.deltaY*.001)));this.draw();},{passive:false});
  canvas.addEventListener('dblclick',()=>this.reset());
  canvas.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','+','-'].includes(e.key)){e.preventDefault();if(e.key==='Home')return this.reset();if(e.key==='ArrowLeft')this.yaw-=.1;if(e.key==='ArrowRight')this.yaw+=.1;if(e.key==='ArrowUp')this.pitch-=.1;if(e.key==='ArrowDown')this.pitch+=.1;if(e.key==='+')this.zoom=Math.min(5,this.zoom*1.1);if(e.key==='-')this.zoom=Math.max(.5,this.zoom/1.1);this.draw();}});
 }
 setMesh(result){
  const gl=this.gl,p=result.position,n=new Float32Array(p.length);this.dims=[result.W,result.H,result.thickness];this.count=p.length/3;
  for(let i=0;i<p.length;i+=9){const ux=p[i+3]-p[i],uy=p[i+4]-p[i+1],uz=p[i+5]-p[i+2],vx=p[i+6]-p[i],vy=p[i+7]-p[i+1],vz=p[i+8]-p[i+2],v=[uy*vz-uz*vy,uz*vx-ux*vz,ux*vy-uy*vx],l=Math.hypot(...v);for(let j=0;j<3;j++)for(let k=0;k<3;k++)n[i+j*3+k]=v[k]/l;}
  gl.bindBuffer(gl.ARRAY_BUFFER,this.pos);gl.bufferData(gl.ARRAY_BUFFER,p,gl.STATIC_DRAW);gl.bindBuffer(gl.ARRAY_BUFFER,this.normal);gl.bufferData(gl.ARRAY_BUFFER,n,gl.STATIC_DRAW);this.draw();
 }
 reset(){this.yaw=-.32;this.pitch=.48;this.zoom=1;this.draw();}
 draw(){
  if(!this.count)return;const gl=this.gl,c=this.canvas,dpr=Math.min(2,window.devicePixelRatio||1),w=Math.max(1,Math.round(c.clientWidth*dpr)),h=Math.max(1,Math.round(c.clientHeight*dpr));if(c.width!==w||c.height!==h){c.width=w;c.height=h;}gl.viewport(0,0,w,h);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.useProgram(this.program);
  const [W,H,T]=this.dims,cy=Math.cos(this.yaw),sy=Math.sin(this.yaw),cx=Math.cos(this.pitch),sx=Math.sin(this.pitch),corners=[];for(const x of [-W/2,W/2])for(const y of [-H/2,H/2])for(const z of [-T/2,T/2])corners.push([cy*x-sy*y,cx*(sy*x+cy*y)-sx*z]);const spanX=Math.max(...corners.map(p=>p[0]))-Math.min(...corners.map(p=>p[0])),spanY=Math.max(...corners.map(p=>p[1]))-Math.min(...corners.map(p=>p[1])),fit=Math.min(w/spanX,h/spanY)*.82*this.zoom;
  gl.uniform3f(this.center,W/2,H/2,T/2);gl.uniform2f(this.angle,this.yaw,this.pitch);gl.uniform3f(this.scale,2*fit/w,2*fit/h,-1/(Math.max(W,H,T)*4));
  gl.bindBuffer(gl.ARRAY_BUFFER,this.pos);gl.enableVertexAttribArray(this.positionAttr);gl.vertexAttribPointer(this.positionAttr,3,gl.FLOAT,false,0,0);gl.bindBuffer(gl.ARRAY_BUFFER,this.normal);gl.enableVertexAttribArray(this.normalAttr);gl.vertexAttribPointer(this.normalAttr,3,gl.FLOAT,false,0,0);gl.drawArrays(gl.TRIANGLES,0,this.count);
 }
}

/** Software fallback: the same actual triangles, flat-shaded and depth-sorted.
 * Used when WebGL is unavailable; it does not substitute a faux SVG relief. */
class CanvasStencilPreview {
 constructor(canvas){
  this.canvas=canvas;this.ctx=canvas.getContext('2d');if(!this.ctx)throw new Error('3D preview is unavailable. Top view and STL export still work.');
  this.yaw=-.32;this.pitch=.48;this.zoom=1;this.mesh=null;this.pending=false;let drag=null;
  canvas.addEventListener('pointerdown',e=>{drag=[e.clientX,e.clientY];canvas.setPointerCapture(e.pointerId);});
  canvas.addEventListener('pointermove',e=>{if(!drag)return;this.yaw+=(e.clientX-drag[0])*.008;this.pitch=this.pitch+(e.clientY-drag[1])*.008;drag=[e.clientX,e.clientY];this.draw();});
  canvas.addEventListener('pointerup',()=>drag=null);canvas.addEventListener('pointercancel',()=>drag=null);
  canvas.addEventListener('wheel',e=>{e.preventDefault();this.zoom=Math.max(.5,Math.min(5,this.zoom*Math.exp(-e.deltaY*.001)));this.draw();},{passive:false});
  canvas.addEventListener('dblclick',()=>this.reset());
  canvas.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','+','-'].includes(e.key)){e.preventDefault();if(e.key==='Home')return this.reset();if(e.key==='ArrowLeft')this.yaw-=.1;if(e.key==='ArrowRight')this.yaw+=.1;if(e.key==='ArrowUp')this.pitch-=.1;if(e.key==='ArrowDown')this.pitch+=.1;if(e.key==='+')this.zoom=Math.min(5,this.zoom*1.1);if(e.key==='-')this.zoom=Math.max(.5,this.zoom/1.1);this.draw();}});
 }
 reset(){this.yaw=-.32;this.pitch=.48;this.zoom=1;this.draw();}
 setMesh(r){this.mesh=r;this.draw();}
 draw(){if(this.pending)return;this.pending=true;requestAnimationFrame(()=>{this.pending=false;this.paint();});}
 paint(){
  if(!this.mesh||this.canvas.hidden)return;
  const c=this.canvas,ctx=this.ctx,dpr=Math.min(2,window.devicePixelRatio||1),w=Math.round(c.clientWidth*dpr),h=Math.round(c.clientHeight*dpr);if(!w||!h)return;
  if(c.width!==w)c.width=w;if(c.height!==h)c.height=h;
  ctx.fillStyle='#efefe8';ctx.fillRect(0,0,w,h);
  const {W,H,thickness:T,position:p}=this.mesh,cy=Math.cos(this.yaw),sy=Math.sin(this.yaw),cx=Math.cos(this.pitch),sx=Math.sin(this.pitch);
  const rot=(x,y,z)=>{const a=cy*x-sy*y,b=sy*x+cy*y;return [a,cx*b-sx*z,sx*b+cx*z];};
  const corners=[];for(const x of [-W/2,W/2])for(const y of [-H/2,H/2])for(const z of [-T/2,T/2])corners.push(rot(x,y,z));const spanX=Math.max(...corners.map(p=>p[0]))-Math.min(...corners.map(p=>p[0])),spanY=Math.max(...corners.map(p=>p[1]))-Math.min(...corners.map(p=>p[1])),scale=Math.min(w/spanX,h/spanY)*.82*this.zoom;
  const faces=[];
  for(let i=0;i<p.length;i+=9){
   if(p[i+2]===p[i+5]&&p[i+2]===p[i+8])continue;
   const ps=[];for(let k=0;k<3;k++)ps.push(rot(p[i+k*3]-W/2,p[i+k*3+1]-H/2,p[i+k*3+2]-T/2));
   const [a,b,c]=ps,u=b.map((v,k)=>v-a[k]),v=c.map((v,k)=>v-a[k]),n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]],len=Math.hypot(...n);
   if(n[2]<=1e-12||len<1e-12)continue;
   const light=.48+.52*Math.max(0,(-.3*n[0]+.7*n[1]+n[2])/(len*Math.sqrt(1.58)));
   faces.push({ps,flat:p[i+2]===p[i+5]&&p[i+2]===p[i+8],z:(a[2]+b[2]+c[2])/3,color:`rgb(${Math.round(69*light)} ${Math.round(110*light)} ${Math.round(92*light)})`});
  }
  faces.sort((a,b)=>a.z-b.z);
  ctx.lineWidth=.45*dpr;ctx.lineJoin='round';
  const append=f=>{for(let i=0;i<3;i++){const p=f.ps[i],x=w/2+p[0]*scale,y=h/2-p[1]*scale;if(i)ctx.lineTo(x,y);else ctx.moveTo(x,y);}ctx.closePath();};
  for(const f of faces)if(!f.flat){ctx.beginPath();append(f);ctx.fillStyle=f.color;ctx.strokeStyle=f.color;ctx.fill();ctx.stroke();}
  // Draw the verified mesh's boundary loops, rather than thousands of
  // coplanar triangles. This avoids both raster hairlines and giant fill paths.
  const up=rot(0,0,1),top=up[2]>=0,n=top?up:up.map(v=>-v),light=.48+.52*Math.max(0,(-.3*n[0]+.7*n[1]+n[2])/Math.sqrt(1.58));
  ctx.beginPath();for(const ring of this.mesh.outlineRings||[]){for(let i=0;i<ring.length;i++){const p=rot(ring[i][0]-W/2,H/2-ring[i][1],top?T/2:-T/2),x=w/2+p[0]*scale,y=h/2-p[1]*scale;if(i)ctx.lineTo(x,y);else ctx.moveTo(x,y);}ctx.closePath();}
  ctx.fillStyle=`rgb(${Math.round(69*light)} ${Math.round(110*light)} ${Math.round(92*light)})`;ctx.fill('evenodd');
 }
}
root.StencilPreview=StencilPreview;
})(window);
