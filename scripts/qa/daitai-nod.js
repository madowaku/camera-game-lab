// Controlled model output exercises the real camera owner, nod tracker and UI.
// This does not substitute for a physical front-camera playtest.
async (page) => {
  const base = new URL(page.url()).origin, checks = [], errors = [], failures = [];
  const check = (ok, name) => { if (!ok) throw Error(name); checks.push(name); };
  const count = () => page.evaluate(() => __heroGame.logs.length);
  const signal = values => page.evaluate(values => Object.assign(__heroSignal, values), values);
  const advance = ms => page.clock.runFor(ms);
  const shot = name => page.screenshot({ path: `output/playwright/${name}.png` });
  page.on('pageerror', error => errors.push(error.message));
  page.on('requestfailed', request => failures.push(request.url()));
  await page.evaluate(() => localStorage.setItem('camera-game-lab-locale', 'ja'));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(base + '/?qa=daitai-nod#daitai');
  await page.waitForFunction(() => document.querySelector('.launch-camera')?.disabled === false);
  await page.clock.install({ time: new Date('2026-10-04T05:00:00Z') });
  await page.clock.pauseAt(new Date('2026-10-04T05:00:01Z'));
  await page.evaluate(async () => {
    const bodySource = await (await fetch('/src/input/bodyInput.js')).text();
    const vision = await import(bodySource.match(/from "([^"]*mediapipe[^"]*)"/)[1]);
    const { BodyInput } = await import('/src/input/bodyInput.js');
    const viewSource = await (await fetch('/src/daitai/daitaiHeroView.js')).text();
    const { DaitaiHeroGame } = await import(viewSource.match(/from "([^"]*\/games\/daitaiHero\.js[^"]*)"/)[1]);
    const { FaceZoneInput } = await import(viewSource.match(/from "([^"]*\/input\/faceZoneInput\.js[^"]*)"/)[1]);
    const tick = DaitaiHeroGame.prototype.tick, process = FaceZoneInput.prototype.processResult;
    DaitaiHeroGame.prototype.tick = function (...args) { window.__heroGame = this; return tick.apply(this, args); };
    FaceZoneInput.prototype.processResult = function (...args) { window.__heroInput = this; return process.apply(this, args); };
    const start = BodyInput.prototype.start;
    BodyInput.prototype.start = function () {
      Object.defineProperties(this.video, {
        currentTime: { configurable: true, get: () => performance.now() / 1000 },
        readyState: { configurable: true, get: () => 3 }
      });
      this.video.play = async () => {};
      return start.call(this);
    };
    window.__heroSignal = { pitch: 0, x: .5, present: true, two: false, translationY: 0 };
    window.__heroTracks = []; window.__heroModels = 0; window.__heroCloses = 0;
    vision.FilesetResolver.forVisionTasks = async () => ({});
    vision.FaceLandmarker.createFromOptions = async (_vision, options) => {
      window.__heroOptions = options; __heroModels++;
      return { close: () => __heroCloses++, detectForVideo: () => {
        if (!__heroSignal.present) return { faceLandmarks: [], facialTransformationMatrixes: [] };
        const points = [], x = 1 - __heroSignal.x;
        points[234] = { x: x - .1, y: .5 + __heroSignal.translationY };
        points[454] = { x: x + .1, y: .5 + __heroSignal.translationY };
        const p = __heroSignal.pitch * Math.PI / 180, c = Math.cos(p), s = Math.sin(p);
        const matrix = { rows: 4, columns: 4, data: [1,0,0,0, 0,c,s,0, 0,-s,c,0, 0,__heroSignal.translationY,-40,1] };
        return { faceLandmarks: __heroSignal.two ? [points, points] : [points],
          facialTransformationMatrixes: __heroSignal.two ? [matrix, matrix] : [matrix] };
      } };
    };
    navigator.mediaDevices.getUserMedia = async () => {
      const canvas = document.createElement('canvas'); canvas.width = 390; canvas.height = 700;
      const ctx = canvas.getContext('2d'); ctx.fillStyle = '#747e64'; ctx.fillRect(0, 0, 390, 700);
      ctx.fillStyle = '#b9b99b'; ctx.beginPath(); ctx.ellipse(195, 245, 70, 90, 0, 0, Math.PI * 2); ctx.fill();
      const stream = canvas.captureStream(); __heroTracks.push(...stream.getTracks()); return stream;
    };
  });
  await page.locator('.launch-camera').click();
  await page.waitForFunction(() => document.querySelector('.dh-camera')?.srcObject);
  await advance(2500);
  check(await page.locator('.dh-setup').isVisible(), 'three-second calibration keeps the setup visible');
  await advance(3900);
  check(await page.locator('.dh-play').isVisible(), 'calibration and centered countdown start face play');
  check(await page.evaluate(() => __heroOptions.outputFacialTransformationMatrixes === true && __heroOptions.numFaces === 2), 'model requests head pose and detects a second face');
  check((await page.locator('[data-answer="1"] .dh-direction').textContent()).includes('うなずく'), 'middle answer visibly teaches nodding');
  await advance(600);
  check(await count() === 0, 'staying centered never answers');
  await signal({ x: .42 }); await advance(120); await signal({ x: .5 }); await advance(400);
  check(await count() === 0, 'old small-sideways center gesture no longer answers');
  await signal({ translationY: .2 }); await advance(300); await signal({ translationY: 0 }); await advance(300);
  check(await count() === 0, 'vertical face translation alone never answers');
  await signal({ pitch: 8 }); await advance(220); await signal({ pitch: 0 }); await advance(300);
  check(await count() === 0, 'a shallow head movement never answers');
  await signal({ pitch: 20 }); await advance(250);
  check(await page.locator('[data-answer="1"]').evaluate(e => e.classList.contains('dh-answer--active')), 'downward nod highlights the middle choice');
  check((await page.locator('.dh-input-status').textContent()).includes('顔を上げて'), 'live prompt asks for the return movement');
  check(await count() === 0, 'head down alone has not submitted');
  await shot('daitai-nod-return-390');
  await signal({ pitch: 0 }); await advance(250);
  check(await count() === 1 && await page.evaluate(() => __heroGame.logs[0].selectedIndex === 1), 'returning upright submits the middle answer');
  await advance(900);
  check(await count() === 1, 'held event cannot answer the next question');
  for (let i = 2; i <= 10; i++) {
    await signal({ pitch: 20 }); await advance(250); await signal({ pitch: 0 }); await advance(250);
    check(await count() === i, `deliberate nod ${i} submits once`);
    await advance(650);
    check(await count() === i, `nod ${i} does not leak across question feedback`);
  }
  check(await page.evaluate(() => __heroGame.logs.every(l => l.selectedIndex === 1 && l.inputType === 'FACE')), 'ten consecutive nods all select center through the face scoring path');
  await signal({ pitch: 20 }); await advance(250);
  await signal({ present: false }); await advance(100);
  const elapsed = await page.evaluate(() => __heroGame.elapsedMs);
  await advance(1000);
  check(await page.evaluate(elapsed => __heroGame.paused && __heroGame.elapsedMs === elapsed, elapsed), 'lost face pauses the timer');
  await signal({ present: true, pitch: 0 }); await advance(600);
  check(await count() === 10, 'face recovery cancels the pending nod');
  await signal({ two: true }); await advance(150);
  check(await page.evaluate(() => __heroGame.paused), 'two faces pause input');
  await signal({ two: false }); await advance(500);
  await signal({ x: .35 }); await advance(380);
  check(await count() === 11 && await page.evaluate(() => __heroGame.logs[10].selectedIndex === 0), 'left answer retains its hold behavior');
  await signal({ x: .5 }); await advance(800);
  check(await count() === 11, 'return from a side answer cannot choose center');
  await signal({ x: .65 }); await advance(380);
  check(await count() === 12 && await page.evaluate(() => __heroGame.logs[11].selectedIndex === 2), 'right answer retains its hold behavior');
  await signal({ x: .5 }); await advance(800);
  for (const size of [{ width: 390, height: 844 }, { width: 360, height: 500 }, { width: 1440, height: 900 }]) {
    await page.setViewportSize(size);
    for (const locale of ['ja', 'en']) {
      if (await page.evaluate(locale => document.documentElement.lang !== locale, locale)) await page.locator('.platform-locale').click();
      await advance(80);
      const layout = await page.evaluate(() => {
        const buttons = [...document.querySelectorAll('.dh-answer')];
        return { fits: document.documentElement.scrollWidth <= innerWidth,
          labelsFit: buttons.every(button => { const label = button.querySelector('.dh-direction span').getBoundingClientRect(), key = button.querySelector('kbd').getBoundingClientRect(); return label.right <= key.left + .5; }),
          answersBelowArena: document.querySelector('.dh-answers').getBoundingClientRect().top >= document.querySelector('.dh-arena').getBoundingClientRect().bottom - .5 };
      });
      check(layout.fits && layout.labelsFit && layout.answersBelowArena, `${locale} nod labels and answer cards fit ${size.width}x${size.height}`);
    }
    await shot(`daitai-nod-playing-${size.width}`);
  }
  await page.locator('.dh-tap-button').click(); await advance(80);
  check((await page.locator('[data-answer="1"] .dh-direction').textContent()).includes('CENTER'), 'tap mode restores the positional center label');
  check(await page.evaluate(() => __heroTracks.every(t => t.readyState === 'ended') && __heroModels === __heroCloses), 'switching to tap releases camera and model');
  const before = await count(); await page.keyboard.press('2'); await advance(80);
  check(await count() === before + 1, 'keyboard center answer still works in tap mode');
  await advance(32000);
  check(await page.locator('.arcade-result-card').isVisible(), 'round still reaches the shared results screen');
  await page.locator('.game-back').click(); await advance(100);
  await page.clock.resume();
  check(errors.length === 0 && failures.length === 0, 'no browser exceptions or failed resources');
  return { checks, errors, failures, synthetic: true, physicalDevice: false };
}
