async (page) => {
  const base = new URL(page.url()).origin, checks = [], errors = [];
  const check = (value, name) => { if (!value) throw Error(name); checks.push(name); };
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(base + '/?qa=pause#/game/solo-pinch-world');
  await page.waitForFunction(() => document.querySelector('.launch-demo')?.disabled === false);
  await page.clock.install(); await page.locator('.launch-demo').click(); await page.clock.runFor(1800);
  const stage = await page.locator('.pw-stage').boundingBox();
  await page.mouse.move(stage.x + stage.width * .23, stage.y + stage.height * .58);
  await page.mouse.down(); await page.clock.runFor(100);
  const time = await page.locator('.pw-time').textContent();
  await page.evaluate(() => window.dispatchEvent(new Event('blur'))); await page.mouse.up(); await page.clock.runFor(1500);
  check(await page.locator('.pw-time').textContent() === time, 'PINCH pause freezes active timer');
  await page.evaluate(() => window.dispatchEvent(new Event('focus'))); await page.clock.runFor(100);
  check(!(await page.locator('.pw-object').evaluate((el) => el.classList.contains('is-held'))), 'release during pause is not lost on recovery');
  await page.mouse.down(); await page.clock.runFor(100);
  check(await page.locator('.pw-object').evaluate((el) => el.classList.contains('is-held')), 'pointer capture can be reacquired after pause');
  await page.mouse.up(); await page.locator('.game-back').click();
  await page.goto(base + '/?qa=pause#/game/solo-blink-horror');
  await page.waitForFunction(() => document.querySelector('.launch-demo')?.disabled === false);
  await page.evaluate(() => {
    window.__gainParams = new Set(); window.__gainTargets = new Map();
    const create = AudioContext.prototype.createGain, target = AudioParam.prototype.setTargetAtTime;
    AudioContext.prototype.createGain = function () { const gain = create.call(this); __gainParams.add(gain.gain); return gain; };
    AudioParam.prototype.setTargetAtTime = function (value, ...args) { if (__gainParams.has(this)) __gainTargets.set(this, value); return target.call(this, value, ...args); };
  });
  await page.locator('.launch-demo').click(); await page.clock.runFor(3300);
  const progress = await page.locator('.bh-progress-value').textContent();
  check(await page.evaluate(() => [...__gainTargets.values()].some((v) => v > 0)), 'BLINK has an active audio cue during play');
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: true }); document.dispatchEvent(new Event('visibilitychange')); });
  check(await page.evaluate(() => __gainTargets.size === 3 && [...__gainTargets.values()].every((v) => v === 0)), 'hidden-page event silences all ambient voices before another animation frame');
  await page.clock.runFor(1500);
  check(await page.locator('.bh-progress-value').textContent() === progress, 'BLINK hidden-page pause freezes escape');
  await page.evaluate(() => { delete document.hidden; document.dispatchEvent(new Event('visibilitychange')); }); await page.clock.runFor(800);
  check(await page.locator('.bh-progress-value').textContent() !== progress, 'BLINK resumes only after stable recovery');
  await page.locator('.game-back').click();
  check(errors.length === 0, 'no pause/recovery browser errors');
  return { checks, errors };
}
