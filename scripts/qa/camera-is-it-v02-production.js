async (page) => {
  const base = new URL(page.url()).origin, errors = [], checks = [];
  page.on('pageerror', e => errors.push(e.message));
  const check = (ok, label) => { if (!ok) throw Error(label); checks.push(label); };
  // Isolate this build from concurrent local builds and PWA auto-update reloads.
  await page.evaluate(async () => { for (const r of await navigator.serviceWorker.getRegistrations()) await r.unregister(); });
  await page.addInitScript(() => {
    delete Navigator.prototype.serviceWorker;
    localStorage.setItem('camera-game-lab-locale', 'en');
    localStorage.setItem('camera-game-lab-platform-onboarded-v1', 'true');
  });
  await page.goto(base + '/?debug=1&qa=' + Date.now() + '#/game/outcam-the-camera-is-it');
  await page.setViewportSize({ width: 360, height: 800 });
  await page.locator('.launch-demo').click();
  await page.waitForTimeout(1600);
  check((await page.locator('.ci-stage-number').textContent()).includes('/ 010'), 'production ten-stage pack');
  check(await page.locator('.ci-debug').count() === 0, 'production excludes debug even with debug=1');
  await page.locator('.ci-stage').focus(); await page.keyboard.down('ArrowRight'); await page.waitForTimeout(200); await page.keyboard.up('ArrowRight');
  await page.locator('.ci-pause').click();
  check(await page.locator('.ci-resume').isVisible(), 'production pause');
  await page.locator('.ci-resume').click();
  check(await page.locator('.ci-overlay').isHidden(), 'production resume');
  await page.screenshot({ path: 'output/playwright/camera-v02-production-360.png' });
  await page.getByRole('link', { name: '← Back to feed' }).click();
  check(errors.length === 0, 'production no runtime errors');
  return { checks, errors };
}
