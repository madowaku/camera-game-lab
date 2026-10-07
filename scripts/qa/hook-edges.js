async(page)=>{
  const base=new URL(page.url()).origin,checks=[],errors=[],check=(ok,name)=>{if(!ok)throw Error(name);checks.push(name);};
  page.on('pageerror',e=>errors.push(e.message));
  await page.emulateMedia({reducedMotion:'no-preference'});await page.goto(base+'/?hookedges='+Date.now()+'#/');
  await page.evaluate(async()=>{const registry=await(await fetch('/src/platform/experiments.js')).text(),path=registry.match(/import\("([^"]*\/hook\/view\.js[^"]*)"\)/)[1],{HookView}=await import(path),render=HookView.prototype.render;HookView.prototype.render=function(...a){window.__hook=this;return render.apply(this,a);};location.hash='#/game/solo-hook';});
  await page.locator('.launch-demo:not(:disabled)').waitFor();await page.setViewportSize({width:390,height:844});await page.clock.install();await page.locator('.launch-demo').click();await page.clock.runFor(250);await page.waitForFunction(()=>__hook.sceneReady&&__hook.three.scene);await page.clock.pauseAt(await page.evaluate(()=>Date.now()));
  await page.evaluate(()=>{__hook.three.layer.canvas.dispatchEvent(new Event('webglcontextlost',{cancelable:true}));});
  check(await page.evaluate(()=>!!__hook.three.error&&!__hook.three.layer),'Three context loss leaves the Phaser game available');
  const catchFish=async(random)=>{
    await page.evaluate(r=>{__hook.game.random=()=>r;},random);await page.keyboard.press('Space');
    for(let i=0;i<35;i++){if(await page.evaluate(()=>__hook.game.phase==='bite'))break;await page.clock.runFor(100);}
    await page.keyboard.press('ArrowUp');
    for(let i=0;i<90;i++){if(await page.evaluate(()=>__hook.game.phase!=='fight'))break;const d=await page.evaluate(()=>__hook.game.direction);await page.keyboard.up('ArrowLeft');await page.keyboard.up('ArrowRight');await page.keyboard.down(d>0?'ArrowLeft':'ArrowRight');await page.clock.runFor(100);}
    await page.keyboard.up('ArrowLeft');await page.keyboard.up('ArrowRight');check(await page.evaluate(()=>__hook.game.phase==='landing'&&__hook.scene.fish.visible),'earned landing uses visible 2D fallback');await page.clock.runFor(1400);
  };
  await catchFish(.3);await page.clock.runFor(1200);
  await catchFish(.999);
  check(await page.evaluate(()=>__hook.game.lastCatch.id==='HUMAN'),'rare human fish is caught through normal inputs');
  check((await page.locator('.hook-catch p').textContent()).match(/釣るなよ|Don.t fish me/),'human fish speaks at catch');await page.screenshot({path:'output/playwright/hook-human-fallback.png'});
  await page.locator('.hook-release').click();check(await page.evaluate(()=>__hook.game.releasedHuman&&__hook.game.phase==='ready'&&localStorage.getItem('camera-game-lab-hook-colleague-v1')==='true'),'RELEASE unlocks the persisted colleague achievement');
  await page.locator('.hook-stage').focus();await catchFish(.94);
  check(await page.evaluate(()=>__hook.game.lastCatch.id==='BOOT'),'boot is caught through normal inputs');
  check(await page.evaluate(()=>__hook.scene.fish.displayHeight<=__hook.scene.scale.height*.3),'portrait boot fits the trophy area');await page.screenshot({path:'output/playwright/hook-boot-fallback.png'});
  await page.emulateMedia({reducedMotion:'reduce'});await page.clock.runFor(100);check(await page.evaluate(()=>__hook.reducedMotion),'reduced motion updates during play');
  await page.evaluate(()=>window.dispatchEvent(new Event('blur')));const at=await page.evaluate(()=>__hook.game.elapsed);await page.clock.runFor(500);check(await page.evaluate(t=>__hook.manualPause&&__hook.game.elapsed===t,at),'focus loss pauses the round');await page.locator('.hook-resume').click();
  await page.clock.runFor(40000);await page.locator('.hook-result').waitFor();await page.clock.runFor(500);check(await page.locator('.hook-achievement').count()===1,'result includes the earned colleague achievement');
  await page.clock.resume();await page.locator('.game-back').click();check(errors.length===0,'no uncaught errors across fallback and rare catches');return{checks,errors};
}
