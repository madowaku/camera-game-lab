// Browser-owned synthetic stream and synthetic landmarks. No physical webcam
// accuracy, participants, device performance or human playtest is claimed.
async (page) => {
  await page.clock.resume(); const base = new URL(page.url()).origin, checks = [], errors = [];
  const check = (ok, name) => { if (!ok) throw Error(name); checks.push(name); };
  await page.goto('about:blank');
  await page.goto(base + '/?qa=palm-camera#/game/duo-palm-pong'); await page.clock.resume();
  page.on('pageerror', e => errors.push(e.message));
  await page.waitForFunction(() => document.querySelector('.pp-entry .launch-camera')?.disabled === false);
  await page.evaluate(async () => {
    const registry = await (await fetch('/src/platform/experiments.js')).text(), path = registry.match(/import\("([^"]*palmPong\/view\.js[^"]*)"\)/)[1];
    const { PalmPongView } = await import(path), render = PalmPongView.prototype.render;
    PalmPongView.prototype.render = function (...args) { window.__pp = this; return render.apply(this, args); };
    const viewSource = await (await fetch(path)).text(), inputPath = viewSource.match(/from "([^"]*input\/palmPongInput\.js[^"]*)"/)[1];
    const { PalmPongInput } = await import(inputPath);
    window.__palmHands = [[.28, .5], [.72, .5]]; window.__palmRequests = []; window.__palmClosed = 0;
    window.__palmResult = () => ({ landmarks: __palmHands.map(([x, y]) => Array.from({ length: 21 }, () => ({ x: 1-x, y, z: 0 }))) });
    PalmPongInput.prototype.createRecognizer = async function (_files, delegate) {
      this.testDelegates ??= []; this.testDelegates.push(delegate);
      if (delegate === 'GPU') throw Error('Synthetic GPU fallback');
      return { detectForVideo: () => __palmResult(), close: () => { __palmClosed++; } };
    };
    const canvas = document.createElement('canvas'); canvas.width = 1280; canvas.height = 720;
    const c = canvas.getContext('2d'); c.fillStyle = '#345ab8'; c.fillRect(0,0,640,720); c.fillStyle = '#e7d4a7'; c.fillRect(640,0,640,720);
    window.__palmStream = canvas.captureStream(30); window.__palmCanvas = canvas;
    Object.defineProperty(navigator.mediaDevices, 'getUserMedia', { configurable: true, value: async constraints => { __palmRequests.push(constraints); return __palmStream; } });
  });
  await page.setViewportSize({ width: 360, height: 800 }); await page.locator('.launch-camera').click();
  check(await page.evaluate(() => __pp.phase === 'rotate' && __palmRequests.length === 0), 'portrait camera entry waits for rotation without sensor access');
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.waitForFunction(() => window.__pp?.input.running);
  check(await page.evaluate(() => __palmRequests.length === 1 && __palmRequests[0].audio === false && __palmRequests[0].video.facingMode.exact === 'user'), 'front camera constraints request no microphone');
  check(await page.evaluate(() => __pp.input.testDelegates.join(',') === 'GPU,CPU'), 'GPU failure falls back to CPU');
  await page.clock.install({ time: new Date('2026-10-04T03:00:00Z') });
  await page.evaluate(() => {
    // Feed the input adapter at an observed 25Hz while virtual time runs. This
    // substitutes landmarks only; projection, matching and physics are real.
    cancelAnimationFrame(__pp.input.frameId); __pp.input.frameId = null;
    __pp.lastFrame = performance.now(); __pp.accumulator = 0;
    __pp.input.tracker.reset(); __pp.input.processResult(__palmResult(), performance.now());
    window.__palmFeed = setInterval(() => { if (__pp.input.running) __pp.input.processResult(__palmResult(), performance.now()); }, 40);
  });
  await page.clock.runFor(800);
  check(await page.evaluate(() => __pp.game.ready && __pp.game.paddles.every(p => p.present && p.active)), 'two stable hands enable START');
  check(await page.evaluate(() => Math.abs(__pp.game.paddles[0].x - .28 * 16) < .01 && Math.abs(__pp.game.paddles[1].x - .72 * 16) < .01), 'mirror and court coordinates attach paddles to matching palms');
  check(await page.locator('.pp-canvas').evaluate(c => { const p = c.getContext('2d').getImageData(15,360,1,1).data; return p[0] > p[2]; }), 'camera pixels are mirrored in the same direction as hand input');
  await page.locator('.pp-start').click(); await page.clock.runFor(3400);
  check(await page.evaluate(() => __pp.game.total >= 1), 'camera adapter drives a real front-face return');
  await page.screenshot({ path: 'output/playwright/palm-pong-camera-synthetic.png' });
  await page.evaluate(() => { __palmHands = [[.72, .5]]; }); await page.clock.runFor(240);
  check(await page.evaluate(() => __pp.game.paused && __pp.game.pauseReason === 'tracking'), 'lost hand pauses after grace');
  const lost = await page.evaluate(() => ({ elapsed: __pp.game.elapsed, total: __pp.game.total, misses: __pp.game.misses, ball: { ...__pp.game.ball } }));
  await page.clock.runFor(600);
  check(await page.evaluate(p => __pp.game.elapsed === p.elapsed && __pp.game.total === p.total && __pp.game.misses === p.misses && __pp.game.ball.x === p.ball.x, lost), 'lost hand creates neither stale success nor stale failure');
  await page.evaluate(() => { __palmHands = [[.28, .5], [.72, .5]]; }); await page.clock.runFor(1650);
  check(await page.evaluate(() => !__pp.game.paused && __pp.game.total >= 1), 'stable two-hand recovery preserves rally state');
  await page.setViewportSize({ width: 360, height: 800 }); await page.clock.runFor(100);
  const rotatedAt = await page.evaluate(() => __pp.game.elapsed);
  await page.clock.runFor(600);
  check(await page.evaluate(t => __pp.game.paused && __pp.game.pauseReason === 'rotation' && __pp.game.elapsed === t, rotatedAt), 'portrait rotation freezes the active round');
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.locator('.pp-resume').click(); await page.clock.runFor(1800);
  check(await page.evaluate(() => !__pp.game.paused), 'landscape return recalibrates and resumes the existing round');
  const stallAt = await page.evaluate(() => { __pp.lastFrame -= 250; return __pp.game.elapsed; }); await page.clock.runFor(50);
  check(await page.evaluate(t => __pp.game.paused && __pp.game.pauseReason === 'processing' && __pp.game.elapsed === t, stallAt), '200ms processing backlog pauses without consuming round time');
  await page.locator('.pp-resume').click(); await page.clock.runFor(1800);
  check(await page.evaluate(() => !__pp.game.paused), 'processing recovery resumes without replaying the stalled interval');
  await page.evaluate(() => { __palmHands = [[.72,.5]]; }); await page.clock.runFor(11000);
  check(await page.locator('.pp-realign').isVisible() && await page.locator('.pp-demo').isVisible() && await page.locator('.pp-exit').isVisible(), 'ten-second loss exposes realign, practice and exit');
  await page.locator('.pp-demo').click(); await page.clock.runFor(600);
  check(await page.evaluate(() => __pp.source === 'demo' && __pp.game.total === 0 && __pp.game.elapsed === 0 && !__pp.input.running), 'switching to practice begins an independent round');
  check(await page.evaluate(() => __palmStream.getTracks().every(t => t.readyState === 'ended') && __palmClosed === 1 && !__pp.video.srcObject), 'practice switch releases the camera stream and model');
  await page.evaluate(() => clearInterval(__palmFeed));
  await page.locator('.game-back').click(); await page.clock.runFor(50);
  check(await page.evaluate(() => !__pp.active && __pp.abort.signal.aborted && !__pp.audio.context), 'exit releases listeners and audio');
  await page.goto(base + '/?qa=palm-denied#/game/duo-palm-pong'); await page.clock.resume();
  await page.waitForFunction(() => document.querySelector('.pp-entry .launch-camera')?.disabled === false);
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.evaluate(async () => {
    const registry = await (await fetch('/src/platform/experiments.js')).text(), path = registry.match(/import\("([^"]*palmPong\/view\.js[^"]*)"\)/)[1];
    const { PalmPongView } = await import(path), render = PalmPongView.prototype.render;
    PalmPongView.prototype.render = function (...args) { window.__pp = this; return render.apply(this, args); };
    const source = await (await fetch(path)).text(), inputPath = source.match(/from "([^"]*input\/palmPongInput\.js[^"]*)"/)[1];
    const { PalmPongInput } = await import(inputPath);
    PalmPongInput.prototype.createRecognizer = async () => ({ detectForVideo: () => ({ landmarks: [] }), close: () => {} });
    Object.defineProperty(navigator.mediaDevices, 'getUserMedia', { configurable: true, value: async () => { throw new DOMException('Synthetic denial', 'NotAllowedError'); } });
  });
  await page.locator('.launch-camera').click(); await page.waitForFunction(() => window.__pp?.phase === 'error');
  check(await page.locator('.pp-demo').isVisible() && await page.locator('.pp-camera-retry').isVisible(), 'permission denial exposes retry and camera-free practice');
  await page.locator('.pp-demo').click(); await page.waitForFunction(() => window.__pp?.game.ready);
  check(await page.evaluate(() => __pp.source === 'demo' && !__pp.input.running && !__pp.video.srcObject), 'denied camera recovers into practice');
  await page.locator('.game-back').click();
  await page.goto(base + '/?qa=palm-cancel#/game/duo-palm-pong'); await page.clock.resume();
  await page.waitForFunction(() => document.querySelector('.pp-entry .launch-camera')?.disabled === false);
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.evaluate(async () => {
    const registry = await (await fetch('/src/platform/experiments.js')).text(), path = registry.match(/import\("([^"]*palmPong\/view\.js[^"]*)"\)/)[1];
    const { PalmPongView } = await import(path), render = PalmPongView.prototype.render;
    PalmPongView.prototype.render = function (...args) { window.__pp = this; return render.apply(this, args); };
    const source = await (await fetch(path)).text(), inputPath = source.match(/from "([^"]*input\/palmPongInput\.js[^"]*)"/)[1];
    const { PalmPongInput } = await import(inputPath);
    PalmPongInput.prototype.createRecognizer = async () => ({ detectForVideo: () => ({ landmarks: [] }), close: () => {} });
    const canvas = document.createElement('canvas'); canvas.width = 1280; canvas.height = 720; window.__cancelStream = canvas.captureStream(30);
    Object.defineProperty(navigator.mediaDevices, 'getUserMedia', { configurable: true, value: () => new Promise(resolve => { window.__resolveCamera = () => resolve(__cancelStream); }) });
  });
  await page.locator('.launch-camera').click(); await page.waitForFunction(() => !!window.__resolveCamera);
  await page.locator('.pp-exit').click(); await page.evaluate(() => __resolveCamera());
  await page.waitForFunction(() => __cancelStream.getTracks().every(t => t.readyState === 'ended'));
  check(await page.evaluate(() => !__pp.input.running && !__pp.video.srcObject && !__pp.active), 'late camera permission after cancel releases its stream');
  check(errors.length === 0, 'no uncaught synthetic camera errors: ' + errors.join('; '));
  return { passed: checks.length, checks, physicalCameraTested: false };
}
