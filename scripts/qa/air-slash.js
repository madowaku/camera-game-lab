// Synthetic browser verification. Real hand feel and phone inference remain device checks.
async page => {
  await page.clock.resume();
  const base = new URL(page.url()).origin, checks = [], errors = [];
  const check = (ok, label) => { if (!ok) throw Error(label); checks.push(label); };
  page.on('pageerror', e => errors.push(e.message));
  await page.evaluate(() => { localStorage.setItem('camera-game-lab-locale', 'ja'); localStorage.setItem('camera-game-lab-air-slash-sfx', 'on'); localStorage.setItem('camera-game-lab-bgm-v1', 'true'); });
  await page.goto(base + '/?qa=air-slash-' + Date.now() + '#/game/solo-air-slash');
  await page.waitForFunction(() => document.querySelector('.as-entry .launch-demo')?.disabled === false);
  await page.evaluate(async () => {
    const registry = await (await fetch('/src/platform/experiments.js')).text(), path = registry.match(/import\("([^"]*airSlash\/view\.js[^"]*)"\)/)[1];
    const { AirSlashView } = await import(path), render = AirSlashView.prototype.render;
    AirSlashView.prototype.render = function (...args) { window.__as = this; return render.apply(this, args); };
  });
  for (const size of [{ width: 1440, height: 900 }, { width: 390, height: 844 }, { width: 360, height: 800 }]) {
    await page.setViewportSize(size);
    check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'entry fits ' + size.width);
    check(await page.locator('.as-cover img').evaluate(i => i.complete && i.naturalWidth > 0), 'Imagegen cover loads ' + size.width);
    check(await page.locator('.launch-camera').evaluate(b => b.getBoundingClientRect().height >= 44), '44px PLAY target ' + size.width);
    await page.screenshot({ path: `output/playwright/air-slash-entry-${size.width}.png`, fullPage: true });
  }
  check(await page.evaluate(() => !document.querySelector('.as-stage video').srcObject && !performance.getEntriesByType('resource').some(e => /\.task|\.wasm/.test(e.name))), 'entry starts no sensors or models');
  await page.locator('.launch-howto').click(); check((await page.locator('.sheet-content').textContent()).includes('イケイケな気分'), 'licensed OpenTracks credit reachable'); await page.keyboard.press('Escape');
  await page.locator('.platform-locale').click(); check((await page.locator('.as-tagline').textContent()).includes('Your hands'), 'English entry'); await page.locator('.platform-locale').click();
  await page.locator('[data-as-recording="creator"]').click();
  await page.locator('[data-as-face="HIDE"]').click(); check(await page.locator('.as-face-picker').isVisible(), 'creator face picker opens');
  await page.clock.install(); await page.clock.pauseAt(new Date());
  await page.locator('.launch-demo').click(); await page.clock.runFor(650);
  check(await page.evaluate(() => __as.phase === 'playing' && __as.options.creator && __as.options.faceMode === 'HIDE'), 'practice starts with selected creator options');
  check(await page.evaluate(() => __as.renderer.atlas.complete && __as.renderer.atlas.naturalWidth > 0), 'transparent fruit atlas loads');
  await page.setViewportSize({ width: 390, height: 844 }); await page.clock.runFor(100); await page.locator('.as-stage').focus();
  await page.evaluate(() => { __as.game.schedule = []; __as.game.fruits = []; __as.game.hitstop = 1e8; __as.game.spawn('fruit', { x: 270, y: 614, kind: 2 }); });
  await page.keyboard.press('ArrowRight'); await page.clock.runFor(480);
  const first = await page.evaluate(() => ({ sliced: __as.game.sliced, score: __as.game.score, pieces: __as.renderer.pieces.length, motions: [...__as.motions], active: document.activeElement.className }));
  check(first.sliced === 1 && first.score >= 120 && first.pieces === 2, 'keyboard slash produces two directional halves and measured score ' + JSON.stringify(first));
  await page.screenshot({ path: 'output/playwright/air-slash-slice-390.png', fullPage: true });
  const score = await page.evaluate(() => __as.game.score); await page.clock.runFor(220); check(await page.evaluate(() => __as.game.score) === score, 'resting hand cannot keep scoring');
  await page.evaluate(() => { __as.game.fruits = []; __as.game.spawn('bomb', { x: 270, y: 614 }); }); await page.keyboard.press('ArrowLeft'); await page.clock.runFor(480);
  check(await page.evaluate(() => __as.game.bombs === 1 && __as.game.score < 0 && __as.phase === 'playing' && __as.game.combo === 0), 'bomb penalizes and keeps round alive');
  check(await page.locator('.as-cue strong').textContent() === 'BOOM!', 'BOOM cue'); await page.screenshot({ path: 'output/playwright/air-slash-bomb-390.png', fullPage: true });
  await page.locator('.as-pause').click(); const pausedAt = await page.evaluate(() => __as.game.elapsed); await page.clock.runFor(1000); check(await page.evaluate(() => __as.game.elapsed) === pausedAt, 'pause freezes round clock'); await page.locator('.as-resume').click();
  await page.keyboard.press('x'); await page.clock.runFor(480);
  check(await page.evaluate(() => __as.game.xSlashes === 1 && __as.game.log.some(e => e.type === 'xslash')), 'two independent keyboard blades make X-SLASH');
  await page.screenshot({ path: 'output/playwright/air-slash-xslash-390.png', fullPage: true });
  await page.locator('.as-sound').click(); check(await page.locator('.as-sound').getAttribute('aria-pressed') === 'false', 'SE toggles');
  await page.locator('.game-music').click(); check(await page.locator('.game-music').getAttribute('aria-pressed') === 'false', 'BGM toggles');
  const rect = await page.locator('.as-canvas').boundingBox();
  await page.evaluate(() => { __as.game.fruits = []; __as.game.spawn('fruit', { x: 270, y: 600, kind: 1 }); });
  await page.mouse.move(rect.x + rect.width * .2, rect.y + rect.height * 600 / 960); await page.mouse.down(); await page.clock.runFor(230);
  for (const x of [.28, .36, .44, .52, .6]) { await page.mouse.move(rect.x + rect.width * x, rect.y + rect.height * 600 / 960); await page.clock.runFor(35); } await page.mouse.up();
  check(await page.evaluate(() => __as.game.sliced >= 3), 'real pointer drag cuts through fruit');
  const left = await page.evaluate(() => 15050 - __as.game.elapsed); await page.clock.runFor(left); await page.locator('.as-result').waitFor();
  check(await page.evaluate(() => __as.game.result.elapsed === 15000 && __as.phase === 'result'), '15 seconds reaches measured result');
  check((await page.locator('.as-result').textContent()).includes('PRACTICE'), 'result labels practice');
  check(await page.evaluate(() => !__as.input.running && !__as.audio.context && __as.frameId == null), 'result releases sensors and audio');
  check(await page.locator('.as-replay canvas').isVisible(), 'best seven-second replay available');
  check(await page.evaluate(() => __as.creatorResult.frames.length > 10 && __as.creatorResult.heroLabel === 'X-SLASH!'), 'auto director selects actual X-SLASH frames');
  for (const size of [{ width: 360, height: 800 }, { width: 1440, height: 900 }]) { await page.setViewportSize(size); check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'result fits ' + size.width); await page.screenshot({ path: `output/playwright/air-slash-result-${size.width}.png`, fullPage: true }); }
  await page.locator('.platform-locale').click(); check((await page.locator('.as-result').textContent()).includes('Fruit sliced'), 'English result');
  await page.locator('[data-result-action="retry"]').click(); await page.clock.runFor(650); check(await page.evaluate(() => __as.source === 'demo' && __as.game.score === 0 && __as.game.sliced === 0 && __as.options.creator), 'retry preserves mode and resets score');
  await page.locator('.game-back').click(); await page.locator('.lab-feed').waitFor(); check(await page.evaluate(() => !__as.active && __as.frameId == null), 'exit stops listeners and animation');
  await page.goto(base + '/#air-slash'); await page.waitForFunction(() => document.querySelector('.as-entry .launch-demo')?.disabled === false); check(await page.title() === 'AIR SLASH · CAMERA GAME LAB', 'legacy alias resolves');
  check(errors.length === 0, 'no browser exceptions'); await page.clock.resume(); return { checks, errors };
}
