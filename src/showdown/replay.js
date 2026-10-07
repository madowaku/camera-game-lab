import townUrl from './assets/town-v1.webp';
import { exportClip, exportCapability } from '../creator/Export.js';
export function cameraRect(video,w,h){const scale=Math.max(w/(video.videoWidth||w),h/(video.videoHeight||h));return{x:(w-video.videoWidth*scale)/2,y:(h-video.videoHeight*scale)/2,w:video.videoWidth*scale,h:video.videoHeight*scale};}
export function faceRect(video,box,w,h){if(!box)return null;const r=cameraRect(video,w,h);return{x:w-r.x-(box.x+box.w)*r.w-box.w*r.w*.25,y:r.y+box.y*r.h-box.h*r.h*.25,w:box.w*r.w*1.5,h:box.h*r.h*1.5};}
export class ShowdownReplay {
  constructor(){this.frames=[];this.last=-Infinity;this.moments=[];this.town=new Image();this.town.src=townUrl;}
  event(e){const weight=e.type==='HIT'?(e.kind==='boss'?10:e.kind==='gold'?8:e.label==='LIGHTNING'?4:2):e.type==='HIGH NOON'?6:0;if(weight)this.moments.push({time:e.time,weight});}
  capture(v){const time=v.game.clock;if(time-this.last<.125||v.game.paused||this.frames.length>=242)return;this.last=time;
    const canvas=document.createElement('canvas');canvas.width=135;canvas.height=240;const c=canvas.getContext('2d');c.fillStyle='#65c5ca';c.fillRect(0,0,135,240);if(this.town.complete&&this.town.naturalWidth)c.drawImage(this.town,0,0,135,240);
    if(v.source==='camera'&&v.video.readyState>=2&&v.options.faceMode!=='HIDE'&&(v.options.faceMode!=='EFFECT'||v.input.faceBox)){
      const r=cameraRect(v.video,135,240);c.save();c.translate(135,0);c.scale(-1,1);c.globalAlpha=.65;c.drawImage(v.video,r.x,r.y,r.w,r.h);c.restore();
      if(v.options.faceMode==='EFFECT'){const f=faceRect(v.video,v.input.faceBox,135,240);c.fillStyle='#f2c77b';c.fillRect(f.x,f.y,f.w,f.h);c.font=`${f.w*.6}px sans-serif`;c.fillText('🤠',f.x,f.y+f.h*.8);}
    }
    const art=v.runtime?.canvas;if(art?.width)c.drawImage(art,0,0,135,240);
    c.fillStyle='#332a2ccc';c.fillRect(0,0,135,25);c.fillStyle='#ffe4aa';c.font='bold 10px sans-serif';c.fillText(`${v.game.score} PT  ×${v.game.combo}`,6,16);
    c.font='bold 9px sans-serif';c.fillText(v.feedbackUntil>time?v.feedback:'SHOWDOWN',6,204);this.frames.push({canvas,time});
  }
  snapshot(){let from=23,best=-1;for(let start=0;start<=23;start+=.5){const score=this.moments.filter(e=>e.time>=start&&e.time<=start+7).reduce((sum,e)=>sum+e.weight,0);if(score>=best){from=start;best=score;}}const frames=this.frames.filter(f=>f.time>=from&&f.time<=from+7);this.frames.filter(f=>!frames.includes(f)).forEach(f=>f.canvas.width=0);this.frames=[];return{frames,from,duration:7000};}
  dispose(){this.frames.forEach(f=>f.canvas.width=0);this.frames=[];}
}
export function mountReplay(root,result){const replay=result.creator,canvas=root.querySelector('.sd-replay canvas');if(!replay||!canvas)return;const abort=new AbortController(),status=root.querySelector('.sd-export-status');let raf=null;
  const draw=(target,elapsed)=>{const f=replay.frames.findLast(f=>f.time<=replay.from+elapsed/1000)??replay.frames[0],c=target.getContext('2d');c.fillStyle='#332a2c';c.fillRect(0,0,target.width,target.height);if(f?.canvas.width)c.drawImage(f.canvas,0,0,target.width,target.height);};
  const stop=()=>{if(raf!==null)cancelAnimationFrame(raf);raf=null;};
  const play=()=>{stop();const started=performance.now();const tick=now=>{draw(canvas,Math.min(7000,now-started));if(now-started<7000)raf=requestAnimationFrame(tick);};raf=requestAnimationFrame(tick);};
  root.querySelector('.sd-replay-play').addEventListener('click',play,{signal:abort.signal});const save=root.querySelector('.sd-save');save.disabled=!exportCapability().available;
  save.addEventListener('click',async()=>{stop();save.disabled=true;try{const file=await exportClip({plan:{duration:7000,heroTimestamp:null,profile:{gameNumber:58},format:7},paint:draw},{signal:abort.signal,sound:false});if(abort.signal.aborted)return;const url=URL.createObjectURL(file),a=document.createElement('a');a.href=url;a.download=file.name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);status.textContent='SAVED · SILENT VIDEO';}catch(e){if(e.name!=='AbortError')status.textContent='VIDEO SAVE UNAVAILABLE';}finally{if(!abort.signal.aborted)save.disabled=false;}},{signal:abort.signal});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();},{signal:abort.signal});draw(canvas,0);return()=>{stop();abort.abort();canvas.width=0;};
}
