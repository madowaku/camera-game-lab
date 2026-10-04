// Exercise only the built UI; no dev-module imports or fabricated outcome state.
async page => {
  await page.clock.resume(); await page.emulateMedia({ reducedMotion: 'no-preference' }); const checks = [], errors = [], failed = [];
  const check = (ok, label) => { if (!ok) throw Error(label); checks.push(label); };
  page.on('pageerror', e => errors.push(e.message)); page.on('requestfailed', r => { if (!r.failure()?.errorText?.includes('ERR_ABORTED')) failed.push(r.url()); });
  const base = new URL(page.url()).origin;
  await page.evaluate(() => { localStorage.setItem('camera-game-lab-locale', 'ja'); localStorage.setItem('camera-game-lab-hand-spell-tutorial-demo', 'done'); });
  for (const [target, signs, name] of [[0, ['ONE', 'TWO', 'THREE'], 'DRAGON FLAME'], [1, ['FIST', 'ONE', 'PALM'], 'THUNDER GOD'], [2, ['TWO', 'PALM', 'FIST'], 'ABSOLUTE ZERO'], [0, ['ONE', 'ONE', 'ONE'], 'CHICK SWARM']]) {
    await page.goto(base + '/?qa=hs-production-' + target + '#/game/solo-hand-spell'); await page.waitForFunction(() => document.querySelector('.hs-entry .launch-demo')?.disabled === false);
    await page.setViewportSize({ width: 390, height: 844 }); check(await page.locator('.hs-cover-dragon').evaluate(i => i.complete && i.naturalWidth > 0), 'built dragon asset loads');
    await page.locator('.hs-spell-picker select').selectOption(String(target));
    await page.clock.install(); await page.clock.pauseAt(new Date(await page.evaluate(() => Date.now() + 100))); await page.locator('.launch-demo').click(); await page.clock.runFor(4150);
    for (const sign of signs) { await page.locator(`[data-hs-sign="${sign}"]`).click(); await page.clock.runFor(35); } await page.locator('.hs-release').click(); await page.clock.runFor(6500);
    check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'built play fits 390');
    check(await page.locator('.motion-caption').count() === 0, 'native spell title is not duplicated by platform motion');
    await page.screenshot({ path: `output/playwright/hand-spell-production-${name.toLowerCase().replaceAll(' ', '-')}-390.png`, fullPage: true });
    await page.clock.runFor(4600); await page.locator('.hs-result').waitFor(); check(await page.locator('.hs-result h2').textContent() === name, 'built UI casts ' + name);
    await page.clock.resume();
  }
  await page.goto(base + '/#hand-spell'); await page.waitForFunction(() => document.querySelector('.hs-entry .launch-demo')?.disabled === false); await page.setViewportSize({ width: 1440, height: 900 });
  check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'built entry fits 1440'); await page.screenshot({ path: 'output/playwright/hand-spell-production-entry-1440.png', fullPage: true });
  check(errors.length === 0, 'no production exceptions'); check(failed.length === 0, 'no production resource failures: ' + failed.join('; '));
  return { checks, errors, failed };
}
