// Synthetic raw MediaPipe output, real MediaStreamTrack and AudioContext teardown.
// This does not certify physical eye tracking, mobile hardware, or human game feel.
async (page) => {
  const base = new URL(page.url()).origin, checks = [], errors = [];
  const check = (condition, name) => { if (!condition) throw Error(name); checks.push(name); };
  page.on('pageerror', (error) => errors.push(error.message));
  await page.addInitScript(() => localStorage.setItem('camera-game-lab-locale', 'en'));
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto(base + '/?qa=blink-camera#/game/solo-blink-horror');
  await page.waitForFunction(() => document.querySelector('.launch-camera')?.disabled === false);
  await page.clock.install();
  await page.evaluate(async () => {
    const source = await (await fetch('/src/input/bodyInput.js')).text();
    const vision = await import(source.match(/from "([^"]*mediapipe[^"]*)"/)[1]);
    const { EyeInput } = await import('/src/input/eyeInput.js');
    const start = EyeInput.prototype.start;
    EyeInput.prototype.start = function () {
      Object.defineProperty(this.video, 'currentTime', { configurable: true, get: () => performance.now() / 1000 });
      return start.call(this);
    };
    window.__eye = { present: true, closed: false };
    window.__tracks = []; window.__contexts = []; window.__modelCloses = 0; window.__mediaRequests = 0; window.__blendshapeOptions = 0;
    const OriginalAudio = window.AudioContext;
    window.AudioContext = class extends OriginalAudio { constructor(...args) { super(...args); window.__contexts.push(this); } };
    vision.FilesetResolver.forVisionTasks = async () => ({});
    vision.FaceLandmarker.createFromOptions = async () => ({
      setOptions: async (options) => { if (options.outputFaceBlendshapes) window.__blendshapeOptions++; },
      detectForVideo: () => window.__eye.present ? { faceLandmarks: [[{}, { x: .5, y: .42 }]], faceBlendshapes: [{ categories: ['eyeBlinkLeft', 'eyeBlinkRight'].map((categoryName) => ({ categoryName, score: window.__eye.closed ? .9 : .1 })) }] } : {},
      close: () => window.__modelCloses++,
    });
    const canvas = document.createElement('canvas'); canvas.width = 360; canvas.height = 640;
    const ctx = canvas.getContext('2d'); ctx.fillStyle = '#66776b'; ctx.fillRect(0, 0, 360, 640);
    window.__paint = setInterval(() => ctx.fillRect(0, 0, 360, 640), 30);
    const stream = () => { const media = canvas.captureStream(30); window.__tracks.push(...media.getTracks()); return media; };
    navigator.mediaDevices.getUserMedia = async () => {
      window.__mediaRequests++;
      if (window.__deny) throw new DOMException('QA denial', 'NotAllowedError');
      if (window.__delay) return new Promise((resolve) => { window.__grant = () => resolve(stream()); });
      return stream();
    };
    const raf = window.requestAnimationFrame, cancel = window.cancelAnimationFrame;
    window.__rafs = new Set();
    window.requestAnimationFrame = (fn) => { let id; id = raf((time) => { window.__rafs.delete(id); fn(time); }); window.__rafs.add(id); return id; };
    window.cancelAnimationFrame = (id) => { window.__rafs.delete(id); cancel(id); };
  });
  check(await page.evaluate(() => __mediaRequests === 0 && __contexts.length === 0), 'no sensors or audio before explicit camera start');
  await page.locator('.launch-camera').click();
  await page.waitForFunction(() => document.querySelector('video')?.srcObject && window.__mediaRequests === 1);
  await page.clock.runFor(4200);
  check(await page.evaluate(() => __blendshapeOptions === 1), 'shared face model enables blendshapes once');
  const progress = () => page.locator('.bh-progress-value').textContent();
  check(await progress() !== '0%', 'raw open eyes finish calibration and advance');
  await page.evaluate(() => { __eye.closed = true; }); await page.clock.runFor(400);
  check(await page.locator('.bh-stage').evaluate((el) => el.classList.contains('is-closed')), 'qualified raw closed eyes hide');
  const closedProgress = await progress(); await page.clock.runFor(500);
  check(await progress() === closedProgress, 'closed eyes pause escape');
  await page.evaluate(() => { __eye.present = false; }); await page.clock.runFor(100);
  const frozen = await page.locator('.bh-stage').evaluate((el) => el.style.getPropertyValue('--danger'));
  await page.clock.runFor(2200);
  check(await page.locator('.bh-stage').evaluate((el) => el.style.getPropertyValue('--danger')) === frozen, 'FACE_LOST never retreats danger');
  check(!(await page.locator('.bh-stage').evaluate((el) => el.classList.contains('is-closed'))), 'FACE_LOST is visibly distinct from hiding');
  await page.evaluate(() => { __eye.present = true; __eye.closed = false; }); await page.clock.runFor(200);
  check(await progress() === closedProgress, 'tracking recovery waits for stable face');
  await page.clock.runFor(20000);
  await page.locator('.platform-result').waitFor({ state: 'visible' });
  await page.waitForFunction(() => __contexts.every((c) => c.state === 'closed'));
  check(await page.evaluate(() => __tracks.every((t) => t.readyState === 'ended') && __modelCloses === 1 && __rafs.size === 0), 'RESULT stops tracks, model, audio and every game animation frame');
  check((await page.locator('.platform-result').textContent()).includes('Camera'), 'camera result has camera source');
  await page.locator('[data-result-action="retry"]').click();
  await page.waitForFunction(() => __mediaRequests === 2);
  await page.clock.runFor(100);
  check(await page.evaluate(() => __tracks.filter((t) => t.readyState === 'live').length === 1), 'RETRY obtains exactly one fresh stream');
  await page.locator('.game-back').click(); await page.clock.runFor(100);
  check(await page.evaluate(() => __tracks.every((t) => t.readyState === 'ended') && __modelCloses === 2), 'leaving calibration releases model and stream');
  await page.evaluate(() => { __delay = true; location.hash = '#/game/solo-blink-horror'; });
  await page.waitForFunction(() => document.querySelector('.launch-camera')?.disabled === false);
  await page.locator('.launch-camera').click(); await page.waitForFunction(() => typeof __grant === 'function');
  await page.locator('.game-back').click(); await page.evaluate(() => __grant()); await page.clock.runFor(100);
  check(await page.evaluate(() => __tracks.every((t) => t.readyState === 'ended') && [...document.querySelectorAll('video')].every((v) => !v.srcObject)), 'late camera permission cannot revive an abandoned game');
  await page.evaluate(() => { __delay = false; __deny = true; location.hash = '#/game/solo-blink-horror'; });
  await page.waitForFunction(() => document.querySelector('.launch-camera')?.disabled === false);
  await page.locator('.launch-camera').click(); await page.locator('.bh-recovery').waitFor({ state: 'visible' });
  await page.locator('.bh-demo').click(); await page.clock.runFor(3000);
  check((await page.locator('.bh-source').textContent()).includes('DEMO'), 'permission denial recovers into clearly labeled demo');
  await page.locator('.game-back').click(); await page.clock.runFor(100);
  await page.waitForFunction(() => __contexts.every((c) => c.state === 'closed'));
  check(await page.evaluate(() => __tracks.every((t) => t.readyState === 'ended')), 'error/demo/exit path leaves no live tracks');
  await page.evaluate(() => clearInterval(__paint));
  check(errors.length === 0, 'no uncaught browser errors');
  return { checks, errors, synthetic: true, physicalDevice: false };
}
