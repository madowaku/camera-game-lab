// Browser interaction checks; synthetic input does not certify physical play.
async (page) => {
  const base = new URL(page.url()).origin, checks = [], errors = [];
  const check = (ok, label) => { if (!ok) throw Error(label); checks.push(label); };
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('about:blank');
  await page.addInitScript(() => { if (location.protocol.startsWith('http')) { localStorage.setItem('camera-game-lab-locale', 'ja'); localStorage.setItem('human-clock-difficulty', 'easy'); } });
  await page.goto(base + '/?qa=hc-' + Date.now() + '#/game/solo-human-clock');
  await page.waitForFunction(() => document.querySelector('.hc-entry .launch-demo')?.disabled === false);
  for (const size of [{ width: 1440, height: 900 }, { width: 390, height: 844 }, { width: 360, height: 640 }]) {
    await page.setViewportSize(size);
    check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'entry no overflow ' + size.width);
    check(await page.locator('.hc-cover img').evaluate(i => i.complete && i.naturalWidth > 0 && i.src.includes('cover-v3')), 'finger-focused Imagegen art ' + size.width);
    check(await page.locator('.launch-camera').evaluate(b => b.getBoundingClientRect().height >= 44), '44px PLAY ' + size.width);
    await page.screenshot({ path: `output/playwright/human-clock-entry-${size.width}.png`, fullPage: true });
  }
  check(await page.evaluate(() => !performance.getEntriesByType('resource').some(e => /\.task|\.wasm|humanClock\.js/.test(e.name)) && !document.querySelector('.hc-stage video').srcObject), 'entry loads no models, audio or sensors');
  await page.locator('.launch-howto').click();
  check((await page.locator('.sheet-content').textContent()).includes('3:40') && (await page.locator('.sheet-content').textContent()).includes('The Swing of Time'), 'hour interpolation and OpenTracks credit in instructions');
  await page.keyboard.press('Escape');
  check(await page.locator('.launch-howto').evaluate(b => document.activeElement === b), 'instructions restore focus');
  await page.locator('.platform-locale').click();
  check((await page.locator('.hc-tagline').textContent()).includes('Make time'), 'English entry');
  await page.locator('input[value="normal"]').check();
  check(await page.locator('input[value="normal"]').isChecked(), 'difficulty radio selection');
  await page.evaluate(async () => {
    const registry = await (await fetch('/src/platform/experiments.js')).text(), viewPath = registry.match(/import\("([^"]*humanClock\/view\.js[^"]*)"\)/)[1];
    const { HumanClockView } = await import(viewPath), render = HumanClockView.prototype.render;
    HumanClockView.prototype.render = function(...args) { window.__hc = this; return render.apply(this, args); };
    window.__hcCore = await import('/src/humanClock/core.js');
  });
  await page.setViewportSize({ width: 390, height: 844 }); await page.clock.install();
  await page.locator('.launch-demo').click(); await page.clock.runFor(700);
  check(await page.evaluate(() => __hc.phase === 'running' && __hc.game.difficulty === 'normal'), 'practice starts selected difficulty after READY');
  check(await page.evaluate(() => !__hc.input.running && !__hc.video.srcObject), 'practice uses no camera');
  check(await page.locator('.hc-stage canvas').evaluate(canvas => {
    const pixels = canvas.getContext('2d').getImageData(0,0,720,960).data; let bright = 0;
    for (let i=0;i<pixels.length;i+=4) if (pixels[i]>120 && pixels[i+1]>120) bright++;
    return bright > 4000;
  }), 'clock is rendered with pixel evidence');
  const before = await page.evaluate(() => __hc.sample.hands.hour.angle); await page.keyboard.press('d');
  check(await page.evaluate(old => Math.abs(__hc.sample.hands.hour.angle-old-5)<.001, before), 'D rotates hour hand independently');
  await page.keyboard.press('Shift+ArrowLeft');
  check(await page.evaluate(() => __hc.activeHand === 'minute'), 'arrows select minute and Shift gives fine movement');
  // Use the actual rendered sliders and their input events to solve each time.
  const match = async () => {
    const values = await page.evaluate(() => { const a=__hcCore.clockAngles(__hc.game.target.hour,__hc.game.target.minute); return {hour:__hcCore.normalizeAngle(a.hour+90),minute:__hcCore.normalizeAngle(a.minute+90)}; });
    for (const side of ['hour','minute']) await page.locator(`[data-angle="${side}"]`).evaluate((el,value) => { el.value=String(value);el.dispatchEvent(new Event('input',{bubbles:true})); },values[side]);
  };
  await match(); await page.clock.runFor(200); await page.locator('.hc-pause').click();
  const at = await page.evaluate(() => __hc.game.elapsed); await page.clock.runFor(1000);
  check(await page.evaluate(() => __hc.game.elapsed) === at && await page.evaluate(() => __hc.game.hold === 0), 'pause freezes timer and resets partial hold');
  await page.locator('.hc-resume').click(); await page.clock.runFor(300);
  check(await page.evaluate(() => __hc.game.score === 0), 'resume needs a fresh full hold');
  await page.clock.runFor(150);
  check(await page.evaluate(() => __hc.game.score === 1 && __hc.game.settling), '400ms completes one clock');
  check(await page.locator('.hc-feedback').isVisible(), 'TICK and +1 TIME visible');
  await page.screenshot({ path: 'output/playwright/human-clock-tick-390.png', fullPage: true });
  await page.clock.runFor(600);
  const rect = await page.locator('.hc-stage canvas').boundingBox(), tip = await page.evaluate(() => __hc.sample.hands.hour);
  await page.mouse.move(rect.x+tip.x/720*rect.width,rect.y+tip.y/960*rect.height);await page.mouse.down();await page.mouse.move(rect.x+rect.width*.2,rect.y+rect.height*.5,{steps:4});await page.mouse.up();
  check(await page.evaluate(() => __hc.drags.size === 0 && __hc.activeHand === 'hour'), 'pointer drag moves a hand and releases capture');
  await page.locator('[data-select="minute"]').click();
  await page.mouse.click(rect.x+rect.width*.85,rect.y+rect.height*.56);
  check(await page.evaluate(() => __hc.activeHand === 'minute' && __hcCore.angleError(__hc.sample.hands.minute.angle,0) < 1), 'tap dial moves selected minute hand');
  await page.screenshot({ path: 'output/playwright/human-clock-play-390.png', fullPage: true });
  for (let i=0;i<4;i++) {await match();await page.clock.runFor(450);if(i<3)await page.clock.runFor(600);}
  check(await page.evaluate(() => __hc.game.score === 5 && __hc.game.rush && !__hc.game.showNumbers), 'five-combo rush and NORMAL numbers fade');
  await page.screenshot({ path: 'output/playwright/human-clock-rush-390.png', fullPage: true });
  await page.clock.runFor(250);await page.locator('.hc-skip').click();
  check(await page.evaluate(() => __hc.game.combo === 0 && __hc.game.skipped === 1 && !__hc.game.rush), 'skip starts another time and resets rush');
  await page.setViewportSize({width:1440,height:900});await page.locator('.hc-sfx').click();
  check(await page.locator('.hc-sfx').getAttribute('aria-pressed') === 'false', 'SFX toggle');
  await page.locator('.game-music').click();check(await page.locator('.game-music').getAttribute('aria-pressed') === 'false','BGM toggle');
  await page.screenshot({path:'output/playwright/human-clock-play-1440.png',fullPage:true});
  await page.evaluate(() => { __hc.sample.hands.hour.present=false; });
  const elapsed=await page.evaluate(()=>__hc.game.elapsed);await page.clock.runFor(Math.ceil((30.1-elapsed)*1000));
  await page.locator('.hc-result').waitFor();
  check(await page.evaluate(() => __hc.game.result.score === 5 && __hc.game.result.completed.length === 5 && __hc.game.result.bestCombo === 5 && __hc.game.result.skipped === 1), 'result preserves measured clocks, fastest, combo and skips');
  check((await page.locator('.hc-result').textContent()).includes('Camera-free practice'), 'result labels practice');
  check(await page.evaluate(() => !__hc.input.running && !__hc.audio.context && __hc.frameId == null), 'result releases inputs, audio and animation');
  for (const size of [{width:1440,height:900},{width:390,height:844},{width:360,height:640}]) {
    await page.setViewportSize(size);check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'result no overflow '+size.width);
    await page.screenshot({path:`output/playwright/human-clock-result-${size.width}.png`,fullPage:true});
  }
  await page.locator('.platform-locale').click();check((await page.locator('.hc-result').textContent()).includes('完成した時刻'),'Japanese result');
  await page.evaluate(() => { window.__hcShare=null;Object.defineProperty(navigator,'share',{configurable:true,value:async p=>{window.__hcShare=p;}}); });
  await page.locator('[data-result-action="share"]').click();
  check(await page.evaluate(() => __hcShare?.text.includes('カメラなし') && __hcShare?.text.includes('5個')), 'share carries actual result and practice provenance');
  await page.locator('[data-result-action="retry"]').click();await page.clock.runFor(700);
  check(await page.evaluate(()=>__hc.source==='demo'&&__hc.game.score===0&&__hc.game.difficulty==='normal'),'retry preserves source and difficulty');
  await page.locator('.game-back').click();await page.locator('.lab-feed').waitFor();
  check(await page.evaluate(()=>!__hc.active&&__hc.frameId==null),'exit cleans loop and input');
  await page.goto(base+'/#/game/solo-finger-gun');await page.waitForFunction(()=>document.querySelector('.launch-camera')?.disabled===false);
  check(await page.evaluate(()=>getComputedStyle(document.querySelector('.platform')).getPropertyValue('--pl-bg').trim()!=='#142420'),'theme does not leak to another game');
  check(errors.length===0,'no browser exceptions');
  return {checks,errors};
}
