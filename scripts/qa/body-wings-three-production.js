async page => {
  const base = new URL(page.url()).origin, checks = [], errors = [];
  const check = (ok, label) => { if (!ok) throw Error(label); checks.push(label); };
  page.on('pageerror', e => errors.push(e.message));
  const threeLoaded = () => page.evaluate(() => performance.getEntriesByType('resource').some(r => /three\.core-|createThreeVisualLayer-|threeScene-/.test(r.name)));
  await page.goto(base + '/#/', { waitUntil: 'networkidle' });
  check(!(await threeLoaded()), 'production Feed does not request Three chunks');
  await page.goto(base + '/#/game/solo-ghost-trail');
  await page.waitForFunction(() => document.querySelector('.launch-demo')?.disabled === false);
  await page.locator('.launch-demo').click();
  check(!(await threeLoaded()), 'production 2D practice does not request Three chunks');
  await page.goto(base + '/#/game/solo-body-wings');
  await page.waitForFunction(() => document.querySelector('.bw-entry .launch-demo')?.disabled === false);
  check(!(await threeLoaded()), 'production BODY WINGS entrance keeps Three lazy');
  await page.setViewportSize({ width: 720, height: 1280 });
  await page.locator('.launch-demo').click(); await page.locator('.bw-world canvas').waitFor();
  check(await threeLoaded(), 'production practice downloads the optional Three chunks');
  await page.waitForFunction(() => Number(document.querySelector('.bw-time').textContent) < 29, null, { timeout: 20000 });
  check(await page.locator('.bw-world canvas').evaluate(c => c.width > 0 && c.height > 0 && !!c.getContext('webgl2')), 'production WebGL canvas is initialized');
  await page.screenshot({ path: 'output/playwright/body-wings-three-production-720.png', fullPage: true });
  await page.locator('.game-back').click(); await page.locator('.lab-feed').waitFor();
  check(await page.locator('.bw-world canvas').count() === 0, 'production departure removes WebGL canvas');
  check(errors.length === 0, 'production has no uncaught exceptions');
  return { checks, errors };
}
