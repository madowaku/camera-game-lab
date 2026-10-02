// Browser checks use actual pointer/key events and the rendered controller.
// The simulation is observed via a dev-module wrapper, never controlled directly.
async (page) => {
  const base = new URL(page.url()).origin, checks = [], errors = [];
  const check = (value, name) => { if (!value) throw Error(name); checks.push(name); };
  page.on('pageerror', (error) => errors.push(error.message));
  await page.addInitScript(() => {
    localStorage.setItem('camera-game-lab-locale', 'en');
    localStorage.setItem('camera-game-lab-platform-onboarded-v1', 'true');
    window.__mediaRequests = 0;
    navigator.mediaDevices.getUserMedia = async () => { __mediaRequests++; throw new DOMException('QA denied', 'NotAllowedError'); };
    Object.defineProperty(navigator, 'share', { configurable: true, value: async (payload) => { window.__share = payload; } });
  });
  const prepare = async (width, height) => {
    await page.setViewportSize({ width, height });
    await page.goto(base + '/?qa=camera-is-it&run=' + Date.now() + '#/game/outcam-the-camera-is-it');
    await page.waitForFunction(() => document.querySelector('.launch-demo') && !document.querySelector('.launch-demo').disabled);
    await page.clock.install();
    await page.evaluate(async () => {
      const { CameraIsItGame } = await import('/src/games/cameraIsIt.js');
      const step = CameraIsItGame.prototype.step;
      CameraIsItGame.prototype.step = function (dt) { window.__game = this; return step.call(this, dt); };
    });
    await page.locator('.launch-demo').click(); await page.clock.runFor(1550);
  };
  await prepare(360, 800);
  check(await page.locator('.ci-title').textContent() === 'LOOK AHEAD', '360: game starts without a permission prompt');
  check(await page.evaluate(() => __mediaRequests === 0), 'demo never requests a camera');
  const board = page.locator('.ci-stage'); await board.scrollIntoViewIfNeeded();
  const bounds = await board.boundingBox(), before = await page.evaluate(() => __game.camera.x);
  const client = await page.context().newCDPSession(page);
  await client.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 });
  await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: bounds.x + 100, y: bounds.y + 200 }] });
  await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: bounds.x + 120, y: bounds.y + 180 }] });
  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await page.clock.runFor(250);
  check(await page.evaluate((x) => __game.camera.x > x + 50, before), '360: touch drag pans the viewport');
  await board.focus(); await page.keyboard.down('ArrowRight'); await page.clock.runFor(150); await page.keyboard.up('ArrowRight');
  check(await page.evaluate(() => __game.camera.x > 500), 'arrow keys pan only the viewport');
  await page.screenshot({ path: 'output/playwright/camera-is-it-360-playing.png' });
  await page.locator('.ci-pause').click();
  const paused = await page.evaluate(() => JSON.stringify({ r: __game.runner, t: __game.elapsed }));
  await page.clock.runFor(3000);
  check(await page.evaluate((s) => JSON.stringify({ r: __game.runner, t: __game.elapsed }) === s, paused), 'manual pause freezes the walker and clock');
  await page.locator('.ci-resume').click(); await board.focus();
  const held = new Set();
  const release = async () => { for (const key of held) await page.keyboard.up(key); held.clear(); };
  let capturedPuzzle = false;
  for (let tick = 0; tick < 650; tick++) {
    const state = await page.evaluate(() => {
      const g = __game, r = g.runner, n = g.platforms[Math.min(r.support + 1, g.platforms.length - 1)];
      return { phase: g.phase, index: g.index, x: g.targetCamera.x, y: g.targetCamera.y, dx: r.x + 200, dy: (r.y + n.y) / 2 - 50 };
    });
    if (state.phase === 'result') break;
    if (state.phase === 'stage-clear') {
      await release(); await page.locator('.ci-next').click(); await board.focus(); await page.clock.runFor(1500); continue;
    }
    const want = new Set();
    if (state.dx > state.x + 35) want.add('ArrowRight'); else if (state.dx < state.x - 35) want.add('ArrowLeft');
    const dy = Math.max(500, Math.min(1300, state.dy));
    if (dy > state.y + 30) want.add('ArrowDown'); else if (dy < state.y - 30) want.add('ArrowUp');
    for (const key of held) if (!want.has(key)) { await page.keyboard.up(key); held.delete(key); }
    for (const key of want) if (!held.has(key)) { await page.keyboard.down(key); held.add(key); }
    await page.clock.runFor(130);
    if (!capturedPuzzle && state.index === 3 && await page.evaluate(() => __game.runner.support === 1)) {
      capturedPuzzle = true; await page.screenshot({ path: 'output/playwright/camera-is-it-360-two-worlds.png' });
    }
  }
  await release();
  await page.locator('.platform-result').waitFor({ state: 'visible' });
  check(await page.evaluate(() => __game.result.clear && __game.result.completed === 5), '360: actual keyboard framing clears all five stages');
  check(!(await page.locator('.platform-result').textContent()).includes('pts'), 'score-free CLEAR flow');
  await page.screenshot({ path: 'output/playwright/camera-is-it-360-clear.png' });
  await page.locator('[data-result-action="share"]').click();
  check(await page.evaluate(() => __share.text.includes('Demo') && __share.text.includes('CLEAR') && __share.url.includes('#/game/outcam-the-camera-is-it')), 'share retains demo provenance and canonical URL');
  await page.locator('.platform-locale').click();
  check((await page.locator('.ci-receipt').textContent()).includes('デモ'), 'JA result updates');
  await page.locator('[data-result-action="retry"]').click(); await page.clock.runFor(1700);
  check((await page.locator('.ci-stage-number').textContent()).includes('001'), 'completed game RETRY starts a new set');
  await page.clock.runFor(12000); await page.locator('.platform-result').waitFor({ state: 'visible' });
  check(await page.locator('.platform-result h2').textContent() === 'RETRY', 'missing route produces a clear failure state');
  await page.locator('[data-result-action="retry"]').click(); await page.clock.runFor(1700);
  check(await page.locator('.ci-overlay').isHidden(), 'failed-stage RETRY restarts playable world');
  await board.focus();
  for (let tick = 0; tick < 170 && await page.evaluate(() => __game.phase !== 'stage-clear'); tick++) {
    const dx = await page.evaluate(() => __game.runner.x + 200 - __game.targetCamera.x);
    if (dx > 35) await page.keyboard.down('ArrowRight');
    await page.clock.runFor(130);
    if (dx > 35) await page.keyboard.up('ArrowRight');
  }
  await page.locator('.ci-next').click(); await page.clock.runFor(16000);
  await page.locator('.platform-result').waitFor({ state: 'visible' });
  check(await page.evaluate(() => __game.result.stage === 2 && __game.result.completed === 1), 'second-stage failure retains completed first stage');
  await page.locator('[data-result-action="retry"]').click(); await page.clock.runFor(1700);
  check((await page.locator('.ci-stage-number').textContent()).includes('002'), 'RETRY resumes the failed second stage');
  check(await page.evaluate(() => __mediaRequests === 0), 'demo retries never request sensors');
  await page.locator('.game-back').click(); await page.locator('.lab-feed').waitFor({ state: 'visible' });
  await client.detach();
  await prepare(1440, 900);
  await page.screenshot({ path: 'output/playwright/camera-is-it-1440-playing.png' });
  check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), '1440: no horizontal overflow');
  check(await page.locator('.ci-stage canvas').evaluate((c) => c.getContext('2d').getImageData(0, 0, c.width, c.height).data.some((n) => n > 0)), 'canvas has visible pixel evidence');
  await page.locator('.game-back').click();
  check(errors.length === 0, 'no uncaught browser errors');
  return { checks, errors, physicalDevice: false, touchAt360: true };
}
