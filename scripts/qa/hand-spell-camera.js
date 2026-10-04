// Synthetic camera and observations test lifecycle/privacy/release, not a physical human.
async page => {
  await page.clock.resume(); const base = new URL(page.url()).origin, checks = [];
  const check = (ok, label) => { if (!ok) throw Error(label); checks.push(label); };
  await page.evaluate(() => { localStorage.setItem('camera-game-lab-hand-spell-tutorial-camera', 'done'); localStorage.setItem('camera-game-lab-locale', 'ja'); });
  await page.goto(base + '/?qa=hs-camera-' + Date.now() + '#/game/solo-hand-spell');
  await page.waitForFunction(() => document.querySelector('.hs-entry .launch-camera')?.disabled === false);
  await page.evaluate(async () => {
    const registry = await (await fetch('/src/platform/experiments.js')).text(), path = registry.match(/import\("([^"]*handSpell\/view\.js[^"]*)"\)/)[1];
    const code = await (await fetch(path)).text(), inputPath = code.match(/from ["']([^"']*input\/handSpellInput\.js[^"']*)["']/)[1];
    const { HandSpellView } = await import(path), { HandSpellInput } = await import(inputPath), setup = HandSpellView.prototype.setup;
    HandSpellView.prototype.setup = function (...args) { window.__hs = this; return setup.apply(this, args); };
    window.__hsCam = { visible: true, sign: 'FIST', span: .1, two: false, denied: false };
    HandSpellInput.prototype.start = async function () {
      if (__hsCam.denied) throw new DOMException('Synthetic refusal', 'NotAllowedError');
      const canvas = document.createElement('canvas'); canvas.width = 540; canvas.height = 960; const c = canvas.getContext('2d'); c.fillStyle = '#c800ff'; c.fillRect(0, 0, 540, 960);
      const stream = canvas.captureStream(24); window.__hsStream = stream; this.session = { stream, recognizer: { close() {} } }; this.running = true; this.video.srcObject = stream; await this.video.play();
      this.face = { x: 270, y: 500, width: 120, height: 150 };
      this.sample = now => !__hsCam.visible ? [] : [{ id: 'Left', sign: __hsCam.sign, confidence: __hsCam.sign ? .9 : .2, span: __hsCam.span, x: 160, y: 650, at: now }, ...(__hsCam.two ? [{ id: 'Right', sign: 'PALM', confidence: .9, span: __hsCam.span, x: 380, y: 650, at: now }] : [])];
    };
  });
  await page.locator('[data-hs-mode="creator"]').click(); await page.locator('[data-hs-face="HIDE"]').click(); await page.locator('.launch-camera').click();
  await page.waitForFunction(() => window.__hs?.phase === 'playing');
  check(await page.evaluate(() => __hs.input.running && __hs.video.srcObject === __hsStream && __hsStream.getAudioTracks().length === 0), 'one front-camera video stream, no microphone');
  await page.clock.install(); await page.clock.pauseAt(new Date(await page.evaluate(() => Date.now() + 100))); await page.clock.runFor(4100);
  const hidden = await page.evaluate(() => [...__hs.canvas.getContext('2d').getImageData(410, 400, 1, 1).data]); check(hidden[0] < 100 && hidden[2] < 160, 'HIDE excludes magenta raw camera');
  await page.evaluate(() => __hsCam.visible = false); await page.clock.runFor(750);
  check(await page.evaluate(() => __hs.game.paused && __hs.game.pauseReason === 'tracking'), 'missing hand pauses the input clock');
  const at = await page.evaluate(() => __hs.game.elapsed); await page.clock.runFor(1000); check(await page.evaluate(t => __hs.game.elapsed === t, at), 'tracking pause preserves time');
  await page.evaluate(() => { __hsCam.visible = true; __hsCam.sign = 'ONE'; }); await page.clock.runFor(200); check(await page.evaluate(() => __hs.game.paused), 'recovery needs stable observations'); await page.clock.runFor(250);
  check(await page.evaluate(() => !__hs.game.paused && __hs.game.signs.length === 0), 'recovery does not invent a seal from held pose');
  await page.evaluate(() => __hsCam.sign = null); await page.clock.runFor(250);
  for (const sign of ['ONE', 'TWO', 'THREE']) { await page.evaluate(s => __hsCam.sign = s, sign); await page.clock.runFor(650); }
  check(await page.evaluate(() => __hs.game.signs.join() === 'ONE,TWO,THREE'), 'camera observations add three seals');
  await page.evaluate(() => { __hsCam.sign = 'PALM'; __hsCam.two = true; __hsCam.span = .1; }); await page.clock.runFor(280);
  check(await page.evaluate(() => !__hs.game.released && __hs.game.signs.length === 3), 'both open palms prepare release without an extra seal');
  await page.evaluate(() => __hsCam.span = .13); await page.clock.runFor(200);
  check(await page.evaluate(() => __hs.game.released && __hs.game.signs.length === 3 && __hs.game.releaseSource === 'gesture'), 'both palm expansions release once');
  await page.clock.runFor(await page.evaluate(() => 10400 - __hs.game.elapsed));
  check(await page.evaluate(() => __hs.game.outcome === 'DRAGON_FLAME'), 'camera three-seal gesture produces PERFECT'); await page.screenshot({ path: 'output/playwright/hand-spell-camera-hide.png', fullPage: true });
  await page.clock.runFor(4700); await page.locator('.hs-result').waitFor(); check(await page.evaluate(() => __hsStream.getTracks().every(t => t.readyState === 'ended') && !__hs.video.srcObject && !__hs.input.running), 'result stops every camera track');
  check(await page.evaluate(() => __hs.game.result.creator.faceMode === 'HIDE' && __hs.game.result.creator.frames.length > 100), 'HIDE creator retains selected composition');
  await page.clock.resume(); await page.locator('.game-back').click(); await page.goto(base + '/#/game/solo-hand-spell'); await page.waitForFunction(() => document.querySelector('.hs-entry .launch-camera')?.disabled === false);
  await page.evaluate(async () => {
    const registry = await (await fetch('/src/platform/experiments.js')).text(), path = registry.match(/import\("([^"]*handSpell\/view\.js[^"]*)"\)/)[1];
    const code = await (await fetch(path)).text(), inputPath = code.match(/from ["']([^"']*input\/handSpellInput\.js[^"']*)["']/)[1];
    const { HandSpellInput } = await import(inputPath); HandSpellInput.prototype.start = async () => { throw new DOMException('Synthetic refusal', 'NotAllowedError'); };
  }); await page.locator('.launch-camera').click(); await page.locator('.hs-practice').waitFor(); check((await page.locator('.hs-overlay').textContent()).includes('カメラ'), 'permission refusal provides recovery');
  await page.locator('.hs-practice').click(); check(await page.locator('.hs-source').textContent() === 'PRACTICE', 'refused camera can switch to practice'); await page.locator('.game-back').click();
  return { checks, synthetic: true, physicalCameraTested: false };
}
