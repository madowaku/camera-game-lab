async page => {
  await page.clock.resume(); await page.emulateMedia({ reducedMotion: 'no-preference' });
  const base = new URL(page.url()).origin, checks = [];
  const check = (ok, label) => { if (!ok) throw Error(label); checks.push(label); };
  await page.evaluate(() => { localStorage.setItem('camera-game-lab-hand-spell-tutorial-demo', 'done'); localStorage.setItem('camera-game-lab-locale', 'ja'); });
  const scenarios = [
    [1, ['FIST', 'ONE', 'PALM'], 'THUNDER_GOD'], [2, ['TWO', 'PALM', 'FIST'], 'ABSOLUTE_ZERO'],
    [0, ['ONE', 'TWO', 'FIST'], 'TINY_FIRE'], [0, ['THREE', 'TWO', 'ONE'], 'SELF_BLAST'],
    [0, ['ONE', 'ONE', 'ONE'], 'CHICK_SWARM'], [0, ['ONE', 'TWO', 'THREE', 'FIST'], 'GIANT_HAND'],
    [0, ['PALM', 'THREE', 'TWO'], 'FISH_STORM'], [0, [], 'SAD_SMOKE'],
  ];
  for (const [target, signs, outcome] of scenarios) {
    await page.goto(base + '/?qa=hs-outcome-' + outcome + '#/game/solo-hand-spell');
    await page.waitForFunction(() => document.querySelector('.hs-entry .launch-demo')?.disabled === false);
    await page.evaluate(async () => {
      const registry = await (await fetch('/src/platform/experiments.js')).text(), path = registry.match(/import\("([^"]*handSpell\/view\.js[^"]*)"\)/)[1];
      const { HandSpellView } = await import(path), setup = HandSpellView.prototype.setup;
      HandSpellView.prototype.setup = function (...args) { window.__hs = this; return setup.apply(this, args); };
    });
    await page.setViewportSize({ width: 390, height: 844 }); await page.locator('.hs-spell-picker select').selectOption(String(target));
    await page.clock.install(); await page.clock.pauseAt(new Date(await page.evaluate(() => Date.now() + 100)));
    await page.locator('.launch-demo').click(); await page.clock.runFor(4100);
    for (const sign of signs) { await page.locator(`[data-hs-sign="${sign}"]`).click(); await page.clock.runFor(40); }
    if (signs.length) await page.locator('.hs-release').click();
    await page.clock.runFor(await page.evaluate(() => 10700 - __hs.game.elapsed));
    check(await page.evaluate(id => __hs.game.scene === 'cast' && __hs.game.outcome === id, outcome), 'actual input casts ' + outcome);
    await page.screenshot({ path: `output/playwright/hand-spell-${outcome.toLowerCase()}-390.png`, fullPage: true });
    const pixels = await page.locator('.hs-canvas').evaluate(c => { const a = c.getContext('2d').getImageData(0, 0, 540, 960).data; let colored = 0; for (let i = 0; i < a.length; i += 4 * 23) if (a[i] + a[i + 1] + a[i + 2] > 140) colored++; return colored; });
    check(pixels > 120, 'nonblank effect pixels for ' + outcome);
    await page.clock.runFor(4400); await page.locator('.hs-result').waitFor();
    check(await page.evaluate(id => __hs.game.result.spell === id && __hs.game.result.creator === null, outcome), 'PLAY result records ' + outcome + ' without replay frames');
    await page.clock.resume();
  }
  check((await page.locator('.hs-result .hs-book').textContent()).includes('10 / 10'), 'three perfect spells and all seven misfires fill SPELL BOOK');
  await page.goto(base + '/?qa=hs-export#/game/solo-hand-spell'); await page.waitForFunction(() => document.querySelector('.hs-entry .launch-demo')?.disabled === false);
  await page.locator('[data-hs-mode="creator"]').click(); await page.locator('[data-hs-face="HIDE"]').click();
  await page.clock.install(); await page.clock.pauseAt(new Date(await page.evaluate(() => Date.now() + 100))); await page.locator('.launch-demo').click(); await page.clock.runFor(4100);
  for (const sign of ['ONE', 'TWO', 'THREE']) await page.locator(`[data-hs-sign="${sign}"]`).click(); await page.locator('.hs-release').click(); await page.clock.runFor(11100); await page.locator('.hs-result').waitFor();
  await page.clock.resume(); const downloadPromise = page.waitForEvent('download'); await page.locator('.hs-save').click(); const download = await downloadPromise;
  await download.saveAs('output/playwright/' + download.suggestedFilename()); check(/^hand-spell-dragon_flame-7s\.(webm|mp4)$/.test(download.suggestedFilename()), 'seven-second CREATOR video downloads');
  check((await page.locator('.hs-export-status').textContent()).includes('保存'), 'export reports success');
  await page.locator('.game-back').click(); return { checks, download: download.suggestedFilename() };
}
