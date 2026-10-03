async (page) => {
  const base = new URL(page.url()).origin, checks = [], errors = [];
  const check = (ok, name) => { if (!ok) throw Error(name); checks.push(name); };
  page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(() => localStorage.setItem('camera-game-lab-locale', 'ja'));
  await page.clock.install({ time: new Date('2026-10-03T00:00:00Z') });
  const run = Date.now();
  for (const size of [{ width: 390, height: 844 }, { width: 360, height: 800 }, { width: 720, height: 1280 }, { width: 1440, height: 900 }]) {
    await page.setViewportSize(size);
    await page.goto(base + `/?qa=soft-serve&run=${run}&width=${size.width}#/game/solo-soft-serve`);
    await page.waitForFunction(() => document.querySelector('.launch-demo')?.disabled === false);
    check(await page.locator('.launch-steps li').count() === 3, `three visual instructions at ${size.width}`);
    check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `no horizontal overflow at ${size.width}`);
    const button = await page.locator('.launch-demo').boundingBox();
    check(button.y + button.height <= size.height, `start buttons fit first screen at ${size.width}`);
    await page.screenshot({ path: `output/playwright/soft-serve-launch-${size.width}.png` });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  check(await page.evaluate(() => !document.querySelector('.ss-stage video').srcObject && !performance.getEntriesByType('resource').some(e => /\.task|\.wasm/.test(e.name))), 'browsing does not acquire camera or download models');
  await page.locator('.launch-demo').click(); await page.clock.runFor(1300);
  check((await page.locator('.ss-callout').textContent()).includes('左右'), 'automatic ready starts with a movement instruction');
  const bounds = await page.locator('.ss-stage').boundingBox();
  for (let i = 0; i < 50; i++) {
    const radius = Math.max(.035, .09 - i * .0007);
    await page.mouse.move(bounds.x + bounds.width * (.5 + Math.sin(i * .72) * radius), bounds.y + bounds.height * .72);
    await page.clock.runFor(180);
  }
  check(parseInt(await page.locator('.ss-height').textContent()) >= 5, 'mouse winding stacks five visible swirls');
  check((await page.locator('.ss-callout').textContent()).includes('もう一巻き'), 'height tempts voluntary extra winding');
  check(await page.locator('.ss-stage canvas:not(.creator-scene)').evaluate(c => {
    const pixels = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    let cream = 0; for (let i = 0; i < pixels.length; i += 4) if (pixels[i] > 240 && pixels[i + 1] > 225 && pixels[i + 2] < 230) cream++;
    return cream > 1000;
  }), 'canvas has visible vanilla pixel evidence');
  await page.screenshot({ path: 'output/playwright/soft-serve-swirls-390.png' });
  await page.locator('.ss-pause').click(); const frozen = await page.locator('.ss-melt-value').textContent();
  await page.clock.runFor(2000); check(await page.locator('.ss-melt-value').textContent() === frozen, 'pause freezes melting');
  await page.locator('.ss-pause').click();
  await page.mouse.move(bounds.x + bounds.width * .89, bounds.y + bounds.height * .72); await page.clock.runFor(850);
  check(await page.locator('.ss-bite').isVisible(), 'moving sideways stops the nozzle and enters eating');
  await page.screenshot({ path: 'output/playwright/soft-serve-eat-390.png' });
  await page.locator('.ss-stage').focus(); await page.keyboard.down('Space'); await page.clock.runFor(300); await page.keyboard.up('Space');
  let bites = 1;
  while (await page.locator('.ss-bite').isVisible() && bites < 15) { await page.locator('.ss-bite').click(); await page.clock.runFor(180); bites++; }
  await page.clock.runFor(850); await page.locator('.platform-result').waitFor();
  check((await page.locator('.platform-result').textContent()).includes('完食！'), 'repeated bites finish CLEAN');
  check(await page.locator('.ss-receipt').count() === 0 && !(await page.locator('.game-cache').isVisible()), 'one dedicated result replaces the playable view');
  check((await page.locator('.platform-result').textContent()).includes('練習'), 'practice provenance reaches shared result');
  check(await page.evaluate(() => { const r = JSON.parse(localStorage.getItem('camera-game-lab-soft-serve-rounds')).at(-1); return r.outcome === 'clean' && r.eatenPercent === 100 && r.source === 'demo' && r.bites >= 5; }), 'local receipt records complete eating without imagery');
  await page.screenshot({ path: 'output/playwright/soft-serve-clean-390.png' });
  await page.locator('[data-result-action="retry"]').click(); await page.clock.runFor(1200);
  check((await page.locator('.ss-source').textContent()).includes('練習'), 'RETRY keeps practice input');
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true });
  const touch = (x, y) => [{ x: bounds.x + bounds.width * x, y: bounds.y + bounds.height * y, id: 1 }];
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: touch(.5, .72) });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: touch(.57, .72) });
  await page.clock.runFor(250);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  check(await page.locator('.ss-stage').evaluate(e => document.activeElement === e), 'touch drag focuses the playable board');
  await page.keyboard.down('ArrowLeft'); await page.clock.runFor(400); await page.keyboard.up('ArrowLeft');
  await page.evaluate(() => window.dispatchEvent(new Event('blur'))); await page.clock.runFor(50);
  const blurred = await page.locator('.ss-melt-value').textContent(); await page.clock.runFor(1200);
  check(await page.locator('.ss-melt-value').textContent() === blurred, 'background focus loss freezes the game');
  await page.evaluate(() => window.dispatchEvent(new Event('focus'))); await page.clock.runFor(500);
  await page.locator('.game-back').click(); await cdp.detach();
  check(page.url().includes('/feed/solo-soft-serve'), 'back returns to the experiment preview');
  await page.goto(base + '/#/game/solo-soft-serve'); await page.waitForFunction(() => document.querySelector('.launch-demo')?.disabled === false);
  await page.getByRole('button', { name: 'Switch to English' }).click();
  check((await page.locator('.launch-steps').textContent()).includes('SWIRL'), 'English launch instructions');
  await page.locator('.launch-demo').click(); await page.clock.runFor(1500);
  check((await page.locator('.ss-callout').textContent()).includes('side to side'), 'English play instructions');
  await page.setViewportSize({ width: 1440, height: 900 }); await page.clock.runFor(100);
  await page.screenshot({ path: 'output/playwright/soft-serve-game-1440.png' });
  await page.setViewportSize({ width: 360, height: 500 }); await page.clock.runFor(100);
  await page.locator('.ss-finish').scrollIntoViewIfNeeded();
  check(await page.locator('.ss-finish').isVisible(), 'small-height screen keeps eating action reachable by scrolling');
  await page.locator('.game-back').click();
  check(errors.length === 0, 'no uncaught browser errors');
  return { checks, errors, physicalDevice: false, humanPlaytest: false };
}
