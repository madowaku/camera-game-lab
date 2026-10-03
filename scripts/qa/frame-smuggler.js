// Deterministic UI practice. No camera inference or human-playtest claims.
async (page) => {
  const base = new URL(page.url()).origin, checks = [], errors = [];
  const check = (value, name) => { if (!value) throw new Error(name); checks.push(name); };
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => {
    localStorage.setItem('camera-game-lab-platform-onboarded-v1', 'true'); localStorage.setItem('camera-game-lab-locale', 'en');
    localStorage.removeItem('camera-game-lab-frame-smuggler-v1'); window.__requests = 0;
    navigator.mediaDevices.getUserMedia = async () => { window.__requests++; throw new DOMException('QA denial', 'NotAllowedError'); };
    Object.defineProperty(navigator, 'share', { configurable: true, value: undefined });
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async text => { window.__shareText = text; } } });
  });
  await page.clock.install();
  const phase = () => page.locator('.fs-game').getAttribute('data-phase');
  for (const [width, height] of [[360, 800], [720, 1280], [1440, 900]]) {
    await page.setViewportSize({ width, height });
    const requests = [], record = request => requests.push(request.url()); page.on('request', record);
    await page.goto(base + '/?qa=smuggler-' + width + '#/feed/outcam-frame-smuggler'); await page.clock.runFor(100);
    const card = page.locator('[data-id="outcam-frame-smuggler"]'); await card.waitFor();
    check(!requests.some(url => /src\/smuggler\/|mediapipe|\.task/.test(url)), `${width}: discovery does not load game/model`); page.off('request', record);
    await page.screenshot({ path: `output/playwright/frame-smuggler-feed-${width}.png` });
    await card.locator('[data-action="play"]').click(); await page.waitForFunction(() => !document.querySelector('.launch-demo')?.disabled);
    await page.locator('.launch-demo').click(); await page.clock.runFor(550);
    check(await page.locator('.fs-start').isEnabled(), `${width}: stable cargo enables START`);
    await page.screenshot({ path: `output/playwright/frame-smuggler-ready-${width}.png`, fullPage: true });
    await page.locator('.fs-start').click(); await page.clock.runFor(2100);
    check(await phase() === 'keep', `${width}: countdown enters KEEP`);
    await page.locator('[data-fs="pause"]').click(); const time = await page.locator('.fs-clock').textContent();
    await page.clock.runFor(4000); check(await page.locator('.fs-clock').textContent() === time, `${width}: pause freezes clock`);
    await page.locator('[data-fs="resume"]').click();
    let hideCaptured = false;
    for (let step = 0; step < 170 && await phase() !== 'result'; step++) {
      const current = await phase();
      if (current === 'hide') {
        await page.locator('[data-fs="hide"]').click();
        if (!hideCaptured) { await page.clock.runFor(300); await page.screenshot({ path: `output/playwright/frame-smuggler-hide-${width}.png`, fullPage: true }); hideCaptured = true; }
      } else if (current === 'return') await page.locator('[data-fs="back"]').click();
      await page.clock.runFor(200);
    }
    await page.locator('.platform-result').waitFor({ state: 'visible' });
    check((await page.locator('.fs-stats').textContent()).includes('4 / 4'), `${width}: four inspections clear`);
    check(!(await page.locator('.fs-survey').isVisible()), `${width}: practice cannot submit human observations`);
    check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${width}: no horizontal overflow`);
    await page.screenshot({ path: `output/playwright/frame-smuggler-result-${width}.png`, fullPage: true });
    await page.locator('[data-result-action="share"]').click();
    check(await page.evaluate(() => __shareText.includes('Practice') && __shareText.includes('#/game/outcam-frame-smuggler')), `${width}: share labels practice and canonical link`);
    await page.locator('.platform-locale').click(); check((await page.locator('.fs-stats').textContent()).includes('検問クリア'), `${width}: JA results`);
    await page.locator('[data-fs="swap"]').click(); await page.clock.runFor(550);
    check((await page.locator('.fs-camera-role').textContent()).includes('P2'), `${width}: swap resets round and changes roles`);
    check(!(await page.locator('.platform-result').isVisible()), `${width}: swap clears shared result`);
    check(await phase() === 'ready', `${width}: swap waits at READY`);
    await page.locator('.platform-locale').click();
    await page.locator('.fs-start').click(); await page.clock.runFor(33000);
    await page.locator('.platform-result').waitFor({ state: 'visible' });
    check((await page.locator('.fs-stats').textContent()).includes('0 / 4'), `${width}: remaining inside fails all inspections`);
    const records = await page.evaluate(() => JSON.parse(localStorage.getItem('camera-game-lab-frame-smuggler-v1')));
    check(records.length === 2 && records[0].cameraPlayer === 'P1' && records[1].cameraPlayer === 'P2', `${width}: both role orders recorded`);
    check(records.every(r => r.source === 'demo' && r.observations === null), `${width}: no fabricated human results`);
    await page.locator('[data-result-action="retry"]').click(); await page.clock.runFor(550);
    await page.locator('.fs-stage').focus(); await page.keyboard.down('ArrowRight'); await page.clock.runFor(800); await page.keyboard.up('ArrowRight');
    check((await page.locator('.fs-tracking').textContent()).includes('OUT OF FRAME'), `${width}: keyboard moves cargo out`);
    await page.locator('[data-fs="back"]').click(); await page.clock.runFor(500);
    if (width === 360) {
      const box = await page.locator('.fs-stage').boundingBox(), client = await page.context().newCDPSession(page);
      await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: box.x + box.width * .5, y: box.y + box.height * .5, id: 1 }] });
      await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: box.x + box.width * .7, y: box.y + box.height * .6, id: 1 }] });
      await page.clock.runFor(100);
      check(Math.abs(parseFloat(await page.locator('.fs-cargo').evaluate(el => el.style.left)) - 70) < 1, '360: real touch drag positions cargo');
      await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await client.detach();
    }
    await page.locator('.game-back').click(); check(await page.evaluate(() => __requests === 0), `${width}: practice/retry/swap never requests sensors`);
  }
  check(errors.length === 0, 'no uncaught browser errors');
  return { checks, errors, physicalDevice: false, humanPlaytest: false };
}
