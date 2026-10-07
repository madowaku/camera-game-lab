async(page)=>{
  const checks=[],errors=[];const check=(v,name)=>{if(!v)throw Error(name);checks.push(name);};page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:5193/?sdqa='+Date.now()+'#/game/solo-finger-gun-showdown');
  await page.locator('.sd-entry .launch-demo:not(:disabled)').waitFor();
  await page.evaluate(async()=>{const {experiments}=await import('/src/platform/experiments.js');const factory=await experiments.find(g=>g.id==='solo-finger-gun-showdown').load();const temporary=factory(document.createElement('div'),'ja'),proto=Object.getPrototypeOf(temporary),notify=proto.notify;proto.notify=function(){window.__sd=this;return notify.call(this);};temporary.deactivate();});
  await page.setViewportSize({width:390,height:844});check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'mobile entry fits');
  await page.locator('.sd-creator').check();await page.locator('.sd-face-mode').selectOption('HIDE');
  await page.screenshot({path:'output/playwright/showdown-entry.png',fullPage:true});
  await page.locator('.launch-demo').click();await page.locator('.sd-render canvas').waitFor();
  await page.waitForFunction(()=>__sd.game.clock>.25);
  check(await page.evaluate(()=>__sd.source==='demo'&&!__sd.video.srcObject),'practice needs no camera');
  const stage=await page.locator('.sd-stage').boundingBox();const enemy=await page.evaluate(()=>__sd.game.enemies[0]);
  await page.mouse.click(stage.x+enemy.x*stage.width,stage.y+enemy.y*stage.height);
  check(await page.evaluate(()=>__sd.game.hits===1&&__sd.game.ammo===5),'real pointer shoots enemy and consumes ammo');
  await page.keyboard.press('p');const clock=await page.evaluate(()=>__sd.game.clock);await page.waitForTimeout(200);check(await page.evaluate(t=>__sd.game.clock===t,clock),'pause freezes clock');
  await page.locator('.sd-start').click();await page.keyboard.press('r');check(await page.evaluate(()=>__sd.game.ammo===6),'keyboard reload fills magazine');
  await page.screenshot({path:'output/playwright/showdown-play.png',fullPage:true});
  await page.evaluate(()=>{__sd.game.clock=22.99;});await page.waitForFunction(()=>__sd.game.phase==='high-noon');
  check(await page.evaluate(()=>__sd.game.enemies.length===5&&__sd.snapshot().musicSilent),'HIGH NOON five enemies and BGM pause');
  await page.screenshot({path:'output/playwright/showdown-high-noon.png',fullPage:true});
  await page.evaluate(()=>{__sd.game.clock=26.99;});await page.waitForFunction(()=>__sd.game.phase==='final');await page.waitForFunction(()=>__sd.game.clock>27.2);
  const boss=await page.evaluate(()=>__sd.game.enemies[0]);await page.mouse.click(stage.x+boss.x*stage.width,stage.y+boss.y*stage.height);
  check(await page.evaluate(()=>__sd.game.final),'final boss responds to actual pointer');
  await page.evaluate(()=>{__sd.game.clock=29.99;});await page.locator('.sd-result').waitFor();
  check(await page.evaluate(()=>__sd.game.result.creator.frames.length>0&&!__sd.input.running),'creator frames retained and camera released on result');
  await page.locator('.sd-replay-play').click();await page.screenshot({path:'output/playwright/showdown-result.png',fullPage:true});
  if(!await page.locator('.sd-save').isDisabled()){const download=page.waitForEvent('download',{timeout:20000});await page.locator('.sd-save').click();const file=await download;check(/camera-game-058-7s\.(webm|mp4)/.test(file.suggestedFilename()),'seven-second silent video exports');await file.saveAs('output/playwright/showdown-highlight.'+file.suggestedFilename().split('.').at(-1));}
  await page.locator('[data-result-action="retry"]').click();await page.waitForFunction(()=>__sd.phase==='playing'&&__sd.game.clock<2);check(await page.locator('.sd-render canvas').count()===1,'retry has one renderer');
  await page.locator('.game-back').click();await page.waitForFunction(()=>!document.querySelector('.sd-render canvas'));check(await page.evaluate(()=>!__sd.active&&!__sd.input.running),'exit releases camera and renderer');
  check(!errors.length,'no browser runtime errors: '+errors.join(','));return{checks,errors};
}
