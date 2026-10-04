async page => {
  await page.clock.resume(); const checks = [], errors = [], failures = [];
  const check = (ok, label) => { if (!ok) throw Error(label); checks.push(label); };
  page.on('pageerror', e => errors.push(e.message)); page.on('response', r => { if (r.status() >= 400) failures.push([r.status(), r.url()]); });
  await page.goto('http://127.0.0.1:5188/?qa=as-production-' + Date.now() + '#/game/solo-air-slash'); await page.locator('.as-entry').waitFor(); await page.waitForFunction(() => document.querySelector('.as-entry .launch-demo')?.disabled === false);
  await page.setViewportSize({ width: 390, height: 844 });
  check(await page.locator('.as-cover img').evaluate(i => i.complete && i.naturalWidth > 0), 'built Imagegen cover loads');
  check(await page.evaluate(() => !performance.getEntriesByType('resource').some(e => /\.task|\.wasm/.test(e.name))), 'built entrance loads no models');
  await page.locator('.launch-howto').click(); check(await page.locator('.game-music-credit a').getAttribute('href') === 'https://opentracks.com/bgm/detail/11555', 'built music credit'); await page.keyboard.press('Escape');
  await page.locator('[data-as-recording="creator"]').click(); await page.locator('[data-as-face="HIDE"]').click(); await page.clock.install(); await page.clock.pauseAt(new Date()); await page.locator('.launch-demo').click(); await page.clock.runFor(700); await page.locator('.as-stage').focus();
  await page.keyboard.press('x'); await page.clock.runFor(480); check(await page.locator('.as-cue strong').textContent() === 'X-SLASH!', 'built two-hand crossing'); check(Number((await page.locator('.as-score').textContent()).replaceAll(',', '')) >= 470, 'built game scores measured X-SLASH');
  await page.locator('.as-pause').click(); const time = await page.locator('.as-timer strong').textContent(); await page.clock.runFor(900); check(await page.locator('.as-timer strong').textContent() === time, 'built pause freezes clock'); await page.locator('.as-resume').click();
  await page.clock.runFor(15100); await page.locator('.as-result').waitFor(); check((await page.locator('.as-result-extra').textContent()).includes('X-SLASH ×1'), 'built result measures X-SLASH'); check(await page.locator('.as-replay canvas').isVisible(), 'built creator replay');
  await page.screenshot({ path: 'output/playwright/air-slash-production-result-390.png', fullPage: true });
  check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'built phone result fits');
  await page.locator('[data-result-action="retry"]').click(); await page.clock.runFor(700); check(await page.locator('.as-score').textContent() === '0', 'built retry resets');
  await page.locator('.game-back').click(); await page.locator('.lab-feed').waitFor(); check(await page.locator('[data-experiment-id="solo-air-slash"]').count() > 0 || (await page.locator('.lab-feed').textContent()).includes('AIR SLASH'), 'built feed integration');
  check(errors.length === 0, 'built page has no exceptions'); check(failures.length === 0, 'built assets have no HTTP errors'); await page.clock.resume(); return { checks, errors, failures };
}
