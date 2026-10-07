async (page) => {
  const base = new URL(page.url()).origin, checks = [], errors = [];
  const check = (ok, label) => { if (!ok) throw Error(label); checks.push(label); };
  page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(() => {
    localStorage.setItem('camera-game-lab-locale', 'en');
    localStorage.setItem('camera-game-lab-platform-onboarded-v1', 'true');
  });
  for (const [width, height] of [[360, 800], [720, 1280]]) {
    await page.setViewportSize({ width, height });
    await page.goto(base + '/?debug=1&run=' + Date.now() + '&width=' + width + '#/game/outcam-the-camera-is-it');
    await page.locator('.launch-demo').waitFor();
    await page.evaluate(async () => {
      const url = performance.getEntriesByType('resource').find(e => e.name.includes('/src/games/cameraIsIt.js')).name;
      const { CameraIsItGame } = await import(url);
      const step = CameraIsItGame.prototype.step;
      CameraIsItGame.prototype.step = function (dt) { window.__stagePack = this; return step.call(this, dt); };
    });
    await page.locator('.launch-demo').click(); await page.waitForTimeout(1500);
    check((await page.locator('.ci-stage-number').textContent()).includes('/ 010'), `${width}: ten-stage count`);
    check(await page.locator('.ci-progress span').count() === 10, `${width}: ten progress marks`);
    for (let index = 5; index < 10; index++) {
      await page.evaluate(i => __stagePack.loadStage(i), index); await page.waitForTimeout(1450);
      check((await page.locator('.ci-stage-number').textContent()).includes(String(index + 1).padStart(3, '0')), `${width}: stage ${index + 1} renders`);
      check(await page.locator('.ci-debug').count() === 1, `${width}: dev debug`);
      check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${width}: no horizontal overflow`);
      await page.screenshot({ path: `output/playwright/camera-v02-${width}-stage${index + 1}.png` });
      if (index === 5) {
        await page.locator('.ci-stage').focus(); const x = await page.evaluate(() => __stagePack.camera.x);
        await page.keyboard.down('ArrowRight'); await page.waitForTimeout(200); await page.keyboard.up('ArrowRight');
        check(await page.evaluate(before => __stagePack.camera.x > before + 20, x), `${width}: keyboard pans camera`);
      }
      if (index === 7) {
        await page.evaluate(() => __stagePack.failStage(__stagePack.platforms[1])); await page.waitForTimeout(100);
        check(await page.locator('.ci-warning').textContent() === 'OVEREXPOSED', `${width}: cause visible before restart`);
        await page.waitForTimeout(1100);
        check(await page.evaluate(() => __stagePack.phase === 'playing'), `${width}: quick retry`);
      }
    }
  }
  check(errors.length === 0, 'no browser runtime errors');
  return { checks, errors };
}
