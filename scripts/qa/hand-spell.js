async page => {
  const base = new URL(page.url()).origin, checks = [], errors = [], failures = [];
  const check = (ok, label) => { if (!ok) throw Error(label); checks.push(label); };
  page.on('pageerror', e => errors.push(e.message)); page.on('requestfailed', r => { if (!r.failure()?.errorText?.includes('ERR_ABORTED')) failures.push(r.url()); });
  await page.evaluate(() => { localStorage.setItem('camera-game-lab-locale', 'ja'); localStorage.removeItem('camera-game-lab-hand-spell-tutorial-demo'); localStorage.removeItem('camera-game-lab-hand-spell-book-v1'); });
  await page.goto(base + '/?qa=hs-' + Date.now() + '#/game/solo-hand-spell');
  await page.waitForFunction(() => document.querySelector('.hs-entry .launch-demo')?.disabled === false);
  await page.evaluate(async () => {
    const registry = await (await fetch('/src/platform/experiments.js')).text(), path = registry.match(/import\("([^"]*handSpell\/view\.js[^"]*)"\)/)[1];
    const { HandSpellView } = await import(path), setup = HandSpellView.prototype.setup;
    HandSpellView.prototype.setup = function (...args) { window.__hs = this; return setup.apply(this, args); };
  });
  for (const size of [{ width: 1440, height: 900 }, { width: 390, height: 844 }, { width: 360, height: 800 }]) {
    await page.setViewportSize(size);
    check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'entry fits ' + size.width);
    check(await page.locator('.hs-cover-dragon').evaluate(i => i.complete && i.naturalWidth > 0), 'Imagegen dragon loads ' + size.width);
    check(await page.locator('.launch-camera').evaluate(b => b.getBoundingClientRect().height >= 44), '44px PLAY target ' + size.width);
    await page.screenshot({ path: `output/playwright/hand-spell-entry-${size.width}.png`, fullPage: true });
  }
  check(await page.evaluate(() => !document.querySelector('.hs-stage video').srcObject && !performance.getEntriesByType('resource').some(e => /\.task|\.wasm/.test(e.name))), 'entry starts no sensors or models');
  await page.locator('.launch-howto').click(); check((await page.locator('.sheet-content').textContent()).includes('The maze of aqua'), 'OpenTracks credit is reachable'); await page.keyboard.press('Escape');
  await page.locator('.platform-locale').click(); check((await page.locator('.hs-tagline').textContent()).includes('Summon your magic'), 'English entry'); await page.locator('.platform-locale').click();
  await page.locator('[data-hs-mode="creator"]').click(); await page.locator('[data-hs-face="HIDE"]').click();
  await page.clock.install(); await page.clock.pauseAt(new Date(await page.evaluate(() => Date.now() + 100)));
  await page.locator('.launch-demo').click(); await page.clock.runFor(50);
  check(await page.evaluate(() => __hs.phase === 'tutorial'), 'first practice opens COPY THIS tutorial');
  await page.locator('[data-hs-sign="ONE"]').click(); await page.clock.runFor(30); check(await page.evaluate(() => __hs.game.signs.length === 0), 'wrong tutorial sign cannot advance');
  await page.locator('[data-hs-sign="TWO"]').click(); await page.clock.runFor(900);
  check(await page.evaluate(() => __hs.game.tutorialStep === 1 && __hs.game.signs.length === 0), 'one sign gives SHING and advances');
  await page.locator('[data-hs-sign="ONE"]').click(); await page.locator('[data-hs-sign="TWO"]').click(); await page.clock.runFor(900);
  check(await page.evaluate(() => __hs.game.tutorialStep === 2), 'two signs teach sequence');
  for (const sign of ['ONE', 'TWO', 'THREE']) await page.locator(`[data-hs-sign="${sign}"]`).click();
  await page.locator('.hs-release').click(); await page.clock.runFor(1250);
  check(await page.evaluate(() => __hs.game.scene === 'tutorial-cast' && __hs.renderer.dragon.complete && __hs.renderer.enemy.complete), 'tutorial casts real Imagegen dragon');
  await page.screenshot({ path: 'output/playwright/hand-spell-tutorial-dragon-360.png', fullPage: true });
  await page.clock.runFor(2100); check(await page.evaluate(() => __hs.phase === 'playing' && __hs.game.elapsed < 200), 'tutorial ends without consuming challenge time');
  await page.clock.runFor(2200); await page.screenshot({ path: 'output/playwright/hand-spell-memory-360.png', fullPage: true });
  await page.clock.runFor(1800); check(await page.evaluate(() => __hs.game.scene === 'input'), 'memory signs disappear at input');
  await page.locator('.hs-stage').focus(); for (const key of ['3', '4', '5']) { await page.keyboard.press(key); await page.clock.runFor(50); }
  check(await page.evaluate(() => __hs.game.signs.join() === 'ONE,TWO,THREE'), 'keyboard seals enter in order');
  await page.keyboard.press('r'); await page.clock.runFor(80); check(await page.evaluate(() => __hs.game.released && __hs.game.signs.length === 3), 'R arms release without another sign');
  await page.locator('.hs-pause').click(); const paused = await page.evaluate(() => __hs.game.elapsed); await page.clock.runFor(1000); check(await page.evaluate(at => __hs.game.elapsed === at, paused), 'pause freezes clock'); await page.locator('.hs-resume').click();
  await page.clock.runFor(await page.evaluate(() => 10400 - __hs.game.elapsed));
  check(await page.evaluate(() => __hs.game.scene === 'cast' && __hs.game.outcome === 'DRAGON_FLAME'), 'PERFECT dragon fires after common anticipation');
  await page.screenshot({ path: 'output/playwright/hand-spell-dragon-360.png', fullPage: true });
  await page.clock.runFor(4700); await page.locator('.hs-result').waitFor();
  check(await page.evaluate(() => __hs.game.result.perfect && __hs.game.result.elapsed === 15000), '15s result is measured');
  check(await page.evaluate(() => !__hs.input.running && !__hs.audio.context && __hs.frameId == null && __hs.tweens.size === 0), 'result releases sensors, audio and GSAP');
  check(await page.evaluate(() => __hs.game.result.creator.frames.length > 100 && __hs.game.result.creator.frames.length <= 182), 'creator frame memory is bounded');
  check((await page.locator('.hs-result').textContent()).includes('PRACTICE'), 'practice source stays visible');
  check((await page.locator('.hs-result .hs-book').textContent()).includes('1 / 10'), 'new discovery registers in book');
  for (const size of [{ width: 1440, height: 900 }, { width: 390, height: 844 }, { width: 360, height: 800 }]) {
    await page.setViewportSize(size); check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'result fits ' + size.width); await page.screenshot({ path: `output/playwright/hand-spell-result-${size.width}.png`, fullPage: true });
  }
  await page.locator('[data-result-action="retry"]').click(); await page.clock.runFor(4100); check(await page.evaluate(() => __hs.phase === 'playing' && __hs.options.creator && __hs.game.scene === 'input'), 'retry preserves CREATOR and skips completed tutorial');
  for (const s of ['ONE', 'TWO']) await page.locator(`[data-hs-sign="${s}"]`).click(); await page.locator('.hs-release').click(); await page.clock.runFor(6500);
  check(await page.evaluate(() => __hs.game.outcome === 'POTATO'), 'skipped seal reveals POTATO after same charge'); await page.screenshot({ path: 'output/playwright/hand-spell-potato-360.png', fullPage: true });
  await page.clock.runFor(4700); await page.locator('.hs-result').waitFor(); check((await page.locator('.hs-result .hs-book').textContent()).includes('2 / 10'), 'failure is collectible');
  await page.locator('.platform-locale').click(); check((await page.locator('.hs-result').textContent()).includes('Discovered spells'), 'English result and book');
  await page.locator('[data-result-action="retry"]').click(); await page.clock.runFor(4100); await page.emulateMedia({ reducedMotion: 'reduce' }); await page.clock.runFor(100); check(await page.evaluate(() => __hs.reducedMotion && __hs.tweens.size === 0), 'live reduced motion clears GSAP');
  await page.locator('.hs-sound').click(); check(await page.locator('.hs-sound').getAttribute('aria-pressed') === 'false', 'SE toggle works');
  await page.locator('.game-music').click(); check(await page.locator('.game-music').getAttribute('aria-pressed') === 'false', 'BGM toggle works');
  await page.locator('.game-back').click(); await page.locator('.lab-feed').waitFor(); check(await page.evaluate(() => !__hs.active && __hs.frameId == null), 'exit tears down active game');
  await page.clock.resume(); await page.goto(base + '/#hand-spell'); await page.waitForFunction(() => document.querySelector('.hs-entry .launch-demo')?.disabled === false); check(await page.title() === 'HAND SPELL · CAMERA GAME LAB', 'alias resolves');
  check(errors.length === 0, 'no browser exceptions: ' + errors.join('; ')); check(failures.length === 0, 'no network failures: ' + failures.join('; '));
  return { checks, errors, failures };
}
