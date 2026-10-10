// Synthetic face landmarks exercise real camera ownership, not human accuracy.
async(page)=>{
  await page.clock.resume();const base=new URL(page.url()).origin,checks=[],errors=[];const check=(ok,label)=>{if(!ok)throw Error(label);checks.push(label);};page.on('pageerror',e=>errors.push(e.message));
  await page.setViewportSize({width:390,height:844});await page.goto(base+'/?qa=tilt-camera-'+Date.now()+'#tilt-turbo');await page.waitForFunction(()=>document.querySelector('.tt-entry .launch-camera')?.disabled===false);
  await page.evaluate(async()=>{
    const registry=await(await fetch('/src/platform/experiments.js')).text(),viewPath=registry.match(/import\("([^"]*tiltTurbo\/view\.js[^"]*)"\)/)[1],viewText=await(await fetch(viewPath)).text(),inputPath=viewText.match(/from ["']([^"']*input\/tiltTurboInput\.js[^"']*)["']/)[1],inputText=await(await fetch(inputPath)).text();
    const vision=await import(inputText.match(/from ["']([^"']*mediapipe[^"']*)["']/)[1]),{TiltTurboInput}=await import(inputPath),{TiltTurboView}=await import(viewPath),render=TiltTurboView.prototype.render,start=TiltTurboInput.prototype.start;
    TiltTurboView.prototype.render=function(...args){window.__tt=this;return render.apply(this,args);};TiltTurboInput.prototype.start=function(){Object.defineProperty(this.video,'currentTime',{configurable:true,get:()=>performance.now()/1000});return start.call(this);};
    window.__raw=9;window.__visible=true;window.__closed=0;window.__options=[];window.__tracks=[];window.__gpuFail=true;
    window.__points=()=>{const p=Array.from({length:478},()=>({x:.5,y:.5,z:0})),slope=Math.tan(-__raw*Math.PI/180)*720/1280;p[33]=p[133]={x:.35,y:.5-.15*slope};p[263]=p[362]={x:.65,y:.5+.15*slope};p[10]={x:.5,y:.25};p[152]={x:.5,y:.75};return p;};
    vision.FilesetResolver.forVisionTasks=async()=>({});vision.FaceLandmarker.createFromOptions=async(_,options)=>{__options.push(options);if(__gpuFail&&options.baseOptions.delegate==='GPU'){__gpuFail=false;throw Error('QA GPU fallback');}return {close:()=>__closed++,detectForVideo:()=>({faceLandmarks:__visible?[__points()]:[]})};};
    const board=document.createElement('canvas');board.width=720;board.height=1280;const c=board.getContext('2d');c.fillStyle='#25b379';c.fillRect(0,0,720,1280);window.__paint=setInterval(()=>c.fillRect(0,0,2,2),50);
    const stream=()=>{const s=board.captureStream(30);__tracks.push(...s.getTracks());return s;};navigator.mediaDevices.getUserMedia=async constraints=>{window.__constraints=constraints;if(window.__deny)throw new DOMException('QA denial','NotAllowedError');if(window.__delay)return new Promise(resolve=>{window.__grant=()=>resolve(stream());});return stream();};
  });
  await page.locator('[data-creator-mode="creator"]').click();await page.locator('[data-face-mode="HIDE"]').click();await page.locator('[data-drive-option="head"]').click();await page.locator('.launch-camera').click();await page.waitForFunction(()=>window.__tt?.input.running);
  await page.clock.install();await page.clock.pauseAt(new Date(await page.evaluate(()=>Date.now()+1000)));await page.clock.runFor(800);
  check(await page.evaluate(()=>Math.abs(__tt.signal.neutral-9)<.1),'camera baseline compensates 9-degree phone roll');
  check(await page.evaluate(()=>__constraints.audio===false&&__constraints.video.facingMode.exact==='user'),'front camera and no mic');
  check(await page.evaluate(()=>__options.map(o=>o.baseOptions.delegate).join()==='GPU,CPU'&&__options.every(o=>o.numFaces===1&&!o.outputFaceBlendshapes)),'one FaceLandmarker with CPU fallback');
  await page.evaluate(()=>{__raw=-11;});await page.clock.runFor(350);check(await page.evaluate(()=>__tt.game.x<-.65),'mirrored left camera tilt moves car left');
  await page.evaluate(()=>{__raw=29;});await page.clock.runFor(350);check(await page.evaluate(()=>__tt.game.x>.65),'mirrored right camera tilt moves car right');
  await page.evaluate(()=>{__raw=9;});await page.clock.runFor(1600);check(await page.evaluate(()=>__tt.phase==='playing'),'camera goes from quick calibration to race');
  const pixel=await page.evaluate(()=>Array.from(__tt.canvas.getContext('2d').getImageData(30,90,1,1).data));check(!(pixel[1]>150&&pixel[0]<60),'HIDE does not draw raw green camera');
  await page.evaluate(()=>{__visible=false;});const at=await page.evaluate(()=>__tt.game.elapsed);await page.clock.runFor(850);check(await page.evaluate(old=>__tt.game.elapsed>old&&!__tt.game.paused&&__tt.game.lost,at),'missing face never freezes race');
  await page.evaluate(()=>{__visible=true;__raw=-6;});await page.clock.runFor(160);check(await page.evaluate(()=>!__tt.game.lost&&__tt.game.steering<-.3&&Math.abs(__tt.signal.neutral-9)<.1),'recovery preserves neutral and resumes promptly');
  await page.screenshot({path:'output/playwright/tilt-turbo-camera-hide-390.png',fullPage:true});
  await page.locator('.game-back').click();await page.locator('.lab-feed').waitFor();check(await page.evaluate(()=>__tracks.every(t=>t.readyState==='ended')&&__closed===1&&!__tt.video.srcObject&&!__tt.active),'exit closes real stream and recognizer');
  await page.clock.resume();await page.evaluate(()=>{__delay=true;location.hash='#tilt-turbo';});await page.waitForFunction(()=>document.querySelector('.launch-camera')?.disabled===false);await page.locator('[data-drive-option="head"]').click();await page.locator('.launch-camera').click();await page.waitForFunction(()=>typeof __grant==='function');await page.locator('.game-back').click();await page.locator('.lab-feed').waitFor();await page.evaluate(()=>{__grant();__delay=false;});await page.waitForFunction(()=>__tracks.every(t=>t.readyState==='ended'));
  check(await page.evaluate(()=>!__tt.active&&!__tt.video.srcObject&&__closed===2),'late permission grant after exit cannot revive camera');
  await page.evaluate(()=>{__deny=true;location.hash='#tilt-turbo';});await page.waitForFunction(()=>document.querySelector('.launch-camera')?.disabled===false);await page.locator('[data-drive-option="head"]').click();await page.locator('.launch-camera').click();await page.locator('.tt-demo').waitFor();check(await page.evaluate(()=>__tt.phase==='error'),'permission denial offers recovery');
  await page.locator('.tt-demo').click();await page.clock.runFor(3100);check(await page.evaluate(()=>__tt.source==='demo'&&__tt.phase==='playing'&&__tracks.every(t=>t.readyState==='ended')),'denied camera can play practice');
  await page.locator('.game-back').click();await page.clock.resume();await page.evaluate(()=>clearInterval(__paint));check(errors.length===0,'no browser exceptions');return {checks,errors};
}
