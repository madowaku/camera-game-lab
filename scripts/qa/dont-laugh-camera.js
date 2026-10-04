// Synthetic front-camera stream and landmark frames; real hardware gates stay explicit.
async (page) => {
  try {
  const base=new URL(page.url()).origin,checks=[],errors=[];const check=(ok,label)=>{if(!ok)throw Error(label);checks.push(label);};page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/?qa=dont-laugh-camera-'+Date.now()+'#/game/solo-dont-laugh');await page.waitForFunction(()=>document.querySelector('.launch-camera')?.disabled===false);
  await page.evaluate(async()=>{
    const registry=await(await fetch('/src/platform/experiments.js')).text(),path=registry.match(/import\("([^"]*dontLaugh\/view\.js[^"]*)"\)/)[1],{DontLaughView}=await import(path),src=await(await fetch(path)).text(),ip=src.match(/from ["']([^"']*input\/dontLaughInput\.js[^"']*)["']/)[1],{DontLaughInput}=await import(ip);
    const render=DontLaughView.prototype.render;DontLaughView.prototype.render=function(...a){window.__dl=this;return render.apply(this,a);};
    window.__faceMode='neutral';window.__cameraTracks=[];
    window.__faceResult=()=>{
      const p=Array.from({length:478},()=>({x:.5,y:.5}));for(const [i,x,y]of[[10,.5,.23],[152,.5,.72],[234,.31,.48],[454,.69,.48],[61,.41,.6],[291,.59,.6],[13,.5,.598],[14,.5,.602],[33,.36,.4],[133,.44,.4],[159,.4,.389],[145,.4,.411],[263,.64,.4],[362,.56,.4],[386,.6,.389],[374,.6,.411]])p[i]={x,y};
      const smiling=__faceMode==='smile';return{faceLandmarks:__faceMode==='lost'?[]:__faceMode==='multiple'?[p,p]:[p],faceBlendshapes:[{categories:['mouthSmileLeft','mouthSmileRight','cheekSquintLeft','cheekSquintRight'].map(categoryName=>({categoryName,score:smiling?.88:.01}))}]};
    };
    const stop=DontLaughInput.prototype.stop;
    DontLaughInput.prototype.start=async function(){
      if(window.__denyCamera)throw new DOMException('Synthetic permission denied','NotAllowedError');
      const canvas=document.createElement('canvas');canvas.width=360;canvas.height=640;const c=canvas.getContext('2d');c.drawImage(document.querySelector('.dl-cover img'),0,0,360,640);const stream=canvas.captureStream(20);__cameraTracks.push(...stream.getTracks());this.session={stream,recognizer:{close(){}}};this.video.srcObject=stream;await this.video.play();this.running=true;this.onStatus('READY');
      this.__timer=setInterval(()=>this.processResult(__faceResult(),performance.now()),40);
    };
    DontLaughInput.prototype.stop=function(){clearInterval(this.__timer);stop.call(this);};
  });
  await page.setViewportSize({width:390,height:844});await page.locator('.launch-camera').click();await page.waitForFunction(()=>window.__dl?.phase==='framing'&&__dl.frame?.ready);
  check(await page.evaluate(()=>__dl.source==='camera'&&__dl.input.running&&__dl.input.tracker.neutral!=null),'camera startup measures neutral face');
  await page.evaluate(()=>clearInterval(__dl.input.__timer));await page.clock.install();await page.evaluate(()=>{__dl.input.__timer=setInterval(()=>__dl.input.processResult(__faceResult(),performance.now()),40);});await page.clock.pauseAt(await page.evaluate(()=>Date.now()+1000));await page.locator('.dl-start').click();await page.clock.runFor(3150);check(await page.evaluate(()=>__dl.phase==='playing'),'camera START runs 3-second countdown');
  await page.clock.runFor(1500);await page.evaluate(()=>__faceMode='lost');await page.clock.runFor(120);const elapsed=await page.evaluate(()=>__dl.game.elapsed);await page.clock.runFor(1000);
  check(await page.evaluate(at=>__dl.inputLost&&__dl.game.elapsed===at,elapsed),'missing face freezes active clock');
  await page.evaluate(()=>__faceMode='neutral');await page.clock.runFor(180);check(await page.evaluate(()=>__dl.inputLost),'recovery needs stable observations');await page.clock.runFor(200);check(await page.evaluate(()=>!__dl.inputLost),'stable face resumes');
  await page.evaluate(()=>__faceMode='multiple');await page.clock.runFor(100);const multiAt=await page.evaluate(()=>__dl.game.elapsed);await page.clock.runFor(500);check(await page.evaluate(at=>__dl.inputLost&&__dl.game.elapsed===at,multiAt),'multiple faces pause without false survival');
  await page.evaluate(()=>__faceMode='neutral');await page.clock.runFor(400);await page.screenshot({path:'output/playwright/dont-laugh-camera-390.png',fullPage:true});
  await page.evaluate(()=>clearInterval(__dl.input.__timer));await page.clock.runFor(240);const staleAt=await page.evaluate(()=>__dl.game.elapsed);await page.clock.runFor(600);check(await page.evaluate(at=>__dl.inputLost&&__dl.game.elapsed===at,staleAt),'stalled inference never keeps a stale face alive');
  await page.evaluate(()=>{__dl.input.__timer=setInterval(()=>__dl.input.processResult(__faceResult(),performance.now()),40);});await page.clock.runFor(400);
  await page.evaluate(()=>__faceMode='smile');await page.clock.runFor(250);check(await page.evaluate(()=>__dl.phase==='playing'),'short real signal is tolerated');await page.clock.runFor(1100);await page.locator('.dl-result').waitFor();
  check(await page.evaluate(()=>__dl.result.reason==='laughed'&&__dl.source==='camera'&&__dl.result.best<15),'sustained camera smile fails without practice best contamination');
  check(await page.evaluate(()=>__cameraTracks.every(t=>t.readyState==='ended')&&!__dl.video.srcObject&&!__dl.input.running),'result stops every acquired camera track');
  check(await page.evaluate(()=>Object.values(JSON.parse(localStorage.getItem('dont-laugh-reactions-v1'))).every(v=>Number.isFinite(v.sum)&&Number.isFinite(v.count))),'only numeric reactions persist');
  await page.screenshot({path:'output/playwright/dont-laugh-camera-caught-390.png',fullPage:true});await page.clock.resume();await page.locator('.game-back').click();await page.locator('.lab-feed').waitFor();
  await page.evaluate(()=>{window.__denyCamera=true;location.hash='#/game/solo-dont-laugh';});await page.waitForFunction(()=>document.querySelector('.launch-camera')?.disabled===false);await page.locator('.launch-camera').click();await page.locator('.dl-demo').waitFor();
  check(await page.evaluate(()=>__dl.phase==='error'&&!__dl.input.running),'permission denial stays recoverable');await page.clock.pauseAt(await page.evaluate(()=>Date.now()+1000));await page.locator('.dl-demo').click();await page.clock.runFor(3150);check(await page.evaluate(()=>__dl.source==='demo'&&__dl.phase==='playing'),'denied camera can switch into working practice');
  await page.clock.resume();await page.locator('.game-back').click();await page.locator('.lab-feed').waitFor();check(await page.evaluate(()=>__cameraTracks.every(t=>t.readyState==='ended')&&!__dl.active),'exit releases synthetic tracks and frame loop');
  check(errors.length===0,'no camera-path browser exceptions');return{checks,errors,source:'synthetic canvas camera + landmarks'};
  } finally { await page.clock.resume(); }
}
