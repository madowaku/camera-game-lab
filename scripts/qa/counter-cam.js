// Camera-free browser evidence. Timing and synthetic input do not establish
// human first-use or physical phone accuracy gates.
async (page) => {
  await page.clock.resume(); for (const key of ['KeyG', 'KeyF', 'ArrowLeft', 'ArrowRight']) await page.keyboard.up(key);
  const base = new URL(page.url()).origin, checks = [], errors = [];
  const check = (ok, label) => { if (!ok) throw Error(label); checks.push(label); };
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(base + '/?qa=counter-cam-' + Date.now() + '#/game/solo-counter-cam');
  await page.waitForFunction(() => document.querySelector('.cc-entry .launch-demo')?.disabled === false);
  for (const size of [{ width: 1440, height: 900 }, { width: 360, height: 800 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(size);
    check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'entry no overflow ' + size.width);
    check(await page.locator('.cc-cover img').evaluate(i => i.complete && i.naturalWidth > 0), 'Imagegen cover loads ' + size.width);
    check(await page.locator('.launch-camera').evaluate(b => b.getBoundingClientRect().height >= 44), '44px PLAY target ' + size.width);
    await page.screenshot({ path: `output/playwright/counter-cam-entry-${size.width}.png`, fullPage: true });
  }
  check(await page.evaluate(() => !performance.getEntriesByType('resource').some(e => /\.task|\.wasm/.test(e.name)) && !document.querySelector('.cc-stage video').srcObject), 'entry starts no camera, models or recording');
  await page.locator('.launch-howto').click(); check((await page.locator('.sheet-content').textContent()).includes('8-bit Aggressive1'), 'OpenTracks BGM credit is reachable');
  await page.keyboard.press('Escape'); await page.locator('.platform-locale').click(); check((await page.locator('.cc-tagline').textContent()).includes('Dodge with your body'), 'English entrance'); await page.locator('.platform-locale').click();
  await page.evaluate(async () => {
    const source = await (await fetch('/src/platform/experiments.js')).text(), path = source.match(/import\("([^"]*counterCam\/view\.js[^"]*)"\)/)[1];
    const { CounterCamView } = await import(path), render = CounterCamView.prototype.render;
    CounterCamView.prototype.render = function (...args) { window.__cc = this; return render.apply(this, args); };
  });
  await page.locator('[data-creator-mode="creator"]').click(); await page.locator('[data-face-mode="HIDE"]').click();
  await page.clock.install(); await page.clock.pauseAt(new Date(await page.evaluate(() => Date.now() + 1000))); await page.locator('.launch-demo').click(); await page.clock.runFor(700);
  check(await page.evaluate(() => __cc.phase === 'calibration' && __cc.calibration === 1 && __cc.game.elapsed === 0), 'calibration waits for an actual punch');
  await page.keyboard.press('Space'); await page.clock.runFor(50);
  check(await page.evaluate(() => __cc.calibration === 2), 'fresh punch confirms calibration');
  await page.keyboard.down('ArrowLeft'); await page.clock.runFor(50); await page.keyboard.up('ArrowLeft');
  await page.keyboard.down('ArrowRight'); await page.clock.runFor(50); await page.keyboard.up('ArrowRight'); await page.clock.runFor(600);
  check(await page.evaluate(() => __cc.phase === 'playing' && __cc.creator && __cc.options.faceMode === 'HIDE'), 'both sways start CREATOR round');
  check(await page.locator('.cc-charge').evaluate(b => b.getBoundingClientRect().bottom <= innerHeight), 'mobile canvas and all practice controls fit the viewport');
  const until = async stage => { for (let i = 0; i < 100; i++) { if (await page.evaluate(s => __cc.game.stage === s, stage)) return; await page.clock.runFor(50); } throw Error('stage timeout: ' + stage); };
  const counter = async screenshot => {
    await until('telegraph'); await page.clock.runFor(650);
    await page.keyboard.down('ArrowLeft'); await until('counter');
    if (screenshot) await page.screenshot({ path: 'output/playwright/counter-cam-just-dodge-390.png', fullPage: true });
    await page.clock.runFor(200); await page.keyboard.press('Space'); await page.clock.runFor(50); await page.keyboard.up('ArrowLeft');
  };
  await counter(true); check(await page.evaluate(() => __cc.game.perfectCounters === 1 && __cc.game.enemyHp === 560), 'dodge and punch causes actual 80 damage');
  check(await page.evaluate(() => __cc.renderer.robot.complete && __cc.renderer.robot.naturalWidth > 0), 'generated robot loads in nonblank canvas');
  await page.screenshot({ path: 'output/playwright/counter-cam-perfect-390.png', fullPage: true });
  await page.locator('.cc-pause').click(); const pausedAt = await page.evaluate(() => __cc.game.elapsed); await page.clock.runFor(1500);
  check(await page.evaluate(at => __cc.game.elapsed === at && __cc.game.paused, pausedAt), 'pause freezes round'); await page.locator('.cc-resume').click();
  for (let i = 0; i < 3; i++) await counter();
  check(await page.evaluate(() => __cc.game.special === 100 && __cc.game.counters === 4), 'four counters unlock special');
  await page.keyboard.down('KeyF'); await page.clock.runFor(550); await page.keyboard.up('KeyF'); await page.clock.runFor(50);
  check(await page.evaluate(() => __cc.game.history.some(e => e.type === 'MEGA PUNCH') && __cc.game.special === 0 && __cc.game.enemyHp === 80), 'charged mega punch consumes gauge and deals 240');
  await page.screenshot({ path: 'output/playwright/counter-cam-mega-390.png', fullPage: true });
  await counter(); await page.clock.runFor(1100); await page.locator('.cc-result').waitFor();
  check(await page.evaluate(() => __cc.game.result.title === 'KO' && __cc.game.result.rank === 'S+' && __cc.game.result.counters === 5), 'perfect KO result uses actual five counters');
  check((await page.locator('.cc-result').textContent()).includes('PRACTICE'), 'result preserves camera-free provenance');
  check(await page.evaluate(() => !__cc.input.running && !__cc.audio.context && __cc.frameId === null && __cc.creatorResult.frames.length > 0), 'result releases camera/audio/RAF and retains selected clip');
  for (const size of [{ width: 360, height: 800 }, { width: 1440, height: 900 }]) {
    await page.setViewportSize(size); check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'result no overflow ' + size.width);
    await page.screenshot({ path: `output/playwright/counter-cam-result-${size.width}.png`, fullPage: true });
  }
  await page.locator('[data-result-action="retry"]').click(); await page.clock.runFor(700);
  check(await page.evaluate(() => __cc.source === 'demo' && __cc.game.counters === 0 && __cc.game.elapsed === 0 && __cc.calibration === 1), 'retry resets round and preserves demo');
  await page.keyboard.press('Space'); await page.clock.runFor(50); await page.keyboard.down('ArrowLeft'); await page.clock.runFor(50); await page.keyboard.up('ArrowLeft'); await page.keyboard.down('ArrowRight'); await page.clock.runFor(50); await page.keyboard.up('ArrowRight'); await page.clock.runFor(600);
  await page.keyboard.down('KeyG'); await page.clock.runFor(1600);
  check(await page.evaluate(() => __cc.game.guards >= 1 && __cc.game.lives === 3 && __cc.game.justDodges === 0), 'guard blocks real attack without counter');
  await page.screenshot({ path: 'output/playwright/counter-cam-guard-1440.png', fullPage: true });
  await page.keyboard.up('KeyG'); await page.locator('.game-back').click(); await page.locator('.lab-feed').waitFor();
  check(await page.evaluate(() => !__cc.active && !__cc.creator && __cc.frameId === null && !__cc.creatorResult), 'exit discards transient recording and input');
  await page.clock.resume();
  await page.goto(base + '/#/game/solo-finger-gun'); await page.waitForFunction(() => document.querySelector('.launch-camera')?.disabled === false);
  check(await page.evaluate(() => getComputedStyle(document.querySelector('.platform')).getPropertyValue('--pl-bg').trim() !== '#111d1e'), 'game CSS does not theme another game');
  check(errors.length === 0, 'no browser exceptions'); return { checks, errors };
}
