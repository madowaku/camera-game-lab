async (page) => {
  const base = 'http://127.0.0.1:5191', checks = [], errors = [];
  const check = (value, name) => { if (!value) throw new Error(name); checks.push(name); };
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(base + '/?rpbqa=' + Date.now() + '#/game/duo-rock-paper-boom');
  await page.locator('.rpb-entry .launch-demo:not(:disabled)').waitFor();
  await page.evaluate(async () => {
    const { experiments } = await import('/src/platform/experiments.js');
    const factory = await experiments.find(g => g.id === 'duo-rock-paper-boom').load();
    const temporary = factory(document.createElement('div'), 'ja'), proto = Object.getPrototypeOf(temporary), notify = proto.notify;
    proto.notify = function (...args) { window.__rpb = this; return notify.apply(this, args); };
    temporary.deactivate();
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({ path: 'output/playwright/rock-paper-boom-entry-desktop.png', fullPage: true });
  check(await page.locator('.rpb-cover img').evaluate(i => i.complete && i.naturalWidth > 0), 'Imagegen cover loads');
  for (const [width, height] of [[390, 844], [360, 800]]) {
    await page.setViewportSize({ width, height });
    check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), width + 'px entrance has no overflow');
  }
  await page.screenshot({ path: 'output/playwright/rock-paper-boom-entry-mobile.png', fullPage: true });
  await page.locator('.launch-demo').click();
  await page.waitForFunction(() => window.__rpb?.game.phase === 'countdown');
  await page.screenshot({ path: 'output/playwright/rock-paper-boom-countdown.png' });
  check(await page.evaluate(() => __rpb.source === 'demo' && !__rpb.video.srcObject && document.querySelectorAll('.rpb-phaser canvas').length === 1), 'one Phaser renderer boots without a camera in practice');
  await page.keyboard.press('p');
  const clock = await page.evaluate(() => __rpb.game.clock); await page.waitForTimeout(300);
  check(await page.evaluate(t => __rpb.game.clock === t && __rpb.game.paused, clock), 'P freezes round clock and shows pause overlay');
  await page.locator('.rpb-resume').click(); await page.waitForFunction(() => __rpb.game.ready);
  check(await page.evaluate(() => __rpb.game.phase === 'ready'), 'resume mid-count returns to ready with fresh hands');
  await page.locator('.rpb-start').click();
  await page.waitForFunction(() => __rpb.game.phase === 'freeze');
  check(await page.evaluate(() => !document.querySelector('.rpb-freeze').hidden && __rpb.snapshot().musicSilent), 'lock captures a real freeze frame and silences BGM');
  await page.screenshot({ path: 'output/playwright/rock-paper-boom-freeze.png' });
  await page.waitForFunction(() => __rpb.game.phase === 'boom' && __rpb.game.age > .85);
  await page.screenshot({ path: 'output/playwright/rock-paper-boom-meteor.png' });
  await page.waitForFunction(() => __rpb.game.phase === 'again');
  const original = await page.evaluate(() => { window.__rpbGame = __rpb.runtime.game; return __rpb.game.result; });
  check(original.winner === 1 && original.move === 'METEOR FIST', 'real countdown and live samples reach P1 meteor win');
  const signs = ['ROCK', 'SCISSORS', 'PAPER'], expected = [[0, 1, 2], [2, 0, 1], [1, 2, 0]];
  for (const [i, p1] of signs.entries()) for (const [j, p2] of signs.entries()) {
    await page.getByRole('button', { name: 'Player 1: ' + p1, exact: true }).click();
    await page.getByRole('button', { name: 'Player 2: ' + p2, exact: true }).click();
    await page.locator('.rpb-again').click();
    await page.waitForFunction(() => __rpb.game.phase === 'boom' && __rpb.game.age > .85);
    const result = await page.evaluate(() => ({ ...__rpb.game.result, reuse: __rpb.runtime.game === __rpbGame, art: __rpb.scene.art.map(s => ({ visible: s.visible, frame: s.frame.name })) }));
    check(result.p1 === p1 && result.p2 === p2 && result.winner === expected[i][j], p1 + ' vs ' + p2 + ' resolves correct live finish');
    check(result.reuse && await page.locator('.rpb-phaser canvas').count() === 1, 'rematch reuses the same Phaser Game: ' + p1 + '/' + p2);
    if (i === j || p1 === 'SCISSORS' && p2 === 'PAPER' || p1 === 'PAPER' && p2 === 'ROCK' || result.winner === 2) await page.screenshot({ path: 'output/playwright/rock-paper-boom-' + p1.toLowerCase() + '-' + p2.toLowerCase() + '.png' });
    if (p1 === 'SCISSORS' && p2 === 'PAPER') check(await page.evaluate(() => getComputedStyle(document.querySelector('.rpb-freeze')).clipPath.startsWith('polygon') && !document.querySelector('.rpb-split').hidden), 'dimension cut splits the actual frozen background');
    await page.waitForFunction(() => __rpb.game.phase === 'again');
  }
  check(await page.locator('.rpb-again').evaluate(b => b.getBoundingClientRect().bottom <= innerHeight), 'mobile AGAIN is reachable without scrolling');
  await page.screenshot({ path: 'output/playwright/rock-paper-boom-again-mobile.png' });
  await page.locator('.rpb-debug').click();
  check(await page.locator('.rpb-debug-hud').innerText().then(s => /P1 HAND: PAPER/.test(s) && /hands detected: 2/.test(s)), 'Debug HUD reports both hands, confidence, FPS and phase');
  await page.locator('.rpb-sound').click(); check(await page.locator('.rpb-sound').getAttribute('aria-pressed') === 'false', 'SE mute is independent of BGM');
  await page.locator('.rpb-debug').click();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.getByRole('button', { name: 'Player 1: ROCK', exact: true }).click();
  await page.getByRole('button', { name: 'Player 2: SCISSORS', exact: true }).click();
  await page.locator('.rpb-again').click(); await page.waitForFunction(() => __rpb.game.phase === 'boom' && __rpb.game.age > .7);
  check(await page.evaluate(() => __rpb.reducedMotion && __rpb.scene.fx.reducedMotion), 'live reduced-motion preference removes shake/flash/particle motion');
  await page.screenshot({ path: 'output/playwright/rock-paper-boom-reduced.png' });
  await page.waitForFunction(() => __rpb.game.phase === 'again');
  await page.locator('.platform-locale').click(); check(await page.locator('.rpb-source').innerText().then(s => /PRACTICE/.test(s)), 'locale updates during rematches without resetting the round');
  await page.locator('.game-back').click();
  await page.waitForFunction(() => !document.querySelector('.rpb-phaser canvas'));
  check(await page.evaluate(() => !__rpb.active && !__rpb.input.running && !__rpb.runtime && !__rpb.audio.context && !__rpbGame.loop.running), 'feed exit releases renderer, model, stream and SE context');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  check(errors.length === 0, 'no browser runtime errors: ' + errors.join(', '));
  return { checks, errors };
}
