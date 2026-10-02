// Synthetic MediaPipe landmarks plus real browser MediaStreamTrack lifecycle.
// Does not claim physical tracking accuracy or a human playtest.
async (page) => {
  const base = new URL(page.url()).origin, checks = [], errors = [];
  const check = (ok, name) => { if (!ok) throw Error(name); checks.push(name); };
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(() => localStorage.setItem('camera-game-lab-locale', 'en'));
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto(base + '/?qa=ghost-camera#/game/solo-ghost-trail');
  await page.waitForFunction(() => document.querySelector('.launch-camera')?.disabled === false);
  await page.clock.install();
  await page.evaluate(async () => {
    const source = await (await fetch('/src/input/bodyInput.js')).text();
    const vision = await import(source.match(/from "([^"]*mediapipe[^"]*)"/)[1]);
    const { GhostInput } = await import('/src/input/ghostInput.js');
    const start = GhostInput.prototype.start;
    GhostInput.prototype.start = function () {
      Object.defineProperty(this.video, 'currentTime', { configurable: true, get: () => performance.now() / 1000 });
      return start.call(this);
    };
    window.__face = { count: 1, x: .5, y: .5 };
    window.__tracks = []; window.__closes = 0; window.__mediaRequests = 0; window.__faceLimit = 0;
    vision.FilesetResolver.forVisionTasks = async () => ({});
    vision.FaceLandmarker.createFromOptions = async () => ({
      setOptions: async (options) => { window.__faceLimit = options.numFaces; },
      detectForVideo: () => ({ faceLandmarks: Array.from({ length: __face.count }, () => [{}, { x: __face.x, y: __face.y }]) }),
      close: () => window.__closes++,
    });
    const canvas = document.createElement('canvas'); canvas.width = 360; canvas.height = 480;
    const ctx = canvas.getContext('2d'); ctx.fillStyle = '#617881'; ctx.fillRect(0, 0, 360, 480);
    window.__paint = setInterval(() => ctx.fillRect(0, 0, 360, 480), 30);
    const stream = () => { const s = canvas.captureStream(30); __tracks.push(...s.getTracks()); return s; };
    navigator.mediaDevices.getUserMedia = async () => {
      __mediaRequests++;
      if (window.__deny) throw new DOMException('QA denied', 'NotAllowedError');
      if (window.__delay) return new Promise((resolve) => { window.__grant = () => resolve(stream()); });
      return stream();
    };
    const raf = requestAnimationFrame, cancel = cancelAnimationFrame;
    window.__rafs = new Set();
    window.requestAnimationFrame = (fn) => { let id; id = raf((time) => { __rafs.delete(id); fn(time); }); __rafs.add(id); return id; };
    window.cancelAnimationFrame = (id) => { __rafs.delete(id); cancel(id); };
  });
  check(await page.evaluate(() => __mediaRequests === 0), 'camera stays off before explicit start');
  await page.locator('.launch-camera').click();
  await page.waitForFunction(() => document.querySelector('.gt-stage video')?.srcObject);
  await page.clock.runFor(1100);
  check(await page.evaluate(() => __faceLimit === 2), 'two-face detector can reject additional players');
  const time = () => page.locator('.gt-time').textContent();
  check(await time() !== '30.0', 'raw nose input starts recording');
  await page.evaluate(() => { __face.count = 0; }); await page.clock.runFor(100);
  const frozen = await time(); await page.clock.runFor(1500);
  check(await time() === frozen, 'face loss freezes round and history');
  await page.evaluate(() => { __face.count = 2; }); await page.clock.runFor(1000);
  check(await time() === frozen, 'two faces cannot resume');
  await page.evaluate(() => { __face.count = 1; }); await page.clock.runFor(300);
  check(await time() === frozen, 'recovery waits for stable input');
  await page.clock.runFor(1000); check(await time() !== frozen, 'stable single face resumes');
  await page.evaluate(() => { __face.x = 1.1; }); await page.clock.runFor(100);
  const outside = await time(); await page.clock.runFor(700);
  check(await time() === outside, 'invalid offscreen face pauses');
  await page.evaluate(() => { __face.x = .5; }); await page.clock.runFor(9000);
  await page.locator('.platform-result').waitFor({ state: 'visible' });
  check((await page.locator('.platform-result').textContent()).includes('Camera'), 'result preserves camera provenance');
  check(await page.evaluate(() => __tracks.every((t) => t.readyState === 'ended') && __closes === 1 && __rafs.size === 0), 'result releases track, model and all animation frames');
  await page.locator('[data-result-action="retry"]').click();
  await page.waitForFunction(() => __mediaRequests === 2); await page.clock.runFor(100);
  check(await page.evaluate(() => __tracks.filter((t) => t.readyState === 'live').length === 1), 'retry has exactly one fresh stream');
  await page.locator('.game-back').click(); await page.clock.runFor(100);
  check(await page.evaluate(() => __tracks.every((t) => t.readyState === 'ended') && __closes === 2), 'exit releases camera/model');
  await page.evaluate(() => { __delay = true; location.hash = '#/game/solo-ghost-trail'; });
  await page.waitForFunction(() => document.querySelector('.launch-camera')?.disabled === false);
  await page.locator('.launch-camera').click(); await page.waitForFunction(() => typeof __grant === 'function');
  await page.locator('.game-back').click(); await page.evaluate(() => __grant()); await page.clock.runFor(100);
  check(await page.evaluate(() => __tracks.every((t) => t.readyState === 'ended') && !document.querySelector('.gt-stage video').srcObject), 'late permission cannot revive abandoned camera');
  await page.evaluate(() => { __delay = false; __deny = true; location.hash = '#/game/solo-ghost-trail'; });
  await page.waitForFunction(() => document.querySelector('.launch-camera')?.disabled === false);
  await page.locator('.launch-camera').click(); await page.locator('.gt-recovery').waitFor();
  await page.locator('.gt-demo').click(); await page.clock.runFor(500);
  check((await page.locator('.gt-source').textContent()).includes('DEMO'), 'permission rejection offers working demo recovery');
  await page.locator('.game-back').click(); await page.clock.runFor(100);
  await page.evaluate(() => clearInterval(__paint));
  check(errors.length === 0, 'no uncaught browser errors');
  return { checks, errors, synthetic: true, physicalDevice: false, humanPlaytest: false };
}
