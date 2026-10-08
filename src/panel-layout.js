/* Pure layout math shared by the SVG canvas and stencil exporter. Units: mm. */
(function(root) {
'use strict';
const EPS=1e-8;
const FRAME=Object.freeze({rimEnabled:true,rimWidth:1,cornerRadius:.6});
function plan(tileW,tileH,s={},frame=FRAME) {
 if(!(Number.isFinite(tileW)&&tileW>0&&Number.isFinite(tileH)&&tileH>0))throw new Error('Invalid tile dimensions.');
 const rim=frame.rimEnabled===false?0:Math.max(0,Number(frame.rimWidth??1));
 const auto=s.panelAuto!==false;
 const up=n=>Math.ceil((n-EPS)*1000)/1000;
 const W=auto?up(tileW*3+2*rim):Number(s.panelWidth),H=auto?up(tileH*3+2*rim):Number(s.panelHeight);
 if(!(Number.isFinite(W)&&Number.isFinite(H)&&W>0&&H>0))throw new Error('Enter a positive export width and height.');
 const columns=Math.max(0,Math.floor((W-2*rim+EPS)/tileW)),rows=Math.max(0,Math.floor((H-2*rim+EPS)/tileH));
 const contentW=columns*tileW,contentH=rows*tileH;
 return {W,H,columns,rows,contentW,contentH,x:(W-contentW)/2,y:(H-contentH)/2,rim,auto,valid:columns>0&&rows>0};
}
function oneRepeat(tileW,tileH,frame=FRAME) {
 const rim=frame.rimEnabled===false?0:Math.max(0,Number(frame.rimWidth??1));
 return {...plan(tileW,tileH,{panelAuto:false,panelWidth:tileW+2*rim,panelHeight:tileH+2*rim},frame),columns:1,rows:1};
}
root.SashikoLayout=Object.freeze({FRAME,plan,oneRepeat});
})(typeof globalThis==='undefined'?window:globalThis);
