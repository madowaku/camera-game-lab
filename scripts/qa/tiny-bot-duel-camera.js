// Dev-server QA: synthetic video and face inference; no hardware claims.
async (page) => {
  const base = 'http://127.0.0.1:5173';
  const output = 'output/playwright';
  const checks = [];
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const check = (condition, name) => { if (!condition) throw Error(name); checks.push(name); };
  await page.goto(base + '/?qa=tiny-bot-camera#duo');
  await page.reload();
  await page.waitForFunction(() => document.querySelector('.launch-camera')?.disabled === false);
  await page.evaluate(async () => {
    const source = await (await fetch('/src/input/bodyInput.js')).text();
    const vision = await import(source.match(/from "([^"]*mediapipe[^"]*)"/)[1]);
    vision.FilesetResolver.forVisionTasks = async () => ({});
    window.__showFaces = false; window.__missing = false; window.__closedModels = 0;
    const face = x => {
      const p = Array.from({ length: 478 }, () => ({ x, y: .45, z: 0 }));
      p[0] = { x: x - .12, y: .25 }; p[2] = { x: x + .12, y: .65 };
      for (const [i, dx, y] of [[33,-.07,.4],[263,.07,.4],[61,-.06,.55],[291,.06,.55],
        [13,0,.55],[14,0,.558],[133,-.04,.4],[159,-.055,.395],[145,-.055,.405],
        [362,.04,.4],[386,.055,.395],[374,.055,.405]]) p[i] = { x: x + dx, y };
      return p;
    };
    const faces = [face(.26), face(.74)];
    vision.FaceLandmarker.createFromOptions = async () => ({
      detectForVideo: () => ({ faceLandmarks: !__showFaces ? [] : __missing ? faces.slice(0, 1) : faces }),
      close: () => window.__closedModels++,
    });
    const duelModule = performance.getEntriesByType('resource').findLast(r => r.name.includes('/src/duo/duoArcade.js')).name;
    const { DuoArcade } = await import(duelModule);
    const activate = DuoArcade.prototype.activate;
    DuoArcade.prototype.activate = function (...args) { window.__duel = this; return activate.apply(this, args); };
    const camera = document.createElement('canvas'); camera.width = 1280; camera.height = 720;
    const ctx = camera.getContext('2d'); let frame = 0;
    const draw = () => {
      ctx.fillStyle = '#fafafa'; ctx.fillRect(0, 0, 1280, 720);
      for (const [x, color] of [[330, '#ff7043'], [950, '#42a5f5']]) {
        ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, 325, 130, 0, 2 * Math.PI); ctx.fill();
        ctx.fillStyle = '#152234'; ctx.fillRect(x - 65, 290, 30, 25); ctx.fillRect(x + 35, 290, 30, 25);
        ctx.fillRect(x - 35, 380, 70, 15);
      }
      ctx.fillStyle = frame++ % 2 ? '#000' : '#fff'; ctx.fillRect(0, 0, 8, 8);
    };
    draw(); window.__cameraTimer = setInterval(draw, 50);
    window.__requests = []; window.__tracks = []; window.__deny = false;
    navigator.mediaDevices.getUserMedia = async constraints => {
      window.__requests.push(constraints);
      if (__deny) throw new DOMException('Permission denied', 'NotAllowedError');
      const stream = camera.captureStream(20); window.__tracks.push(...stream.getTracks()); return stream;
    };
  });
  check(await page.evaluate(() => __requests.length === 0), 'preflight does not request the camera');
  await page.locator('.launch-camera').click();
  await page.waitForFunction(() => window.__duel?.status === 'READY' && document.querySelector('.duo-camera').videoWidth > 0);
  check(await page.evaluate(() => __requests.length === 1 && __requests[0].video.facingMode.exact === 'user'), 'requests front camera exactly once');
  for (const size of [{ width: 844, height: 390 }, { width: 390, height: 844 }, { width: 1440, height: 900 }]) {
    await page.setViewportSize(size);
    const preview = await page.evaluate(() => {
      const root = __duel.root, video = document.querySelector('.duo-camera'), overlay = document.querySelector('.duo-overlay');
      const stage = document.querySelector('.duo-stage').getBoundingClientRect();
      const caption = document.querySelector('.duo-overlay__detail').getBoundingClientRect();
      return {
        live: root.classList.contains('duo--camera-live'), calibrating: root.classList.contains('duo--calibrating'),
        opacity: getComputedStyle(video).opacity, mirrored: getComputedStyle(video).transform.startsWith('matrix(-1'),
        fit: getComputedStyle(video).objectFit, background: getComputedStyle(overlay).backgroundColor,
        blur: getComputedStyle(overlay).backdropFilter, arena: getComputedStyle(__duel.canvas).visibility,
        captionAtBottom: caption.top >= stage.top + stage.height * .5,
        noOverflow: document.documentElement.scrollWidth <= innerWidth,
      };
    });
    check(preview.live && preview.calibrating && preview.opacity === '1', `bright live calibration at ${size.width}x${size.height}`);
    check(preview.fit === 'contain' && preview.mirrored, `whole mirrored camera frame at ${size.width}x${size.height}`);
    check(preview.background === 'rgba(0, 0, 0, 0)' && preview.blur === 'none' && preview.arena === 'hidden', `faces unobscured at ${size.width}x${size.height}`);
    check(preview.captionAtBottom && preview.noOverflow, `caption fits below faces at ${size.width}x${size.height}`);
    await page.locator('.duo-stage').screenshot({ path: `${output}/tiny-bot-camera-after-${size.width}.png` });
  }
  await page.setViewportSize({ width: 844, height: 390 });
  await page.evaluate(() => { __showFaces = true; });
  await page.waitForFunction(() => __duel.phase === 'playing', null, { timeout: 12000 });
  await page.locator('.duo-overlay').waitFor({ state: 'hidden' });
  check(await page.evaluate(() => !__duel.root.classList.contains('duo--calibrating') && getComputedStyle(__duel.canvas).visibility === 'visible' && __duel.snapshot.players.every(p => p.present && p.calibrated)), 'two detected faces calibrate and restore arena for play');
  await page.locator('.duo-stage').screenshot({ path: `${output}/tiny-bot-camera-playing.png` });
  await page.evaluate(() => { __missing = true; });
  await page.waitForFunction(() => __duel.paused);
  await page.locator('.duo-overlay').waitFor({ state: 'visible' });
  check(await page.locator('.duo-overlay').isVisible(), 'face loss pauses with recovery message');
  check(await page.locator('.duo-overlay').evaluate(el => getComputedStyle(el).backdropFilter === 'none' && getComputedStyle(el).backgroundColor === 'rgba(0, 0, 0, 0)'), 'face recovery keeps camera visible');
  await page.evaluate(() => { __missing = false; });
  await page.waitForFunction(() => !__duel.paused);
  await page.locator('.duo-pause-button').click();
  const pausedAt = await page.evaluate(() => __duel.game.elapsedMs);
  await page.locator('.duo-stage').screenshot({ path: `${output}/tiny-bot-camera-paused.png` });
  check(await page.evaluate(at => __duel.game.elapsedMs === at, pausedAt), 'manual pause freezes the round');
  await page.locator('.duo-recalibrate-button').click();
  await page.waitForFunction(() => __duel.root.classList.contains('duo--calibrating'));
  check(await page.evaluate(() => getComputedStyle(__duel.canvas).visibility === 'hidden'), 'recalibration restores clear preview');
  await page.locator('.duo-fallback-button').click();
  check(await page.locator('.duo-camera').isHidden(), 'fallback hides released video');
  check(await page.evaluate(() => __tracks.every(t => t.readyState === 'ended') && getComputedStyle(__duel.canvas).visibility === 'visible'), 'fallback releases stream and retains visible arena');
  await page.locator('.game-back').click();
  await page.evaluate(() => { location.hash = '#duo'; });
  await page.waitForFunction(() => document.querySelector('.launch-camera')?.disabled === false);
  await page.evaluate(() => { __deny = true; });
  await page.locator('.launch-camera').click();
  await page.waitForFunction(() => __duel.status === 'ERROR');
  check(await page.locator('.duo-message').evaluate(el => el.textContent.includes('許可設定')), 'denied permission displays concrete camera error');
  check(await page.locator('.duo-fallback-button').isVisible(), 'denied permission offers fallback');
  await page.evaluate(() => { __deny = false; __showFaces = false; });
  await page.locator('.duo-camera-button').click();
  await page.waitForFunction(() => __duel.status === 'READY' && __duel.root.classList.contains('duo--camera-live'));
  check(await page.evaluate(() => __tracks.filter(t => t.readyState === 'live').length === 1), 'camera retry creates exactly one live stream');
  await page.evaluate(() => { __duel.locale = 'en'; __duel.render(); });
  check(await page.locator('.duo-overlay__detail').evaluate(el => el.textContent.includes('Both players')), 'English calibration caption renders');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('.duo-stage').screenshot({ path: `${output}/tiny-bot-camera-after-en-390.png` });
  await page.locator('.game-back').click();
  await page.locator('.lab-feed').waitFor();
  check(await page.evaluate(() => __tracks.every(t => t.readyState === 'ended') && [...document.querySelectorAll('video')].every(v => !v.srcObject)), 'leaving game releases all camera streams');
  check(errors.length === 0, 'no browser exceptions');
  await page.evaluate(() => clearInterval(__cameraTimer));
  return { checks, synthetic: true, errors };
}
