async (page) => {
  const base = new URL(page.url()).origin, checks = [], errors = [];
  const check = (value, name) => { if (!value) throw Error(name); checks.push(name); };
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(() => {
    localStorage.setItem('camera-game-lab-locale', 'ja');
    localStorage.setItem('camera-game-lab-platform-onboarded-v1', 'true');
    window.__cameraCalls = 0;
    navigator.mediaDevices.getUserMedia = async () => { __cameraCalls++; throw Error('Unexpected camera request'); };
  });
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto(base + '/?qa=camera-production&run=' + Date.now() + '#/explore');
  await page.locator('#experiment-search').fill('EXP-043');
  check(await page.locator('.explore-card').count() === 1, 'production Explore discovers EXP-043');
  check(await page.evaluate(() => __cameraCalls === 0), 'discovery does not request camera');
  await page.locator('.explore-card a').click();
  await page.waitForFunction(() => document.querySelector('.launch-demo') && !document.querySelector('.launch-demo').disabled);
  check((await page.locator('.launch-reason').textContent()).includes('スマホ'), 'JA launcher explains framing');
  await page.clock.install();
  await page.locator('.launch-demo').click(); await page.clock.runFor(1650);
  check(await page.locator('.ci-overlay').isHidden(), 'production demo starts');
  check(await page.locator('.ci-stage canvas').evaluate((c) => c.getContext('2d').getImageData(0, 0, c.width, c.height).data.some((n) => n > 0)), 'built canvas has pixels');
  check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), '360 production layout has no horizontal overflow');
  await page.screenshot({ path: 'output/playwright/camera-is-it-production-360.png' });
  await page.clock.runFor(14000); await page.locator('.platform-result').waitFor({ state: 'visible' });
  check(await page.locator('.platform-result h2').textContent() === 'RETRY', 'built failure flow reaches RETRY');
  check(!(await page.locator('.platform-result').textContent()).includes('点'), 'built result omits score');
  await page.locator('[data-result-action="retry"]').click(); await page.clock.runFor(1650);
  check(await page.locator('.ci-overlay').isHidden(), 'built RETRY is playable');
  check(await page.evaluate(() => __cameraCalls === 0), 'production demo and retry never request a camera');
  await page.locator('.game-back').click(); await page.locator('.lab-feed').waitFor({ state: 'visible' });
  check(errors.length === 0, 'no production page errors');
  return { checks, errors, physicalDevice: false };
}
