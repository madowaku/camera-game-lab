// Production bundle smoke: no dev-module imports, all game actions use the UI.
async (page) => {
  const base = new URL(page.url()).origin, checks = [], errors = [];
  const check = (condition, name) => { if (!condition) throw Error(name); checks.push(name); };
  page.on('pageerror', (error) => errors.push(error.message));
  await page.addInitScript(() => { localStorage.setItem('camera-game-lab-locale', 'en'); localStorage.setItem('camera-game-lab-platform-onboarded-v1', 'true'); });
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto(base + '/?qa=production-expansion#/game/solo-blink-horror');
  await page.waitForFunction(() => document.querySelector('.launch-demo')?.disabled === false);
  await page.clock.install();
  await page.locator('.launch-demo').click(); await page.clock.runFor(17000);
  await page.locator('.platform-result').waitFor({ state: 'visible' });
  check((await page.locator('.bh-receipt').textContent()).includes('CAUGHT'), 'production BLINK lazy bundle plays to result');
  await page.locator('[data-result-action="next"]').click();
  await page.goto(base + '/?qa=production-expansion#/game/solo-pinch-world');
  await page.waitForFunction(() => document.querySelector('.launch-demo')?.disabled === false);
  await page.locator('.launch-demo').click(); await page.clock.runFor(1800);
  const move = async (x, y) => { const box = await page.locator('.pw-stage').boundingBox(); await page.mouse.move(box.x + x * box.width, box.y + y * box.height); await page.clock.runFor(400); };
  const grab = async (x, y) => { await move(x, y); await page.mouse.down(); await page.clock.runFor(100); };
  const drop = async () => { await page.mouse.up(); await page.clock.runFor(100); };
  await grab(.23, .58); await move(.77, .38); await drop();
  await grab(.2, .48); await move(.2, .84); await move(.8, .84); await move(.8, .48); await drop();
  await grab(.24, .65); await move(.75, .33); await drop(); await page.clock.runFor(500);
  await page.locator('.platform-result').waitFor({ state: 'visible' });
  check((await page.locator('.pw-receipt').textContent()).includes('CLEAN RUN'), 'production PINCH lazy bundle clears all three tasks');
  await page.screenshot({ path: 'output/playwright/expansion-production-result-360.png' });
  await page.locator('[data-result-action="retry"]').click(); await page.clock.runFor(1800);
  check(await page.locator('.pw-task-number').textContent() === '01', 'production retry resets input and world');
  await page.screenshot({ path: 'output/playwright/expansion-production-pinch-360.png' });
  await page.locator('.game-back').click(); await page.clock.runFor(100);
  check(await page.locator('.feed-card').count() >= 10 && await page.locator('[data-id="solo-pinch-world"]').count() === 1, 'production returns to the expanded feed');
  check(errors.length === 0, 'no production page errors');
  return { checks, errors };
}
