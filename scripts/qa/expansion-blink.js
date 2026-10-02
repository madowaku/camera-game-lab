// Run with Playwright CLI against the Vite server. Uses real fallback controls.
async (page) => {
  const base = new URL(page.url()).origin, checks = [], errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const check = (value, name) => { if (!value) throw Error(name); checks.push(name); };
  await page.addInitScript(() => {
    localStorage.setItem('camera-game-lab-platform-onboarded-v1', 'true');
    localStorage.setItem('camera-game-lab-locale', 'en');
    window.__mediaRequests = 0;
    navigator.mediaDevices.getUserMedia = async () => { window.__mediaRequests++; throw new DOMException('QA denied', 'NotAllowedError'); };
    Object.defineProperty(navigator, 'share', { configurable: true, value: undefined });
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async (text) => { window.__shared = text; } } });
  });
  await page.clock.install();
  for (const [width, height] of [[360, 800], [720, 1280], [1440, 900]]) {
    await page.setViewportSize({ width, height });
    const requests = []; const collect = (request) => requests.push(request.url()); page.on('request', collect);
    await page.goto(base + '/?qa=blink-' + width + '#/feed/solo-blink-horror');
    const card = page.locator('[data-id="solo-blink-horror"]');
    await card.waitFor(); await page.clock.runFor(200);
    check(!requests.some((url) => /src\/(blink|input)\/|mediapipe|\.task(?:\?|$)/.test(url)), `${width}: Feed does not load game or model`);
    page.off('request', collect);
    await page.screenshot({ path: `output/playwright/expansion-blink-feed-${width}.png` });
    await card.locator('[data-action="play"]').click();
    await page.waitForFunction(() => document.querySelector('.launch-demo')?.disabled === false);
    check(await page.evaluate(() => window.__mediaRequests === 0), `${width}: PLAY preflight has no camera request`);
    await page.locator('.launch-demo').click(); await page.clock.runFor(3300);
    check(await page.locator('.bh-progress-value').textContent() !== '0%', `${width}: demo starts and progresses`);
    await page.screenshot({ path: `output/playwright/expansion-blink-open-${width}.png` });
    await page.keyboard.down('Space'); await page.clock.runFor(300);
    check(await page.locator('.bh-stage').evaluate((el) => el.classList.contains('is-closed')), `${width}: keyboard closes the scene`);
    await page.screenshot({ path: `output/playwright/expansion-blink-closed-${width}.png` });
    await page.keyboard.up('Space');
    let held = false;
    for (let i = 0; i < 130 && !(await page.locator('.platform-result').isVisible()); i++) {
      const danger = await page.locator('.bh-stage').evaluate((el) => parseFloat(el.style.getPropertyValue('--danger')));
      const close = held ? danger > .5 : danger > .8;
      if (close !== held) { await page.keyboard[close ? 'down' : 'up']('Space'); held = close; }
      await page.clock.runFor(250);
    }
    await page.keyboard.up('Space');
    await page.locator('.platform-result').waitFor({ state: 'visible' });
    check((await page.locator('.bh-receipt').textContent()).includes('ESCAPED'), `${width}: strategic fallback round escapes`);
    check((await page.locator('.platform-result').textContent()).includes('Demo'), `${width}: result labels demo source`);
    check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${width}: no horizontal overflow`);
    await page.screenshot({ path: `output/playwright/expansion-blink-result-${width}.png` });
    await page.locator('[data-result-action="share"]').click();
    check(await page.evaluate(() => /Demo.*ESCAPED/.test(window.__shared) && window.__shared.includes('#/game/solo-blink-horror')), `${width}: result share preserves outcome, source and canonical route`);
    await page.locator('[data-result-action="retry"]').click(); await page.clock.runFor(16000);
    await page.locator('.platform-result').waitFor({ state: 'visible' });
    check((await page.locator('.bh-receipt').textContent()).includes('CAUGHT'), `${width}: RETRY resets and continuous staring loses`);
    await page.locator('.platform-locale').click();
    check((await page.locator('.bh-receipt').textContent()).includes('捕まった'), `${width}: JA result and labels`);
    await page.locator('[data-result-action="next"]').click();
    await page.locator('.lab-feed').waitFor({ state: 'visible' });
    check(await page.evaluate(() => window.__mediaRequests === 0), `${width}: entire demo workflow remains camera-free`);
  }
  check(errors.length === 0, 'no uncaught browser errors');
  return { checks, errors, synthetic: false, physicalDevice: false };
}
