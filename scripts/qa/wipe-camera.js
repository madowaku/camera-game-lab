// Synthetic landmarks + real canvas MediaStream. No physical-camera claims.
async page=>{
  await page.clock.resume();const base=new URL(page.url()).origin,checks=[],errors=[];
  const check=(ok,label)=>{if(!ok)throw Error(label);checks.push(label);};page.on('pageerror',e=>errors.push(e.message));
  await page.setViewportSize({width:390,height:844});await page.goto(base+'/?qa=wipe-camera-'+Date.now()+'#/game/solo-wipe');
  await page.waitForFunction(()=>document.querySelector('.wipe-entry .launch-camera')?.disabled===false);
  await page.evaluate(async()=>{
    const registry=await(await fetch('/src/platform/experiments.js')).text(),viewPath=registry.match(/import\("([^"]*wipe\/view\.js[^"]*)"\)/)[1];
    const viewSource=await(await fetch(viewPath)).text(),inputPath=viewSource.match(/from ["']([^"']*input\/wipeInput\.js[^"']*)["']/)[1];
    const inputSource=await(await fetch(inputPath)).text(),vision=await import(inputSource.match(/from ["']([^"']*mediapipe[^"']*)["']/)[1]);
    const {WipeView}=await import(viewPath),{WipeInput}=await import(inputPath),render=WipeView.prototype.render,start=WipeInput.prototype.start;
    WipeView.prototype.render=function(...args){window.__wipe=this;return render.apply(this,args);};
    WipeInput.prototype.start=function(){Object.defineProperty(this.video,'currentTime',{configurable:true,get:()=>performance.now()/1000});return start.call(this);};
    window.__lmFor=(x,y)=>Array.from({length:21},(_,i)=>({x:1-x+(i===5?-.04:i===17?.04:0),y,z:0}));
    window.__lm=[];window.__requests=0;window.__closes=0;window.__tracks=[];window.__delegates=[];
    vision.FilesetResolver.forVisionTasks=async()=>({});
    vision.HandLandmarker.createFromOptions=async(_,options)=>{window.__options=options;__delegates.push(options.baseOptions.delegate);if(__delegates.length===1)throw Error('QA GPU fallback');return {close:()=>__closes++,detectForVideo:()=>({landmarks:__lm})};};
    const board=document.createElement('canvas');board.width=720;board.height=1280;const c=board.getContext('2d');c.fillStyle='#ea4343';c.fillRect(0,0,720,1280);c.fillStyle='#51be76';c.fillRect(0,0,360,1280);
    window.__requestStream=async()=>{__requests++;const stream=board.captureStream(30);__tracks.push(...stream.getTracks());const refresh=()=>{if(stream.getVideoTracks().some(t=>t.readyState==='live')){c.fillStyle='#51be76';c.fillRect(0,0,1,1);requestAnimationFrame(refresh);}};requestAnimationFrame(refresh);return stream;};
    navigator.mediaDevices.getUserMedia=__requestStream;
  });
  check(await page.evaluate(()=>__requests===0),'no camera before PLAY');
  await page.locator('[data-wipe-recording="creator"]').click();await page.locator('[data-wipe-face="HIDE"]').click();await page.locator('.launch-camera').click();
  await page.waitForFunction(()=>__wipe.phase==='waiting');check(await page.evaluate(()=>__delegates.join(',')==='GPU,CPU'&&__options.numHands===2),'real lifecycle falls back to CPU and requests two hands');
  check(await page.evaluate(()=>__wipe.game.elapsed===0&&__wipe.game.percent()===0),'camera waits without an invented palm');
  await page.evaluate(()=>{__lm=[__lmFor(.3,.3)];});await page.waitForFunction(()=>__wipe.phase==='playing');
  for(const [x,y] of [[.35,.3],[.4,.3],[.45,.3],[.5,.3],[.55,.3],[.6,.3]]){await page.evaluate(([x,y])=>{__lm=[__lmFor(x,y)];},[x,y]);await page.waitForTimeout(60);}
  check(await page.evaluate(()=>__wipe.game.percent()>0),'synthetic camera palms clean actual dirt');
  await page.evaluate(()=>{__lm=[];});await page.waitForFunction(()=>__wipe.game.paused&&__wipe.game.pauseReason==='tracking');
  const elapsed=await page.evaluate(()=>__wipe.game.elapsed);await page.waitForTimeout(450);check(await page.evaluate(()=>__wipe.game.elapsed)===elapsed,'tracking loss freezes time');
  check((await page.locator('.wipe-overlay').textContent()).includes('画面に戻して'),'tracking loss has a recovery instruction');
  await page.evaluate(()=>{__lm=[__lmFor(.65,.7)];});await page.waitForFunction(()=>!__wipe.game.paused);check(await page.evaluate(()=>__wipe.game.percent()>0),'hand reacquisition resumes automatically');
  await page.evaluate(()=>{const g=__wipe.game;for(let pass=0;pass<3;pass++)for(let y=0;y<=1.00001;y+=.06)for(let k=0;k<=20;k++)g.wipe({x:k/20,y,id:999,radius:.135,present:true});});
  await page.waitForFunction(()=>__wipe.phase==='finish');
  const pixel=await page.locator('.wipe-canvas').evaluate(c=>Array.from(c.getContext('2d').getImageData(400,700,1,1).data));
  check(!(pixel[0]>200&&pixel[1]<100)&&!(pixel[1]>150&&pixel[0]<100),'HIDE clear window never reveals the synthetic raw camera');
  await page.screenshot({path:'output/playwright/wipe-camera-hide-390.png',fullPage:true});
  await page.locator('.wipe-result').waitFor();check(await page.evaluate(()=>__tracks.every(t=>t.readyState==='ended')&&!__wipe.video.srcObject&&__closes>=1),'result closes real stream tracks and recognizer');
  check(await page.evaluate(()=>__wipe.creatorResult.faceMode==='HIDE'&&__wipe.creatorResult.frames.length>0),'HIDE replay retains sanitized frames');
  await page.locator('.game-back').click();await page.evaluate(()=>{location.hash='#/game/duo-wipe';});await page.waitForFunction(()=>document.querySelector('.launch-camera')?.disabled===false);
  await page.locator('.launch-camera').click();await page.waitForFunction(()=>__wipe.phase==='waiting');
  await page.evaluate(()=>{__lm=[__lmFor(.2,.3),__lmFor(.3,.3)];});await page.waitForTimeout(300);check(await page.evaluate(()=>__wipe.phase==='waiting'),'two hands on the left cannot start DUO');
  await page.evaluate(()=>{__lm=[__lmFor(.25,.3),__lmFor(.75,.3)];});await page.waitForFunction(()=>__wipe.phase==='playing');check(await page.evaluate(()=>__wipe.game.players===2),'one hand on each screen side starts DUO');
  await page.evaluate(()=>{__lm=[__lmFor(.25,.3)];});await page.waitForFunction(()=>__wipe.game.paused);check(await page.evaluate(()=>__wipe.game.pauseReason==='tracking'),'missing DUO hand pauses fairly');
  await page.evaluate(()=>{__lm=[__lmFor(.75,.4),__lmFor(.25,.4)];});await page.waitForFunction(()=>!__wipe.game.paused);check(await page.evaluate(()=>__wipe.game.palms.length===2),'reordered landmarks recover both screen sides');
  await page.screenshot({path:'output/playwright/wipe-camera-duo-390.png',fullPage:true});
  await page.locator('.game-back').click();check(await page.evaluate(()=>__tracks.every(t=>t.readyState==='ended')&&!__wipe.active),'exit closes all streams');
  await page.evaluate(()=>{location.hash='#/game/solo-wipe';});await page.waitForFunction(()=>document.querySelector('.launch-camera')?.disabled===false);
  await page.evaluate(()=>{navigator.mediaDevices.getUserMedia=async()=>{throw new DOMException('QA permission denial','NotAllowedError');};});
  await page.locator('.launch-camera').click();await page.waitForFunction(()=>__wipe.phase==='error');check(await page.locator('.wipe-camera-retry').isVisible(),'permission denial exposes camera retry');
  check(await page.locator('.wipe-practice').isVisible(),'permission denial exposes camera-free recovery');
  await page.locator('.wipe-practice').click();await page.waitForFunction(()=>__wipe.source==='demo'&&__wipe.phase==='waiting');check(await page.evaluate(()=>!__wipe.input.running),'camera denial can recover into practice');
  await page.locator('.game-back').click();
  check(errors.length===0,'no camera-path browser exceptions');return {checks,errors};
}
