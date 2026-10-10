async(page)=>{
  await page.clock.resume();for(const key of ['ArrowLeft','ArrowRight','KeyA','KeyD'])await page.keyboard.up(key);
  const base=new URL(page.url()).origin,checks=[],errors=[];const check=(ok,label)=>{if(!ok)throw Error(label);checks.push(label);};
  page.on('pageerror',e=>errors.push(e.message));await page.goto(base+'/?qa=tilt-turbo-'+Date.now()+'#tilt-turbo');await page.waitForFunction(()=>document.querySelector('.tt-entry .launch-demo')?.disabled===false);
  for(const size of [{width:1440,height:900},{width:360,height:800},{width:390,height:844}]){
    await page.setViewportSize(size);check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'entry no overflow '+size.width);
    check(await page.locator('.tt-cover img').evaluate(i=>i.complete&&i.naturalWidth>0),'generated art '+size.width);
    check(await page.locator('[data-creator-mode="creator"]').evaluate(b=>b.getBoundingClientRect().height>=44),'44px creator target '+size.width);
    if(size.width<=640)check(await page.locator('.launch-camera').evaluate(b=>b.getBoundingClientRect().bottom<=innerHeight),'PLAY visible before scrolling '+size.width);
    await page.screenshot({path:`output/playwright/tilt-turbo-entry-${size.width}.png`,fullPage:true});
  }
  check(await page.evaluate(()=>!document.querySelector('.tt-stage video').srcObject&&!performance.getEntriesByType('resource').some(e=>/\.task|\.wasm/.test(e.name))),'entry starts no sensors or models');
  await page.locator('.launch-howto').click();check((await page.locator('.sheet-content').textContent()).includes('8-bit Stage1'),'BGM credit reachable');await page.keyboard.press('Escape');
  await page.locator('.platform-locale').click();check((await page.locator('.tt-tagline').textContent()).includes('Turn an invisible wheel'),'English copy');await page.locator('.platform-locale').click();
  await page.evaluate(async()=>{const registry=await(await fetch('/src/platform/experiments.js')).text(),path=registry.match(/import\("([^"]*tiltTurbo\/view\.js[^"]*)"\)/)[1];const {TiltTurboView}=await import(path);const render=TiltTurboView.prototype.render;TiltTurboView.prototype.render=function(...args){window.__tt=this;return render.apply(this,args);};});
  await page.locator('[data-creator-mode="creator"]').click();await page.locator('[data-face-mode="HIDE"]').click();
  await page.clock.install();await page.clock.pauseAt(new Date(await page.evaluate(()=>Date.now()+1000)));await page.locator('.launch-demo').click();await page.clock.runFor(350);
  await page.keyboard.down('ArrowLeft');await page.clock.runFor(350);check(await page.evaluate(()=>__tt.game.x<-.7&&__tt.game.elapsed===0),'tutorial car follows left before race');await page.keyboard.up('ArrowLeft');
  await page.keyboard.down('KeyD');await page.clock.runFor(350);check(await page.evaluate(()=>__tt.game.x>.6),'tutorial car follows right');await page.keyboard.up('KeyD');await page.clock.runFor(1950);
  check(await page.evaluate(()=>__tt.phase==='playing'),'roughly three-second demo onboarding');
  await page.keyboard.down('ArrowLeft');await page.clock.runFor(200);await page.keyboard.up('ArrowLeft');await page.keyboard.down('ArrowRight');await page.clock.runFor(350);await page.keyboard.up('ArrowRight');
  await page.screenshot({path:'output/playwright/tilt-turbo-play-390.png',fullPage:true});
  check(await page.locator('.tt-practice').evaluate(e=>e.getBoundingClientRect().bottom<=innerHeight),'mobile controls fit screen');
  await page.locator('.tt-pause').click();const at=await page.evaluate(()=>__tt.game.elapsed);await page.clock.runFor(700);check(await page.evaluate(()=>__tt.game.elapsed)===at,'pause freezes race');await page.locator('.tt-resume').click();
  // Exercise the actual camera motion freshness/fallback boundary in a local instance.
  await page.evaluate(()=>{__tt.source='camera';__tt.signal.neutral=7;__tt.motion={at:performance.now(),tracked:true,ready:true,roll:20,steering:.8};});
  await page.clock.runFor(200);const beforeLoss=await page.evaluate(()=>__tt.game.elapsed);await page.clock.runFor(850);
  check(await page.evaluate(()=>__tt.game.elapsed>0&&__tt.game.lost&&!__tt.game.paused&&Math.abs(__tt.game.x)<.5),'stale camera input returns to center while racing');
  check(await page.evaluate(()=>__tt.game.faceLosses===1),'continuous lost interval counted once');
  await page.evaluate(()=>{__tt.motion={at:performance.now(),tracked:true,ready:true,roll:-15,steering:-.5};});await page.clock.runFor(100);
  check(await page.evaluate(()=>!__tt.game.lost&&__tt.game.steering<0),'reacquisition resumes immediately');await page.evaluate(()=>{__tt.source='demo';});
  const stage=await page.locator('.tt-stage').boundingBox();await page.mouse.move(stage.x+stage.width*.15,stage.y+stage.height*.7);await page.mouse.down();await page.clock.runFor(300);check(await page.evaluate(()=>__tt.game.steering<0),'left-half touch/pointer steers');await page.mouse.up();
  for(let i=0;i<23;i++){await page.clock.runFor(1000);await page.waitForTimeout(25);}
  await page.locator('.tt-result').waitFor();check(await page.evaluate(()=>__tt.game.result.elapsed===20000),'fixed 20-second finish');
  check((await page.locator('.tt-result').textContent()).includes('PRACTICE'),'practice result provenance');
  check(await page.evaluate(()=>__tt.creatorResult?.frames.length>0&&__tt.creatorResult.candidates.some(e=>e.type==='JUMP!')),'creator records final frames and event candidates');
  await page.screenshot({path:'output/playwright/tilt-turbo-result-390.png',fullPage:true});
  await page.locator('[data-result-action="retry"]').click();await page.clock.runFor(100);check(await page.evaluate(()=>__tt.phase==='calibration'&&__tt.game.hits===0&&__tt.game.faceLosses===0),'retry resets round and baseline');
  await page.locator('.game-back').click();await page.locator('.lab-feed').waitFor();check(await page.evaluate(()=>!__tt.active&&!__tt.creator&&__tt.frameId===null&&!__tt.creatorResult),'exit releases input and transient replay');
  await page.goto(base+'/#/game/solo-finger-gun');await page.waitForFunction(()=>document.querySelector('.launch-camera')?.disabled===false);
  check(await page.evaluate(()=>getComputedStyle(document.querySelector('.platform')).getPropertyValue('--pl-bg').trim()!=='#f6f0dd'),'game theme does not leak');
  await page.clock.resume();check(errors.length===0,'no browser exceptions');return {checks,errors};
}
