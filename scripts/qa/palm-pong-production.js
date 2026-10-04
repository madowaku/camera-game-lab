// Production bundle smoke test: no source imports or simulated score injection.
async (page) => {
  await page.clock.resume(); const base = new URL(page.url()).origin, checks = [], errors = [];
  const check = (ok, name) => { if (!ok) throw Error(name); checks.push(name); };
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(base + '/?qa=palm-built#/game/duo-palm-pong'); await page.clock.resume();
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.waitForFunction(() => document.querySelector('.pp-entry .launch-demo')?.disabled === false);
  check(await page.locator('.pp-entry-art img').evaluate(i => i.complete && i.naturalWidth > 0), 'built Imagegen cover loads');
  check(await page.evaluate(() => !performance.getEntriesByType('resource').some(r => /\.task|\.wasm/.test(r.name))), 'built entrance has no model requests');
  await page.locator('.launch-howto').click();
  check(await page.locator('.game-music-credit a').getAttribute('href') === 'https://opentracks.com/bgm/detail/1021', 'built how-to links directly to OpenTracks track');
  await page.keyboard.press('Escape');
  await page.clock.install({ time: new Date('2026-10-04T03:30:00Z') });
  await page.locator('.launch-demo').click(); await page.clock.runFor(650);
  check(await page.locator('.pp-start').isEnabled(), 'built practice enables START after preparation');
  await page.locator('.pp-start').click(); await page.clock.runFor(3150);
  check(await page.locator('.pp-start').isHidden() && (await page.locator('.pp-timer').textContent()).includes('30'), 'built countdown transitions into timed play');
  await page.clock.runFor(2200);
  check(await page.locator('.pp-score strong').textContent() !== '0', 'built static practice produces a real return');
  await page.locator('.pp-pause').click(); const timer = await page.locator('.pp-timer').textContent(); await page.clock.runFor(1500);
  check(await page.locator('.pp-timer').textContent() === timer, 'built pause freezes time');
  await page.locator('.pp-resume').click(); await page.clock.runFor(1600);
  await page.clock.runFor(31000); await page.locator('.pp-result').waitFor();
  check((await page.locator('.pp-result').textContent()).match(/練習|PRACTICE/), 'built result labels practice');
  check(await page.locator('.pp-result-actions button').count() === 3, 'built result exposes retry, challenge and browse');
  await page.setViewportSize({ width: 360, height: 800 });
  check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'built mobile result has no horizontal overflow');
  await page.screenshot({ path: 'output/playwright/palm-pong-built-result-360.png', fullPage: true });
  await page.locator('[data-result-action="retry"]').click(); await page.clock.runFor(650);
  check(await page.locator('.pp-start').isEnabled() && await page.locator('.pp-score strong').textContent() === '0', 'built retry resets the round');
  await page.locator('.game-back').click(); await page.clock.runFor(50);
  check(await page.evaluate(() => !document.querySelector('.pp-court video').srcObject), 'built exit leaves no camera stream');
  check(errors.length === 0, 'no uncaught built browser errors: ' + errors.join('; '));
  return { passed: checks.length, checks };
}
