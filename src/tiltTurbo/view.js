import { TiltTurboGame } from './core.js';
import { TiltSignal, steeringForRoll } from './input.js';
import { TiltTurboInput } from '../input/tiltTurboInput.js';
import { TiltTurboRenderer, W, H } from './renderer.js';
import { TiltTurboAudio } from './audio.js';
import { CreatorMode } from '../creator/CreatorMode.js';
import { copy } from './messages.js';
import { cameraInputDebug } from '../input/debugStore.js';
import './tiltTurbo.css';
export const createView = (root, locale) => new TiltTurboView(root, locale);
export class TiltTurboView {
  constructor(root, locale) {
    this.root=root;this.locale=locale;this.listeners=new Set();this.options={};this.keys=new Set();this.pointers=new Map();this.generation=0;this.phase='idle';
    this.game=new TiltTurboGame();this.signal=new TiltSignal();this.audio=new TiltTurboAudio();
    root.innerHTML=`<section class="tt-play"><div class="tt-toolbar"><span class="tt-source"></span><div><button class="tt-sfx" type="button" aria-pressed="true">SE ON</button><button class="tt-pause" type="button">Ⅱ</button></div></div>
      <div class="tt-stage" role="group" tabindex="0"><video muted playsinline hidden></video><canvas class="tt-canvas" width="${W}" height="${H}" role="img"></canvas><canvas class="tt-capture" hidden></canvas>
      <div class="tt-overlay" hidden role="status"><h2></h2><p></p><button class="tt-resume" type="button" hidden></button><button class="tt-retry-camera" type="button" hidden></button><button class="tt-demo" type="button" hidden></button></div></div>
      <div class="tt-practice" hidden><button type="button" data-steer="-1">↙ LEFT</button><button type="button" data-steer="1">RIGHT ↘</button></div><p class="tt-hint"></p><button type="button" class="tt-reconnect" hidden></button><div class="tt-live" aria-live="polite" role="status"></div></section>`;
    this.$=s=>root.querySelector(s);this.video=this.$('video');this.canvas=this.$('.tt-canvas');this.capture=this.$('.tt-capture');this.renderer=new TiltTurboRenderer(this.canvas);
    this.input=new TiltTurboInput(this.video,{onResult:packet=>{
      if(!this.active||this.source!=='camera')return;
      this.packet=packet;this.motion={...this.signal.sample(packet.raw,packet.at),at:packet.at};
      cameraInputDebug.metric("TiltTurbo","rawRoll",packet.raw,packet.at);
      cameraInputDebug.metric("TiltTurbo","filteredRoll",this.motion.roll,packet.at);
      cameraInputDebug.metric("TiltTurbo","steering",this.motion.steering,packet.at);
      cameraInputDebug.metric("TiltTurbo","neutral",this.signal.neutral,packet.at);
      cameraInputDebug.metric("TiltTurbo","calibration",Math.round((this.motion.progress??0)*100)+"%",packet.at);
      if(this.motion.tracked!==this.debugTracked){
        cameraInputDebug.event("TiltTurbo",this.motion.tracked?"TRACK_FOUND":"TRACK_LOST",{},packet.at);
        this.debugTracked=this.motion.tracked;
      }
    },onStatus:(status,error)=>{
      if(!this.active||this.source!=='camera')return;this.status=status;
      if(status==='ERROR'&&this.phase==='playing'){this.packet=null;this.motion={tracked:false,ready:true,roll:0,steering:0};this.render();}
      else if(status==='ERROR')this.fail(error);else this.render();
    }});
  }
  get t(){return copy(this.locale);}
  configure(options={}){this.options={creator:!!options.creator,faceMode:options.faceMode??'ORIGINAL'};}
  subscribe(fn){this.listeners.add(fn);return()=>this.listeners.delete(fn);}
  notify(){this.listeners.forEach(fn=>fn(this.snapshot()));}
  snapshot(){return {phase:this.phase==='ending'?'playing':this.phase==='calibration'?'countdown':this.phase,source:this.source,paused:this.game.paused,elapsed:this.game.elapsed,result:this.phase==='result'?{...this.game.result,source:this.source,creator:this.creatorResult}:null};}
  setLocale(locale){this.locale=locale;this.render();}
  activate(){this.active=true;this.phase='idle';this.render();}
  setup(source){
    this.releaseInputs();this.active=true;this.source=source;this.phase='loading';this.game.reset();this.signal.reset();this.creatorResult=null;this.packet=null;this.motion={tracked:false,ready:false};this.manualPause=false;this.prep=0;this.countdown=0;this.ending=0;
    this.reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;this.debugTracked=null;
    if(this.options.creator)this.creator=new CreatorMode(this.capture,{profile:{brand:'TILT TURBO'},faceMode:this.options.faceMode,reducedMotion:true});
    this.bind();this.audio.arm();this.render();this.notify();return this.generation;
  }
  async startCamera(){const token=this.setup('camera');try{await this.input.start();if(this.active&&token===this.generation)this.begin();}catch(e){if(token===this.generation&&e.name!=='AbortError')this.fail(e);}}
  startDemo(){this.setup('demo');this.begin();this.$('.tt-stage').focus({preventScroll:true});}
  async reconnect(){try{await this.input.start();}catch(e){this.status='ERROR';this.render();}}
  begin(){this.phase='calibration';this.lastFrame=performance.now();this.render();this.notify();this.frameId=requestAnimationFrame(this.loop);}
  bind(){
    this.abort=new AbortController();const signal=this.abort.signal;
    this.root.addEventListener('click',e=>{
      if(e.target.closest('.tt-pause,.tt-resume'))this.togglePause();
      else if(e.target.closest('.tt-retry-camera'))void this.startCamera();
      else if(e.target.closest('.tt-demo'))this.startDemo();
      else if(e.target.closest('.tt-reconnect'))void this.reconnect();
      else if(e.target.closest('.tt-sfx')){this.audio.enabled=!this.audio.enabled;if(this.audio.enabled)this.audio.arm();else void this.audio.context?.suspend().catch(()=>{});this.render();}
    },{signal});
    this.root.addEventListener('pointerdown',e=>{
      if(this.source!=='demo'||this.game.paused||!['calibration','countdown','playing'].includes(this.phase))return;
      const button=e.target.closest('[data-steer]'),stage=e.target.closest('.tt-stage');if(!button&&!stage)return;
      if(e.target.closest('button')&&!button)return;e.preventDefault();const target=button??stage;
      const rect=stage?.getBoundingClientRect();this.pointers.set(e.pointerId,button?Number(button.dataset.steer):e.clientX<rect.left+rect.width/2?-1:1);target.setPointerCapture(e.pointerId);
    },{signal});
    const up=e=>this.pointers.delete(e.pointerId);for(const type of ['pointerup','pointercancel','lostpointercapture'])this.root.addEventListener(type,up,{signal});
    window.addEventListener('keydown',e=>{
      if(!this.active||e.altKey||e.metaKey||e.ctrlKey||/INPUT|TEXTAREA|SELECT/.test(e.target.tagName))return;
      if(e.code==='Escape'&&!e.repeat){this.togglePause();return;}
      if(this.source==='demo'&&!this.game.paused&&['ArrowLeft','ArrowRight','KeyA','KeyD'].includes(e.code)){e.preventDefault();this.keys.add(e.code);}
    },{signal});window.addEventListener('keyup',e=>this.keys.delete(e.code),{signal});
    window.addEventListener('blur',this.background,{signal});document.addEventListener('visibilitychange',this.visibility,{signal});
  }
  background=()=>{if(['calibration','countdown','playing'].includes(this.phase)&&!this.manualPause)this.togglePause();};
  visibility=()=>{if(document.hidden)this.background();};
  togglePause(){if(!['calibration','countdown','playing'].includes(this.phase))return;this.manualPause=!this.manualPause;this.game.paused=this.manualPause;this.keys.clear();this.pointers.clear();
    if(this.manualPause)void this.audio.context?.suspend().catch(()=>{});else {this.audio.arm();this.lastFrame=performance.now();}
    this.render();this.notify();}
  getMotion(now){
    if(this.source==='demo'){const left=this.keys.has('ArrowLeft')||this.keys.has('KeyA')||[...this.pointers.values()].includes(-1),right=this.keys.has('ArrowRight')||this.keys.has('KeyD')||[...this.pointers.values()].includes(1);
      const roll=(Number(right)-Number(left))*20;return {tracked:true,ready:true,roll,steering:steeringForRoll(roll)};}
    if(!this.motion?.at||now-this.motion.at>250)return {tracked:false,ready:this.signal.neutral!==null,progress:this.signal.progress,roll:0,steering:0};return this.motion;
  }
  loop=now=>{
    if(!this.active)return;const realDt=Math.max(0,now-this.lastFrame),dt=Math.min(100,realDt);this.lastFrame=now;const motion=this.getMotion(now);this.currentMotion=motion;
    if(!this.game.paused){
      if(this.phase==='calibration'){
        this.game.preview(dt,motion.tracked?motion.steering:0);
        if(motion.ready&&motion.tracked){this.prep+=dt;if(this.prep>=(this.source==='demo'?2000:1350)){this.phase='countdown';this.countdown=0;this.notify();}}else this.prep=0;
      }else if(this.phase==='countdown'){
        this.game.preview(dt,motion.tracked?motion.steering:0);this.countdown+=dt;
        if(this.countdown>=900){this.game.x=0;this.game.start();this.phase='playing';this.notify();}
      }else if(this.phase==='playing'){
        this.game.step(realDt,motion);if(this.game.result){this.phase='ending';this.ending=0;}
      }else if(this.phase==='ending'){
        this.ending+=realDt;if(this.ending>=1100){
          if(this.creator){const capture=this.creator.snapshot(),last=capture.frames.at(-1)?.at??0;this.creatorResult={...capture,frames:capture.frames.filter(f=>f.at>=Math.max(0,last-6000)),events:[],candidates:this.game.history.filter(e=>['MAX TILT','BONK!','NICE!','LEFT!','RIGHT!','JUMP!','FINISH!'].includes(e.type)),duration:7000,stats:{...this.game.result}};}
          this.phase='result';this.input.stop();this.audio.stop();this.frameId=null;this.render();this.notify();return;
        }
      }
    }
    for(const event of this.game.takeEvents()){this.audio.play(event);if(!['SKRRRT!','FACE LOST','MAX TILT'].includes(event.type))this.$('.tt-live').textContent=event.type;}
    this.render();this.draw();
    if(this.creator&&['playing','ending'].includes(this.phase)&&!this.game.paused)this.creator.compose(this.video,this.canvas,{time:this.game.elapsed+this.ending,source:'demo'});
    if(this.active)this.frameId=requestAnimationFrame(this.loop);
  };
  faceBox(){const p=this.packet?.points;if(!p||performance.now()-this.packet.at>250)return null;return {left:Math.min(...p.map(q=>q.x)),right:Math.max(...p.map(q=>q.x)),top:Math.min(...p.map(q=>q.y)),bottom:Math.max(...p.map(q=>q.y)),eyeLeft:p[33],eyeRight:p[263],mouth:p[13]};}
  draw(){this.renderer.draw(this.game,{video:this.video,face:this.faceBox(),motion:this.currentMotion,source:this.source,faceMode:this.options.creator?this.options.faceMode:'ORIGINAL',creator:this.options.creator,phase:this.phase,prep:this.prep,countdown:this.countdown,ending:this.ending,reducedMotion:this.reducedMotion,locale:this.locale});}
  render(){
    const t=this.t;if(!this.$('.tt-hint'))return;
    this.$('.tt-source').textContent=`${this.source==='demo'?t.demo:t.camera}${this.options.creator?' · CREATOR':''}`;
    this.$('.tt-sfx').textContent=`SE ${this.audio.enabled?'ON':'OFF'}`;this.$('.tt-sfx').setAttribute('aria-pressed',String(this.audio.enabled));
    const playable=['calibration','countdown','playing'].includes(this.phase);
    this.$('.tt-pause').disabled=!playable;this.$('.tt-pause').textContent=this.manualPause?'▶':'Ⅱ';this.$('.tt-pause').setAttribute('aria-label',this.manualPause?t.resume:t.pause);
    this.$('.tt-practice').hidden=this.source!=='demo';this.root.querySelectorAll('[data-steer]').forEach(b=>{b.disabled=!playable||this.game.paused;b.setAttribute('aria-label',Number(b.dataset.steer)<0?t.left:t.right);});
    this.$('.tt-hint').textContent=this.source==='demo'?t.hint:t.cameraHint;this.$('.tt-stage').setAttribute('aria-label','TILT TURBO');this.canvas.setAttribute('aria-label',`TILT TURBO · ${Math.ceil((20000-this.game.elapsed)/1000)} SEC · HIT ${this.game.hits} · NEAR ${this.game.near}`);
    const label=this.phase==='error'?t.error:this.phase==='loading'?t.loading:this.manualPause?t.paused:'';this.$('.tt-overlay').hidden=!label;this.$('.tt-overlay h2').textContent=label;
    this.$('.tt-overlay p').textContent=this.phase==='error'?t.errorHint:this.phase==='loading'?this.status==='REQUESTING_CAMERA'?t.permission:t.model:'';
    this.$('.tt-resume').hidden=!this.manualPause;this.$('.tt-resume').textContent=t.resume;this.$('.tt-retry-camera').hidden=this.phase!=='error';this.$('.tt-retry-camera').textContent=t.retryCamera;
    this.$('.tt-demo').hidden=this.phase!=='error';this.$('.tt-demo').textContent=t.practice;this.$('.tt-reconnect').hidden=!(this.source==='camera'&&this.status==='ERROR'&&this.phase==='playing');this.$('.tt-reconnect').textContent=t.retryCamera;
  }
  fail(error){if(!this.active)return;this.error=error;this.input.stop();this.phase='error';this.game.paused=true;this.audio.stop();this.render();this.notify();}
  releaseInputs(){++this.generation;if(this.frameId!=null)cancelAnimationFrame(this.frameId);this.frameId=null;this.abort?.abort();this.keys.clear();this.pointers.clear();this.input?.stop();this.audio.stop();this.creator?.dispose();this.creator=null;this.packet=null;}
  deactivate(){this.active=false;this.releaseInputs();this.creatorResult=null;this.phase='idle';}
}
