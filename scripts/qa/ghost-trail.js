// Playwright CLI run-code, against Vite. Real demo controls; no human verdict.
async (page) => {
  const base = new URL(page.url()).origin, checks = [], errors = [];
  const check = (ok, name) => { if (!ok) throw Error(name); checks.push(name); };
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(() => {
    localStorage.setItem('camera-game-lab-locale', 'en');
    localStorage.setItem('camera-game-lab-platform-onboarded-v1', 'true');
    window.__mediaRequests = 0;
    navigator.mediaDevices.getUserMedia = async () => { window.__mediaRequests++; throw Error('No camera in demo QA'); };
    Object.defineProperty(navigator, 'share', { configurable: true, value: undefined });
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async (text) => { window.__shared = text; } } });
  });
  await page.clock.install();
  for (const [width, height] of [[360, 800], [720, 1280], [1440, 900]]) {
    await page.setViewportSize({ width, height });
    const requests = [], collect = (r) => requests.push(r.url()); page.on('request', collect);
    await page.goto(base + '/?qa=ghost-' + width + '#/feed/solo-ghost-trail');
    const card = page.locator('[data-id="solo-ghost-trail"]'); await card.waitFor(); await page.clock.runFor(200);
    check(!requests.some((url) => /src\/(ghost|input)\/|mediapipe|\.task(?:\?|$)/.test(url)), `${width}: lazy feed`);
    page.off('request', collect);
    await page.screenshot({ path: `output/playwright/ghost-feed-${width}.png` });
    await card.locator('[data-action="play"]').click();
    await page.waitForFunction(() => document.querySelector('.launch-demo')?.disabled === false);
    await page.locator('.launch-demo').click();
    const stage = page.locator('.gt-stage'), bounds = await stage.boundingBox();
    await page.locator('.gt-pause').click(); const frozen = await page.locator('.gt-time').textContent();
    await page.clock.runFor(1800); check(await page.locator('.gt-time').textContent() === frozen, `${width}: explicit pause freezes time`);
    await page.locator('.gt-pause').click(); await page.clock.runFor(650);
    for (let i = 0; i < 305 && !(await page.locator('.platform-result').isVisible()); i++) {
      const elapsed = 30 - Number(await page.locator('.gt-time').textContent());
      const angle = elapsed / 19 * Math.PI * 2;
      await page.mouse.move(bounds.x + bounds.width * (.5 + .3 * Math.cos(angle)), bounds.y + bounds.height * (.5 + .225 * Math.sin(angle)));
      await page.clock.runFor(100);
      if (i === 45 || i === 225) await page.screenshot({ path: `output/playwright/ghost-play-${width}-${i}.png` });
    }
    await page.locator('.platform-result').waitFor({ state: 'visible' });
    check((await page.locator('.gt-receipt').textContent()).includes('OUTRAN YOUR PAST'), `${width}: 30-second survival with actual pointer controls`);
    check((await page.locator('.gt-receipt').textContent()).includes('4 ghosts'), `${width}: four historical ghosts`);
    check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${width}: no horizontal overflow`);
    check((await page.locator('.platform-result').textContent()).includes('Demo'), `${width}: honest demo provenance`);
    await page.screenshot({ path: `output/playwright/ghost-result-${width}.png` });
    await page.locator('[data-result-action="share"]').click();
    check(await page.evaluate(() => /Demo.*SURVIVED/.test(__shared) && __shared.includes('#/game/solo-ghost-trail')), `${width}: localized canonical result share`);
    await page.locator('[data-result-action="retry"]').click(); await page.clock.runFor(7500);
    check((await page.locator('.gt-receipt').textContent()).includes('PAST CAUGHT UP'), `${width}: retry resets and standing still loses`);
    await page.locator('.platform-locale').click();
    check((await page.locator('.gt-receipt').textContent()).includes('過去に追いつかれた'), `${width}: Japanese result`);
    await page.locator('[data-result-action="next"]').click(); await page.locator('.lab-feed').waitFor();
    check(await page.evaluate(() => __mediaRequests === 0), `${width}: demo never requests camera`);
  }
  check(errors.length === 0, 'no uncaught browser errors');
  return { checks, errors, physicalDevice: false, humanPlaytest: false };
}
