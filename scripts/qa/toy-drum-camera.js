// Real MediaStream lifecycle with synthetic landmarks; no claim of human accuracy.
async (page) => {
  await page.clock.resume(); const base = new URL(page.url()).origin, checks = [], errors = [];
  const check = (ok, name) => { if (!ok) throw Error(name); checks.push(name); };
  page.on('pageerror', e => errors.push(e.message));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(base + '/?qa=toy-camera-' + Date.now() + '#/game/solo-toy-drum');
  await page.waitForFunction(() => document.querySelector('.td-entry .launch-camera')?.disabled === false);
  await page.evaluate(async () => {
    const registry = await (await fetch('/src/platform/experiments.js')).text(), path = registry.match(/import\("([^"]*\/toyDrum\/view\.js[^"]*)"\)/)[1];
    const source = await (await fetch(path)).text(), inputPath = source.match(/from "([^"]*\/input\/toyDrumInput\.js[^"]*)"/)[1];
    const inputSource = await (await fetch(inputPath)).text(), vision = await import(inputSource.match(/from "([^"]*mediapipe[^"]*)"/)[1]);
    const { ToyDrumView } = await import(path), { ToyDrumInput } = await import(inputPath), render = ToyDrumView.prototype.render, start = ToyDrumInput.prototype.start;
    ToyDrumView.prototype.render = function (...args) { window.__tdView = this; return render.apply(this, args); };
    ToyDrumInput.prototype.start = function () { Object.defineProperty(this.video, 'currentTime', { configurable: true, get: () => performance.now() / 1000 }); return start.call(this); };
    const { DRUMS } = await import('/src/games/toyDrum.js'); window.__drums = DRUMS;
    window.__hands = DRUMS.slice(0, 2).map(d => ({ x: d.x, y: d.y - d.ry - .08 })); window.__requests = 0; window.__closes = 0; window.__tracks = []; window.__delegates = [];
    vision.FilesetResolver.forVisionTasks = async () => ({});
    vision.HandLandmarker.createFromOptions = async (files, options) => {
      __delegates.push(options.baseOptions.delegate); window.__numHands = options.numHands;
      if (__delegates.length === 1) throw Error('QA GPU fallback');
      return { close: () => __closes++, detectForVideo: () => ({ landmarks: __hands.map(p => Array.from({ length: 21 }, () => ({ x: 1-p.x, y: p.y, z: 0 }))), handedness: [] }) };
    };
    const board = document.createElement('canvas'); board.width = 720; board.height = 1280; const c = board.getContext('2d'); c.fillStyle = '#c4dcca'; c.fillRect(0,0,720,1280); c.fillStyle = '#e9bd93'; c.beginPath(); c.arc(360,290,100,0,Math.PI*2); c.fill(); c.fillRect(210,420,300,430);
    window.__board = board; window.__paintTimer = setInterval(() => { c.fillStyle = '#c4dcca'; c.fillRect(0,0,10,10); }, 50);
    const stream = () => { const s = board.captureStream(30); __tracks.push(...s.getTracks()); return s; };
    navigator.mediaDevices.getUserMedia = async constraints => { __requests++; window.__constraints = constraints; if (window.__deny) throw new DOMException('QA denied','NotAllowedError'); if (window.__delay) return new Promise(resolve => window.__grant = () => resolve(stream())); return stream(); };
  });
  await page.locator('.launch-camera').click(); await page.waitForFunction(() => window.__tdView?.input.running); await page.clock.install(); await page.clock.runFor(100);
  check(await page.evaluate(() => __constraints.audio === false && __constraints.video.facingMode.exact === 'user'), 'front camera without microphone');
  check(await page.evaluate(() => __numHands === 2 && __delegates.slice(0,2).join() === 'GPU,CPU'), 'two-hand model with GPU to CPU fallback');
  check(await page.evaluate(() => __tdView.game.phase === 'free'), 'first visible hands start FREE PLAY');
  await page.evaluate(() => { __hands.forEach((h, i) => h.y = __drums[i].y); }); await page.clock.runFor(60);
  check(await page.evaluate(() => __tdView.game.hits === 2 && __tdView.game.doubles === 1), 'tracked downward palm entries trigger DOUBLE');
  await page.clock.runFor(500); check(await page.evaluate(() => __tdView.game.hits === 2), 'stationary camera palms do not roll');
  await page.keyboard.press('j'); check(await page.evaluate(() => __tdView.game.hits === 2), 'practice keys cannot score in camera mode');
  await page.evaluate(() => { __hands = []; }); await page.clock.runFor(750); const lostAt = await page.evaluate(() => __tdView.game.elapsed); await page.clock.runFor(500);
  check(await page.evaluate(() => __tdView.game.elapsed) === lostAt, 'tracking loss pauses active clock');
  await page.evaluate(() => { __hands = __drums.slice(0, 2).map(d => ({ x:d.x,y:d.y })); }); await page.clock.runFor(300);
  check(await page.evaluate(() => !__tdView.inputLost && __tdView.game.hits === 2), 'stable hand return resumes without phantom hits');
  await page.evaluate(() => { __hands = __drums.slice(2).map(d => ({ x:d.x,y:d.y - d.ry - .08 })); }); await page.clock.runFor(60);
  await page.evaluate(() => { __hands.forEach((h, i) => h.y = __drums[i + 2].y); }); await page.clock.runFor(60);
  check(await page.evaluate(() => __tdView.game.hits === 4 && __tdView.game.doubles === 2), 'lower-row swings hit blue and green without retriggering upper drums');
  await page.evaluate(() => { __hands.reverse(); }); await page.clock.runFor(60); check(await page.evaluate(() => __tdView.input.tracker.slots[0].x < __tdView.input.tracker.slots[1].x), 'model array order never swaps palm slots');
  await page.screenshot({ path: 'output/playwright/toy-drum-camera-390.png' });
  await page.locator('.game-back').click(); await page.locator('.lab-feed').waitFor();
  check(await page.evaluate(() => __tracks.every(t => t.readyState === 'ended') && __closes === 1 && !__tdView.active), 'exit stops real camera tracks and model');
  await page.clock.resume(); await page.evaluate(() => { __delay = true; location.hash = '#/game/solo-toy-drum'; }); await page.waitForFunction(() => document.querySelector('.td-entry .launch-camera')?.disabled === false);
  await page.locator('.launch-camera').click(); await page.waitForFunction(() => typeof __grant === 'function'); await page.locator('.game-back').click(); await page.locator('.lab-feed').waitFor();
  await page.evaluate(() => { __grant(); __delay = false; }); await page.waitForFunction(() => __tracks.every(t => t.readyState === 'ended'));
  check(await page.evaluate(() => !__tdView.active && !__tdView.video.srcObject && __closes === 2), 'late permission after navigation releases newly granted tracks');
  await page.evaluate(() => { __deny = true; location.hash = '#/game/solo-toy-drum'; }); await page.waitForFunction(() => document.querySelector('.td-entry .launch-camera')?.disabled === false);
  await page.locator('.launch-camera').click(); await page.locator('.td-demo').waitFor(); check(await page.locator('.td-reconnect').isVisible(), 'denied camera offers concrete reconnect and practice');
  await page.locator('.td-demo').click(); await page.clock.runFor(200); check(await page.evaluate(() => __tdView.source === 'demo' && __tdView.game.phase === 'free'), 'permission denial recovers into labeled practice');
  await page.evaluate(() => clearInterval(__paintTimer)); await page.goto(base + '/#/'); check(errors.length === 0, 'no uncaught camera errors'); return { checks, errors };
}
