import { HumanClockGame, W, H, HOLD_SECONDS, TOLERANCE, clamp, normalizeAngle, signedAngle, formatTime, clockAngles, evaluateHands } from './core.js';
import { HumanClockInput } from '../input/humanClockInput.js';
import { demoSample, vectorAngle } from './tracking.js';
import { ClockRenderer } from './renderer.js';
import { ClockAudio } from './audio.js';
import { copy } from './messages.js';
import './humanClock.css';
export const createView = (root, locale) => new HumanClockView(root, locale);
export class HumanClockView {
  constructor(root, locale) {
    this.root=root;this.locale=locale;this.game=new HumanClockGame();this.audio=new ClockAudio();this.listeners=new Set();this.phase='idle';this.generation=0;this.active=false;
    root.innerHTML=`<section class="hc-play"><div class="hc-toolbar"><span class="hc-source"></span><button type="button" class="hc-pause">Ⅱ</button></div>
      <div class="hc-stage" tabindex="0"><video playsinline muted hidden></video><canvas width="${W}" height="${H}" role="img"></canvas>
      <div class="hc-hud"><span>SCORE <b class="hc-score">00</b></span><span class="hc-timer">30<small>s</small></span></div>
      <div class="hc-target"><small>MAKE THIS TIME</small><strong>1:00</strong></div><div class="hc-rush" hidden>TIME RUSH <span></span></div>
      <div class="hc-feedback" hidden><strong></strong><span>+1 TIME!</span></div>
      <div class="hc-hold"><span></span><div><i></i></div></div>
      <div class="hc-overlay" hidden><h2></h2><p></p><button class="hc-resume" type="button" hidden></button><button class="hc-reconnect" type="button" hidden></button><button class="hc-demo" type="button" hidden></button></div></div>
      <div class="hc-hand-status"><div data-hand="hour"><b></b><span></span></div><div data-hand="minute"><b></b><span></span></div></div>
      <div class="hc-practice" hidden><div class="hc-select" role="group"><button type="button" data-select="hour" aria-pressed="true"></button><button type="button" data-select="minute" aria-pressed="false"></button></div>
      <label class="hc-slider hc-hour"><span></span><input type="range" min="0" max="359.5" step=".5" data-angle="hour"><output></output></label>
      <label class="hc-slider hc-minute"><span></span><input type="range" min="0" max="359" step="1" data-angle="minute"><output></output></label></div>
      <div class="hc-footer"><p></p><div><button class="hc-skip" type="button"></button><button class="hc-sfx" type="button" aria-pressed="true"></button></div></div><div class="hc-live" role="status" aria-live="polite"></div></section>`;
    this.$=s=>root.querySelector(s);this.canvas=this.$('canvas');this.video=this.$('video');this.renderer=new ClockRenderer(this.canvas);this.drags=new Map();
    this.input=new HumanClockInput(this.video,{
      onSample:sample=>{
        if(!this.active||this.source!=='camera')return;
        this.sample=sample;
        if(sample?.ready){this.recoverAt??=performance.now();if(!sample.continuous)this.game.clearHold();}
        else{this.recoverAt=null;this.game.clearHold();}
      },
      onStatus:(status,error)=>{
        if(!this.active||this.source!=='camera')return;this.status=status;
        if(status==='ERROR'){this.phase='error';this.error=error;this.game.paused=true;this.audio.stop();}
        this.render();this.notify();
      },
    });
  }
  subscribe(fn){this.listeners.add(fn);return()=>this.listeners.delete(fn);}
  notify(){this.listeners.forEach(fn=>fn(this.snapshot()));}
  snapshot(){return{phase:this.phase==='running'?'playing':this.phase,source:this.source,paused:this.manualPause||this.inputLost||this.game.paused,elapsed:this.game.elapsed,musicRate:this.game.rush?1.08:1,result:this.game.result};}
  configure({difficulty='easy'}={}){this.difficulty=difficulty==='normal'?'normal':'easy';}
  setLocale(locale){this.locale=locale;this.render();}
  activate(){
    this.deactivate();this.active=true;this.phase='waiting';this.sample=null;this.source=null;this.manualPause=this.inputLost=false;this.recoverAt=null;this.readyElapsed=0;this.activeHand='hour';this.feedback=null;this.status=this.error=null;this.game.reset(this.difficulty);this.drags.clear();
    this.reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;this.abort=new AbortController();const signal=this.abort.signal;
    this.root.addEventListener('click',this.click,{signal});this.root.addEventListener('input',this.rangeInput,{signal});
    this.canvas.addEventListener('pointerdown',this.pointerDown,{signal});this.canvas.addEventListener('pointermove',this.pointerMove,{signal});this.canvas.addEventListener('pointerup',this.pointerUp,{signal});this.canvas.addEventListener('pointercancel',this.pointerUp,{signal});
    window.addEventListener('keydown',this.keyDown,{signal});window.addEventListener('blur',this.blur,{signal});document.addEventListener('visibilitychange',this.visibility,{signal});
    this.lastFrame=performance.now();this.frameId=requestAnimationFrame(this.loop);this.render();this.draw();
  }
  async startCamera(){
    const token=++this.generation;this.input.stop();this.source='camera';this.phase='loading';this.sample=null;this.manualPause=this.inputLost=false;this.recoverAt=null;this.game.reset(this.difficulty);this.audio.arm();this.render();this.notify();
    try{await this.input.start();if(!this.active||token!==this.generation)return;this.phase='framing';this.lastFrame=performance.now();this.render();this.notify();}
    catch(error){if(!this.active||token!==this.generation||error?.name==='AbortError')return;this.phase='error';this.error=error;this.input.stop();this.audio.stop();this.render();this.notify();}
  }
  startDemo(){
    ++this.generation;this.input.stop();this.source='demo';this.sample=demoSample();this.manualPause=this.inputLost=false;this.game.reset(this.difficulty);this.phase='countdown';this.readyElapsed=0;this.feedback=null;this.audio.arm();this.lastFrame=performance.now();this.render();this.notify();this.$('.hc-stage').focus({preventScroll:true});
  }
  releaseInputs(){++this.generation;this.input.stop();this.audio.stop();this.abort?.abort();this.drags.clear();if(this.frameId!=null)cancelAnimationFrame(this.frameId);this.frameId=null;}
  deactivate(){this.active=false;this.releaseInputs();this.phase='idle';}
  click=e=>{
    if(e.target.closest('.hc-pause,.hc-resume'))this.togglePause();
    else if(e.target.closest('.hc-demo'))this.startDemo();
    else if(e.target.closest('.hc-reconnect'))void this.startCamera();
    else if(e.target.closest('.hc-skip')){this.game.skip();this.feedback=null;this.render();}
    else if(e.target.closest('.hc-sfx')){this.audio.enabled=!this.audio.enabled;if(this.audio.enabled)this.audio.arm();else this.audio.stop();this.render();}
    else{const b=e.target.closest('[data-select]');if(b){this.activeHand=b.dataset.select;this.render();}}
  };
  rangeInput=e=>{if(e.target.matches('[data-angle]'))this.moveHand(e.target.dataset.angle,Number(e.target.value)-90);};
  moveHand(side,angle){
    if(this.source!=='demo'||!['running','countdown'].includes(this.phase)||this.game.paused)return;
    const angles={hour:this.sample.hands.hour.angle,minute:this.sample.hands.minute.angle};angles[side]=normalizeAngle(angle);this.sample=demoSample(angles.hour,angles.minute);this.activeHand=side;this.render();this.draw();
  }
  keyDown=e=>{
    if(!this.active||e.altKey||e.ctrlKey||e.metaKey||/INPUT|TEXTAREA|SELECT/.test(e.target.tagName))return;
    if(e.code==='Space'&&['running','countdown'].includes(this.phase)){e.preventDefault();if(!e.repeat)this.togglePause();return;}
    if(this.source!=='demo'||!['a','d','ArrowLeft','ArrowRight'].includes(e.key))return;
    e.preventDefault();const side=e.key==='a'||e.key==='d'?'hour':'minute',dir=e.key==='a'||e.key==='ArrowLeft'?-1:1;
    this.moveHand(side,this.sample.hands[side].angle+dir*(e.shiftKey?(side==='hour'?.5:1):5));
  };
  pointerPoint(e){const r=this.canvas.getBoundingClientRect();return{x:(e.clientX-r.left)*W/r.width,y:(e.clientY-r.top)*H/r.height};}
  pointerDown=e=>{
    if(this.source!=='demo'||this.phase!=='running'||this.game.paused)return;const p=this.pointerPoint(e);
    const near=['hour','minute'].map(side=>({side,d:Math.hypot(p.x-this.sample.hands[side].x,p.y-this.sample.hands[side].y)})).sort((a,b)=>a.d-b.d);
    const side=near[0].d<60?near[0].side:this.activeHand;
    if([...this.drags.values()].includes(side))return;
    e.preventDefault();this.drags.set(e.pointerId,side);this.canvas.setPointerCapture(e.pointerId);this.activeHand=side;this.pointHand(side,p);
  };
  pointHand(side,p){if(Math.hypot(p.x-this.sample.center.x,p.y-this.sample.center.y)>40)this.moveHand(side,vectorAngle(this.sample.center,p));}
  pointerMove=e=>{const side=this.drags.get(e.pointerId);if(!side||this.game.paused)return;e.preventDefault();this.pointHand(side,this.pointerPoint(e));};
  pointerUp=e=>{this.drags.delete(e.pointerId);if(this.canvas.hasPointerCapture(e.pointerId))this.canvas.releasePointerCapture(e.pointerId);};
  togglePause(){
    if(!['running','countdown'].includes(this.phase))return;this.manualPause=!this.manualPause;this.game.paused=this.manualPause||this.inputLost;this.game.clearHold();this.drags.clear();this.lastFrame=performance.now();
    if(this.manualPause)void this.audio.context?.suspend().catch(()=>{});else this.audio.arm();this.render();this.notify();
  }
  blur=()=>{if(['running','countdown'].includes(this.phase)&&!this.manualPause)this.togglePause();};
  visibility=()=>{if(document.hidden)this.blur();};
  loop=now=>{
    if(!this.active)return;const rawDt=Math.max(0,(now-this.lastFrame)/1000);this.lastFrame=now;
    const dt=Math.min(.1,rawDt),fresh=this.source==='demo'||this.sample?.ready&&now-this.sample.at<=150;
    if(rawDt>.15)this.game.clearHold();
    if(this.phase==='framing'&&fresh&&this.recoverAt!=null&&now-this.recoverAt>=250){this.phase='countdown';this.readyElapsed=0;this.notify();}
    if(this.phase==='countdown'&&!this.manualPause){
      if(!fresh){this.phase='framing';this.readyElapsed=0;this.notify();}
      else{this.readyElapsed+=dt;if(this.readyElapsed>=.6){this.game.start();this.phase='running';this.notify();}}
    }else if(this.phase==='running'){
      if(this.source==='camera'){
        if(!fresh)this.recoverAt=null;
        const lost=!fresh||this.inputLost&&(this.recoverAt==null||now-this.recoverAt<250);
        if(lost!==this.inputLost){this.inputLost=lost;this.game.paused=this.manualPause||lost;this.game.clearHold();if(lost)void this.audio.context?.suspend().catch(()=>{});else if(!this.manualPause)this.audio.arm();this.notify();}
      }
      this.game.match=evaluateHands(this.sample?.hands,this.game.target);
      this.game.step(rawDt,this.game.match.matched&&fresh&&rawDt<=.15);
      if(this.game.phase==='result'){this.game.result.source=this.source;this.phase='result';this.input.stop();this.notify();}
    }
    for(const event of this.game.takeEvents()){
      this.audio.play(event);if(event.type==='correct'){this.feedback=event;this.$('.hc-live').textContent=`${event.label} +1 TIME! ${this.game.score}`;}else if(event.type==='question')this.feedback=null;
    }
    this.render();this.draw();if(this.active&&this.phase!=='result'&&this.frameId!=null)this.frameId=requestAnimationFrame(this.loop);
  };
  draw(){this.renderer.draw(this.game,{sample:this.sample,video:this.video,source:this.source,reducedMotion:this.reducedMotion,feedback:this.feedback,locale:this.locale,activeHand:this.activeHand});}
  render(){
    const t=copy(this.locale),g=this.game;this.$('.hc-play').dataset.source=this.source??'';
    this.$('.hc-source').textContent=this.source==='demo'?t.demo:t.camera;this.canvas.setAttribute('aria-label',t.canvas);
    this.$('.hc-pause').setAttribute('aria-label',t.pause);this.$('.hc-pause').disabled=!['running','countdown'].includes(this.phase);
    this.$('.hc-score').textContent=String(g.score).padStart(2,'0');this.$('.hc-timer').innerHTML=`${Math.ceil(g.remaining)}<small>s</small>`;this.$('.hc-timer').classList.toggle('hc-urgent',g.remaining<=5);
    const target=this.$('.hc-target');target.classList.toggle('hc-folded',g.settling);target.querySelector('strong').textContent=formatTime(g.target);
    this.$('.hc-rush').hidden=!g.rush;this.$('.hc-rush span').textContent=`${Math.ceil(g.rushUntil-g.elapsed)}s`;
    const feedback=this.$('.hc-feedback');feedback.hidden=!g.settling||this.phase!=='running';feedback.querySelector('strong').textContent=this.feedback?.label??'TICK!';
    const hold=this.$('.hc-hold');hold.hidden=this.phase!=='running'||g.settling;hold.querySelector('span').textContent=g.hold>0?t.locked:t.hold;hold.querySelector('i').style.width=`${g.hold/HOLD_SECONDS*100}%`;
    const angles=clockAngles(g.target.hour,g.target.minute);
    ['hour','minute'].forEach((side,i)=>{
      const hand=this.sample?.hands?.[side],error=g.match?.errors?.[i]??Infinity,el=this.$(`[data-hand="${side}"]`);
      el.querySelector('b').textContent=t[side];el.dataset.matched=String(error<=TOLERANCE);
      el.querySelector('span').textContent=!hand?.present?t[side==='hour'?'leftMissing':'rightMissing']:error<=TOLERANCE?t.matched:signedAngle(hand.angle,angles[side])>0?`↻ ${t.clockwise}`:`↺ ${t.counterclockwise}`;
      const button=this.$(`[data-select="${side}"]`);button.textContent=t[sideShort(side)];button.setAttribute('aria-pressed',String(this.activeHand===side));
      const input=this.$(`[data-angle="${side}"]`),value=normalizeAngle((hand?.angle??0)+90);input.value=String(value);input.disabled=g.paused||!['running','countdown'].includes(this.phase);input.setAttribute('aria-label',t[side]);input.setAttribute('aria-valuetext',`${Math.round(value)}° ${t[sideShort(side)]}`);
      this.$(`.hc-${side} span`).textContent=t[sideShort(side)];this.$(`.hc-${side} output`).textContent=`${value.toFixed(side==='hour'?1:0)}°`;
    });
    this.$('.hc-select').setAttribute('aria-label',t.selectHand);this.$('.hc-practice').hidden=this.source!=='demo';this.$('.hc-footer p').textContent=this.source==='demo'?t.demoHint:t.cameraHint;
    this.$('.hc-skip').textContent=`${t.skip} →`;this.$('.hc-skip').disabled=this.phase!=='running'||g.paused||g.settling;
    this.$('.hc-sfx').textContent=`${t.sfx} ${this.audio.enabled?'ON':'OFF'}`;this.$('.hc-sfx').setAttribute('aria-pressed',String(this.audio.enabled));
    const overlay=this.$('.hc-overlay');overlay.hidden=!['waiting','loading','framing','countdown','error'].includes(this.phase)&&!this.manualPause&&!this.inputLost;
    if(overlay.hidden)return;
    overlay.querySelector('h2').textContent=this.manualPause?t.paused:this.phase==='error'?t.error:this.phase==='loading'?t.loading:this.phase==='countdown'?t.ready:this.inputLost?t[this.sample?.hint==='leftMissing'?'leftMissing':this.sample?.hint==='rightMissing'?'rightMissing':'lost']:t[this.sample?.hint??'frame'];
    overlay.querySelector('p').textContent=this.manualPause||this.phase==='countdown'?'':this.phase==='error'?t[this.error?.name==='NotAllowedError'?'denied':'errorHint']:this.phase==='loading'?t[this.status==='REQUESTING_CAMERA'?'permission':'model']:this.inputLost?t.lostHint:t.frameHint;
    this.$('.hc-resume').hidden=!this.manualPause;this.$('.hc-resume').textContent=t.resume;this.$('.hc-reconnect').hidden=this.phase!=='error';this.$('.hc-reconnect').textContent=t.retryCamera;
    this.$('.hc-demo').hidden=this.source==='demo'||!['error','framing'].includes(this.phase)&&!this.inputLost;this.$('.hc-demo').textContent=t.practice;
  }
}
const sideShort = side => side==='hour'?'hourShort':'minuteShort';
