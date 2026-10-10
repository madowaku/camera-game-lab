// Run with playwright-cli run-code --filename=scripts/qa/tension-solo.js.
// Actual browser and canvas; synthetic input does not verify physical cameras.
async (page) => {
  const checks=[],errors=[],failedAssets=[],requests=[];
  const check=(value,label)=>{if(!value)throw Error(label);checks.push(label);};
  const origin=new URL(page.url()).origin, run=Math.random().toString(36).slice(2);
  page.on('pageerror',error=>errors.push(error.message));
  page.on('response',response=>{if(/tension-(break|duel)/.test(response.url())&&response.status()>=400)failedAssets.push(response.url());});
  page.on('request',request=>requests.push(request.url()));
  await page.clock.install();await page.clock.pauseAt(new Date(Date.now()+200));
  const capture=()=>page.evaluate(async url=>{
    const {TensionSolo}=await import(url);
    const activate=TensionSolo.prototype.activate;
    TensionSolo.prototype.activate=function(...args){window.__solo=this;return activate.apply(this,args);};
  },requests.findLast(url=>/\/src\/tension\/solo\.js(?:\?|$)/.test(url)));
  const ready=async()=>{await page.locator('.launch-demo').waitFor();await page.locator('.launch-demo').isEnabled();};
  for(const [width,height]of [[1440,900],[844,390],[390,844]]){
    await page.setViewportSize({width,height});
    for(const side of ['right','left'])for(const layout of ['first-boing','the-gap','corner-shot']){
      const tag=`${width}x${height}-${side}-${layout}`;
      await page.goto(`${origin}/?qa=${tag}-${run}#tension-break`);await ready();await capture();
      await page.locator('.launch-demo').click();
      check(await page.locator('.tns-hands').isVisible(),`${tag}: hand selection`);
      await page.locator(`[data-hand="${side}"]`).click();await page.locator(`[data-layout="${layout}"]`).click();
      check(await page.locator(`[data-layout="${layout}"]`).getAttribute('aria-pressed')==='true',`${tag}: layout selection`);
      await page.locator('.tns-confirm-layout').click();await page.clock.runFor(1800);
      check(await page.evaluate(()=>__solo.phase==='playing'&&__solo.match.lives===3),`${tag}: countdown and first serve`);
      check(await page.evaluate(()=>__solo.handSide===localStorage.getItem('camera-game-lab-tension-solo-hand')),`${tag}: saved preference`);
      check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${tag}: no horizontal overflow`);
      check(await page.evaluate(()=>{const v=__solo,c=v.canvas,ctx=c.getContext('2d'),p=ctx.getImageData(0,0,c.width,c.height).data;return p.some((n,i)=>i%4===3&&n>0);}),`${tag}: nonblank canvas`);
      await page.locator('.tns-shell').screenshot({path:`output/playwright/tension-solo-${tag}.png`});
      await page.locator('input[data-kind="angle"]').fill('25');await page.locator('input[data-kind="opening"]').fill('19');await page.clock.runFor(40);
      check(await page.evaluate(()=>__solo.net.distance>.18&&__solo.fake.angle>.4),`${tag}: tilt/opening controls`);
      const box=await page.locator('.tns-stage').boundingBox();
      await page.mouse.move(box.x+box.width*(side==='right'?.82:.18),box.y+box.height*.55);await page.mouse.down();await page.mouse.move(box.x+box.width*.5,box.y+box.height*.65);await page.mouse.up();await page.clock.runFor(40);
      check(await page.evaluate(()=>__solo.fake.y/__solo.height>.6),`${tag}: pointer drag`);
      await page.locator('.tns-pause').click();const before=await page.evaluate(()=>JSON.stringify(__solo.match));await page.clock.runFor(1000);
      check(await page.evaluate(()=>JSON.stringify(__solo.match))===before,`${tag}: pause freezes state`);
      await page.locator('.tns-resume').click();await page.clock.runFor(40);
      await page.evaluate(()=>{__solo.match.elapsed=29.99;});await page.clock.runFor(40);await page.locator('.arcade-result-card').waitFor();
      check((await page.locator('.arcade-result-card h2').textContent())==='TIME UP',`${tag}: measured result`);
      check((await page.locator('.arcade-result-source').textContent()).includes('練習'),`${tag}: practice provenance`);
      await page.locator('[data-result-action="retry"]').click();await page.clock.runFor(1800);
      check(await page.evaluate(()=>__solo.phase==='playing'&&__solo.layoutId===__solo.match.layoutId&&__solo.match.score===0&&__solo.match.lives===3),`${tag}: retry without refresh`);
      await page.evaluate(()=>{__solo.match.elapsed=29.99;});await page.clock.runFor(40);await page.locator('[data-result-action="change-layout"]').click();
      check(await page.locator('.tns-layouts').isVisible(),`${tag}: result change-layout`);
    }
  }
  // The browser renders an actual loss/return stream; input/model are stubbed.
  await page.setViewportSize({width:844,height:390});await page.goto(`${origin}/?qa=camera-${run}#tension-break`);await ready();await capture();
  await page.locator('.launch-camera').click();await page.locator('[data-hand="right"]').click();
  await page.evaluate(()=>{__solo.input.start=async()=>{__solo.input.running=true;};});await page.locator('.tns-confirm-layout').click();await page.clock.runFor(2000);
  check(await page.evaluate(()=>__solo.phase==='ready'&&__solo.match.elapsed===0), 'camera waits for usable C');
  await page.evaluate(async()=>{const {geometry}=await import('/src/tension/rules.js');window.__sample={...geometry({x:.82,y:.2},{x:.82,y:.36}),active:true};__solo.input.onResult([__sample],performance.now());__solo.countdown=.01;});await page.clock.runFor(60);
  check(await page.evaluate(()=>__solo.phase==='playing'),'synthetic camera enters play');await page.clock.runFor(400);const frozen=await page.evaluate(()=>JSON.stringify(__solo.match));await page.clock.runFor(2000);
  check(await page.evaluate(()=>JSON.stringify(__solo.match))===frozen,'tracking loss pauses timer/ball/lives');
  await page.locator('.tns-shell').screenshot({path:'output/playwright/tension-solo-camera-loss.png'});
  await page.evaluate(()=>__solo.input.onResult([__sample],performance.now()));await page.clock.runFor(40);
  check(await page.evaluate(()=>!__solo.paused&&__solo.match.lives===3),'reacquisition preserves lives');
  await page.locator('.tns-pause').click();await page.locator('.tns-change-hand').click();
  check(await page.locator('.tns-switch-confirm').isVisible(),'explicit hand-switch confirmation');await page.locator('.tns-switch-confirm').click();
  check(await page.evaluate(()=>__solo.handSide==='left'&&__solo.match.elapsed===0&&__solo.match.lives===3),'confirmed hand switch resets safely');
  await page.evaluate(()=>__solo.cameraFailed({name:'NotAllowedError'}));check((await page.locator('.tns-status').textContent()).includes('許可'),'denied camera explains recovery');
  await page.locator('.tns-demo-recovery').click();await page.clock.runFor(1800);check(await page.evaluate(()=>__solo.mode==='demo'&&__solo.phase==='playing'),'denial recovers into practice');
  await page.locator('.platform-locale').click();check((await page.locator('.tns-mode').textContent()).includes('PRACTICE'),'live EN switch');
  await page.locator('.tns-shell').screenshot({path:'output/playwright/tension-solo-en.png'});
  // Complete a full, unshortened 30-second attempt, including real misses.
  await page.evaluate(()=>{__solo.ready();__solo.fake.y=.06;});await page.clock.runFor(34000);await page.locator('.arcade-result-card').waitFor();
  check(['TIME UP','GAME OVER'].includes(await page.locator('.arcade-result-card h2').textContent()),'complete ordinary practice round');
  await page.locator('[data-result-action="browse"]').click();check((await page.url()).includes('/feed/'),'result back exits');
  check(errors.length===0,'no browser exceptions');check(failedAssets.length===0,'no failed local assets');
  check(!requests.some(url=>/mediapipe-models|gesture_recognizer.task/.test(url)),'practice did not download recognition model');
  // Leave the CLI/browser's own completion timers running after frozen-clock QA.
  await page.clock.resume();
  return {checks:checks.length,matrix:18,errors,failedAssets,scope:'Browser/canvas + synthetic tracking; physical camera and human game feel unverified'};
}
