// Genuine browser MediaStream tracks and the production input lifecycle, with
// synthetic model landmarks. These checks do not establish physical accuracy.
async (page) => {
  await page.clock.resume();
  const base = new URL(page.url()).origin, checks = [], errors = [];
  const check = (ok, name) => { if (!ok) throw Error(name); checks.push(name); };
  page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(() => { localStorage.setItem('camera-game-lab-locale', 'ja'); localStorage.setItem('camera-game-lab-bgm-v1', 'true'); });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(base + '/?qa=handy-camera#/game/solo-handy-pals');
  await page.clock.resume();
  await page.waitForFunction(() => document.querySelector('.hp-entry .launch-camera')?.disabled === false);
  await page.clock.install({ time: new Date('2026-10-03T15:20:00Z') });
  await page.evaluate(async () => {
    const registry = await (await fetch('/src/platform/experiments.js')).text();
    const path = registry.match(/import\("([^"]*\/handy\/view\.js[^"]*)"\)/)[1];
    const source = await (await fetch(path)).text();
    const inputPath = source.match(/from "([^"]*\/input\/handyPalsInput\.js[^"]*)"/)[1];
    const inputSource = await (await fetch(inputPath)).text();
    const vision = await import(inputSource.match(/from "([^"]*mediapipe[^"]*)"/)[1]);
    const { HandyPalsInput } = await import(inputPath), { HandyPalsView } = await import(path);
    const render = HandyPalsView.prototype.render, start = HandyPalsInput.prototype.start;
    HandyPalsView.prototype.render = function (...args) { window.__hpView = this; return render.apply(this, args); };
    HandyPalsInput.prototype.start = function () {
      Object.defineProperties(this.video, {
        currentTime: { configurable: true, get: () => performance.now() / 1000 },
        readyState: { configurable: true, get: () => 3 },
        videoWidth: { configurable: true, get: () => 400 },
        videoHeight: { configurable: true, get: () => 500 },
      });
      this.video.play = async () => {};
      return start.call(this);
    };
    window.__hands = [{ x: .28, y: .72, label: 'Left' }, { x: .72, y: .72, label: 'Right' }];
    window.__requests = 0; window.__closes = 0; window.__tracks = []; window.__delegates = []; window.__audio = [];
    const Ctor = window.AudioContext;
    if (Ctor) window.AudioContext = function (...args) { const c = new Ctor(...args); __audio.push(c); return c; };
    vision.FilesetResolver.forVisionTasks = async () => ({});
    vision.HandLandmarker.createFromOptions = async (files, options) => {
      __delegates.push(options.baseOptions.delegate); window.__numHands = options.numHands;
      if (options.baseOptions.delegate === 'GPU' && !window.__gpuFailed) { window.__gpuFailed = true; throw Error('QA GPU fallback'); }
      return { close: () => __closes++, detectForVideo: () => ({
        landmarks: __hands.map(p => Array.from({ length: 21 }, () => ({ x: 1 - p.x, y: p.y, z: 0 }))),
        handedness: __hands.map(p => [{ categoryName: p.label, score: .99 }]),
      }) };
    };
    const board = document.createElement('canvas'); board.width = 400; board.height = 500;
    const c = board.getContext('2d'); c.fillStyle = '#91bca1'; c.fillRect(0, 0, 400, 500);
    c.fillStyle = '#e8c1a1'; for (const x of [112, 288]) { c.beginPath(); c.ellipse(x, 360, 33, 45, 0, 0, Math.PI * 2); c.fill(); }
    const stream = () => { const s = board.captureStream(30); __tracks.push(...s.getTracks()); return s; };
    navigator.mediaDevices.getUserMedia = async constraints => {
      __requests++; window.__constraints = constraints;
      if (window.__deny) throw new DOMException('QA denied', 'NotAllowedError');
      if (window.__delay) return new Promise(resolve => window.__grant = () => resolve(stream()));
      return stream();
    };
  });
  check(await page.evaluate(() => __requests === 0), 'entry does not request camera');
  await page.locator('.launch-camera').click();
  await page.waitForFunction(() => window.__hpView?.input.running);
  await page.clock.runFor(450);
  check(await page.evaluate(() => __constraints.audio === false && __constraints.video.facingMode.exact === 'user'), 'front camera only and no microphone');
  check(await page.evaluate(() => __numHands === 2 && __delegates.join() === 'GPU,CPU'), 'two-hand model and CPU fallback');
  check(await page.evaluate(() => __hpView.game.phase === 'intro'), 'two landmarks summon both characters');
  await page.clock.runFor(3000);
  check(await page.evaluate(() => __hpView.game.phase === 'playing'), 'camera free dance follows automatic greeting');
  await page.evaluate(() => { __hands = [{ x: .39, y: .72, label: 'Left' }, { x: .61, y: .72, label: 'Right' }]; });
  await page.clock.runFor(250); check(await page.evaluate(() => __hpView.game.highFives === 1), 'camera hand distance produces high-five');
  await page.evaluate(() => { __hands.reverse(); }); await page.clock.runFor(200);
  check(await page.evaluate(() => __hpView.input.tracker.slots[0].label === 'Left'), 'model array order does not exchange identities');
  await page.evaluate(() => { __hands = [{ x: .75, y: .72, label: 'Left' }, { x: .25, y: .72, label: 'Right' }]; }); await page.clock.runFor(350);
  check(await page.evaluate(() => __hpView.game.pals[0].x > __hpView.game.pals[1].x), 'crossing retains characters on their own hands');
  await page.evaluate(() => { __hands = [{ x: .25, y: .72, label: 'Right' }]; }); await page.clock.runFor(500);
  check(await page.evaluate(() => __hpView.game.pals[0].state === 'wobble' && __hpView.game.pals[0].visible), 'brief loss preserves wobbling character');
  await page.clock.runFor(350);
  check(await page.evaluate(() => __hpView.game.pals[0].state === 'search'), 'longer loss looks around');
  check((await page.locator('.hp-tip').textContent()).includes('手のひら全体'), 'loss gives concrete recovery instruction');
  await page.evaluate(() => { __hands = [{ x: .7, y: .72, label: 'Left' }, { x: .3, y: .72, label: 'Right' }]; }); await page.clock.runFor(200);
  check(await page.evaluate(() => __hpView.game.pals.every(p => p.state === 'present')), 'hand return recovers without another calibration');
  await page.screenshot({ path: 'output/playwright/handy-pals-camera-390.png' });
  await page.clock.runFor(31000); await page.locator('.hp-result').waitFor();
  check(await page.evaluate(() => __tracks.every(t => t.readyState === 'ended') && __closes === 1 && __audio.every(c => c.state === 'closed')), 'result closes real tracks, model and all audio contexts');
  check(!(await page.locator('.hp-result').textContent()).includes('練習'), 'camera souvenir does not claim practice');
  await page.clock.resume();
  await page.locator('[data-result-action="retry"]').click(); await page.waitForFunction(() => __requests === 2 && __hpView.input.running); await page.clock.runFor(450);
  check(await page.evaluate(() => __hpView.source === 'camera'), 'retry reacquires camera source');
  await page.locator('.game-back').click(); await page.locator('.lab-feed').waitFor();
  check(await page.evaluate(() => __tracks.every(t => t.readyState === 'ended') && !__hpView.active), 'navigation releases active camera and controller');
  await page.clock.resume();
  await page.evaluate(() => { __delay = true; location.hash = '#/game/solo-handy-pals'; });
  await page.waitForFunction(() => document.querySelector('.hp-entry .launch-camera')?.disabled === false);
  await page.locator('.launch-camera').click(); await page.waitForFunction(() => typeof window.__grant === 'function');
  await page.locator('.game-back').click(); await page.locator('.lab-feed').waitFor();
  await page.evaluate(() => { __grant(); __delay = false; });
  await page.waitForFunction(() => __tracks.every(t => t.readyState === 'ended'));
  check(await page.evaluate(() => !__hpView.active && !__hpView.video.srcObject && __closes === 3), 'late camera permission after exit is cancelled and all new tracks stop');
  await page.clock.resume();
  await page.goto(base + '/#/game/solo-handy-pals'); await page.waitForFunction(() => document.querySelector('.hp-entry .launch-camera')?.disabled === false);
  await page.evaluate(async () => {
    const registry = await (await fetch('/src/platform/experiments.js')).text(), path = registry.match(/import\("([^"]*\/handy\/view\.js[^"]*)"\)/)[1];
    const source = await (await fetch(path)).text(), inputPath = source.match(/from "([^"]*\/input\/handyPalsInput\.js[^"]*)"/)[1];
    const { HandyPalsInput } = await import(inputPath); HandyPalsInput.prototype.start = async () => { throw new DOMException('QA denied', 'NotAllowedError'); };
  });
  await page.locator('.launch-camera').click(); await page.locator('.hp-demo').waitFor();
  check((await page.locator('.hp-overlay').textContent()).includes('許可'), 'denied permission offers retry and practice');
  await page.locator('.hp-demo').click(); await page.clock.runFor(200);
  check((await page.locator('.hp-source').textContent()).includes('練習'), 'permission denial can recover into practice');
  await page.goto(base + '/#/'); check(errors.length === 0, 'no unhandled camera browser errors');
  return { checks, errors };
}
