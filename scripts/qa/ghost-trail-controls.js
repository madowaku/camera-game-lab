async (page) => {
  const base = new URL(page.url()).origin, checks = [], errors = [];
  const check = (ok, name) => { if (!ok) throw Error(name); checks.push(name); };
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(() => localStorage.setItem('camera-game-lab-locale', 'ja'));
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto(base + '/?qa=ghost-controls#/game/solo-ghost-trail');
  await page.waitForFunction(() => document.querySelector('.launch-demo')?.disabled === false);
  await page.clock.install(); await page.locator('.launch-demo').click(); await page.clock.runFor(50);
  const ring = () => page.locator('.gt-stage canvas').evaluate((canvas) => {
    const { width: w, height: h } = canvas, data = canvas.getContext('2d').getImageData(0, 0, w, h).data;
    let sumX = 0, sumY = 0, count = 0;
    for (let y = Math.floor(h * .2); y < h * .8; y++) for (let x = Math.floor(w * .1); x < w * .9; x++) {
      const i = (y * w + x) * 4;
      if (data[i] > 240 && data[i + 1] > 240 && data[i + 2] > 225) { sumX += x; sumY += y; count++; }
    }
    return { x: sumX / count / w, y: sumY / count / h, count };
  });
  const before = await ring();
  await page.keyboard.down('ArrowRight'); await page.clock.runFor(350); await page.keyboard.up('ArrowRight');
  check((await ring()).x > before.x + .1, 'keyboard moves the visible player ring');
  const bounds = await page.locator('.gt-stage').boundingBox(), cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true });
  const touch = (x, y) => [{ x: bounds.x + bounds.width * x, y: bounds.y + bounds.height * y, id: 1 }];
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: touch(.35, .45) });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: touch(.3, .4) });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await page.clock.runFor(50);
  const after = await ring(); check(Math.abs(after.x - .3) < .02 && Math.abs(after.y - .4) < .02, 'touch drag places ring at the touch location');
  check((await page.locator('.gt-callout').textContent()).includes('自由に動こう'), 'Japanese recording instruction');
  await page.screenshot({ path: 'output/playwright/ghost-ja-controls-360.png' });
  await page.evaluate(() => window.dispatchEvent(new Event('blur'))); const frozen = await page.locator('.gt-time').textContent();
  await page.clock.runFor(2000); check(await page.locator('.gt-time').textContent() === frozen, 'focus loss freezes time');
  await page.evaluate(() => window.dispatchEvent(new Event('focus'))); await page.clock.runFor(800);
  check(await page.locator('.gt-time').textContent() !== frozen, 'focus return recovers without a jump');
  await page.locator('.game-back').click(); await cdp.detach();
  check(errors.length === 0, 'no control errors'); return { checks, errors, physicalDevice: false };
}
