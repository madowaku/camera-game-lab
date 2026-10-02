// Run only against npm run preview, in a fresh disposable CLI browser session.
async (page) => {
  const base = new URL(page.url()).origin, checks = [], requests = [];
  const check = (value, name) => { if (!value) throw Error(name); checks.push(name); };
  page.on('request', request => requests.push(request.url()));
  await page.addInitScript(() => {
    window.__sensorRequests = 0;
    navigator.mediaDevices.getUserMedia = async () => { window.__sensorRequests++; throw Error('Unexpected permission request during discovery QA'); };
  });
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto(base + '/#/'); await page.reload();
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await page.locator('.lab-feed').waitFor();
  const catalogSize = await page.locator('.feed-card').count();
  const cached = await page.evaluate(async () => {
    const all = [];
    for (const name of await caches.keys()) for (const request of await (await caches.open(name)).keys()) all.push(request.url);
    return all;
  });
  check(cached.some(url => url.includes('/index.html')), 'PWA shell installed in cache');
  check(!cached.some(url => /\/(view|faceInput|soloExperience|bodyInput|duoArcade|guardianExperience|daitaiHeroView|watermelonGuide|noteBlasterArcade|fingerGunTheme)-.*\.js/.test(url)), 'PWA does not precache game or MediaPipe JS');
  await page.locator('.lab-feed').focus(); await page.keyboard.press('End');
  await page.waitForFunction(() => document.querySelector('.feed-card:last-child').inert === false);
  check(await page.evaluate(() => window.__sensorRequests) === 0, 'scrolling production feed requests no sensors');
  check(!requests.some(url => /\.task|\.wasm|bodyInput.*\.js|duoArcade.*\.js/.test(url)), 'scrolling production feed requests no models or games');
  await page.context().setOffline(true);
  try {
    await page.reload();
    await page.locator('.lab-feed').waitFor();
    check(await page.locator('.feed-card').count() === catalogSize, 'cached feed works offline');
    await page.waitForFunction(() => document.querySelector('.preview-asset')?.naturalWidth > 0);
    check(true, 'cached hero image works offline');
  } finally { await page.context().setOffline(false); }
  await page.goto(base + '/#duo');
  await page.waitForFunction(() => document.querySelector('.launch-demo')?.disabled === false);
  check(await page.evaluate(() => window.__sensorRequests) === 0, 'production deep link stays behind permission explanation');
  check(await page.locator('.orientation-guide').isVisible(), 'production lazy module and orientation guide work');
  await page.locator('.game-back').click();
  await page.goto(base + '/#/feed/solo-hand-beat');
  if (await page.locator('.platform-onboarding button').count()) await page.locator('.platform-onboarding button').click();
  await page.waitForFunction(() => document.querySelector('.preview-asset')?.naturalWidth > 0);
  await page.screenshot({ path: 'output/playwright/platform-production-360.png' });
  return { checks, precacheEntries: cached.length };
}
