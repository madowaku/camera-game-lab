// Run through playwright-cli run-code. Native practice controls and real judges;
// instrumentation observes the controller, without adding production globals.
async page => {
  await page.clock.resume();
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  const base = new URL(page.url()).origin, checks = [], errors = [], failed = [];
  const check = (ok, name) => { if (!ok) throw Error(name); checks.push(name); };
  page.on('pageerror', e => errors.push(e.message));
  page.on('response', r => { if (r.status() >= 400) failed.push(r.url() + ': ' + r.status()); });
  await page.addInitScript(() => {
    localStorage.setItem('camera-game-lab-platform-onboarded-v1', 'true');
    localStorage.setItem('camera-game-lab-locale', 'ja');
    localStorage.setItem('camera-game-lab-bgm-v1', 'false');
    window.__mediaRequests = 0;
    navigator.mediaDevices.getUserMedia = async () => { __mediaRequests++; throw new DOMException('QA denial', 'NotAllowedError'); };
  });
  await page.goto(base + '/#/explore');
  const games = await page.evaluate(async () => (await import('/src/platform/experiments.js')).experiments.map(({ id, module, demo }) => ({ id, module, demo })));
  const prepare = async id => {
    await page.goto(base + '/?qa=motion#/game/' + id);
    await page.waitForFunction(() => document.querySelector('.launch-camera')?.disabled === false);
    await page.evaluate(async () => {
      const launcher = await (await fetch('/src/platform/launcher.js')).text();
      const path = launcher.match(/from ["']([^"']*motionDirector\.js[^"']*)["']/)[1];
      const { MotionDirector } = await import(path);
      const update = MotionDirector.prototype.update;
      MotionDirector.prototype.update = function (instance, game, snapshot) {
        window.__motion = this; window.__view = instance; window.__motionSnapshot = snapshot;
        return update.call(this, instance, game, snapshot);
      };
    });
  };
  for (const size of [{ width: 390, height: 844 }, { width: 1440, height: 900 }]) {
    await page.setViewportSize(size);
    for (const game of games) {
      await prepare(game.id);
      check(await page.locator('.motion-emblem').count() === 1, game.id + ': entry motif ' + size.width);
      check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), game.id + ': entry fits ' + size.width);
      check(await page.evaluate(() => __mediaRequests === 0), game.id + ': entry starts no camera');
    }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.clock.install(); await page.clock.pauseAt(await page.evaluate(() => Date.now() + 100));
  const launched = [];
  for (const game of games.filter(g => g.demo)) {
    await prepare(game.id);
    await page.locator('.launch-demo').click(); await page.clock.runFor(850);
    if (game.module === 'palmPong') { await page.locator('.pp-start').click(); }
    if (game.module === 'smuggler') { await page.locator('.fs-start').click(); }
    if (game.module === 'blink') { await page.locator('.bh-hide').focus(); await page.keyboard.down('Space'); await page.clock.runFor(150); await page.keyboard.up('Space'); }
    if (game.module === 'noteEater') { await page.locator('.ne-bite').click(); }
    if (game.module === 'counterCam') {
      await page.keyboard.press('Space'); await page.clock.runFor(50);
      await page.keyboard.down('ArrowLeft'); await page.clock.runFor(50); await page.keyboard.up('ArrowLeft');
      await page.keyboard.down('ArrowRight'); await page.clock.runFor(50); await page.keyboard.up('ArrowRight');
    }
    if (game.module === 'tiltTurbo') {
      await page.keyboard.down('ArrowLeft'); await page.clock.runFor(350); await page.keyboard.up('ArrowLeft');
      await page.keyboard.down('ArrowRight'); await page.clock.runFor(350); await page.keyboard.up('ArrowRight');
    }
    if (game.module === 'wipe') {
      await page.locator('.wipe-stage').scrollIntoViewIfNeeded();
      const b = await page.locator('.wipe-stage').boundingBox();
      await page.mouse.move(b.x + b.width * .25, b.y + b.height * .2); await page.mouse.down();
    }
    for (let i = 0; i < 100 && !(await page.evaluate(() => window.__motion?.started)); i++) await page.clock.runFor(100);
    check(await page.evaluate(() => !!__motion.profile && __motion.started), game.id + ': native practice reaches motion stage');
    check(await page.evaluate(() => __motion.layer?.isConnected && getComputedStyle(__motion.layer).pointerEvents === 'none'), game.id + ': layer cannot intercept controls');
    check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), game.id + ': gameplay fits mobile');
    check(await page.evaluate(() => __mediaRequests === 0), game.id + ': practice starts no sensors');
    launched.push(game.id);
    if (game.module === 'wipe') await page.mouse.up();
    await page.locator('.game-back').click(); await page.clock.runFor(30);
    check(await page.evaluate(() => !__motion.game && !document.querySelector('.motion-layer')), game.id + ': route clears all effects');
  }
  // A visible, actual drum hit; no synthetic score or success assignment.
  await prepare('solo-toy-drum'); await page.locator('.launch-demo').click(); await page.clock.runFor(900);
  await page.keyboard.press('d'); await page.clock.runFor(32);
  check(await page.evaluate(() => __view.game.hits > 0 && document.querySelector('.motion-burst--hit')), 'drum key judge produces a visible burst');
  check(await page.evaluate(() => document.querySelector('.motion-ring').getBoundingClientRect().width > 0), 'burst has rendered geometry');
  await page.screenshot({ path: 'output/playwright/motion-drum-hit-390.png', fullPage: true });
  await page.clock.runFor(250);
  await page.keyboard.press('f'); await page.clock.runFor(250); await page.keyboard.press('j'); await page.clock.runFor(250); await page.keyboard.press('k'); await page.clock.runFor(250); await page.keyboard.press('d'); await page.clock.runFor(32);
  check(await page.evaluate(() => __view.game.combo >= 5 && document.querySelector('.motion-burst--combo')), 'five native drum hits produce combo cut-in');
  check((await page.locator('.motion-caption').textContent()).includes('5 COMBO'), 'cut-in reports actual combo');
  await page.screenshot({ path: 'output/playwright/motion-drum-combo-390.png', fullPage: true });
  await page.locator('.td-pause').click(); await page.clock.runFor(32);
  check(await page.locator('.motion-burst').count() === 0, 'pause removes transient geometry immediately');
  await page.locator('.td-resume').click(); await page.clock.runFor(1000);
  check(await page.locator('.motion-burst').count() === 0, 'resume does not replay the combo');
  await page.emulateMedia({ reducedMotion: 'reduce' }); await page.keyboard.press('f'); await page.clock.runFor(32);
  check(await page.locator('.motion-burst').count() === 0, 'live reduced-motion change suppresses effects');
  await page.emulateMedia({ reducedMotion: 'no-preference' }); await page.clock.runFor(1000);
  check(await page.locator('.motion-burst').count() === 0, 'reenabling motion does not replay old hits');
  await page.clock.runFor(31000); await page.locator('.td-result').waitFor();
  // CSS reveal timelines need real browser frames, unlike the JS round clock.
  await page.clock.resume(); await page.waitForTimeout(850);
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 100));
  check(await page.locator('.platform-result').getAttribute('data-motion-scene') === 'result', 'custom result has staged motion');
  check(await page.evaluate(() => !__motion.game && !document.querySelector('.motion-layer')), 'result releases game effects');
  await page.screenshot({ path: 'output/playwright/motion-drum-result-390.png', fullPage: true });
  for (const size of [{ width: 360, height: 500 }, { width: 1440, height: 900 }]) {
    await page.setViewportSize(size);
    check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'result fits ' + size.width);
  }
  await page.locator('[data-result-action="retry"]').click(); await page.clock.runFor(950);
  check(await page.evaluate(() => __motion.game?.id === 'solo-toy-drum' && __view.game.hits === 0), 'retry resets controller and motion baseline');
  await page.locator('.game-back').click(); await page.clock.runFor(50);
  await prepare('solo-air-slash'); await page.locator('.launch-demo').click(); await page.clock.runFor(700);
  await page.keyboard.press('x'); await page.clock.runFor(480);
  check(await page.evaluate(() => __view.game.xSlashes === 1 && document.querySelector('.motion-burst--special')), 'native crossing blades produce X-SLASH cut-in');
  check(await page.locator('.motion-caption').count() === 0, 'X-SLASH emphasizes native text without a duplicate caption');
  await page.screenshot({ path: 'output/playwright/motion-air-slash-special-1440.png', fullPage: true });
  await page.clock.runFor(20000); await page.locator('.as-result').waitFor();
  await page.locator('.platform-locale').click(); await page.clock.runFor(600);
  check((await page.locator('.as-result').textContent()).includes('Fruit sliced'), 'result language still changes');
  await page.locator('.game-back').click(); await page.clock.runFor(50);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await prepare('solo-handy-pals');
  check(await page.locator('.motion-emblem').evaluate(el => getComputedStyle(el).display === 'none'), 'reduced-motion hides entry motif');
  check(await page.locator('.launch-panel').evaluate(el => getComputedStyle(el).animationName === 'none'), 'reduced-motion entry remains static');
  await page.clock.resume(); await page.emulateMedia({ reducedMotion: 'no-preference' });
  check(errors.length === 0, 'no uncaught browser errors: ' + errors.join('; '));
  check(failed.length === 0, 'no failed resources: ' + failed.join('; '));
  return { checks: checks.length, entrances: games.length * 2, practiceRounds: launched, errors, failed, physicalCamera: false };
}
