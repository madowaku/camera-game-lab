// Real pointer/touch/keyboard fallback. No automatic gameplay hooks or camera.
async (page) => {
  const base = new URL(page.url()).origin, checks = [], errors = [];
  const check = (value, name) => { if (!value) throw Error(name); checks.push(name); };
  page.on('pageerror', (error) => errors.push(error.message));
  await page.addInitScript(() => {
    localStorage.setItem('camera-game-lab-platform-onboarded-v1', 'true'); localStorage.setItem('camera-game-lab-locale', 'en');
    window.__mediaRequests = 0;
    navigator.mediaDevices.getUserMedia = async () => { window.__mediaRequests++; throw new DOMException('QA denial', 'NotAllowedError'); };
    Object.defineProperty(navigator, 'share', { configurable: true, value: undefined });
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async (text) => { window.__shared = text; } } });
  });
  await page.clock.install();
  for (const [width, height] of [[360, 800], [720, 1280], [1440, 900]]) {
    await page.setViewportSize({ width, height });
    const requests = [], collect = (request) => requests.push(request.url()); page.on('request', collect);
    await page.goto(base + '/?qa=pinch-' + width + '#/feed/solo-pinch-world');
    const card = page.locator('[data-id="solo-pinch-world"]'); await card.waitFor(); await page.clock.runFor(200);
    check(!requests.some((url) => /src\/(pinch|input)\/|mediapipe|\.task(?:\?|$)/.test(url)), `${width}: Feed has no game/model/sensor work`);
    page.off('request', collect);
    await page.screenshot({ path: `output/playwright/expansion-pinch-feed-${width}.png` });
    await card.locator('[data-action="info"]').click();
    check((await page.locator('.sheet-content').textContent()).includes('PINCH WORLD'), `${width}: INFO metadata`);
    await page.locator('.sheet-close').click(); await card.locator('[data-action="play"]').click();
    await page.waitForFunction(() => document.querySelector('.launch-demo')?.disabled === false);
    await page.locator('.launch-demo').click(); await page.clock.runFor(1800);
    const board = page.locator('.pw-stage');
    const client = width === 360 ? await page.context().newCDPSession(page) : null;
    let position, down = false;
    const move = async (x, y, ms = 350) => {
      const box = await board.boundingBox(); position = { x: box.x + x * box.width, y: box.y + y * box.height };
      if (client) { if (down) await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ ...position, id: 1 }] }); }
      else await page.mouse.move(position.x, position.y);
      await page.clock.runFor(ms);
    };
    const press = async (x, y) => {
      await move(x, y, 30); down = true;
      if (client) await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...position, id: 1 }] });
      else await page.mouse.down();
      await page.clock.runFor(100);
    };
    const release = async () => {
      if (client) await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); else await page.mouse.up();
      down = false; await page.clock.runFor(100);
    };
    const held = () => page.locator('.pw-object').evaluate((el) => el.classList.contains('is-held'));
    await page.screenshot({ path: `output/playwright/expansion-pinch-pick-${width}.png` });
    await press(.87, .84); await move(.23, .58);
    check(!(await held()), `${width}: held pinch crossing an object cannot auto-grab`);
    await release(); await press(.23, .58);
    check(await held(), `${width}: fresh pinch grabs`);
    await move(.77, .38); await release();
    check(await page.locator('.pw-task-number').textContent() === '02', `${width}: matching circle socket advances immediately`);
    await press(.2, .48); await move(.8, .48, 600);
    const objectX = await page.locator('.pw-object').evaluate((el) => el.transform.baseVal.getItem(0).matrix.e);
    check(objectX < 389 && (await page.locator('.pw-instruction').textContent()).includes('object stays'), `${width}: square stops at the wall while tweezer crosses`);
    await page.screenshot({ path: `output/playwright/expansion-pinch-barrier-${width}.png` });
    await move(.23, .48); await move(.23, .84); await move(.8, .84); await move(.8, .48); await release();
    check(await page.locator('.pw-task-number').textContent() === '03', `${width}: gap route advances to precision task`);
    await press(.24, .65); await move(.75, .33); await release(); await page.clock.runFor(400);
    await page.locator('.platform-result').waitFor({ state: 'visible' });
    check((await page.locator('.pw-receipt').textContent()).includes('WORLD COMPLETE'), `${width}: all three tasks clear`);
    check((await page.locator('.pw-receipt').textContent()).includes('3 grabs · 1 missed pinches'), `${width}: result counters retain failed fresh pinch`);
    check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${width}: no horizontal overflow`);
    await page.screenshot({ path: `output/playwright/expansion-pinch-result-${width}.png` });
    await page.locator('[data-result-action="share"]').click();
    check(await page.evaluate(() => /Demo.*CLEAR/.test(__shared) && __shared.includes('#/game/solo-pinch-world')), `${width}: SHARE preserves demo source and canonical URL`);
    await page.locator('.platform-locale').click();
    check((await page.locator('.pw-receipt').textContent()).includes('クリア'), `${width}: JA result`);
    await page.locator('.platform-locale').click();
    await page.locator('[data-result-action="retry"]').click(); await page.clock.runFor(1800);
    check(await page.locator('.pw-task-number').textContent() === '01', `${width}: RETRY resets the task`);
    await page.keyboard.down('ArrowLeft'); await page.keyboard.down('ArrowUp'); await page.clock.runFor(460);
    await page.keyboard.up('ArrowLeft'); await page.keyboard.up('ArrowUp'); await page.keyboard.down('Space'); await page.clock.runFor(100);
    check(await held(), `${width}: arrows plus Space work`);
    await page.keyboard.up('Space'); await page.clock.runFor(100);
    check(!(await held()), `${width}: keyboard release works`);
    await press(.23, .58); await move(.77, .38); await release();
    await press(.2, .48); await move(.2, .84); await move(.8, .84); await move(.8, .48); await release();
    await press(.24, .65); await move(.75, .33); await release(); await page.clock.runFor(400);
    await page.locator('.platform-result').waitFor({ state: 'visible' });
    await page.locator('[data-result-action="next"]').click(); await page.locator('.lab-feed').waitFor({ state: 'visible' });
    check(await page.evaluate(() => __mediaRequests === 0), `${width}: full demo/retry/next never requests camera`);
    if (client) await client.detach();
  }
  check(errors.length === 0, 'no uncaught browser errors');
  return { checks, errors, physicalDevice: false, touchAt360: true };
}
