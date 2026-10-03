// Synthetic landmark frames with actual MediaStreamTrack ownership.
// These checks do not establish real MediaPipe accuracy or human game feel.
async (page) => {
  const base = new URL(page.url()).origin, checks = [], errors = [];
  const check = (ok, name) => { if (!ok) throw Error(name); checks.push(name); };
  page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(() => localStorage.setItem('camera-game-lab-locale', 'ja'));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(base + '/');
  await page.goto(base + '/?qa=soft-camera#/game/solo-soft-serve');
  await page.waitForFunction(() => document.querySelector('.launch-camera')?.disabled === false);
  await page.clock.install();
  await page.evaluate(async () => {
    const source = await (await fetch('/src/input/bodyInput.js')).text();
    const vision = await import(source.match(/from "([^"]*mediapipe[^"]*)"/)[1]);
    const { SoftServeInput } = await import('/src/input/softServeInput.js');
    const viewSource = await (await fetch('/src/softServe/view.js')).text();
    const { SoftServeGame } = await import(viewSource.match(/from "([^"]*\/games\/softServe\.js[^"]*)"/)[1]);
    const start = SoftServeInput.prototype.start, step = SoftServeGame.prototype.step;
    SoftServeGame.prototype.step = function (...args) { window.__game = this; return step.apply(this, args); };
    SoftServeInput.prototype.start = function () {
      Object.defineProperty(this.video, 'currentTime', { configurable: true, get: () => performance.now() / 1000 });
      // Landmark mocks do not decode frames. Keep browser-owned tracks real,
      // while giving the synthetic inference a stable camera aspect ratio.
      Object.defineProperty(this.video, 'readyState', { configurable: true, get: () => 3 });
      Object.defineProperty(this.video, 'videoWidth', { configurable: true, get: () => document.querySelector('.ss-stage').clientWidth });
      Object.defineProperty(this.video, 'videoHeight', { configurable: true, get: () => document.querySelector('.ss-stage').clientHeight });
      this.video.play = async () => {};
      return start.call(this);
    };
    window.__signal = { hand: true, faceCount: 1, hx: .5, hy: .72, mx: .5, my: .45, open: false };
    window.__tracks = []; window.__mediaRequests = 0; window.__handCloses = 0; window.__faceCloses = 0; window.__delegates = []; window.__failFaceGPU = true;
    vision.FilesetResolver.forVisionTasks = async () => ({});
    vision.HandLandmarker.createFromOptions = async (fileset, options) => {
      window.__handCount = options.numHands; __delegates.push(options.baseOptions.delegate);
      return { detectForVideo: () => ({ landmarks: __signal.hand ? [Array.from({ length: 21 }, () => ({ x: __signal.hx, y: __signal.hy }))] : [] }), close: () => __handCloses++ };
    };
    vision.FaceLandmarker.createFromOptions = async (fileset, options) => {
      if (__failFaceGPU && options.baseOptions.delegate === 'GPU') { __failFaceGPU = false; throw Error('QA GPU unavailable'); }
      window.__faceCount = options.numFaces;
      return { detectForVideo: () => ({ faceLandmarks: Array.from({ length: __signal.faceCount }, () => {
        const f = Array.from({ length: 478 }, () => ({ x: __signal.mx, y: __signal.my }));
        f[13] = { x: __signal.mx, y: __signal.my - (__signal.open ? .04 : .002) };
        f[14] = { x: __signal.mx, y: __signal.my + (__signal.open ? .04 : .002) };
        f[61] = { x: __signal.mx - .06, y: __signal.my }; f[291] = { x: __signal.mx + .06, y: __signal.my }; return f;
      }) }), close: () => __faceCloses++ };
    };
    const canvas = document.createElement('canvas'); canvas.width = document.querySelector('.ss-stage').clientWidth; canvas.height = document.querySelector('.ss-stage').clientHeight;
    const ctx = canvas.getContext('2d'); ctx.fillStyle = '#689584'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    window.__paint = setInterval(() => ctx.fillRect(0, 0, canvas.width, canvas.height), 30);
    const stream = () => { const s = canvas.captureStream(30); __tracks.push(...s.getTracks()); return s; };
    navigator.mediaDevices.getUserMedia = async constraints => {
      __mediaRequests++; window.__constraints = constraints;
      if (window.__deny) throw new DOMException('QA denied', 'NotAllowedError');
      if (window.__delay) return new Promise(resolve => { window.__grant = () => resolve(stream()); });
      return stream();
    };
    const raf = requestAnimationFrame, cancel = cancelAnimationFrame;
    window.__rafs = new Set();
    window.requestAnimationFrame = fn => { let id; id = raf(time => { __rafs.delete(id); fn(time); }); __rafs.add(id); return id; };
    window.cancelAnimationFrame = id => { __rafs.delete(id); cancel(id); };
  });
  check(await page.evaluate(() => __mediaRequests === 0), 'explicit camera action required');
  await page.locator('.launch-camera').click(); await page.waitForFunction(() => document.querySelector('.ss-stage video')?.srcObject);
  await page.clock.runFor(1800);
  check(await page.evaluate(() => __constraints.video.facingMode.exact === 'user' && __constraints.audio === false), 'one front camera with no microphone');
  check(await page.evaluate(() => __handCount === 1 && __faceCount === 2 && __delegates.join() === 'GPU,CPU' && __handCloses === 1), 'partial GPU creation closes hand model before CPU fallback');
  check(await page.evaluate(() => __game.phase === 'serve'), 'hand detection automatically begins serving');
  await page.clock.runFor(2500); await page.evaluate(() => { __signal.hand = false; }); await page.clock.runFor(100);
  const frozen = await page.locator('.ss-melt-value').textContent(); await page.clock.runFor(1300);
  check(await page.locator('.ss-melt-value').textContent() === frozen, 'hand loss freezes melting and serving');
  await page.evaluate(() => { __signal.hand = true; }); await page.clock.runFor(200);
  check(await page.locator('.ss-melt-value').textContent() === frozen, 'reacquisition needs a stable hold');
  await page.clock.runFor(600); check(await page.evaluate(() => !__game.paused), 'stable hand resumes without a penalty');
  await page.evaluate(() => { __signal.faceCount = 0; }); await page.clock.runFor(1200);
  check(await page.evaluate(() => !__game.paused), 'face absence does not interrupt the hand-only serve phase');
  await page.evaluate(() => { __signal.hx = .1; }); await page.clock.runFor(1000);
  check(await page.evaluate(() => __game.phase === 'eat' && __game.paused), 'moving away enters eating; a missing mouth pauses it');
  const eaten = await page.evaluate(() => __game.amount);
  await page.evaluate(() => { __signal.faceCount = 2; }); await page.clock.runFor(900);
  check(await page.evaluate(() => __game.paused && __game.bites === 0), 'two faces cannot supply mouth contact');
  await page.evaluate(() => { __signal.faceCount = 1; }); await page.clock.runFor(800);
  check(await page.evaluate(() => !__game.paused && __game.amount > 0), 'one valid mouth and hand resume eating');
  const approach = () => page.evaluate(() => {
    const p = __game.tip; __signal.mx = 1 - p.x; __signal.my = p.y; __signal.open = true;
  });
  await approach(); await page.clock.runFor(250);
  check(await page.evaluate(() => __game.bites === 1 && __game.amount < __game.maxAmount), 'open mouth at rendered tip takes one bite');
  await page.clock.runFor(900); check(await page.evaluate(() => __game.bites === 1), 'sustained contact cannot eat the whole cone');
  await page.screenshot({ path: 'output/playwright/soft-serve-camera-eat-390.png' });
  for (let i = 0; i < 12 && await page.evaluate(() => __game.phase !== 'result'); i++) {
    await page.evaluate(() => { __signal.open = false; }); await page.clock.runFor(250);
    await approach(); await page.clock.runFor(250);
  }
  await page.clock.runFor(300); await page.locator('.platform-result').waitFor();
  check(await page.evaluate(() => __game.result.outcome === 'clean' && __game.result.source === 'camera' && __game.result.eatenPercent === 100), 'repeated mouth approaches produce camera CLEAN');
  check(await page.evaluate(() => __tracks.every(t => t.readyState === 'ended') && __handCloses === 2 && __faceCloses === 1 && __rafs.size === 0), 'result releases the single stream, both models and animation loops');
  await page.locator('[data-result-action="retry"]').click(); await page.waitForFunction(() => __mediaRequests === 2); await page.clock.runFor(200);
  check(await page.evaluate(() => __tracks.filter(t => t.readyState === 'live').length === 1), 'camera RETRY owns exactly one fresh stream');
  await page.locator('.game-back').click(); await page.clock.runFor(100);
  check(await page.evaluate(() => __tracks.every(t => t.readyState === 'ended') && __handCloses === 3 && __faceCloses === 2 && __rafs.size === 0), 'departure closes both models and all input resources');
  await page.evaluate(() => { __delay = true; location.hash = '#/game/solo-soft-serve'; });
  await page.waitForFunction(() => document.querySelector('.launch-camera')?.disabled === false);
  await page.locator('.launch-camera').click(); await page.waitForFunction(() => typeof __grant === 'function');
  await page.locator('.game-back').click(); await page.evaluate(() => __grant()); await page.clock.runFor(100);
  check(await page.evaluate(() => __tracks.every(t => t.readyState === 'ended') && !document.querySelector('.ss-stage video').srcObject && __rafs.size === 0), 'late permission cannot revive an abandoned round');
  await page.evaluate(() => { __delay = false; __deny = true; location.hash = '#/game/solo-soft-serve'; });
  await page.waitForFunction(() => document.querySelector('.launch-camera')?.disabled === false);
  await page.locator('.launch-camera').click(); await page.locator('.ss-recovery').waitFor();
  check(await page.locator('.ss-retry').isVisible(), 'permission denial gives an explicit retry');
  await page.locator('.ss-demo').click(); await page.clock.runFor(1200);
  check((await page.locator('.ss-source').textContent()).includes('練習'), 'denial recovers to labeled camera-free practice');
  await page.locator('.game-back').click(); await page.clock.runFor(100); await page.evaluate(() => clearInterval(__paint));
  check(errors.length === 0, 'no uncaught camera-path errors');
  return { checks, errors, synthetic: true, physicalDevice: false, humanPlaytest: false, creamBeforeEating: eaten };
}
