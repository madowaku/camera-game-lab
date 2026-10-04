async page => {
  await page.clock.resume(); const base = new URL(page.url()).origin;
  await page.goto(base + '/?qa=as-export-' + Date.now() + '#/game/solo-air-slash');
  await page.waitForFunction(() => document.querySelector('.as-entry .launch-demo')?.disabled === false);
  await page.evaluate(async () => {
    const registry = await (await fetch('/src/platform/experiments.js')).text(), path = registry.match(/import\("([^"]*airSlash\/view\.js[^"]*)"\)/)[1];
    const { AirSlashView } = await import(path), render = AirSlashView.prototype.render;
    AirSlashView.prototype.render = function (...args) { window.__as = this; return render.apply(this, args); };
  });
  await page.locator('[data-as-recording="creator"]').click(); await page.locator('[data-as-face="HIDE"]').click();
  await page.clock.install(); await page.clock.pauseAt(new Date()); await page.locator('.launch-demo').click(); await page.clock.runFor(800);
  await page.keyboard.press('x'); await page.clock.runFor(500); await page.clock.runFor(15000); await page.locator('.as-result').waitFor();
  await page.clock.resume(); await page.locator('[data-as-clip="encode"]').click();
  await page.waitForFunction(() => document.querySelector('[data-as-clip="save"]')?.disabled === false, { timeout: 25000 });
  const downloadPending = page.waitForEvent('download'); await page.locator('[data-as-clip="save"]').click(); const download = await downloadPending;
  const path = 'output/playwright/air-slash-highlight.' + download.suggestedFilename().split('.').at(-1); await download.saveAs(path);
  const file = await page.evaluate(() => ({ name: __as.creatorResult.file.name, size: __as.creatorResult.file.size, type: __as.creatorResult.file.type, faceMode: __as.creatorResult.faceMode }));
  if (file.size < 5000 || file.faceMode !== 'HIDE') throw Error('Export is missing or has wrong privacy mode');
  await page.screenshot({ path: 'output/playwright/air-slash-export-ready.png', fullPage: true });
  return { path, ...file, silent: true, duration: 7, clock: 'real MediaRecorder' };
}
