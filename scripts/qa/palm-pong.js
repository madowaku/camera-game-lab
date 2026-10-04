// Synthetic interaction QA. This does not measure two-person camera accuracy.
async (page) => {
  await page.clock.resume();
  const base = new URL(page.url()).origin, checks = [], errors = [];
  const check = (ok, name) => { if (!ok) throw Error(name); checks.push(name); };
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('about:blank');
  await page.addInitScript(() => { if (!location.protocol.startsWith('http')) return; localStorage.setItem('camera-game-lab-locale', 'ja'); localStorage.setItem('camera-game-lab-bgm-v1', 'true'); localStorage.removeItem('camera-game-lab-duo-palm-pong-v1'); localStorage.removeItem('camera-game-lab-palm-pong-settings-v1'); });
  await page.goto(base + '/?qa=palm-pong#/game/duo-palm-pong');
  await page.clock.resume();
  await page.waitForFunction(() => document.querySelector('.pp-entry .launch-demo')?.disabled === false);
  for (const size of [{ width: 1280, height: 720 }, { width: 800, height: 360 }, { width: 360, height: 800 }, { width: 720, height: 1280 }]) {
    await page.setViewportSize(size);
    check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'entry has no horizontal overflow ' + size.width + 'x' + size.height);
    check(await page.locator('.pp-entry-art img').evaluate(i => i.complete && i.naturalWidth > 0), 'Imagegen cover loads ' + size.width);
    check(await page.locator('.launch-camera').evaluate(b => b.getBoundingClientRect().height >= 44), 'camera button has a 44px target ' + size.width);
    await page.screenshot({ path: `output/playwright/palm-pong-entry-${size.width}x${size.height}.png`, fullPage: true });
  }
  check(await page.evaluate(() => !performance.getEntriesByType('resource').some(e => /\.task|\.wasm/.test(e.name)) && !document.querySelector('.pp-court video').srcObject), 'entry starts no camera or model');
  await page.locator('.launch-howto').click();
  check((await page.locator('.sheet-content').textContent()).includes('パステルハウス'), 'OpenTracks credit is reachable');
  check((await page.locator('.sheet-content').textContent()).includes('WASD'), 'how-to explains separate keyboard controls');
  await page.keyboard.press('Escape');
  check(await page.locator('.launch-howto').evaluate(b => b === document.activeElement), 'how-to restores focus');
  await page.locator('.pp-guide-check').uncheck();
  await page.evaluate(async () => {
    const registry = await (await fetch('/src/platform/experiments.js')).text();
    const path = registry.match(/import\("([^"]*palmPong\/view\.js[^"]*)"\)/)[1];
    const { PalmPongView } = await import(path);
    const render = PalmPongView.prototype.render;
    PalmPongView.prototype.render = function (...args) { window.__pp = this; return render.apply(this, args); };
  });
  await page.clock.install({ time: new Date('2026-10-04T02:30:00Z') });
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.locator('.launch-demo').click(); await page.clock.runFor(600);
  check(await page.evaluate(() => __pp.game.ready && __pp.game.phase === 'calibration' && __pp.guide === false), 'practice respects guide preference and waits for START');
  await page.locator('.pp-start').click(); await page.clock.runFor(3100);
  check(await page.evaluate(() => __pp.game.phase === 'playing' && __pp.game.elapsed < .2), 'countdown starts the 30-second clock only at serve');
  check(await page.locator('.pp-canvas').evaluate(c => {
    const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    let ball = 0, mint = 0, coral = 0;
    for (let i = 0; i < d.length; i += 4) { if (d[i] > 240 && d[i+1] > 180 && d[i+1] < 225 && d[i+2] < 90) ball++; if (d[i] < 80 && d[i+1] > 100 && d[i+2] > 80 && d[i+2] < 170) mint++; if (d[i] > 180 && d[i+1] < 120 && d[i+2] < 100) coral++; }
    return ball > 300 && mint > 1500 && coral > 1500;
  }), 'canvas contains the yellow ball and both physical paddles');
  const before = await page.evaluate(() => __pp.demoPoints.map(p => ({ ...p })));
  await page.keyboard.down('w'); await page.clock.runFor(150); await page.keyboard.up('w');
  await page.keyboard.down('ArrowDown'); await page.clock.runFor(150); await page.keyboard.up('ArrowDown');
  check(await page.evaluate(p => __pp.demoPoints[0].y < p[0].y && __pp.demoPoints[1].y > p[1].y, before), 'WASD and arrows control different paddles');
  await page.evaluate(() => {
    const b = document.querySelector('.pp-court').getBoundingClientRect(); const court = document.querySelector('.pp-court');
    const fire = (type, pointerId, x, y) => court.dispatchEvent(new PointerEvent(type, { bubbles: true, pointerId, pointerType: 'touch', clientX: b.x + x * b.width, clientY: b.y + y * b.height }));
    const capture = court.setPointerCapture.bind(court); court.setPointerCapture = () => {};
    fire('pointerdown', 101, .28, .4); fire('pointerdown', 202, .72, .6); fire('pointerup', 101, .28, .4);
    fire('pointermove', 202, .65, .45); court.setPointerCapture = capture;
  });
  check(await page.evaluate(() => __pp.pointers.size === 1 && __pp.pointers.get(202) === 1 && Math.abs(__pp.demoPoints[0].x - .28 * 16) < .001 && Math.abs(__pp.demoPoints[1].x - .65 * 16) < .001), 'releasing one pointer does not transfer the other hand');
  await page.evaluate(() => { __pp.pointers.clear(); __pp.demoPoints[0] = { x: .28 * 16, y: 4.5, present: true, continuous: false }; __pp.demoPoints[1] = { x: .72 * 16, y: 4.5, present: true, continuous: false }; });
  await page.clock.runFor(50);
  await page.locator('.pp-pause').click(); const elapsed = await page.evaluate(() => __pp.game.elapsed);
  await page.clock.runFor(900);
  check(await page.evaluate(t => __pp.game.elapsed === t && __pp.game.paused, elapsed), 'pause freezes ball and time');
  await page.locator('.pp-resume').click(); await page.clock.runFor(1450);
  check(await page.evaluate(t => __pp.game.paused && __pp.game.elapsed === t, elapsed), 'resume waits for stable hands and one-second cue');
  await page.clock.runFor(100); check(await page.evaluate(() => !__pp.game.paused), 'resume returns to the preserved state');
  await page.locator('.pp-sound').click(); check(await page.locator('.pp-sound').getAttribute('aria-pressed') === 'false', 'return sounds can be muted');
  await page.locator('.game-music').click(); check(await page.locator('.game-music').getAttribute('aria-pressed') === 'false', 'BGM switch is available');
  await page.locator('.platform-locale').click(); check((await page.locator('.pp-source').textContent()).includes('PRACTICE'), 'language changes during play preserve practice source');
  await page.evaluate(() => window.dispatchEvent(new Event('blur'))); const hiddenAt = await page.evaluate(() => __pp.game.elapsed);
  await page.clock.runFor(300); check(await page.evaluate(t => __pp.game.elapsed === t, hiddenAt), 'background blur freezes the clock');
  await page.locator('.pp-resume').click(); await page.clock.runFor(1600);
  // Drive trustworthy practice inputs toward the predicted catch heights. All
  // counts still come from the same swept collision core, not a fake score.
  await page.evaluate(async () => {
    const { predictGuide, clamp } = await import('/src/palmPong/core.js'); const update = __pp.updateDemo.bind(__pp);
    __pp.updateDemo = dt => { const target = predictGuide(__pp.game).target; if (target) __pp.demoPoints[__pp.game.nextReceiver].y = clamp(target.y, .17 * 9, .83 * 9); update(dt); };
  });
  await page.clock.runFor(2500);
  check(await page.evaluate(() => __pp.game.total > 1 && __pp.game.returns.every(n => n > 0)), 'alternating real returns count both players');
  const ballBefore = await page.evaluate(() => ({ ...__pp.game.ball })); await page.clock.runFor(100);
  check(await page.evaluate(b => __pp.game.ball.x !== b.x || __pp.game.ball.y !== b.y, ballBefore), 'ball visibly moves');
  for (const size of [{ width: 1280, height: 720 }, { width: 800, height: 360 }, { width: 360, height: 800 }, { width: 720, height: 1280 }]) {
    await page.setViewportSize(size); await page.clock.runFor(50);
    const b = await page.locator('.pp-court').boundingBox();
    check(Math.abs(b.width / b.height - 16 / 9) < .01, 'court keeps 16:9 geometry ' + size.width + 'x' + size.height);
    check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'play has no horizontal overflow ' + size.width);
    await page.screenshot({ path: `output/playwright/palm-pong-play-${size.width}x${size.height}.png`, fullPage: true });
  }
  await page.clock.runFor(32000); await page.locator('.pp-result').waitFor();
  check((await page.locator('.pp-result').textContent()).includes('PRACTICE'), 'results clearly label practice');
  const result = await page.evaluate(() => __pp.game.result);
  check(result.totalReturns === result.playerReturns[0] + result.playerReturns[1] && result.bestRally <= result.totalReturns, 'result counts reconcile');
  check(await page.evaluate(() => !__pp.input.running && !__pp.audio.context && __pp.abort.signal.aborted), 'result releases camera, effect audio, and event listeners');
  check(await page.evaluate(() => { const r = JSON.parse(localStorage.getItem('camera-game-lab-duo-palm-pong-v1')); return r.demo.rounds === 1 && r.camera.rounds === 0; }), 'practice record does not change camera records');
  for (const size of [{ width: 1280, height: 720 }, { width: 800, height: 360 }, { width: 360, height: 800 }, { width: 720, height: 1280 }]) {
    await page.setViewportSize(size);
    check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'result has no horizontal overflow ' + size.width);
    await page.screenshot({ path: `output/playwright/palm-pong-result-${size.width}x${size.height}.png`, fullPage: true });
  }
  await page.evaluate(() => Object.defineProperty(navigator, 'share', { configurable: true, value: async payload => { window.__ppShared = payload; } }));
  await page.locator('[data-result-action="share"]').click();
  await page.waitForFunction(() => !!window.__ppShared);
  const shared = await page.evaluate(() => [window.__ppShared.text, window.__ppShared.url].join('\n'));
  check(shared.includes('practice') && shared.includes('PALM PONG') && shared.includes('#/game/duo-palm-pong') && !shared.includes('pts'), 'challenge share has practice provenance and direct game link');
  await page.locator('[data-result-action="retry"]').click(); await page.clock.runFor(600);
  check(await page.evaluate(() => __pp.source === 'demo' && __pp.game.ready && __pp.game.total === 0 && __pp.game.elapsed === 0), 'retry resets counts and reuses guide configuration');
  await page.locator('.game-back').click(); await page.clock.runFor(100);
  check(await page.evaluate(() => !__pp.active && !__pp.input.running && !__pp.audio.context && __pp.abort.signal.aborted), 'leaving releases all game resources');
  await page.goto(base + '/#palm-pong'); await page.clock.resume();
  await page.locator('.pp-entry .launch-demo').waitFor(); check(await page.title() === 'PALM PONG · CAMERA GAME LAB', 'legacy alias opens PALM PONG');
  check(errors.length === 0, 'no uncaught browser errors: ' + errors.join('; '));
  return { passed: checks.length, checks, result, errors };
}
