async page => {
  await page.clock.resume();
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  const base = new URL(page.url()).origin, checks = [], errors = [], failed = [];
  const check = (ok, name) => { if (!ok) throw Error(name); checks.push(name); };
  page.on('pageerror', e => errors.push(e.message));
  page.on('response', r => { if (r.status() >= 400) failed.push(r.url()); });
  await page.addInitScript(() => {
    localStorage.setItem('camera-game-lab-locale', 'ja'); localStorage.setItem('camera-game-lab-bgm-v1', 'false');
    window.__mediaRequests = 0;
    navigator.mediaDevices.getUserMedia = async () => { __mediaRequests++; throw new DOMException('QA denial', 'NotAllowedError'); };
  });
  const open = async id => {
    await page.goto(base + '/?qa=motion-production#/game/' + id);
    await page.waitForFunction(() => document.querySelector('.launch-demo')?.disabled === false);
  };
  for (const size of [{ width: 390, height: 844 }, { width: 1440, height: 900 }]) {
    await page.setViewportSize(size);
    for (const id of ['solo-toy-drum', 'solo-air-slash', 'solo-blink-horror', 'solo-dont-laugh']) {
      await open(id);
      check(await page.locator('.motion-emblem').count() === 1, id + ': bundled entry motif ' + size.width);
      check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), id + ': bundled layout ' + size.width);
      check(await page.evaluate(() => __mediaRequests === 0), id + ': no camera on entry');
    }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.clock.install(); await page.clock.pauseAt(await page.evaluate(() => Date.now() + 100));
  await open('solo-toy-drum'); await page.locator('.launch-demo').click(); await page.clock.runFor(850);
  for (const key of ['d', 'f', 'j', 'k', 'd']) { await page.keyboard.press(key); await page.clock.runFor(210); }
  check((await page.locator('.motion-caption').textContent()).includes('5 COMBO'), 'bundled native keyboard combo cut-in');
  check(await page.locator('.motion-layer').evaluate(el => getComputedStyle(el).pointerEvents === 'none'), 'bundled effect ignores pointer input');
  await page.screenshot({ path: 'output/playwright/motion-production-combo-390.png', fullPage: true });
  await page.clock.runFor(31000); await page.locator('.td-result').waitFor();
  await page.clock.resume(); await page.waitForTimeout(850);
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 100));
  check(await page.locator('.platform-result').getAttribute('data-motion-scene') === 'result', 'bundled staged result');
  check(await page.locator('.td-result .result-actions').evaluate(el => getComputedStyle(el).opacity === '1'), 'result controls visible after reveal');
  check(await page.locator('.motion-layer').count() === 0, 'bundled result removes live geometry');
  await page.screenshot({ path: 'output/playwright/motion-production-result-390.png', fullPage: true });
  await page.locator('[data-result-action="retry"]').click(); await page.clock.runFor(850);
  check(await page.locator('.td-score span').textContent() === '0000', 'bundled retry resets score');
  await page.locator('.game-back').click(); await page.clock.runFor(50);
  await open('solo-air-slash'); await page.locator('.launch-demo').click(); await page.clock.runFor(700);
  await page.keyboard.press('x'); await page.clock.runFor(480);
  check(await page.locator('.as-cue strong').textContent() === 'X-SLASH!', 'bundled native X-SLASH');
  check(await page.locator('.motion-burst--special').count() > 0 && await page.locator('.motion-caption').count() === 0, 'bundled special uses one caption');
  await page.screenshot({ path: 'output/playwright/motion-production-air-slash-390.png', fullPage: true });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.clock.runFor(32);
  check(await page.locator('.motion-burst').count() === 0, 'bundled live reduced-motion cleanup');
  await page.locator('.game-back').click(); await page.clock.runFor(50);
  check(await page.locator('.motion-layer').count() === 0, 'bundled exit removes live geometry');
  check(await page.evaluate(() => __mediaRequests === 0), 'practice never requests camera');
  await page.clock.resume(); await page.emulateMedia({ reducedMotion: 'no-preference' });
  check(errors.length === 0, 'no production exceptions: ' + errors.join('; '));
  check(failed.length === 0, 'no broken production resources: ' + failed.join('; '));
  return { checks: checks.length, errors, failed, physicalCamera: false };
}
