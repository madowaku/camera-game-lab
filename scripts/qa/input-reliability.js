// Synthetic model output traverses the real controllers. Human Input Gates remain separate.
async (page) => {
  const base = new URL(page.url()).origin, checks = [], errors = [], failures = [];
  const check = (ok, name) => { if (!ok) throw Error(name); checks.push(name); };
  page.on('pageerror', error => errors.push(error.message));
  page.on('requestfailed', request => failures.push(request.url()));
  await page.addInitScript(() => { if (!localStorage.getItem('camera-game-lab-locale')) localStorage.setItem('camera-game-lab-locale', 'en'); });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(base + '/?qa=input-reliability#/game/solo-finger-gun');
  await page.waitForFunction(() => document.querySelector('.launch-camera')?.disabled === false);
  await page.clock.install({ time: new Date('2026-10-03T00:00:00Z') });
  await page.clock.pauseAt(new Date('2026-10-03T00:00:01Z'));
  await page.evaluate(async () => {
    const source = await (await fetch('/src/input/bodyInput.js')).text();
    const vision = await import(source.match(/from "([^"]*mediapipe[^"]*)"/)[1]);
    const { BodyInput } = await import('/src/input/bodyInput.js');
    const soloSource = await (await fetch('/src/solo/soloExperience.js')).text();
    const { FingerGunInput } = await import(soloSource.match(/from "([^"]*\/input\/fingerGunInput\.js[^"]*)"/)[1]);
    const start = BodyInput.prototype.start, process = FingerGunInput.prototype.processResult;
    BodyInput.prototype.start = function () {
      Object.defineProperties(this.video, {
        currentTime: { configurable: true, get: () => performance.now() / 1000 },
        readyState: { configurable: true, get: () => 3 },
        videoWidth: { configurable: true, get: () => this.video.clientWidth },
        videoHeight: { configurable: true, get: () => this.video.clientHeight },
      });
      this.video.play = async () => {};
      return start.call(this);
    };
    FingerGunInput.prototype.processResult = function (...args) { window.__gun = this; return process.apply(this, args); };
    window.__signal = { mode: 'gun', present: true, x: .03, y: .03, gesture: 'Open_Palm' };
    window.__tracks = []; window.__models = 0; window.__closes = 0;
    vision.FilesetResolver.forVisionTasks = async () => ({});
    vision.GestureRecognizer.createFromOptions = async () => {
      __models++;
      return { close: () => __closes++, recognizeForVideo: () => {
        if (!__signal.present) return {};
        const x = 1 - __signal.x, y = __signal.y;
        const points = Array.from({ length: 21 }, () => ({ x, y: y + .1 }));
        if (__signal.mode === 'gun') {
          points[0] = { x, y: y + .2 }; points[9] = { x, y: y + .12 };
          [5, 6, 7, 8].forEach((i, n) => { points[i] = { x, y: y + .14 - n * .0283 }; });
          // Thumb never changes during a lock or a shot.
          points[4] = { x, y: y + .1 };
        }
        return { landmarks: [points], gestures: [[{ categoryName: __signal.gesture, score: .95 }]] };
      } };
    };
    navigator.mediaDevices.getUserMedia = async () => {
      const canvas = document.createElement('canvas'); canvas.width = 390; canvas.height = 700;
      const c = canvas.getContext('2d'); c.fillStyle = '#7c8276'; c.fillRect(0, 0, 390, 700);
      const stream = canvas.captureStream(); __tracks.push(...stream.getTracks()); return stream;
    };
  });
  await page.locator('.launch-camera').click();
  await page.waitForFunction(() => document.querySelector('#camera')?.srcObject);
  await page.clock.runFor(100);
  check((await page.locator('#hits').textContent()).startsWith('0 /'), 'off-target pointing does not fire');
  await page.evaluate(() => { const target = __gun.getTarget(); Object.assign(__signal, { x: target.x, y: target.y }); });
  await page.clock.runFor(150);
  check(await page.locator('#finger-aim').evaluate(e => e.classList.contains('finger-aim--armed')), 'target overlap immediately shows the lock ring');
  check((await page.locator('#detected').textContent()).includes('LOCK'), 'partial lock is readable before firing');
  await page.screenshot({ path: 'output/playwright/input-gun-lock-390.png' });
  await page.clock.runFor(250);
  check((await page.locator('#hits').textContent()).startsWith('1 / 1'), 'unchanged thumb auto-fires after a quarter-second lock');
  await page.clock.runFor(400);
  check((await page.locator('#hits').textContent()).startsWith('1 / 1'), 'old target position cannot repeat a shot');
  await page.evaluate(() => { const target = __gun.getTarget(); Object.assign(__signal, { x: target.x, y: target.y }); });
  await page.clock.runFor(130);
  await page.evaluate(() => { __signal.present = false; }); await page.clock.runFor(100);
  check(await page.locator('#finger-aim').isHidden(), 'tracking loss hides and resets the reticle');
  check((await page.locator('#detected').textContent()).includes('frame'), 'missing hand gives a visible recovery action');
  await page.evaluate(() => { __signal.present = true; }); await page.clock.runFor(130);
  check((await page.locator('#hits').textContent()).startsWith('1 / 1'), 'returning hand must fill a new lock');
  await page.clock.runFor(180);
  check((await page.locator('#hits').textContent()).startsWith('2 / 2'), 'recovered pointing resumes automatically');
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.evaluate(() => { const target = __gun.getTarget(); Object.assign(__signal, { x: target.x, y: target.y }); });
  await page.clock.runFor(450);
  check((await page.locator('#hits').textContent()).startsWith('3 / 3'), 'desktop framing retains target alignment and auto-fire');
  await page.screenshot({ path: 'output/playwright/input-gun-desktop.png' });
  await page.setViewportSize({ width: 360, height: 500 }); await page.clock.runFor(100);
  check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'short phone gun scene fits width and scrolls');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('.game-back').click();
  check(await page.evaluate(() => __tracks.every(t => t.readyState === 'ended') && __models === __closes), 'leaving the gun releases camera and model');

  await page.evaluate(() => { __signal.mode = 'hand'; __signal.x = .5; __signal.y = .5; __signal.gesture = 'Thumb_Up'; location.hash = '#/game/solo-hand-beat'; });
  await page.waitForFunction(() => document.querySelector('.launch-camera')?.disabled === false);
  await page.locator('.launch-camera').click();
  await page.waitForFunction(() => document.querySelector('#camera')?.srcObject);
  await page.clock.runFor(2850);
  check((await page.locator('#detected').textContent()).includes('THUMB UP'), 'canned Thumb_Up reaches the real HAND BEAT readout');
  check(await page.locator('#target-icon').evaluate(e => e.dataset.illustration === 'THUMB_UP'), 'fourth beat teaches thumbs up with a distinct illustration');
  await page.screenshot({ path: 'output/playwright/input-hand-thumb-up-390.png' });
  await page.locator('.game-back').click();

  await page.evaluate(() => { location.hash = '#/game/solo-soft-serve'; });
  await page.waitForFunction(() => document.querySelector('.launch-demo')?.disabled === false);
  await page.locator('.launch-howto').click();
  check((await page.locator('.ss-howto').textContent()).includes('No pinching'), 'SOFT SERVE teaches palm attachment in its how-to');
  await page.locator('.sheet-close').click();
  await page.evaluate(async () => {
    const source = await (await fetch('/src/softServe/view.js')).text();
    const { SoftServeGame } = await import(source.match(/from "([^"]*\/games\/softServe\.js[^"]*)"/)[1]);
    const step = SoftServeGame.prototype.step;
    SoftServeGame.prototype.step = function (...args) { window.__soft = this; return step.apply(this, args); };
  });
  await page.locator('.launch-demo').click(); await page.clock.runFor(150);
  check(await page.evaluate(() => __soft.phase === 'ready' && __soft.attachmentProgress > 0 && __soft.attachmentProgress < 1), 'SOFT SERVE gives partial attachment before input success');
  await page.screenshot({ path: 'output/playwright/input-soft-hold-390.png' });
  await page.clock.runFor(320);
  check(await page.evaluate(() => __soft.phase === 'serve' && __soft.effect?.type === 'attached'), 'attachment confirms before serving');
  await page.screenshot({ path: 'output/playwright/input-soft-click-390.png' });
  await page.locator('.game-back').click();

  for (const size of [{ width: 390, height: 844 }, { width: 360, height: 500 }, { width: 1440, height: 900 }]) {
    await page.setViewportSize(size);
    for (const id of ['solo-hand-beat', 'solo-finger-gun', 'solo-pinch-world', 'solo-soft-serve']) {
      for (const locale of ['en', 'ja']) {
        await page.evaluate(locale => localStorage.setItem('camera-game-lab-locale', locale), locale);
        await page.goto(base + '/?qa=input-layout&locale=' + locale + '#/game/' + id);
        await page.waitForFunction(() => document.querySelector('.launch-camera')?.disabled === false);
        check(await page.evaluate(locale => document.documentElement.lang === locale, locale), `${id} renders the ${locale} locale`);
        check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${id} ${locale} entrance fits ${size.width}x${size.height}`);
        await page.locator('.launch-camera').scrollIntoViewIfNeeded();
        check(await page.locator('.launch-camera').isVisible(), `${id} ${locale} PLAY is reachable at ${size.width}x${size.height}`);
      }
      await page.screenshot({ path: `output/playwright/input-${id}-${size.width}.png` });
    }
  }
  check(errors.length === 0 && failures.length === 0, 'no browser exceptions or failed resources');
  return { checks, errors, failures, synthetic: true, physicalDevice: false, humanPlaytest: false };
}
