import { JSDOM } from 'jsdom';
import assert from 'node:assert/strict';
const dom=new JSDOM('<section id="root"></section>',{url:'http://localhost/#tension-duel'});
for(const key of ['window','document','navigator','HTMLMediaElement']) Object.defineProperty(globalThis,key,{value:dom.window[key],configurable:true});
let rafId=0;
globalThis.requestAnimationFrame=()=>++rafId;
globalThis.cancelAnimationFrame=()=>{};
Object.defineProperty(document,'hidden',{value:false,configurable:true});
const commands=[];
const ctx=new Proxy({}, {get:(obj,key)=>obj[key]??((...args)=>commands.push([key,...args]))});
dom.window.HTMLCanvasElement.prototype.getContext=()=>ctx;
let viewport={width:800,height:450};
dom.window.Element.prototype.getBoundingClientRect=function(){return {...viewport,left:0,top:0,right:viewport.width,bottom:viewport.height};};
const { register } = await import('node:module');
register('./tension-css-loader.mjs', import.meta.url);
const {TensionDuel}=await import('../src/tension/duel.js');
const rules=await import('../src/tension/rules.js');
const root=document.querySelector('#root');
const duel=new TensionDuel(root,'ja',{onExit:()=>duel.deactivate()});
const $=s=>root.querySelector(s);
let checks=0;const check=(name,fn)=>{fn();checks++;console.log('PASS',name);};
duel.activate();
check('intro is Japanese, primary action and tryout are visible',()=>{assert.match($('.td-card h2').textContent,/Cを/);assert.equal($('.td-start').textContent,'カメラで遊ぶ');assert.ok(!$('.td-demo').hidden);});
check('fullscreen is a visible primary action on browsers that support it',()=>assert.ok($('.td-actions').contains($('.td-full'))));
let lockedOrientation='', unlockedOrientation=false;
const shell=$('.td-shell');
Object.defineProperty(document,'fullscreenElement',{value:null,writable:true,configurable:true});
document.exitFullscreen=async()=>{document.fullscreenElement=null;document.dispatchEvent(new window.Event('fullscreenchange'));};
shell.requestFullscreen=async()=>{document.fullscreenElement=shell;document.dispatchEvent(new window.Event('fullscreenchange'));};
Object.defineProperty(window.screen,'orientation',{configurable:true,value:{lock:async value=>{lockedOrientation=value;},unlock:()=>{unlockedOrientation=true;}}});
await duel.toggleFullscreen();
check('fullscreen requests landscape orientation where supported',()=>{assert.equal(document.fullscreenElement,shell);assert.equal(lockedOrientation,'landscape');assert.equal($('.td-full').textContent,'通常表示に戻す');});
await duel.toggleFullscreen();
check('leaving fullscreen releases the orientation lock',()=>{assert.equal(document.fullscreenElement,null);assert.ok(unlockedOrientation);});
let wakeRequests=0,wakeReleases=0;
const wakeSentinel={released:false,addEventListener(){},async release(){wakeReleases++;this.released=true;}};
Object.defineProperty(navigator,'wakeLock',{configurable:true,value:{request:async type=>{assert.equal(type,'screen');wakeRequests++;return wakeSentinel;}}});
duel.phase='playing';await duel.keepAwake();await duel.releaseWakeLock();duel.phase='intro';
check('screen wake lock is acquired for active play and released afterward',()=>{assert.equal(wakeRequests,1);assert.equal(wakeReleases,1);});
$('.td-demo').click();
check('camera-free action enters ready and reveals accessible range controls',()=>{assert.equal(duel.phase,'ready');assert.equal(duel.mode,'demo');assert.equal(root.querySelectorAll('input[aria-label]').length,6);assert.ok(!$('.td-controls').hidden);});
let now=0;duel.tick(now);
$('.td-skip').click();now+=20;duel.tick(now);
check('skip enters playing after nets are ready',()=>assert.equal(duel.phase,'playing'));
check('keyboard controls work even with a button focused',()=>{const before=duel.fake[0].y;$('.td-demo').focus();window.dispatchEvent(new window.KeyboardEvent('keydown',{key:'w',bubbles:true}));assert.ok(duel.fake[0].y<before);});
check('native range changes tension and angle',()=>{const stretch=root.querySelector('input[data-player="0"][data-kind="opening"]');stretch.value='15';stretch.dispatchEvent(new window.Event('input'));const angle=root.querySelector('input[data-player="0"][data-kind="angle"]');angle.value='25';angle.dispatchEvent(new window.Event('input'));now+=20;duel.tick(now);assert.equal(duel.nets[0].state,2);assert.ok(duel.nets[0].angle<Math.PI/2);});
const results=[];
for(let round=0;round<5;round++){
  if(round) {$('.td-start').click();duel.tick(now+=20);$('.td-skip').click();duel.tick(now+=20);}
  for(let frame=0;frame<901;frame++){
    // UI control input, tracking the ball only for these simulated playtests.
    for(let p=0;p<2;p++){
      const input=root.querySelector(`input[data-player="${p}"][data-kind="position"]`);
      input.value=String(duel.match.ball.y/duel.height*100);input.dispatchEvent(new window.Event('input'));
    }
    now+=1000/60;duel.tick(now);
  }
  assert.equal(duel.phase,'result',JSON.stringify({remaining:duel.match.remaining,nets:duel.nets}));assert.ok(duel.match.hits>=3);results.push({score:duel.match.score,hits:duel.match.hits,bestRally:duel.match.bestRally});
}
check('five UI-driven simulated rounds finish and retry resets match',()=>{assert.equal(results.length,5);assert.equal($('.td-start').textContent,'もう一度・15秒');});
check('canvas draws net curves, endpoint nodes and hit effects',()=>{assert.ok(commands.some(c=>c[0]==='quadraticCurveTo'));assert.ok(commands.some(c=>c[0]==='arc'));});
duel.ready();duel.tick(now+=20);$('.td-skip').click();duel.tick(now+=20);
duel.fake.forEach(f=>f.y=.04);duel.tick(now+=2000);
for(let frame=0;frame<120;frame++) duel.tick(now+=1000/60);
check('a missed ball updates the visible opponent score',()=>{assert.equal(duel.match.score[1],1);assert.equal($('.td-score strong').textContent,'0 : 1');});
for(let frame=0;frame<1000;frame++) duel.tick(now+=1000/60);
check('EN changes all experiment actions and range names',()=>{duel.setLocale('en');assert.equal($('.td-start').textContent,'Play again · 15s');assert.equal($('.td-demo').textContent,'Play with camera');assert.equal(root.querySelector('input').getAttribute('aria-label'),'P1 Height');});
// Camera failure with the actual UI state handlers, no device/model claims.
let starts=0;duel.input.start=async()=>{starts++;throw Object.assign(new Error('camera denied'),{name:'NotAllowedError'});};duel.input.stop=()=>{};
await duel.start(); // mode demo/result is a retry, switch to camera explicitly next.
duel.mode='camera';duel.phase='intro';await duel.start();
check('camera permission failures explain how to retry and offer camera-free play',()=>{assert.equal(duel.phase,'intro');assert.match($('.td-status').textContent,/Camera access is blocked/);assert.equal($('.td-start').disabled,false);assert.equal($('.td-demo').textContent,'Try without camera');});
$('.td-demo').click();
check('camera failure recovers directly to camera-free ready',()=>{assert.equal(duel.phase,'ready');assert.equal(duel.mode,'demo');});
// Two hand camera injection exercises smoothing + readiness, not MediaPipe recognition.
duel.mode='camera';duel.input.running=true;duel.ready();
const n=x=>rules.geometry({x,y:.23},{x,y:.34});
const realNow=performance.now();duel.nets=rules.updateNets([null,null],[n(.2)],realNow);duel.tick(realNow);
check('one hand waits and countdown cannot advance',()=>{assert.equal(duel.phase,'ready');assert.equal(duel.countdown,3);assert.match($('.td-hint').textContent,/Show one C/);});
duel.nets=rules.updateNets(duel.nets,[n(.2),n(.8)],realNow+10);duel.countdown=.01;duel.tick(realNow+30);
check('two injected hands begin the camera round',()=>assert.equal(duel.phase,'playing'));
const remaining=duel.match.remaining;duel.tick(realNow+600);
check('tracking loss pauses the camera round and fades nets',()=>{assert.equal(duel.match.remaining,remaining);assert.match($('.td-hint').textContent,/both C shapes/);assert.ok(duel.nets.every(n=>!n.active));});
duel.nets=rules.updateNets(duel.nets,[n(.2),n(.8)],realNow+650);duel.tick(realNow+650);
check('first reacquisition frame never charges paused time',()=>assert.equal(duel.match.remaining,remaining));
duel.nets=rules.updateNets(duel.nets,[n(.2),n(.8)],realNow+670);duel.tick(realNow+670);
check('tracking reacquisition resumes the existing round',()=>assert.ok(duel.match.remaining<remaining));
duel.phase='result';const startsBeforeRetry=starts;await duel.start();
check('camera retry reuses the running input without requesting it again',()=>{assert.equal(duel.phase,'ready');assert.equal(starts,startsBeforeRetry);});
duel.countdown=.01;duel.tick(realNow+690);duel.tick(realNow+710);
Object.defineProperty(document,'hidden',{value:true,configurable:true});document.dispatchEvent(new window.Event('visibilitychange'));const hiddenTime=duel.match.remaining;duel.tick(realNow+800);
check('hidden document freezes round',()=>assert.equal(duel.match.remaining,hiddenTime));
Object.defineProperty(document,'hidden',{value:false,configurable:true});document.dispatchEvent(new window.Event('visibilitychange'));
for(const [width,height] of [[360,202.5],[800,450],[1280,720]]){viewport={width,height};duel.draw(realNow+800);assert.equal(duel.canvas.width,width);}
check('canvas dimensions follow narrow and landscape arena sizes',()=>assert.equal(duel.canvas.width,1280));
duel.startDemo();duel.tick(now+=20);$('.td-skip').click();duel.tick(now+=20);duel.tick(now+=20);
$('.td-pause').click();const pausedTime=duel.match.remaining,pausedBall={...duel.match.ball};
duel.tick(now+=5000);
check('pause button freezes ball and clock and offers resume',()=>{assert.equal(duel.phase,'paused');assert.equal(duel.match.remaining,pausedTime);assert.deepEqual(duel.match.ball,pausedBall);assert.equal($('.td-start').textContent,'Resume');});
$('.td-start').click();duel.tick(now+=2000);duel.tick(now+=20);
check('resume preserves score and does not consume paused time',()=>{assert.equal(duel.phase,'playing');assert.ok(Math.abs(duel.match.remaining-(pausedTime-.02))<1e-8);assert.deepEqual(duel.match.score,[0,0]);});
window.dispatchEvent(new window.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
check('Escape pauses without leaving the game',()=>assert.equal(duel.phase,'paused'));
viewport={width:390,height:292.5};duel.tick(now+=20);
check('portrait rotation updates world height while preserving the paused clock',()=>{assert.equal(duel.match.height,.75);assert.ok(duel.match.ball.y>=rules.CONFIG.radius && duel.match.ball.y<=.75-rules.CONFIG.radius);});
check('practice provenance remains on the HUD and result',()=>{assert.equal($('.td-mode').textContent,'Camera-free practice');duel.phase='result';duel.render();assert.equal($('.td-card-label').textContent,'Practice result');});
duel.mode='camera';duel.ready();duel.nets=rules.updateNets([null,null],[n(.7),n(.85)],now);duel.tick(now+=20);
check('two hands on the same side cannot bypass player setup',()=>{assert.equal(duel.countdown,3);assert.equal(duel.phase,'ready');});
$('.td-exit').click();
check('exit cancels active game and hides the route',()=>{assert.equal(duel.active,false);assert.equal(root.hidden,true);});
console.log(JSON.stringify({checks,simulatedRounds:results,scope:'DOM + stub canvas, synthetic hands; not real browser or camera'},null,2));
