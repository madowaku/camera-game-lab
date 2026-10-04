// Synthetic frames/observations verify lifecycle, loss recovery and HIDE, not real human tracking.
async page => {
  await page.clock.resume(); const base = new URL(page.url()).origin, checks = [];
  const check = (ok, label) => { if (!ok) throw Error(label); checks.push(label); };
  await page.evaluate(() => localStorage.setItem('camera-game-lab-locale', 'ja'));
  await page.goto(base + '/?qa=as-camera-' + Date.now() + '#/game/solo-air-slash');
  await page.waitForFunction(() => document.querySelector('.as-entry .launch-demo')?.disabled === false);
  await page.evaluate(async () => {
    const registry = await (await fetch('/src/platform/experiments.js')).text(), path = registry.match(/import\("([^"]*airSlash\/view\.js[^"]*)"\)/)[1];
    const code = await (await fetch(path)).text(), inputPath = code.match(/from ["']([^"']*input\/airSlashInput\.js[^"']*)["']/)[1];
    const { AirSlashView } = await import(path), { AirSlashInput } = await import(inputPath), render = AirSlashView.prototype.render;
    AirSlashView.prototype.render = function (...args) { window.__as = this; return render.apply(this, args); };
    window.__asCamPresent = true; window.__asCamFail = false;
    AirSlashInput.prototype.start = async function () {
      if (window.__asCamFail) throw new DOMException('Synthetic denied camera', 'NotAllowedError');
      const canvas = document.createElement('canvas'); canvas.width = 540; canvas.height = 960; const c = canvas.getContext('2d'); c.fillStyle = '#c800ff'; c.fillRect(0, 0, 540, 960);
      const stream = canvas.captureStream(24); window.__asStream = stream; this.session = { stream, recognizer: { close() {} } }; this.running = true; this.video.srcObject = stream; await this.video.play();
      this.sample = now => window.__asCamPresent ? [{ id: 'right', x: 130, y: 580, at: now }] : [];
    };
  });
  await page.locator('[data-as-recording="creator"]').click(); await page.locator('[data-as-face="HIDE"]').click();
  await page.locator('.launch-camera').click(); await page.waitForFunction(() => window.__as?.phase === 'playing');
  check(await page.evaluate(() => __as.source === 'camera' && __as.input.running && __as.video.srcObject === __asStream), 'one synthetic front-camera stream attached');
  const pixel = await page.evaluate(() => Array.from(__as.canvas.getContext('2d').getImageData(100, 300, 1, 1).data)); check(pixel[0] < 80 && pixel[2] < 120, 'HIDE does not render raw magenta camera');
  await page.clock.install(); await page.clock.pauseAt(new Date()); await page.evaluate(() => __asCamPresent = false); await page.clock.runFor(600);
  check(await page.evaluate(() => __as.game.paused && __as.game.pauseReason === 'tracking'), 'tracking loss pauses');
  const at = await page.evaluate(() => __as.game.elapsed); await page.clock.runFor(1000); check(await page.evaluate(() => __as.game.elapsed) === at, 'lost tracking freezes timer');
  await page.evaluate(() => __asCamPresent = true); await page.clock.runFor(220); check(await page.evaluate(() => __as.game.paused), 'recovery waits for stable hands'); await page.clock.runFor(250);
  check(await page.evaluate(() => !__as.game.paused && __as.game.score === 0), 'stable recovery resumes without an accidental slash');
  await page.screenshot({ path: 'output/playwright/air-slash-camera-hide.png', fullPage: true });
  await page.clock.runFor(15100); await page.locator('.as-result').waitFor(); check(await page.evaluate(() => __asStream.getTracks().every(t => t.readyState === 'ended') && !__as.video.srcObject && !__as.input.running), 'result stops every camera track');
  check(await page.evaluate(() => __as.creatorResult.faceMode === 'HIDE' && __as.creatorResult.frames.length > 10), 'HIDE creator records selected composition');
  await page.clock.resume(); await page.locator('.game-back').click(); await page.goto(base + '/#/game/solo-air-slash'); await page.waitForFunction(() => document.querySelector('.as-entry .launch-camera')?.disabled === false);
  // New navigation creates a new module realm, so force the refusal at its input boundary again.
  await page.evaluate(async () => {
    const registry = await (await fetch('/src/platform/experiments.js')).text(), path = registry.match(/import\("([^"]*airSlash\/view\.js[^"]*)"\)/)[1];
    const code = await (await fetch(path)).text(), inputPath = code.match(/from ["']([^"']*input\/airSlashInput\.js[^"']*)["']/)[1];
    const { AirSlashInput } = await import(inputPath); AirSlashInput.prototype.start = async () => { throw new DOMException('Synthetic denied camera', 'NotAllowedError'); };
  });
  await page.locator('.launch-camera').click(); await page.locator('.as-practice').waitFor(); check((await page.locator('.as-overlay').textContent()).includes('カメラ'), 'permission refusal offers localized recovery');
  await page.locator('.as-practice').click(); check(await page.locator('.as-source').textContent() === 'PRACTICE', 'camera refusal can switch to practice');
  await page.locator('.game-back').click(); return { checks, synthetic: true, physicalCameraTested: false };
}
