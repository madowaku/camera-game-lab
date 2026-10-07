async (page) => {
  const checks = [], errors = [], check = (ok, name) => { if (!ok) throw new Error(name); checks.push(name); };
  page.on('pageerror', e => errors.push(e.message));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('http://127.0.0.1:5192/?rpbprod=' + Date.now() + '#/game/duo-rock-paper-boom');
  await page.locator('.rpb-entry .launch-demo:not(:disabled)').waitFor();
  await page.evaluate(() => {
    window.__rpbEvents = [];
    window.addEventListener('camera-lab:game', e => { if (e.detail.gameId === 'duo-rock-paper-boom') window.__rpbEvents.push(e.detail); });
  });
  check(await page.evaluate(() => !performance.getEntriesByType('resource').some(r => /\.task|\/wasm\//.test(r.name))), 'production entrance starts no camera or hand model');
  await page.locator('.launch-demo').click();
  await page.locator('.rpb-again:visible').waitFor();
  for (const [p1, p2, move, threshold] of [['ROCK', 'SCISSORS', 'METEOR FIST', .65], ['SCISSORS', 'PAPER', 'DIMENSION CUT', .65], ['PAPER', 'ROCK', 'GIANT PALM', .85]]) {
    await page.evaluate(() => { window.__rpbEvents = []; });
    await page.getByRole('button', { name: 'Player 1: ' + p1, exact: true }).click();
    await page.getByRole('button', { name: 'Player 2: ' + p2, exact: true }).click();
    await page.locator('.rpb-again').click();
    await page.waitForFunction(() => window.__rpbEvents.some(e => e.type === 'IMPACT'));
    const events = await page.evaluate(() => window.__rpbEvents), lock = events.find(e => e.type === 'LOCK'), boom = events.find(e => e.type === 'BOOM'), impact = events.find(e => e.type === 'IMPACT');
    check(lock.result.move === move && impact.result.move === move, 'production ' + move + ' resolves and delivers semantic impact');
    check(boom.time - lock.time >= .5 && impact.time - boom.time >= threshold && impact.time - boom.time < threshold + .061, move + ' sound/visual collision follows exactly the intended freeze and attack delay');
    check(await page.locator('.rpb-phaser canvas').count() === 1, 'production rematch retains one canvas');
    await page.screenshot({ path: 'output/playwright/rock-paper-boom-production-' + p1.toLowerCase() + '.png' });
    await page.locator('.rpb-again:visible').waitFor();
    check(await page.evaluate(() => __rpbEvents.filter(e => e.type === 'IMPACT').length === 1), move + ' impact is emitted once');
  }
  await page.locator('.game-back').click(); await page.waitForFunction(() => !document.querySelector('.rpb-phaser canvas'));
  check(errors.length === 0, 'production runtime has no browser errors');
  return { checks, errors };
}
