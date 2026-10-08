// Browser integration suite; pass a Playwright page to runMaruQA().
import assert from 'node:assert/strict';
export async function runMaruQA(page, base = 'http://localhost:5173') {
  const checks = [], errors = [], failed = []; page.on('pageerror', e => errors.push(e.message)); page.on('response', r => { if(r.status() >= 400)failed.push(r.url()); });
  const check = (ok, name) => { assert.ok(ok, name); checks.push(name); };
  await page.goto(base + '/?debug=1#/game/solo-maru-magic');
  await page.locator('.maru-entry .launch-demo:not(:disabled)').waitFor();
  await page.setViewportSize({width:1440,height:900});await page.screenshot({path:'output/maru-magic/desktop-entry.png',fullPage:true});
  check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'desktop entry fits');
  await page.evaluate(async()=>{
    // Use Vite's actual module URL, including its HMR timestamp when present.
    const url=performance.getEntriesByType('resource').find(x=>x.name.includes('/maruMagic/view.js')).name;
    const {MaruView}=await import(url),notify=MaruView.prototype.notify;
    MaruView.prototype.notify=function(...args){window.__maru=this;return notify.apply(this,args);};
  });
  await page.setViewportSize({width:390,height:844});await page.screenshot({path:'output/maru-magic/mobile-entry.png',fullPage:true});
  await page.locator('.launch-demo').click();await page.waitForFunction(()=>window.__maru?.sceneReady);
  check(await page.evaluate(()=>__maru.phase==='playing'&&__maru.source==='demo'&&!__maru.input.running),'touch play starts without camera or model');
  await page.screenshot({path:'output/maru-magic/mobile-ready.png',fullPage:true});
  const gameIdentity=await page.evaluate(()=>{window.__firstGame=__maru.runtime.game;return !!__firstGame;});check(gameIdentity,'Phaser boots');
  const scores=[];
  for(let round=0;round<5;round++) {
    if(round)await page.locator(round%2 ? '.maru-stage-again' : '.maru-again').click();
    const box=await page.locator('.maru-stage').boundingBox(), cx=box.x+box.width*.5,cy=box.y+box.height*.5,r=box.width*.25;
    await page.mouse.move(cx+r,cy);await page.mouse.down();
    for(let i=1;i<=80;i++){const a=i/80*Math.PI*2;await page.mouse.move(cx+Math.cos(a)*r,cy+Math.sin(a)*r);await page.waitForTimeout(8);}
    await page.mouse.up();await page.locator('.maru-result').waitFor({state:'visible'});scores.push(await page.evaluate(()=>__maru.game.result.score));
    check(await page.evaluate(()=>__maru.game.result.ending==='closed'&&__maru.game.result.valid&&__maru.runtime.game===__firstGame),'round '+(round+1)+' auto-closes and reuses renderer');
  }
  check(scores.every(s=>s>=95),'five clean touch circles summon light spirits');
  check(await page.evaluate(()=>__maru.records.best>=95&&__maru.records.fastestMs>150),'separate best score and qualified fastest records saved');
  await page.waitForTimeout(700);await page.screenshot({path:'output/maru-magic/mobile-legend.png',fullPage:true});
  await page.locator('.maru-again').click();
  await page.evaluate(()=>__maru.consume({x:450,y:300},performance.now(),'touch'));
  await page.locator('[data-action="pause"]').click();check(await page.evaluate(()=>__maru.game.paused&&__maru.game.points.length===0&&!__maru.game.result),'pause clears incomplete stroke without scoring');await page.locator('[data-action="resume"]').click();
  await page.evaluate(()=>{
    const g=__maru.game;g.sample({x:450,y:300},performance.now(),'touch');g.startAt=performance.now()-8001;
  });await page.waitForFunction(()=>__maru.game.phase==='summoned');check(await page.evaluate(()=>__maru.game.result.ending==='timeout'&&__maru.game.result.score<50),'input timeout summons a potato');
  await page.screenshot({path:'output/maru-magic/mobile-potato.png',fullPage:true});
  await page.evaluate(()=>__maru.setLocale('en'));check(await page.locator('.maru-again').textContent().then(s=>s.includes('SUMMON AGAIN')),'English result and retry');
  await page.setViewportSize({width:360,height:800});check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'360px result has no horizontal overflow');await page.screenshot({path:'output/maru-magic/mobile-en.png',fullPage:true});
  await page.evaluate(()=>__maru.setLocale('ja'));
  // Real lifecycle, synthetic video/landmarks. Not a physical-hand accuracy test.
  await page.evaluate(()=>{
    window.__denied=true;window.__tip={x:450,y:300};window.__closed=0;
    Object.getPrototypeOf(__maru.input).createRecognizer=async()=>({detectForVideo:()=>({landmarks:__tip?[Array.from({length:21},()=>({x:1-__tip.x/600,y:__tip.y/600,z:0}))]:[]}),close:()=>__closed++});
    Object.defineProperty(navigator.mediaDevices,'getUserMedia',{configurable:true,value:async constraints=>{
      window.__constraints=constraints;if(__denied)throw new DOMException('QA denied','NotAllowedError');
      const c=document.createElement('canvas');c.width=600;c.height=600;const ctx=c.getContext('2d');const stream=c.captureStream(30);window.__stream=stream;
      const track=stream.getVideoTracks()[0],settings=track.getSettings.bind(track);track.getSettings=()=>({...settings(),facingMode:'user'});
      const draw=()=>{if(track.readyState!=='live')return;ctx.fillStyle='#34485b';ctx.fillRect(0,0,600,600);ctx.fillStyle='#45687a';ctx.fillRect(Math.random()*600,200,2,2);requestAnimationFrame(draw);};draw();return stream;
    }});void __maru.startCamera();
  });
  await page.waitForFunction(()=>__maru.phase==='error');check(await page.evaluate(()=>__constraints.audio===false&&__constraints.video.facingMode.exact==='user'&&!__maru.input.running&&!__maru.video.srcObject&&__closed>0),'front camera only, denial releases model and stream');
  await page.evaluate(()=>__denied=false);await page.locator('[data-action="camera"]').click();await page.waitForFunction(()=>__maru.phase==='playing'&&__maru.game.armed);
  await page.waitForFunction(()=>document.querySelector('.maru-cue strong')?.textContent.includes('準備OK'));
  check(await page.locator('.maru-cue').isVisible(),'camera READY has a large explicit cue');
  await page.screenshot({path:'output/maru-magic/camera-ready.png',fullPage:true});
  await page.evaluate(async()=>{for(let i=1;i<=40;i++){const a=i/140*Math.PI*2;__tip={x:300+150*Math.cos(a),y:300+150*Math.sin(a)};await new Promise(r=>setTimeout(r,45));}});
  check(await page.evaluate(()=>__maru.game.phase==='drawing'),'fingertip hold then motion auto-starts');
  await page.evaluate(()=>__tip=null);await page.waitForTimeout(220);check(await page.evaluate(()=>__maru.game.phase==='drawing'&&!__maru.game.result),'brief hand loss preserves stroke');
  await page.evaluate(()=>{const a=40/140*Math.PI*2;__tip={x:300+150*Math.cos(a),y:300+150*Math.sin(a)};});await page.waitForTimeout(120);
  check(await page.evaluate(()=>__maru.game.phase==='drawing'&&__maru.game.excludedMs>0),'reacquisition excludes lost time');
  await page.evaluate(()=>__tip=null);await page.waitForTimeout(750);check(await page.evaluate(()=>__maru.game.phase==='ready'&&!__maru.game.result),'long hand loss resets without an unfair score');
  await page.screenshot({path:'output/maru-magic/camera-recovery.png',fullPage:true});
  await page.evaluate(()=>__tip={x:450,y:300});await page.waitForFunction(()=>__maru.game.armed);
  await page.evaluate(async()=>{for(let i=1;i<=90;i++){const a=i/90*Math.PI*2;__tip={x:300+150*Math.cos(a),y:300+150*Math.sin(a)};await new Promise(r=>setTimeout(r,45));}});
  await page.waitForFunction(()=>__maru.game.phase==='summoned');
  check(await page.evaluate(()=>__maru.input.trackingEnabled&&__maru.input.running&&__maru.game.result.score>=95),'camera stays available after a summon for touch-free retry');
  await page.evaluate(()=>{const t=__maru.retryTarget();window.__retryPoint={x:(t.left+t.right)/2,y:(t.top+t.bottom)/2};__tip=__retryPoint;});await page.waitForTimeout(300);
  check(await page.evaluate(()=>__maru.game.phase==='summoned'&&__maru.retryDwell.progress>0),'a brief hover fills progress but does not retry');
  await page.evaluate(()=>__tip={x:300,y:60});await page.waitForTimeout(120);check(await page.evaluate(()=>__maru.retryDwell.progress===0),'leaving retry target cancels dwell');
  await page.evaluate(()=>__tip=__retryPoint);await page.waitForFunction(()=>__maru.game.phase==='ready');
  check(await page.evaluate(()=>__maru.dwellRetries===1&&!__maru.game.result&&__maru.input.running),'stable 700ms fingertip dwell starts a new attempt with same camera');
  await page.waitForTimeout(500);check(await page.evaluate(()=>!!__maru.game.startExclusion&&!__maru.game.armed&&__maru.game.points.length===0),'holding at retry button never starts the next circle');
  await page.evaluate(()=>__tip={x:450,y:300});await page.waitForFunction(()=>__maru.game.armed);
  check(await page.evaluate(()=>!__maru.game.startExclusion&&__maru.game.phase==='ready'&&__maru.game.anchor.x===450),'new chosen position gets a fresh hold and READY');
  await page.evaluate(()=>__tip={x:440,y:330});await page.waitForFunction(()=>__maru.game.phase==='drawing');
  check(await page.evaluate(()=>__maru.game.points[0].x===450&&__maru.game.points[0].y===300),'the chosen point becomes the next circle start');
  await page.locator('.game-back').click();await page.waitForFunction(()=>!document.querySelector('.maru-phaser canvas'));
  check(await page.evaluate(()=>__stream.getTracks().every(t=>t.readyState==='ended')&&!__maru.input.running&&!__maru.audio.context&&!__maru.runtime),'exit releases video tracks, model, audio and renderer');
  check(errors.length===0,'no uncaught browser errors');check(failed.length===0,'no missing local assets');return {checks,scores,errors,failed};
}
