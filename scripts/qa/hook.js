async (page) => {
  const base = new URL(page.url()).origin, checks = [], errors = [];
  const check = (ok, name) => { if (!ok) throw Error(name); checks.push(name); };
  page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(() => { localStorage.setItem('camera-game-lab-locale', 'ja'); localStorage.setItem('camera-game-lab-platform-onboarded-v1','true'); localStorage.setItem('camera-game-lab-bgm-v1','true'); });
  await page.goto(base + '/?qa=hook-' + Date.now() + '#/');
  await page.evaluate(async () => { const registry=await(await fetch('/src/platform/experiments.js')).text(); const path=registry.match(/import\("([^"]*\/hook\/view\.js[^"]*)"\)/)[1]; const {HookView} = await import(path); const original=HookView.prototype.render; HookView.prototype.render=function(...a){window.__hook=this;return original.apply(this,a);}; location.hash='#/game/solo-hook'; });
  await page.waitForFunction(() => document.querySelector('.hook-entry .launch-demo')?.disabled === false);
  for (const size of [{width:390,height:844},{width:1440,height:900},{width:320,height:640}]) {
    await page.setViewportSize(size);
    check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'entry has no overflow '+size.width);
    check(await page.locator('.hook-cover>img').evaluate(i => i.complete && i.naturalWidth > 0), 'Imagegen cover loads '+size.width);
    check(await page.locator('.hook-roster img').evaluateAll(a => a.every(i => i.complete && i.naturalWidth > 0)), 'five alpha sprites load '+size.width);
    await page.screenshot({path:`output/playwright/hook-entry-${size.width}.png`});
  }
  check(await page.evaluate(() => !performance.getEntriesByType('resource').some(e => /\.task|\.wasm/.test(e.name)) && !document.querySelector('.hook-stage video').srcObject),'browsing never requests camera or model');
  await page.locator('.launch-howto').click(); check((await page.locator('.sheet-content').textContent()).includes('ぷかぷか'),'how-to credits OpenTracks music'); await page.keyboard.press('Escape');
  await page.setViewportSize({width:390,height:844}); await page.clock.install(); await page.locator('.launch-demo').click(); await page.clock.runFor(250);
  await page.waitForFunction(() => __hook.sceneReady && __hook.three.scene);
  await page.clock.pauseAt(await page.evaluate(() => Date.now()));
  await page.evaluate(() => { __hook.game.random=()=>.08; });
  check(await page.evaluate(() => __hook.game.phase === 'ready' && __hook.source === 'demo'),'practice is ready to cast');
  check(await page.locator('.hook-stage canvas').count() === 2,'Phaser and shared Three layers created');
  await page.screenshot({path:'output/playwright/hook-ready-390.png'});
  await page.keyboard.press('Space'); await page.clock.runFor(500); check(await page.evaluate(() => __hook.game.phase === 'wait'),'cast lands in water');
  await page.clock.runFor(1200); check(await page.evaluate(() => __hook.game.phase === 'bite'),'fish produces real HIT cue');
  await page.screenshot({path:'output/playwright/hook-bite-390.png'});
  await page.keyboard.press('ArrowUp'); await page.clock.runFor(50); check(await page.evaluate(() => __hook.game.phase === 'fight'),'up key hooks the fish');
  const holdCorrect = async () => { const d=await page.evaluate(() => __hook.game.direction); await page.keyboard.up('ArrowLeft'); await page.keyboard.up('ArrowRight'); await page.keyboard.down(d>0?'ArrowLeft':'ArrowRight'); };
  await holdCorrect(); await page.clock.runFor(550); await page.screenshot({path:'output/playwright/hook-fight-390.png'});
  for (let i=0;i<14;i++) { if(await page.evaluate(() => __hook.game.phase !== 'fight')) break; await holdCorrect(); await page.clock.runFor(200); }
  await page.keyboard.up('ArrowLeft'); await page.keyboard.up('ArrowRight');
  check(await page.evaluate(() => __hook.game.phase === 'landing' && __hook.game.catches.length === 1),'observed counterpull earns a real catch');
  await page.clock.runFor(300); await page.screenshot({path:'output/playwright/hook-landing-390.png'});
  await page.clock.runFor(1100); check(await page.evaluate(() => __hook.game.phase === 'catch'),'landing leads to hand trophy');
  await page.screenshot({path:'output/playwright/hook-catch-390.png'});
  await page.waitForFunction(() => !!__hook.photo);
  const photoBytes=await page.evaluate(() => __hook.photo.size); check(photoBytes>10000,'actual catch photo contains rendered art');
  await page.locator('.hook-pause').click(); const elapsed=await page.evaluate(() => __hook.game.elapsed); await page.clock.runFor(700);
  check(await page.evaluate(() => __hook.game.elapsed)===elapsed,'manual pause freezes all active time'); await page.locator('.hook-resume').click();
  await page.locator('.hook-se').click(); check(await page.locator('.hook-se').getAttribute('aria-pressed')==='false','SE mute works');
  await page.locator('.game-music').click(); check(await page.locator('.game-music').getAttribute('aria-pressed')==='false','BGM mute works');
  await page.locator('.hook-locale').click(); check((await page.locator('.hook-source').textContent()).includes('PRACTICE'),'JA/EN preserves round and practice provenance');
  await page.clock.runFor(1700);
  // Retry sequence runs solely through player controls; it never awards points.
  for(let fish=0;fish<2;fish++) {
    await page.keyboard.press('Space');
    for(let i=0;i<35;i++){if(await page.evaluate(()=>__hook.game.phase==='bite'))break;await page.clock.runFor(100);}
    await page.keyboard.press('ArrowUp');
    for(let i=0;i<75;i++){if(await page.evaluate(()=>__hook.game.phase!=='fight'))break;await holdCorrect();await page.clock.runFor(120);}
    await page.keyboard.up('ArrowLeft');await page.keyboard.up('ArrowRight');await page.clock.runFor(2700);
  }
  check(await page.evaluate(()=>__hook.game.catches.length>=3 && __hook.game.fevers>=1 && __hook.game.limit>=35),'third consecutive real catch triggers fever and time bonus');
  check(await page.evaluate(()=>__hook.snapshot().musicRate===1.16),'fever speeds the licensed music');
  await page.screenshot({path:'output/playwright/hook-fever-390.png'});
  await page.setViewportSize({width:320,height:640}); await page.clock.runFor(150);check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'play has no overflow at 320');await page.screenshot({path:'output/playwright/hook-play-320.png'});
  await page.clock.runFor(40000);await page.waitForSelector('.hook-result');
  check((await page.locator('.hook-result').textContent()).includes('PRACTICE'),'result preserves actual practice source');
  check(await page.evaluate(()=>!__hook.input.running && !__hook.video.srcObject && !__hook.audio.context && !__hook.three.layer),'result releases camera, audio and Three resources');
  await page.setViewportSize({width:390,height:844});await page.clock.runFor(1000);await page.locator('.hook-result-score').scrollIntoViewIfNeeded();await page.screenshot({path:'output/playwright/hook-result-390.png'});
  await page.locator('[data-result-action="retry"]').click();await page.clock.runFor(200);
  check(await page.evaluate(()=>__hook.game.score===0 && __hook.game.elapsed<.5 && __hook.source==='demo'),'retry resets score and preserves practice');
  check(await page.locator('.hook-stage canvas').count()===2,'retry keeps exactly one canvas per renderer');
  await page.clock.resume();await page.locator('.game-back').click();await page.waitForFunction(()=>!__hook.active&&!__hook.runtime);
  check(await page.evaluate(()=>!__hook.active && !__hook.runtime && !__hook.three.layer && !__hook.audio.context),'exit frees both renderer lifetimes');
  check(errors.length===0,'no uncaught browser errors');return {checks,errors};
}
