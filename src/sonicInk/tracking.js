import { clamp, W, H } from './core.js';
export const TRACKING={enter:.30,leave:.44,frames:3,bridgeMs:250,endMs:500};
const valid=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y)&&p.x>=0&&p.x<=1&&p.y>=0&&p.y<=1;
export class InkTracker {
  constructor(){this.reset();}
  reset(){this.active=false;this.candidate=null;this.frames=0;this.lastPresent=null;this.history=[];this.position=null;this.baseline=null;this.needsOpen=false;this.seen=false;this.presentSince=null;}
  rearm(){this.active=false;this.needsOpen=true;this.history=[];this.position=null;this.frames=0;this.candidate=null;}
  missing(at){
    this.presentSince=null;
    const lost=this.lastPresent===null?Infinity:at-this.lastPresent;
    const end=this.active&&lost>=TRACKING.endMs;
    if(this.seen&&lost>=TRACKING.endMs)this.rearm();
    return {present:false,drawing:this.active,holding:lost<TRACKING.endMs,lostFor:lost,end};
  }
  update(result,at,vw,vh){
    const ps=result?.landmarks?.[0],aspect=vw/vh;
    if(!ps||![0,4,8,9].every(i=>valid(ps[i]))||!Number.isFinite(aspect)||aspect<=0)return this.missing(at);
    const measure=(a,b)=>Math.hypot((a.x-b.x)*aspect,a.y-b.y);
    const palm=measure(ps[0],ps[9]);if(palm<.025)return this.missing(at);
    const ratio=measure(ps[4],ps[8])/palm;
    const scale=Math.max(W/vw,H/vh),tip={x:((1-ps[8].x)*vw*scale-(vw*scale-W)/2)/W,y:(ps[8].y*vh*scale-(vh*scale-H)/2)/H};
    if(!valid(tip))return this.missing(at);
    const gap=this.lastPresent===null?0:at-this.lastPresent;
    let end=false;
    if(this.seen&&gap>=TRACKING.bridgeMs){end=this.active;this.rearm();}
    this.lastPresent=at;this.seen=true;this.presentSince??=at;this.baseline??=palm;
    const p={...tip,z:clamp(Math.log(palm/this.baseline)*.8,-.5,.5)};
    this.history.push(p);if(this.history.length>4)this.history.shift();
    const smooth=Object.fromEntries(['x','y','z'].map(k=>[k,this.history.reduce((sum,v)=>sum+v[k],0)/this.history.length]));
    this.position=smooth;
    const candidate=ratio<=TRACKING.enter?true:ratio>=TRACKING.leave?false:null;
    if(candidate===null){this.frames=0;this.candidate=null;}else{this.frames=candidate===this.candidate?this.frames+1:1;this.candidate=candidate;if(this.frames>=TRACKING.frames){if(!candidate){end||=this.active;this.active=false;this.needsOpen=false;}else if(!this.needsOpen)this.active=true;}}
    return {present:true,position:smooth,drawing:this.active,end,open:ratio>=TRACKING.leave,stable:at-this.presentSince>=200};
  }
}
