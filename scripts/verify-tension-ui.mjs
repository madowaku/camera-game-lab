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
const musicStates=[],setMusic=duel.audio.setMusic.bind(duel.audio);
duel.audio.setMusic=playing=>{musicStates.push(playing);setMusic(playing);};
const $=s=>root.querySelector(s);
let checks=0;const check=(name,fn)=>{fn();checks++;console.log('PASS',name);};
let now=0;
duel.activate();
check('intro teaches mirrored hand shapes, primary action and tryout are visible',()=>{assert.match($('.tnd-card h2').textContent,/左はC、右は反対向きのC/);assert.match($('.tnd-card p').textContent,/開いた側を中央/);assert.equal($('.tnd-start').textContent,'カメラで遊ぶ');assert.ok(!$('.tnd-demo').hidden);});
check('rules explain wall bounce, side goals and center line; licensed music is credited',()=>{assert.match($('.tnd-guide').textContent,/上下の壁で跳ね返り/);assert.match($('.tnd-guide').textContent,/中央線を越えたネットは球を返せず/);assert.ok($('.tnd-credits a[href*="otologic.jp"]'));assert.ok($('.tnd-credits a[href*="creativecommons.org/licenses/by/4.0"]'));});
check('Japanese instructions teach wide elastic catches and narrow fast returns',()=>{assert.match($('.tnd-card p').textContent,/広げてバイーン、狭めて速く/);assert.match($('.tnd-guide').textContent,/ゴールの上下は壁/);});
check('readiness prompt and player labels distinguish left C from right mirrored C',()=>{duel.phase='ready';now+=20;duel.tick(now);assert.match($('.tnd-ready-copy').textContent,/左はC、右は反対向きのC/);assert.equal($('.tnd-p1 small').textContent,'左はCを映してね');assert.equal($('.tnd-p2 small').textContent,'右は反対向きのCを映してね');duel.phase='intro';duel.render();});
check('fullscreen is a visible primary action on browsers that support it',()=>assert.ok($('.tnd-actions').contains($('.tnd-full'))));
let lockedOrientation='', unlockedOrientation=false;
const shell=$('.tnd-shell');
Object.defineProperty(document,'fullscreenElement',{value:null,writable:true,configurable:true});
document.exitFullscreen=async()=>{document.fullscreenElement=null;document.dispatchEvent(new window.Event('fullscreenchange'));};
shell.requestFullscreen=async()=>{document.fullscreenElement=shell;document.dispatchEvent(new window.Event('fullscreenchange'));};
Object.defineProperty(window.screen,'orientation',{configurable:true,value:{lock:async value=>{lockedOrientation=value;},unlock:()=>{unlockedOrientation=true;}}});
await duel.toggleFullscreen();
check('fullscreen requests landscape orientation where supported',()=>{assert.equal(document.fullscreenElement,shell);assert.equal(lockedOrientation,'landscape');assert.equal($('.tnd-full').textContent,'通常表示に戻す');});
await duel.toggleFullscreen();
check('leaving fullscreen releases the orientation lock',()=>{assert.equal(document.fullscreenElement,null);assert.ok(unlockedOrientation);});
let wakeRequests=0,wakeReleases=0;
const wakeSentinel={released:false,addEventListener(){},async release(){wakeReleases++;this.released=true;}};
Object.defineProperty(navigator,'wakeLock',{configurable:true,value:{request:async type=>{assert.equal(type,'screen');wakeRequests++;return wakeSentinel;}}});
duel.phase='playing';await duel.keepAwake();await duel.releaseWakeLock();duel.phase='intro';
check('screen wake lock is acquired for active play and released afterward',()=>{assert.equal(wakeRequests,1);assert.equal(wakeReleases,1);});
$('.tnd-demo').click();
check('camera-free action enters ready and reveals accessible range controls',()=>{assert.equal(duel.phase,'ready');assert.equal(duel.mode,'demo');assert.equal(root.querySelectorAll('input[aria-label]').length,6);assert.ok(!$('.tnd-controls').hidden);});
duel.tick(now);
$('.tnd-skip').click();now+=20;duel.tick(now);
check('skip enters playing after nets are ready',()=>assert.equal(duel.phase,'playing'));
check('keyboard controls work even with a button focused',()=>{const before=duel.fake[0].y;$('.tnd-demo').focus();window.dispatchEvent(new window.KeyboardEvent('keydown',{key:'w',bubbles:true}));assert.ok(duel.fake[0].y<before);});
check('native range changes tension and angle',()=>{const stretch=root.querySelector('input[data-player="0"][data-kind="opening"]');stretch.value='15';stretch.dispatchEvent(new window.Event('input'));const angle=root.querySelector('input[data-player="0"][data-kind="angle"]');angle.value='25';angle.dispatchEvent(new window.Event('input'));now+=20;duel.tick(now);assert.equal(duel.nets[0].state,2);assert.ok(duel.nets[0].angle<Math.PI/2);});
const results=[];
for(let round=0;round<5;round++){
  if(round) {$('.tnd-start').click();duel.tick(now+=20);$('.tnd-skip').click();duel.tick(now+=20);}
  for(let frame=0;frame<1001;frame++){
    // UI control input, tracking the ball only for these simulated playtests.
    for(let p=0;p<2;p++){
      const input=root.querySelector(`input[data-player="${p}"][data-kind="position"]`);
      input.value=String(duel.match.ball.y/duel.height*100);input.dispatchEvent(new window.Event('input'));
    }
    now+=1000/60;duel.tick(now);
  }
  assert.equal(duel.phase,'playing');assert.ok(duel.match.elapsed>15);assert.ok(duel.match.hits>=3);
  // Deliberately miss through native controls to complete a first-to-five match.
  for(const input of root.querySelectorAll('input[data-kind="angle"]')){input.value='0';input.dispatchEvent(new window.Event('input'));}
  for(const input of root.querySelectorAll('input[data-kind="position"]')){input.value='5';input.dispatchEvent(new window.Event('input'));}
  for(let frame=0;frame<3600 && duel.phase==='playing';frame++)duel.tick(now+=1000/60);
  assert.equal(duel.phase,'result',JSON.stringify({score:duel.match.score,nets:duel.nets}));assert.equal(Math.max(...duel.match.score),5);results.push({score:duel.match.score,hits:duel.match.hits,bestRally:duel.match.bestRally});
}
check('five UI-driven first-to-five matches continue beyond 15 seconds, finish and reset on retry',()=>{assert.equal(results.length,5);assert.equal($('.tnd-start').textContent,'もう一度・5点先取');assert.equal($('.tnd-target').textContent,'5点先取');});
check('canvas draws net curves, endpoint nodes and hit effects',()=>{assert.ok(commands.some(c=>c[0]==='quadraticCurveTo'));assert.ok(commands.some(c=>c[0]==='arc'));});
duel.ready();duel.tick(now+=20);$('.tnd-skip').click();duel.tick(now+=20);
duel.fake.forEach(f=>f.y=.04);duel.tick(now+=2000);
for(let frame=0;frame<120;frame++) duel.tick(now+=1000/60);
check('a missed ball updates the visible opponent score',()=>{assert.equal(duel.match.score[1],1);assert.equal($('.tnd-score strong').textContent,'0 : 1');});
for(let frame=0;frame<1000;frame++) duel.tick(now+=1000/60);
check('EN changes actions and preserves mirrored hand instructions',()=>{duel.phase='intro';duel.setLocale('en');assert.equal($('.tnd-start').textContent,'Play with camera');assert.equal($('.tnd-demo').textContent,'Try without camera');assert.match($('.tnd-card h2').textContent,/mirrored C on the right/);assert.equal(root.querySelector('input').getAttribute('aria-label'),'P1 Height');});
check('English explains spreading for boing and pinching for speed',()=>{assert.match($('.tnd-guide').textContent,/Spread your fingers for a bigger, longer boing/);assert.match($('.tnd-guide').textContent,/pinch.*faster/);});
// Camera failure with the actual UI state handlers, no device/model claims.
let starts=0;duel.input.start=async()=>{starts++;throw Object.assign(new Error('camera denied'),{name:'NotAllowedError'});};duel.input.stop=()=>{};
await duel.start(); // mode demo/result is a retry, switch to camera explicitly next.
duel.mode='camera';duel.phase='intro';await duel.start();
check('camera permission failures explain how to retry and offer camera-free play',()=>{assert.equal(duel.phase,'intro');assert.match($('.tnd-status').textContent,/Camera access is blocked/);assert.equal($('.tnd-start').disabled,false);assert.equal($('.tnd-demo').textContent,'Try without camera');});
$('.tnd-demo').click();
check('camera failure recovers directly to camera-free ready',()=>{assert.equal(duel.phase,'ready');assert.equal(duel.mode,'demo');});
// Two hand camera injection exercises smoothing + readiness, not MediaPipe recognition.
duel.mode='camera';duel.input.running=true;duel.ready();
const n=x=>rules.geometry({x,y:.23},{x,y:.34});
const realNow=performance.now();duel.nets=rules.updateNets([null,null],[n(.2)],realNow);duel.tick(realNow);
check('one hand waits and countdown cannot advance with mirrored player guidance',()=>{assert.equal(duel.phase,'ready');assert.equal(duel.countdown,3);assert.match($('.tnd-hint').textContent,/Show C on the left and its mirror on the right/);});
duel.nets=rules.updateNets(duel.nets,[n(.2),n(.8)],realNow+10);duel.countdown=.01;duel.tick(realNow+30);
check('two injected hands begin the camera round',()=>assert.equal(duel.phase,'playing'));
const elapsed=duel.match.elapsed;duel.tick(realNow+600);
check('tracking loss pauses the camera round and fades nets',()=>{assert.equal(duel.match.elapsed,elapsed);assert.match($('.tnd-hint').textContent,/Show C on the left and its mirror on the right/);assert.ok(duel.nets.every(n=>!n.active));});
check('tracking loss silences music and reacquisition restarts it',()=>{assert.equal(musicStates.at(-1),false);});
duel.nets=rules.updateNets(duel.nets,[n(.2),n(.8)],realNow+650);duel.tick(realNow+650);
check('first reacquisition frame never charges paused time',()=>assert.equal(duel.match.elapsed,elapsed));
duel.nets=rules.updateNets(duel.nets,[n(.2),n(.8)],realNow+670);duel.tick(realNow+670);
check('tracking reacquisition resumes the existing round',()=>{assert.ok(duel.match.elapsed>elapsed);assert.equal(musicStates.at(-1),true);});
duel.phase='result';const startsBeforeRetry=starts;await duel.start();
check('camera retry reuses the running input without requesting it again',()=>{assert.equal(duel.phase,'ready');assert.equal(starts,startsBeforeRetry);});
duel.countdown=.01;duel.tick(realNow+690);duel.tick(realNow+710);
Object.defineProperty(document,'hidden',{value:true,configurable:true});document.dispatchEvent(new window.Event('visibilitychange'));const hiddenTime=duel.match.elapsed;duel.tick(realNow+800);
check('hidden document freezes round and silences music',()=>{assert.equal(duel.match.elapsed,hiddenTime);assert.equal(musicStates.at(-1),false);});
Object.defineProperty(document,'hidden',{value:false,configurable:true});document.dispatchEvent(new window.Event('visibilitychange'));
for(const [width,height] of [[360,202.5],[800,450],[1280,720]]){viewport={width,height};duel.draw(realNow+800);assert.equal(duel.canvas.width,width);}
check('canvas dimensions follow narrow and landscape arena sizes',()=>assert.equal(duel.canvas.width,1280));
duel.startDemo();duel.tick(now+=20);$('.tnd-skip').click();duel.tick(now+=20);duel.tick(now+=20);
duel.match.ball={x:.5,y:rules.CONFIG.radius+.001,vx:0,vy:-.3};duel.tick(now+=20);
check('a real top bounce creates a visible impact and cannot award a goal',()=>{assert.equal(duel.wallImpacts.length,1);assert.equal(duel.wallImpacts[0].wall,'top');assert.deepEqual(duel.match.score,[0,0]);});
duel.tick(now+=500);
check('wall glow expires after its brief impact instead of accumulating',()=>assert.equal(duel.wallImpacts.length,0));
duel.fake[0].distance=.21;duel.fake[0].y=duel.height/2;duel.tick(now+=20);
duel.match.ball={x:duel.fake[0].x+.018,y:duel.fake[0].y,vx:-.34,vy:0};duel.tick(now+=20);
assert.ok(duel.match.capture);
$('.tnd-pause').click();const pausedTime=duel.match.elapsed,pausedBall={...duel.match.ball};
const pausedCatch=structuredClone(duel.match.capture);
duel.tick(now+=5000);
check('pause button freezes ball and active play time and offers resume',()=>{assert.equal(duel.phase,'paused');assert.equal(duel.match.elapsed,pausedTime);assert.deepEqual(duel.match.ball,pausedBall);assert.equal($('.tnd-start').textContent,'Resume');assert.equal(musicStates.at(-1),false);});
check('pausing during a wide catch preserves spring deformation and release timing',()=>assert.deepEqual(duel.match.capture,pausedCatch));
$('.tnd-start').click();duel.tick(now+=2000);duel.tick(now+=20);
check('resume preserves score and does not consume paused time',()=>{assert.equal(duel.phase,'playing');assert.ok(Math.abs(duel.match.elapsed-(pausedTime+.02))<1e-8);assert.deepEqual(duel.match.score,[0,0]);});
duel.tick(now+=100);duel.tick(now+=100);
check('resuming finishes the existing elastic catch once and releases toward the opponent',()=>{assert.equal(duel.match.capture,null);assert.equal(duel.match.hits,1);assert.ok(duel.match.ball.vx>0);});
window.dispatchEvent(new window.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
check('Escape pauses without leaving the game',()=>assert.equal(duel.phase,'paused'));
viewport={width:390,height:292.5};duel.tick(now+=20);
check('portrait rotation updates world height while the match stays paused',()=>{assert.equal(duel.phase,'paused');assert.equal(duel.match.height,.75);assert.ok(duel.match.ball.y>=rules.CONFIG.radius && duel.match.ball.y<=.75-rules.CONFIG.radius);});
check('practice provenance remains on the HUD and result',()=>{assert.equal($('.tnd-mode').textContent,'Camera-free practice');duel.phase='result';duel.render();assert.equal($('.tnd-card-label').textContent,'Practice result');});
duel.mode='camera';duel.ready();duel.nets=rules.updateNets([null,null],[n(.7),n(.85)],now);duel.tick(now+=20);
check('two hands on the same side cannot bypass player setup',()=>{assert.equal(duel.countdown,3);assert.equal(duel.phase,'ready');});
const live=geometry=>({...geometry,active:true,opacity:1,seenAt:now});
duel.nets=[live(rules.geometry({x:.45,y:.23},{x:.53,y:.34})),live(n(.8))];duel.countdown=.01;duel.tick(now+=20);
check('a net straddling center cannot start even when its center is in its own half',()=>{assert.equal(duel.nets[0].center.x,.49);assert.equal(duel.countdown,3);assert.match($('.tnd-p1 small').textContent,/Back from center/);});
duel.nets=[live(n(.2)),live(n(.8))];duel.countdown=.01;duel.tick(now+=20);duel.tick(now+=20);
const beforeCrossing=duel.match.elapsed;
duel.nets=[live(n(.53)),live(n(.8))];duel.tick(now+=20);
check('crossing shows an arrow warning, disables that net and keeps play running',()=>{assert.equal(duel.phase,'playing');assert.ok(duel.match.elapsed>beforeCrossing);assert.equal($('.tnd-p1').dataset.crossed,'true');assert.match($('.tnd-hint').textContent,/P1 ← Return to your half/);assert.equal(musicStates.at(-1),true);});
duel.nets=[live(n(.2)),live(n(.8))];duel.tick(now+=20);
check('returning home clears the crossing warning without restarting the match',()=>{assert.equal($('.tnd-p1').dataset.crossed,'false');assert.doesNotMatch($('.tnd-hint').textContent,/Return to your half/);assert.equal(duel.phase,'playing');});
duel.startDemo();duel.tick(now+=20);duel.stage.setPointerCapture=()=>{};
const pointer=(type,x,id)=>{const event=new window.Event(type,{bubbles:true});Object.assign(event,{clientX:x,clientY:viewport.height/2,pointerId:id});duel.stage.dispatchEvent(event);};
pointer('pointerdown',viewport.width*.2,1);pointer('pointermove',viewport.width*.8,1);
duel.fake[0].angle=1;duel.tick(now+=20);
check('practice drag moves in both axes and clamps the whole net to its own half',()=>{assert.ok(duel.fake[0].x>.3);assert.ok(rules.netInOwnHalf(duel.nets[0],0));assert.ok(rules.netInOwnHalf(duel.nets[1],1));assert.equal(duel.pointers.get(1),0);});
$('.tnd-exit').click();
check('exit cancels active game and hides the route',()=>{assert.equal(duel.active,false);assert.equal(root.hidden,true);});
console.log(JSON.stringify({checks,simulatedRounds:results,scope:'DOM + stub canvas, synthetic hands; not real browser or camera'},null,2));
