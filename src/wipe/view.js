import { WipeGame,W,H,clamp } from "./core.js";
import { WipeInput } from "../input/wipeInput.js";
import { WipeRenderer } from "./renderer.js";
import { WipeAudio } from "./audio.js";
import { copy } from "./messages.js";
import { CreatorMode } from "../creator/CreatorMode.js";
import { wipeCreatorProfile,selectWipeReplay } from "./creatorProfile.js";
import "./wipe.css";
export const createView=(root,locale,options)=>new WipeView(root,locale,options);
export class WipeView {
  constructor(root,locale="ja",{onExit}={}){
    this.root=root;this.locale=locale;this.onExit=onExit;this.listeners=new Set();this.options={};this.generation=0;this.active=false;this.phase="idle";this.source="camera";this.pointers=new Map();this.pointerSerial=0;
    this.game=new WipeGame();this.audio=new WipeAudio();
    try{this.audio.enabled=localStorage.getItem("camera-game-lab-wipe-sfx")!=="off";}catch{}
    root.innerHTML=`<section class="wipe-play"><div class="wipe-toolbar"><span class="wipe-source"></span><div><button type="button" class="wipe-sound"></button><button type="button" class="wipe-pause"></button></div></div>
      <div class="wipe-stage" tabindex="0" role="group"><video muted playsinline hidden aria-hidden="true"></video><canvas class="wipe-canvas" width="540" height="960" role="img"></canvas><canvas class="wipe-capture" hidden aria-hidden="true"></canvas>
      <div class="wipe-hud"><div class="wipe-clean" data-side="0"><small class="wipe-player">P1</small><strong>0<small>%</small></strong><span>CLEAN</span></div><div class="wipe-clean" data-side="1"><small class="wipe-player">P2</small><strong>0<small>%</small></strong><span>CLEAN</span></div></div>
      <div class="wipe-overlay" hidden><div><h2></h2><p role="status" aria-live="polite"></p><button type="button" class="wipe-resume wipe-primary" hidden></button><button type="button" class="wipe-camera-retry wipe-secondary" hidden></button><button type="button" class="wipe-practice wipe-secondary" hidden></button><button type="button" class="wipe-exit wipe-text" hidden></button></div></div>
      <div class="wipe-cue" role="status" aria-live="polite"></div><div class="wipe-time"><span>30</span><small>SEC</small><progress max="30000" value="30000"></progress></div></div><p class="wipe-hint"></p></section>`;
    this.$=s=>root.querySelector(s);this.canvas=this.$(".wipe-canvas");this.video=this.$("video");this.capture=this.$(".wipe-capture");this.renderer=new WipeRenderer(this.canvas);
    this.input=new WipeInput(this.video,{onStatus:(status,error)=>{if(!this.active||this.source!=="camera")return;this.status=status;if(status==="ERROR")this.fail(error);else this.render();}});
    this.render();
  }
  configure(options={}){this.options={...options,faceMode:options.faceMode??"ORIGINAL"};}
  subscribe(fn){this.listeners.add(fn);return()=>this.listeners.delete(fn);}
  notify(){const snapshot=this.snapshot();this.listeners.forEach(fn=>fn(snapshot));}
  snapshot(){
    const r=this.game.result;
    return {phase:this.phase,source:this.source,paused:this.game.paused,elapsed:this.game.elapsed,result:this.phase==="result"?{...r,creator:this.creatorResult,
      summaryJa:`${r.mode==="duo"?`P1 ${r.clean[0]}% / P2 ${r.clean[1]}%`:`${r.clean[0]}% CLEAN`} · ${r.elapsed.toFixed(1)}秒`,
      summaryEn:`${r.mode==="duo"?`P1 ${r.clean[0]}% / P2 ${r.clean[1]}%`:`${r.clean[0]}% CLEAN`} · ${r.elapsed.toFixed(1)} sec`}:null};
  }
  setLocale(locale){this.locale=locale;this.render();}
  activate(mode="solo"){this.mode=this.options.mode??mode;this.active=true;this.phase="idle";this.render();}
  setup(source){
    this.releaseInputs();this.active=true;this.source=source;this.phase="loading";this.error=null;this.status="LOADING_MODEL";this.creatorResult=null;
    this.game=new WipeGame({mode:this.mode,source,seed:49+Math.floor(Math.random()*100000)});this.renderer.reset();this.userPaused=false;this.backgroundPaused=false;this.uiKey=null;this.cueUntil=0;this.creatorStartFrame=null;
    this.reducedMotion=matchMedia("(prefers-reduced-motion: reduce)").matches;
    if(this.options.creator){this.creator=new CreatorMode(this.capture,{profile:wipeCreatorProfile,faceMode:this.options.faceMode,reducedMotion:this.reducedMotion});this.replayFrame=document.createElement("canvas");this.replayFrame.width=W;this.replayFrame.height=H;}
    this.bind();this.audio.arm();this.render();this.notify();return this.generation;
  }
  async startCamera(){const token=this.setup("camera");try{await this.input.start();if(this.active&&token===this.generation)this.begin();}catch(e){if(this.active&&token===this.generation&&e.name!=="AbortError")this.fail(e);}}
  startDemo(){this.setup("demo");this.begin();this.$(".wipe-stage").focus({preventScroll:true});}
  begin(){this.phase="waiting";this.lastTick=performance.now();this.render();this.notify();this.frameId=requestAnimationFrame(this.tick);}
  bind(){
    this.abort=new AbortController();const signal=this.abort.signal,stage=this.$(".wipe-stage");
    stage.addEventListener("pointerdown",this.pointerDown,{signal});stage.addEventListener("pointermove",this.pointerMove,{signal});for(const name of ["pointerup","pointercancel","lostpointercapture"])stage.addEventListener(name,this.pointerUp,{signal});
    this.root.addEventListener("click",e=>{
      if(e.target.closest(".wipe-pause")){this.game.paused?this.resume():this.pause("user");}
      if(e.target.closest(".wipe-resume"))this.resume();
      if(e.target.closest(".wipe-camera-retry"))void this.startCamera();
      if(e.target.closest(".wipe-practice"))this.startDemo();
      if(e.target.closest(".wipe-exit"))this.onExit?.();
      if(e.target.closest(".wipe-sound")){this.audio.setEnabled(!this.audio.enabled);try{localStorage.setItem("camera-game-lab-wipe-sfx",this.audio.enabled?"on":"off");}catch{}this.render();}
    },{signal});
    window.addEventListener("blur",()=>this.pause("hidden"),{signal});document.addEventListener("visibilitychange",()=>{if(document.hidden)this.pause("hidden");},{signal});
    window.addEventListener("resize",()=>{if(this.source==="camera")this.input.tracker.reset();this.clearPointers();this.game.contacts.clear();},{signal});
  }
  point(event){const r=this.canvas.getBoundingClientRect();return {x:clamp((event.clientX-r.left)/r.width),y:clamp((event.clientY-r.top)/r.height)};}
  pointerDown=e=>{
    if(this.source!=="demo"||this.game.paused||e.button>0||["finish","result"].includes(this.game.phase)||e.target.closest("button"))return;
    const p=this.point(e),side=this.game.players===1?0:p.x<.5?0:1;
    if([...this.pointers.values()].some(p=>p.side===side))return;
    e.preventDefault();this.$(".wipe-stage").focus({preventScroll:true});this.$(".wipe-stage").setPointerCapture(e.pointerId);
    this.pointers.set(e.pointerId,{...p,side,id:`pointer-${++this.pointerSerial}`,radius:this.game.players===1?.135:.095,present:true});
    // A desktop mouse can prepare both lanes, then take turns dragging each.
    if(this.game.phase==="waiting"&&this.source==="demo"){this.game.phase="ready";this.game.readyAge=600;this.demoReady=true;}
  };
  pointerMove=e=>{const p=this.pointers.get(e.pointerId);if(p&&!this.game.paused){const next=this.point(e);if(this.game.players===2)next.x=clamp(next.x,p.side*.5+.002,(p.side+1)*.5-.002);Object.assign(p,next);}};
  pointerUp=e=>{const p=this.pointers.get(e.pointerId);if(p)this.game.contacts.delete(p.id);this.pointers.delete(e.pointerId);};
  clearPointers(){for(const id of this.pointers.keys()){try{this.$(".wipe-stage").releasePointerCapture(id);}catch{}}this.pointers.clear();}
  pause(reason){if(!this.active||["idle","loading","error","finish","result"].includes(this.phase))return;this.game.pause(reason);this.audio.pause();this.clearPointers();this.render();this.notify();}
  resume(){if(document.hidden)return;this.game.resume();this.audio.arm();this.lastTick=performance.now();this.render();this.notify();}
  fail(error){this.error=error;this.phase="error";this.input.stop();this.audio.pause();if(this.frameId!=null)cancelAnimationFrame(this.frameId);this.frameId=null;this.render();this.notify();}
  tick=now=>{
    if(!this.active||["idle","loading","error","result"].includes(this.phase))return;
    const delta=now-this.lastTick;this.lastTick=now;
    if(delta>700&&this.game.phase==="playing")this.pause("hidden");
    let palms=this.source==="demo"?[...this.pointers.values()]:this.input.tracker.sample(now);
    if(this.game.players===2&&this.source==="camera")palms=[0,1].map(side=>palms.filter(p=>(p.x<.5?0:1)===side).sort((a,b)=>b.radius-a.radius)[0]).filter(Boolean);
    if(this.demoReady&&this.game.phase==="ready"){this.game.phase="playing";this.game.events=[];this.audio.play({type:"start"});this.demoReady=false;}
    else this.game.step(delta,palms);
    for(const e of this.game.events){this.audio.play(e);this.renderer.event(e,this.reducedMotion);if(e.type==="splash"){this.specialCue=e.small?copy(this.locale).small:copy(this.locale).splash;this.cueUntil=now+1200;}if(e.type==="perfect")this.creator?.highlight("PERFECT",this.game.elapsed);}
    this.phase=this.game.phase;
    this.renderer.draw(this.game,{video:this.video,source:this.source,faceMode:this.options.faceMode,dt:Math.min(delta,100),reducedMotion:this.reducedMotion,locale:this.locale});
    if(this.creator&&!this.game.paused&&["waiting","ready","playing","finish"].includes(this.phase)){
      this.creatorStartFrame??=this.creator.frames[0]??null;
      // The rendered canvas already contains the selected face mode. Never add a raw camera fallback.
      const c=this.replayFrame.getContext("2d");c.drawImage(this.canvas,0,0);c.textAlign="center";c.fillStyle="#33594e";c.strokeStyle="#fff9ec";c.lineWidth=8;c.font="900 52px 'Trebuchet MS',sans-serif";
      const label=this.game.players===1?`${this.game.percent()}% CLEAN`:`P1 ${this.game.percent(0)}%  ·  P2 ${this.game.percent(1)}%`;c.strokeText(label,W/2,108);c.fillText(label,W/2,108);
      this.creator.compose({srcObject:null},this.replayFrame,{time:this.game.elapsed+this.game.finishAge,source:"demo"});
    }
    if(this.phase==="result"){
      if(this.creator){const snapshot=this.creator.snapshot();if(this.creatorStartFrame&&snapshot.frames[0]!==this.creatorStartFrame)snapshot.frames.unshift(this.creatorStartFrame);this.creatorResult=selectWipeReplay(snapshot,this.game.result);}
      this.game.result.inferenceFps=this.source==="camera"?Math.round(this.input.tracker.fps):null;
      this.game.result.best=this.saveBest();this.render();this.notify();this.releaseInputs();return;
    }
    this.render();const key=`${this.phase}:${this.game.paused}`;if(key!==this.lastSnapshot){this.lastSnapshot=key;this.notify();}
    if(this.active)this.frameId=requestAnimationFrame(this.tick);
  };
  saveBest(){
    if(this.game.result.reason!=="perfect"||this.game.players!==1)return null;
    try{const key=`camera-game-lab-wipe-best-${this.source}`,old=Number(localStorage.getItem(key))||Infinity,best=Math.min(old,this.game.result.elapsed);localStorage.setItem(key,String(best));return best;}catch{return null;}
  }
  render(){
    const t=copy(this.locale),g=this.game,now=performance.now();
    const key=[this.locale,this.phase,this.source,g.mode,g.paused,g.pauseReason,g.percent(0),g.percent(1),Math.ceil((g.duration-g.elapsed)/1000),this.audio.enabled,this.status,now<this.cueUntil].join("|");if(key===this.uiKey)return;this.uiKey=key;
    this.$(".wipe-play").dataset.mode=g.mode;this.$(".wipe-source").textContent=this.source==="demo"?t.demo:`${t.camera} · ${this.options.faceMode??"ORIGINAL"}`;
    this.$(".wipe-sound").textContent=this.audio.enabled?t.soundOn:t.soundOff;this.$(".wipe-sound").setAttribute("aria-pressed",String(this.audio.enabled));
    this.$(".wipe-pause").textContent=g.paused?"▶":"Ⅱ";this.$(".wipe-pause").setAttribute("aria-label",g.paused?t.resume:t.pause);this.$(".wipe-pause").disabled=["loading","error","finish","result","idle"].includes(this.phase);
    this.$(".wipe-hint").textContent=this.source==="demo"?t.demoHint:t.cameraHint;
    this.$(".wipe-canvas").setAttribute("aria-label",g.players===1?`WIPE! ${g.percent()}% CLEAN`:`WIPE! P1 ${g.percent(0)}% · P2 ${g.percent(1)}%`);
    this.$(".wipe-stage").setAttribute("aria-label",this.source==="demo"?t.demoHint:t.cameraHint);
    for(let side=0;side<2;side++){const e=this.$(`[data-side="${side}"]`);e.hidden=side===1&&g.players===1;e.querySelector("strong").innerHTML=`${g.percent(side)}<small>%</small>`;e.querySelector(".wipe-player").hidden=g.players===1;}
    const remaining=Math.max(0,g.duration-g.elapsed);this.$(".wipe-time span").textContent=String(Math.ceil(remaining/1000));this.$("progress").max=g.duration;this.$("progress").value=remaining;this.$("progress").setAttribute("aria-label",this.locale==="ja"?"残り時間":"Time remaining");
    const overlay=this.$(".wipe-overlay"),blocking=["loading","error"].includes(this.phase)||g.paused;
    overlay.hidden=!blocking;this.$(".wipe-resume").hidden=!g.paused||g.pauseReason==="tracking";this.$(".wipe-camera-retry").hidden=this.phase!=="error";this.$(".wipe-practice").hidden=this.phase!=="error"&&g.pauseReason!=="tracking";this.$(".wipe-exit").hidden=!blocking;
    this.$(".wipe-resume").textContent=t.resume;this.$(".wipe-camera-retry").textContent=t.retryCamera;this.$(".wipe-practice").textContent=t.practice;this.$(".wipe-exit").textContent=t.exit;
    overlay.querySelector("h2").textContent=this.phase==="loading"?"WIPE!":this.phase==="error"?"CAMERA?":g.pauseReason==="tracking"?"👋":"PAUSE";
    overlay.querySelector("p").textContent=this.phase==="loading"?(this.status==="REQUESTING_CAMERA"?t.requesting:t.loading):this.phase==="error"?(["NotAllowedError","NotFoundError","NotReadableError"].includes(this.error?.name)?t.error:t.modelError):g.pauseReason==="tracking"?(g.players===2?t.lostDuo:t.lost):t.paused;
    this.$(".wipe-cue").hidden=blocking||["finish","result","idle"].includes(this.phase);
    this.$(".wipe-cue").textContent=this.phase==="waiting"?(this.source==="demo"?t.demoHint:g.players===2?t.both:t.show):this.phase==="ready"?t.ready:now<this.cueUntil?this.specialCue:g.percent(0)>=90||g.players===2&&g.percent(1)>=90?t.last:t.wipe;
  }
  releaseInputs(){++this.generation;this.input.stop();this.audio.stop();this.abort?.abort();this.clearPointers();if(this.frameId!=null)cancelAnimationFrame(this.frameId);this.frameId=null;this.creator?.dispose();this.creator=null;this.creatorStartFrame=null;if(this.replayFrame)this.replayFrame.width=0;this.replayFrame=null;}
  deactivate(){this.active=false;this.releaseInputs();this.phase="idle";this.creatorResult=null;}
}
