import { cameraPoint, drawCamera } from "./CameraLayout.js";
export const FACE_MODES=Object.freeze(["ORIGINAL","EFFECT","HIDE"]);
export function normalizeFaceMode(mode) { return FACE_MODES.includes(mode)?mode:"ORIGINAL"; }
const oval=(c,x,y,rx,ry)=>{c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fill();};
export function drawFaceMode(c,video,mode,face,{width:w,height:h,open=false,crown=false,effect}={}) {
  const project=p=>cameraPoint(p,video.videoWidth,video.videoHeight,w,h);
  // HIDE never shows a raw fallback when tracking is absent, stale or ambiguous.
  if(mode!=="HIDE"||face)drawCamera(c,video,w,h);
  if(!face)return;
  const a=project({x:face.left,y:face.top}),b=project({x:face.right,y:face.bottom});
  if(!a||!b)return;
  const x=(a.x+b.x)*w/2,y=(a.y+b.y)*h/2,fw=Math.max(Math.abs(a.x-b.x)*w,w*.17),fh=Math.max(Math.abs(a.y-b.y)*h,h*.14);
  if(mode==="HIDE") {
    c.fillStyle="#fff7eb";oval(c,x,y-fh*.12,fw*.85,fh*.9);
    c.strokeStyle="#f57682";c.lineWidth=3;c.beginPath();c.arc(x,y,fw*.23,0,Math.PI);c.stroke();
    c.fillStyle="#a9404d";oval(c,x-fw*.24,y-fh*.17,fw*.045,fw*.045);oval(c,x+fw*.24,y-fh*.17,fw*.045,fw*.045);
  } else if(mode==="EFFECT") {
    const l=project(face.eyeLeft),r=project(face.eyeRight),mouth=project(face.mouth);
    effect?.(c,{x,y,width:fw,height:fh,eyeY:l&&r?(l.y+r.y)*h/2:y-fh*.15,mouth:mouth?{x:mouth.x*w,y:mouth.y*h}:{x,y},open,crown});
  }
}
