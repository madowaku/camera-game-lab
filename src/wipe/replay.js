import { ClipComposer } from "../creator/ClipComposer.js";
import { exportClip,exportCapability } from "../creator/Export.js";
import { downloadVideo } from "../creator/Share.js";
export class WipeComposer extends ClipComposer {
  endCard(c,w,h){c.fillStyle="#fff8e9";c.fillRect(0,0,w,h);c.textAlign="center";c.fillStyle="#356051";c.font=`900 ${w*.22}px Impact,sans-serif`;c.fillText("WIPE!",w/2,h*.44);c.font=`800 ${w*.037}px 'Trebuchet MS',sans-serif`;c.fillText(this.plan.profile.heroLabel,w/2,h*.51);c.fillText("CAMERA GAME #049",w/2,h*.57);if(this.source==="demo"){c.font=`700 ${w*.025}px sans-serif`;c.fillText("CAMERA-FREE PRACTICE",w/2,h*.63);}}
}
export function wipeReplayPlan(result){return {format:"7",duration:7000,heroTimestamp:result.reason==="perfect"?5000:null,profile:{brand:"WIPE!",gameNumber:49,gameplayText:"WIPE THE FOG!",heroLabel:result.reason==="perfect"?"PERFECT WINDOW!":"LOOK AT THAT SHINE!"},segments:[{kind:"PLAY",start:0,from:0,duration:6000},{kind:"END_CARD",start:6000,from:0,duration:1000}]};}
export class WipeReplay {
  constructor(root,result,t){
    this.root=root;this.result=result;this.t=t;this.abort=new AbortController();this.generation=0;this.canvas=root.querySelector(".wipe-replay canvas");this.canvas.width=270;this.canvas.height=480;
    this.plan=wipeReplayPlan(result);this.composer=new WipeComposer(result.creator.frames,this.plan,result.creator);
    root.addEventListener("click",this.click,{signal:this.abort.signal});document.addEventListener("visibilitychange",()=>{if(document.hidden)this.stop();},{signal:this.abort.signal});
    this.update();this.play();
  }
  status(text){if(!this.abort.signal.aborted)this.root.querySelector(".wipe-export-status").textContent=text;}
  update(){for(const action of ["save","share"])this.root.querySelector(`[data-wipe-clip="${action}"]`).disabled=!this.result.creator.file;this.root.querySelector('[data-wipe-clip="encode"]').hidden=!!this.result.creator.file;}
  stop(){++this.generation;if(this.frameId!=null)cancelAnimationFrame(this.frameId);this.frameId=null;}
  play(){this.stop();const token=this.generation;let elapsed=0,last=performance.now();const tick=now=>{if(token!==this.generation)return;elapsed+=Math.min(100,now-last);last=now;void this.composer.paint(this.canvas,elapsed).catch(()=>this.status(this.t.clipFailed));if(elapsed<7000)this.frameId=requestAnimationFrame(tick);};this.frameId=requestAnimationFrame(tick);}
  click=e=>{const action=e.target.closest("[data-wipe-clip]")?.dataset.wipeClip;if(action==="replay")this.play();if(action==="encode")void this.encode();if(action==="save"&&this.result.creator.file)downloadVideo(this.result.creator.file);if(action==="share"&&this.result.creator.file)void this.share();};
  async share(){const file=this.result.creator.file;try{if(navigator.canShare?.({files:[file]})){await navigator.share({files:[file],title:"WIPE! · PERFECT WINDOW"});return;}}catch(e){if(e.name==="AbortError")return;}downloadVideo(file);}
  async encode(){
    if(this.encoding||this.abort.signal.aborted)return;if(!exportCapability().available){this.status(this.t.clipUnsupported);return;}
    this.encoding=true;const button=this.root.querySelector('[data-wipe-clip="encode"]');button.disabled=true;this.status(this.t.generating);
    const composer=new WipeComposer(this.result.creator.frames,this.plan,this.result.creator);
    try{const file=await exportClip(composer,{signal:this.abort.signal,sound:false,onProgress:p=>this.status(`${this.t.generating} ${Math.floor(p*100)}%`)});if(!this.abort.signal.aborted){this.result.creator.file=file;this.status(this.t.clipReady);this.update();}}
    catch(e){if(e.name!=="AbortError")this.status(this.t.clipFailed);}
    finally{composer.dispose();this.encoding=false;if(!this.abort.signal.aborted)button.disabled=false;}
  }
  dispose(){this.abort.abort();this.stop();this.composer.dispose();this.canvas.width=0;}
}
