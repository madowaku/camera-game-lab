import { CREATOR_SIZE } from "./CameraLayout.js";
import { drawFaceMode, normalizeFaceMode } from "./FaceMode.js";
import { HighlightEvents } from "./HighlightEvent.js";
import { DirectorEventBus } from "./DirectorEventBus.js";
import { DirectorRecorder } from "./DirectorRecorder.js";
import { AutoDirector } from "./AutoDirector.js";
import { creatorMetric } from "./metrics.js";
const clamp=n=>Math.max(0,Math.min(1,n));
const oval=(c,x,y,rx,ry)=>{c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fill();};
export class CreatorMode {
  constructor(canvas,{profile,faceMode="ORIGINAL",reducedMotion=false,avatar=null}={}) {
    this.canvas=canvas;this.profile=profile;this.faceMode=normalizeFaceMode(faceMode);this.reducedMotion=reducedMotion;
    this.faceModes=new Set([this.faceMode]);
    this.avatar=avatar;
    canvas.width=CREATOR_SIZE.width;canvas.height=CREATOR_SIZE.height;
    this.camera=document.createElement("canvas");this.camera.width=270;this.camera.height=480;
    this.highlights=new HighlightEvents(profile);this.frames=[];this.live=[];this.bytes=0;this.lastCapture=-Infinity;this.generation=0;this.recording=true;
    if(profile.director) {
      this.director = new AutoDirector(profile.director);
      this.events = new DirectorEventBus(profile.director);
      this.recorder = new DirectorRecorder(profile.director);
      this.events.subscribe(event => this.recorder.mark(event, profile.director));
      canvas.width=540;canvas.height=960;this.camera.width=540;this.camera.height=960;
      creatorMetric("creator_mode_started");creatorMetric("face_mode_selected",{faceMode:this.faceMode});
    }
  }
  event(payload) {
    const event=this.events?.emit(payload);
    if(event?.type==="HERO"){this.markHero(event.timestamp);creatorMetric("hero_detected");}
    return event;
  }
  markHero(timestamp) { this.heroTimestamp=timestamp; }
  setFaceMode(mode) { this.faceMode=normalizeFaceMode(mode);this.faceModes.add(this.faceMode);creatorMetric("face_mode_selected",{faceMode:this.faceMode}); }
  highlight(type,time=this.time??0,data={}) {
    if(typeof time==="object"){data=time;time=this.time??0;}
    const event=this.highlights.highlight(type,time,data);
    if(!event&&data.final){const previous=this.highlights.events.findLast(e=>e.type===type);if(previous){previous.data={...previous.data,...data};previous.finalAt=time;previous.duration=Math.max(previous.duration,time-previous.at+this.profile[type].duration);}}
    return event;
  }
  compose(video,food,{time=0,face=null,open=false,biteAge=Infinity,source="camera",avatarCanvas=this.avatar?.()}={}) {
    this.time=time;
    const c=this.canvas.getContext("2d"),camera=this.camera.getContext("2d"),w=270,h=480,event=this.highlights.latest(time);
    if(this.director){
      c.setTransform(this.canvas.width/w,0,0,this.canvas.height/h,0,0);
      camera.setTransform(this.camera.width/w,0,0,this.camera.height/h,0,0);
      camera.fillStyle="#fff7eb";camera.fillRect(0,0,w,h);
      if(source==="camera"||this.faceMode==="AVATAR")drawFaceMode(camera,video,this.faceMode,face,{width:w,height:h,open,crown:biteAge<700,effect:this.profile.faceEffect,avatarCanvas});
      c.fillStyle="#fff7eb";c.fillRect(0,0,w,h);
      if(source==="camera"||this.faceMode==="AVATAR")c.drawImage(this.camera,0,0,w,h);
      c.drawImage(food,0,0,w,h);
      c.textAlign="center";c.font="800 9px sans-serif";c.fillStyle="#fff7eb";c.strokeStyle="#583a2d";c.lineWidth=2;
      const brand=`◉ CAMERA GAME #${String(this.profile.director.gameNumber).padStart(3,"0")}`;
      c.strokeText(brand,w/2,h*.085);c.fillText(brand,w/2,h*.085);
      if(this.heroTimestamp===undefined&&this.hud){c.font="800 12px sans-serif";const label=`${this.hud.swirls} SWIRLS`;c.strokeText(label,w/2,h*.9);c.fillText(label,w/2,h*.9);}
      this.recorder.capture(this.canvas,time);return;
    }
    if(video.srcObject||this.faceMode==="AVATAR"){camera.fillStyle="#fff7eb";camera.fillRect(0,0,w,h);drawFaceMode(camera,video,this.faceMode,face,{width:w,height:h,open,crown:biteAge<700,effect:this.profile.faceEffect,avatarCanvas});}
    c.fillStyle="#fff7eb";c.fillRect(0,0,w,h);
    if(source==="camera"||this.faceMode==="AVATAR")c.drawImage(this.camera,0,0);
    c.drawImage(food,0,0,w,h);
    const capture=time-this.lastCapture>=125;
    if(capture){
      this.lastCapture=time;
      const frame=document.createElement("canvas");frame.width=w;frame.height=h;frame.getContext("2d").drawImage(this.canvas,0,0);
      this.live.push({at:time,canvas:frame});if(this.live.length>10)this.live.shift();
    }
    if(event&&!this.reducedMotion&&this.live.length){
      const age=time-event.at,finalAge=time-(event.finalAt??event.at),kind=event.kind??event.type;
      const target=event.freeze&&age<event.freeze?event.at:event.slow&&age<450&&!event.data.final?event.at+age*.5:time;
      const frame=this.live.findLast(f=>f.at<=target)??this.live[0];
      const zoom=kind==="fail"?1.045:1;
      c.save();c.translate(w/2,h/2);c.scale(zoom,zoom);c.drawImage(frame.canvas,-w/2,-h/2);c.restore();
      if(kind==="fail"&&event.splashColor&&age>250){c.fillStyle=event.splashColor;for(let i=0;i<6;i++){const r=clamp((age-250)/500)*w*.24;oval(c,(i%3)*w*.42,h*(.2+Math.floor(i/3)*.62),r*1.2,r);}}
      if(kind==="finish"&&event.data.final&&event.splashColor){c.fillStyle=event.splashColor;const r=clamp(finalAge/300)*h;c.beginPath();c.arc(w/2,h*.45,r,0,Math.PI*2);c.fill();}
    } else if((event?.kind??event?.type)==="finish"&&event.data.final&&event.splashColor){c.fillStyle=event.splashColor;c.fillRect(0,0,w,h);}
    if(event)this.drawHighlight(c,event,time);
    if(capture&&this.recording&&!this.pending){
      this.pending=true;const token=this.generation;
      this.canvas.toBlob(blob=>{
        this.pending=false;if(!blob||token!==this.generation||!this.recording)return;
        this.frames.push({at:time,blob});this.bytes+=blob.size;
        while(this.frames.length>340||this.bytes>8*1024*1024)this.bytes-=this.frames.shift().blob.size;
      },"image/webp",.66);
    }
  }
  drawHighlight(c,event,time) {
    const w=270,h=480,age=time-event.at,kind=event.kind??event.type,finish=kind==="finish"&&event.data.final;
    c.textAlign="center";c.shadowColor="#583a2d";c.shadowBlur=kind==="finish"&&!finish?4:0;
    c.fillStyle=finish?"#a9404d":"#fff7eb";c.font="900 "+(finish?31:23)+"px sans-serif";
    c.strokeStyle="#583a2d";c.lineWidth=4;
    const label=kind==="finish"&&!finish?(event.anticipationLabel??event.label):event.label,y=finish?h*.38:h*.22;
    if(!finish)c.strokeText(label,w/2,y);c.fillText(label,w/2,y);c.shadowBlur=0;
    if(finish)this.profile.drawFinishStats?.(c,event.data,{width:w,height:h});
    if(kind==="perfect"&&event.data.point&&!this.reducedMotion){c.save();c.strokeStyle="#fffef5";c.lineWidth=2;for(let i=0;i<3;i++){const x=event.data.point.x*w+(i-1)*20,y=event.data.point.y*h-i*9,size=3+Math.sin(age/120+i)*2;c.beginPath();c.moveTo(x-size,y);c.lineTo(x+size,y);c.moveTo(x,y-size);c.lineTo(x,y+size);c.stroke();}c.restore();}
    if(!this.reducedMotion){for(let i=0;i<14;i++){const a=i*2.4,r=35+(age%900)/900*60;c.fillStyle=["#f57682","#a9be88","#f6c561","#fff7eb"][i%4];c.save();c.translate(w*.5+Math.cos(a)*r,y+Math.sin(a)*r);c.rotate(a+age/700);c.fillRect(-2,-3,4,6);c.restore();}}
  }
  snapshot() { this.recording=false;return {frames:[...this.frames],events:this.highlights.events.map(e=>({...e,data:{...e.data}})),brand:this.profile.brand,faceMode:this.faceMode,faceModes:[...this.faceModes]}; }
  async finish({source="camera",sound=true}={}) {
    if(!this.director)return this.snapshot();
    const frames=await this.recorder.finish(),events=this.events.events.map(e=>({...e,metadata:{...e.metadata}}));
    const plans={15:this.director.plan(frames,events,"15"),7:this.director.plan(frames,events,"7")};
    creatorMetric("creator_mode_completed",{source,faceMode:this.faceMode});
    return {frames,events,plans,brand:this.profile.brand,faceMode:this.faceMode,faceModes:[...this.faceModes],source,sound,reducedMotion:this.reducedMotion,files:{}};
  }
  dispose() { ++this.generation;this.recording=false;this.recorder?.dispose();this.events?.dispose();this.frames=[];this.live=[];this.bytes=0;this.camera.width=0;this.canvas.width=0; }
}
