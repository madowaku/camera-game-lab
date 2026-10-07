// Public UI only, against vite preview; no dev diagnostics or synthetic model.
async page => {
  const base = 'http://127.0.0.1:5309', checks = [], errors = [];
  const check = (ok, label) => { if (!ok) throw new Error(label); checks.push(label); };
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(base + '/?qa=production#/game/tech-camera-puppet');
  await page.waitForFunction(() => document.querySelector('.puppet-entry .launch-demo')?.disabled === false);
  await page.locator('.puppet-entry-driver').selectOption('vrm');
  await page.locator('[data-puppet-mode=creator]').click(); await page.locator('.launch-demo').click();
  await page.locator('.puppet-world canvas').waitFor();
  check(await page.evaluate(() => document.querySelector('.puppet-stage video').hidden && !document.querySelector('.puppet-stage video').srcObject && document.querySelectorAll('.puppet-world canvas').length === 1), 'built VRM practice starts with one canvas and no camera');
  await page.locator('.puppet-settings summary').click(); await page.locator('[data-motion=mouth]').focus(); await page.keyboard.press('End');
  await page.locator('.puppet-driver').selectOption('mascot'); await page.locator('.puppet-roar').waitFor({ state: 'visible' });
  check(true, 'built monster responds to keyboard-operated mouth slider');
  await page.setViewportSize({ width: 390, height: 844 }); await page.screenshot({ path: 'output/playwright/avatar-production.png', fullPage: true });
  await page.waitForFunction(() => !document.querySelector('.puppet-finish').disabled);
  await page.locator('.puppet-finish').click(); await page.locator('.puppet-result canvas').waitFor();
  check(await page.evaluate(() => !document.querySelector('.puppet-world canvas') && /AVATAR/.test(document.querySelector('.puppet-result').textContent)), 'built result releases live renderer and shows avatar provenance');
  const download = page.waitForEvent('download'); await page.locator('.puppet-save').click(); const file = await download;
  await file.saveAs('output/playwright/avatar-production-clip.' + (file.suggestedFilename().endsWith('.mp4') ? 'mp4' : 'webm'));
  check((await file.failure()) === null, 'built native silent clip exports');
  await page.locator('[data-result-action=retry]').click(); await page.locator('.puppet-world canvas').waitFor();
  check(await page.locator('.puppet-world canvas').count() === 1, 'built retry creates one renderer');
  await page.locator('.game-back').click(); await page.locator('.lab-feed').waitFor();
  check(await page.locator('.puppet-world canvas').count() === 0, 'built exit disposes renderer');
  await page.goto(base + '/?qa=normal-2d#/game/solo-ghost-trail'); await page.waitForFunction(() => document.querySelector('.launch-demo')?.disabled === false); await page.locator('.launch-demo').click();
  check(await page.evaluate(() => !performance.getEntriesByType('resource').some(r => /VRMPuppetDriver|SimplePuppetDriver|three\.module|createThreeVisualLayer/.test(r.name))), 'existing 2D game imports no puppet or Three renderer');
  await page.locator('.game-back').click(); await page.locator('.lab-feed').waitFor();
  check(errors.length === 0, 'build has no uncaught browser errors');
  return { checks, errors };
}
