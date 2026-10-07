import { ShowdownGame } from './core.js';
import { ShowdownInput } from './input.js';
import { ShowdownScene } from './scene.js';
import { PhaserRuntime } from '../game-runtime/phaser/PhaserRuntime.js';
import { ShowdownAudio } from './audio.js';
import './style.css';
import { ShowdownReplay, faceRect } from './replay.js';
export function createView(root,locale){return new ShowdownView(root,locale);}
export class ShowdownView {
  constructor(root,locale){
    this.root=root;this.locale=locale;this.game=new ShowdownGame();this.listeners=new Set();this.audio=new ShowdownAudio();this.aim={x:.5,y:.5};this.lastAim=-Infinity;this.effects=[];this.generation=0;
    root.innerHTML=`<section class="sd-play"><header><b>FINGER GUN <em>SHOWDOWN</em></b><button class="sd-pause" aria-label="Pause">Ⅱ</button></header><div class="sd-stage"><video autoplay muted playsinline></video><div class="sd-render"></div><div class="sd-hud"><strong class="sd-score">0</strong><span class="sd-time">30</span><b class="sd-combo"></b></div><div class="sd-call" role="status"><h2>DRAW!</h2><p></p><button class="sd-start">DRAW!</button><button class="sd-fallback" hidden></button></div><div class="sd-feedback"></div><div class="sd-belt"><span class="sd-ammo"></span><span class="sd-reload"></span></div></div><footer><p class="sd-help"></p><button class="sd-sound" aria-pressed="true">SE ON</button><button class="sd-reload-button">RELOAD ↓</button></footer></section>`;
    this.$=s=>root.querySelector(s);this.video=this.$('video');
    this.input=new ShowdownInput(this.video,{getTarget:()=>this.phase==='playing'?{x:2,y:2,radius:0}:null,onAim:a=>{if(a.visible){this.aim=a;this.lastAim=performance.now();}},onMouth:m=>{this.mouth=m;},onShot:a=>{if(this.source==='camera'&&this.phase==='playing')this.game.shoot(a);}});
  }
  t(ja,en){return this.locale==='ja'?ja:en;}
  configure(options={}){this.options={creator:!!options.creator,faceMode:['ORIGINAL','EFFECT','HIDE'].includes(options.faceMode)?options.faceMode:'ORIGINAL'};}
  subscribe(fn){this.listeners.add(fn);return()=>this.listeners.delete(fn);}
  notify(){this.listeners.forEach(fn=>fn(this.snapshot()));}
  snapshot(){return{phase:this.phase,source:this.source,paused:this.game.paused,musicSilent:this.game.phase==='high-noon'||this.phase!=='playing',elapsed:this.game.clock,result:this.game.result};}
  setLocale(l){this.locale=l;this.render();}
  activate(){this.active=true;this.phase='waiting';this.game.reset();this.effects=[];this.aim={x:.5,y:.5};this.lastAim=-Infinity;this.mouth=null;this.lastFrame=performance.now();this.abort=new AbortController();const signal=this.abort.signal;
    const motion=matchMedia('(prefers-reduced-motion: reduce)');this.reducedMotion=motion.matches;motion.addEventListener('change',e=>{this.reducedMotion=e.matches;},{signal});
    this.root.addEventListener('click',this.click,{signal});this.$('.sd-stage').addEventListener('pointermove',this.pointer,{signal});this.$('.sd-stage').addEventListener('pointerdown',this.pointer,{signal});window.addEventListener('keydown',this.key,{signal});window.addEventListener('blur',this.pause,{signal});document.addEventListener('visibilitychange',()=>{if(document.hidden)this.pause();},{signal});
    this.options??={creator:false,faceMode:'ORIGINAL'};this.replay=this.options.creator?new ShowdownReplay():null;
    this.faceCover=document.createElement('div');this.faceCover.className='sd-face-cover';this.faceCover.textContent='🤠';this.$('.sd-stage').append(this.faceCover);
    this.runtime=new PhaserRuntime(this.$('.sd-render'),new ShowdownScene(this),{width:540,height:960});this.runtime.game.events.on('postrender',()=>{if(this.phase==='playing')this.replay?.capture(this);});this.render();this.notify();}
  async startCamera(){this.source='camera';this.phase='loading';const token=++this.generation;this.render();this.notify();try{await this.input.start();if(!this.active||token!==this.generation)return;this.phase='calibration';this.render();this.notify();}catch(e){if(!this.active||token!==this.generation)return;this.input.stop();this.phase='error';this.render();this.notify();}}
  startDemo(){++this.generation;this.input.stop();this.source='demo';this.phase='playing';this.game.start();this.audio.arm();this.lastFrame=performance.now();this.render();this.notify();}
  releaseInputs(){++this.generation;this.input.stop();this.audio.stop();this.abort?.abort();this.runtime?.sleep();this.replay?.dispose();this.replay=null;}
  deactivate(){this.active=false;this.releaseInputs();this.runtime?.destroy();this.runtime=null;this.faceCover?.remove();}
  pause=()=>{if(this.phase==='playing'){this.game.paused=true;this.audio.stop();this.render();this.notify();}};
  click=e=>{if(e.target.closest('.sd-start')){this.audio.arm();if(this.game.paused){this.game.paused=false;this.input.resetTracking();this.lastFrame=performance.now();}else if(this.phase==='calibration'&&this.mouth?.ready){this.phase='playing';this.game.start();this.lastFrame=performance.now();}}
    if(e.target.closest('.sd-pause'))this.game.paused?this.$('.sd-start').click():this.pause();
    if(e.target.closest('.sd-fallback'))this.startDemo();
    if(e.target.closest('.sd-reload-button')&&this.source==='demo'){this.game.reload(false,0);this.game.reload(true,.31);}
    if(e.target.closest('.sd-sound')){this.audio.enabled=!this.audio.enabled;this.audio.enabled?this.audio.arm():this.audio.stop();}
    this.render();this.notify();};
  pointer=e=>{if(this.source!=='demo'||e.target.closest('button'))return;const r=this.$('.sd-stage').getBoundingClientRect();this.aim={x:(e.clientX-r.left)/r.width,y:(e.clientY-r.top)/r.height};if(e.type==='pointerdown'&&this.phase==='playing'){e.preventDefault();this.game.shoot(this.aim);}};
  key=e=>{if(e.repeat||e.ctrlKey||e.metaKey||e.altKey||/INPUT|TEXTAREA|SELECT/.test(e.target.tagName))return;if(e.code==='KeyP'){this.game.paused?this.$('.sd-start').click():this.pause();}if(this.source!=='demo'||this.phase!=='playing')return;if(e.code==='Space'&&!e.target.closest('button')){e.preventDefault();this.game.shoot(this.aim);}if(e.code==='KeyR')this.$('.sd-reload-button').click();};
  loop=now=>{if(!this.active)return;const dt=Math.min(.06,Math.max(0,(now-this.lastFrame)/1000));this.lastFrame=now;
    if(this.phase==='playing'){this.game.reload(this.source==='camera'&&this.input.lowered,dt);this.game.step(dt);if(!this.game.paused&&this.game.phase==='high-noon'&&Math.floor(this.game.clock*2)!==this.lastTick){this.lastTick=Math.floor(this.game.clock*2);this.audio.play({type:'TICK'});}for(const e of this.game.takeEvents()){this.audio.play(e);this.replay?.event(e);if(['SHOT','HIT'].includes(e.type))this.effects.push({...e,at:this.game.clock});if(e.type!=='SHOT'){this.feedback=e.type==='HIT'?`${e.label} +${e.points}`:e.type==='CIVILIAN'?'SAFE! −500':e.type;this.feedbackUntil=this.game.clock+.7;}}
      this.effects=this.effects.filter(e=>this.game.clock-e.at<.5);if(this.game.result){this.game.result.creator=this.replay?.snapshot()??null;this.phase='result';this.input.stop();this.audio.stop();}}
    this.render();this.notify();};
  render(){if(!this.$)return;const g=this.game;this.video.hidden=this.source!=='camera';
    const hideCamera=this.options?.faceMode==='HIDE'||this.options?.faceMode==='EFFECT'&&!this.input.faceBox;this.video.style.visibility=hideCamera?'hidden':'visible';
    if(this.faceCover){const f=this.input.faceBox&&faceRect(this.video,this.input.faceBox,this.$('.sd-stage').clientWidth,this.$('.sd-stage').clientHeight);this.faceCover.hidden=this.options.faceMode!=='EFFECT'||!f||this.video.hidden||hideCamera;if(f)Object.assign(this.faceCover.style,{left:f.x+'px',top:f.y+'px',width:f.w+'px',height:f.h+'px'});}
    const overlay=this.$('.sd-call');overlay.hidden=this.phase==='playing'&&!g.paused||this.phase==='result';
    this.$('.sd-call h2').textContent=g.paused?'PAUSED':this.phase==='error'?this.t('カメラを使えません','CAMERA UNAVAILABLE'):this.phase==='loading'?this.t('準備中…','LOADING…'):'POINT. SAY BAN.';
    this.$('.sd-call p').textContent=this.phase==='error'?this.t('カメラ許可を確認してください。練習でも遊べます。','Check camera permission, or try practice.'):this.t('口を閉じて調整 → 人差し指を伸ばす → DRAW!','Close mouth to calibrate → point your index finger → DRAW!');
    this.$('.sd-start').hidden=!(this.phase==='calibration'||g.paused);this.$('.sd-start').disabled=!g.paused&&!(this.mouth?.ready&&this.input.currentAim.visible);this.$('.sd-start').textContent=g.paused?this.t('再開','RESUME'):'DRAW!';
    this.$('.sd-fallback').hidden=this.phase!=='error';this.$('.sd-fallback').textContent=this.t('カメラなしで練習','TRY PRACTICE');
    this.$('.sd-score').textContent=g.score.toLocaleString();this.$('.sd-time').textContent=String(Math.ceil(30-g.clock)).padStart(2,'0');this.$('.sd-combo').textContent=g.combo>1?`×${g.combo}`:'';
    this.$('.sd-ammo').textContent='● '.repeat(g.ammo)+'○ '.repeat(6-g.ammo);this.$('.sd-reload').textContent=g.ammo?this.t('手を下げてリロード ↓','LOWER HAND TO RELOAD ↓'):'EMPTY! ↓';
    this.$('.sd-help').textContent=this.source==='demo'?this.t('タップ / Spaceで射撃 · Rでリロード · Pで休憩','Tap / Space fires · R reloads · P pauses'):this.t('指で狙う · 口を開けてBAN! · 手を下げて装填','Point to aim · open mouth: BAN! · lower hand to reload');
    this.$('.sd-feedback').textContent=g.paused?'':this.feedbackUntil>g.clock?this.feedback:this.phase==='playing'&&this.source==='camera'&&performance.now()-this.lastAim>800?this.t('手を映してね','SHOW YOUR HAND'):g.clock<3?'POINT → SAY BAN!':g.phase==='high-noon'?(g.clock<24?'HIGH NOON':'DRAW!'):g.phase==='final'?'FINAL SHOT':'';
    this.$('.sd-reload-button').hidden=this.source!=='demo';this.$('.sd-sound').textContent=this.audio.enabled?'SE ON':'SE OFF';this.$('.sd-sound').setAttribute('aria-pressed',String(this.audio.enabled));this.$('.sd-stage').dataset.phase=g.phase;}
}
