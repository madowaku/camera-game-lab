import { cameraPoint } from "../creator/CameraLayout.js";
import { W,H,clamp } from "./core.js";
export function palmFromLandmarks(landmarks, videoWidth, videoHeight) {
  const points = [0,5,9,13,17].map(i=>landmarks?.[i]);
  if(points.some(p=>!p||![p.x,p.y].every(Number.isFinite)))return null;
  const raw={x:points.reduce((a,p)=>a+p.x,0)/5,y:points.reduce((a,p)=>a+p.y,0)/5};
  const p=cameraPoint(raw,videoWidth,videoHeight,W,H),a=cameraPoint(points[1],videoWidth,videoHeight,W,H),b=cameraPoint(points[4],videoWidth,videoHeight,W,H);
  if(!p||p.x<-.06||p.x>1.06||p.y<-.06||p.y>1.06)return null;
  return {...p,radius:Math.hypot(a.x-b.x,(a.y-b.y)*H/W)*1.8,present:true};
}
export class WipeTracker {
  constructor(){this.reset();}
  reset(){this.points=[];this.at=-Infinity;this.serial=0;this.fps=0;}
  update(result, at, videoWidth, videoHeight) {
    const delta=at-this.at,old=[...this.points];
    this.fps=delta>0&&delta<1000?this.fps*.8+1000/delta*.2:this.fps;
    this.points=(result?.landmarks??[]).map(l=>palmFromLandmarks(l,videoWidth,videoHeight)).filter(Boolean).map(p=>{
      const nearest=old.reduce((best,candidate)=>!best||Math.hypot(candidate.x-p.x,candidate.y-p.y)<Math.hypot(best.x-p.x,best.y-p.y)?candidate:best,null);
      const continuous=delta<180&&nearest&&Math.hypot(nearest.x-p.x,nearest.y-p.y)<.24;
      if(continuous)old.splice(old.indexOf(nearest),1);
      const alpha=clamp(1-Math.exp(-Math.max(16,delta)/42),.3,1);
      return {...p,id:continuous?nearest.id:++this.serial,x:continuous?nearest.x+(p.x-nearest.x)*alpha:p.x,y:continuous?nearest.y+(p.y-nearest.y)*alpha:p.y,continuous:!!continuous};
    }); this.at=at;
  }
  sample(now){return now-this.at<=180?this.points:[];}
}
