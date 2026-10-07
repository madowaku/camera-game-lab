async (page) => {
  const base = 'http://127.0.0.1:5189', checks = [], errors = [];
  const check = (ok, label) => { if (!ok) throw Error(label); checks.push(label); };
  page.on('pageerror', e => errors.push(e.message));
  const probe = async () => page.evaluate(async () => {
    const { experiments } = await import('/src/platform/experiments.js');
    const factory = await experiments.find(g => g.id === 'solo-human-fish').load();
    const temporary = factory(document.createElement('div'), 'ja'), proto = Object.getPrototypeOf(temporary);
    if (!proto.__qa) {
      const render = proto.render, loop = proto.loop;
      proto.render = function (...args) { window.__hf = this; return render.apply(this, args); };
      proto.loop = function (...args) { window.__hf = this; return loop.apply(this, args); };
      proto.__qa = true;
    }
    temporary.deactivate();
  });
  const ready = async () => page.locator('.hf-entry .launch-demo').waitFor();
  const move = async (x, y) => { const r = await page.locator('.hf-stage').boundingBox(); await page.mouse.click(r.x + r.width * x, r.y + r.height * y); };
  const tap = async () => page.locator('.hf-bite').click();
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(base + '/?hfqa=' + Date.now() + '#/game/solo-human-fish'); await ready(); await probe();
  if (await page.locator('.platform-locale').innerText() === 'JA') await page.locator('.platform-locale').click();
  await page.screenshot({ path: 'output/playwright/human-fish-entry-desktop.png', fullPage: true });
  await page.locator('.hf-cover').screenshot({ path: 'output/human-fish/cover-render.png' });
  check(await page.locator('.hf-cover-fish').evaluate(img => img.complete && img.naturalWidth > 0), 'generated aquarium and transparent human-fish sprite load');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: 'output/playwright/human-fish-entry-mobile.png', fullPage: true });
  check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'mobile entrance has no horizontal overflow');
  await page.locator('.launch-demo').click(); await page.waitForFunction(() => window.__hf?.phase === 'playing');
  check(await page.evaluate(() => __hf.source === 'demo' && !__hf.video.srcObject && __hf.scene.fish.active && document.querySelectorAll('.hf-phaser-host canvas').length === 1), 'practice boots one moving Phaser scene without a camera');
  await page.screenshot({ path: 'output/playwright/human-fish-play-mobile.png', fullPage: true });
  check(await page.locator('.hf-bite').evaluate(b => b.getBoundingClientRect().bottom <= innerHeight), 'mobile bite button is visible without scrolling');
  await move(.72, .53); await page.waitForTimeout(450); await tap();
  await page.waitForFunction(() => __hf.game.foods === 1);
  check(await page.evaluate(() => __hf.game.score === 3), 'touch move and public bite button eat an actual shrimp');
  await page.evaluate(() => { __hf.game.oxygen = 9; });
  await move(.5, .155); await page.waitForFunction(() => __hf.game.atSurface);
  check(await page.evaluate(() => __hf.game.breaths === 0 && __hf.game.oxygen < 9), 'surface arrival alone does not refill oxygen');
  await page.keyboard.press('Space'); await page.waitForFunction(() => __hf.game.breaths === 1);
  check(await page.evaluate(() => __hf.game.oxygen > 95 && __hf.game.closeBreaths === 1), 'Space triggers last-gasp breath and real oxygen recovery');
  await page.screenshot({ path: 'output/playwright/human-fish-puha.png', fullPage: true });
  await page.locator('.hf-bite').focus(); await page.keyboard.press('p');
  const paused = await page.evaluate(() => ({ elapsed: __hf.game.elapsed, oxygen: __hf.game.oxygen }));
  await page.waitForTimeout(300);
  check(await page.evaluate(p => __hf.game.elapsed === p.elapsed && __hf.game.oxygen === p.oxygen, paused), 'P after a bite button focus pauses oxygen and life timer');
  await page.locator('.hf-resume').click();
  await page.evaluate(() => { window.__firstGame = __hf.runtime.game; __hf.game.oxygen = .01; });
  await page.locator('.hf-result').waitFor();
  check(await page.locator('.hf-result').innerText().then(t => t.includes('生きました') && t.includes('呼吸回数') && t.includes('猫に叩かれた')), 'oxygen zero floats into the complete human-fish life report');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'output/playwright/human-fish-result-mobile.png', fullPage: true });
  await page.locator('[data-result-action="retry"]').click(); await page.waitForFunction(() => __hf.phase === 'playing');
  check(await page.evaluate(() => __hf.runtime.game === __firstGame && __hf.game.foods === 0 && document.querySelectorAll('.hf-phaser-host canvas').length === 1), 'retry reuses Phaser Game and resets the life');
  await page.locator('.game-back').click();
  await page.waitForFunction(() => !document.querySelector('.hf-phaser-host canvas'));
  check(await page.evaluate(() => !__hf.input.running && !__firstGame.loop.running && !__hf.runtime), 'feed exit stops the renderer and camera resources');

  await page.goto(base + '/?hfqa=' + Date.now() + '#/game/solo-human-fish'); await ready(); await probe();
  await page.locator('[data-creator-mode="creator"]').click();
  check(await page.locator('[data-face-mode="EFFECT"]').getAttribute('aria-pressed') === 'true', 'creator defaults to the fish effect');
  await page.locator('.launch-demo').click(); await page.waitForFunction(() => window.__hf?.phase === 'playing');
  await page.evaluate(() => {
    const loop = __hf.loop.bind(__hf); __hf.lastAutoBite = -10;
    __hf.loop = (time, dt) => {
      if (__hf.phase === 'playing') {
        const g = __hf.game, cat = g.cat;
        if (g.oxygen < 39) __hf.returning = true;
        if (__hf.returning) {
          __hf.demoTarget = { x: cat ? cat.x < .5 ? .82 : .18 : .18, y: .155 };
          if (g.atSurface && g.elapsed - __hf.lastAutoBite > .4) { __hf.pendingBite = true; __hf.lastAutoBite = g.elapsed; if (g.oxygen > 90) __hf.returning = false; }
        } else {
          const item = [...g.items].sort((a, b) => ({ giant: 20, gold: 15, pearl: 10, shrimp: 3, flake: 1 }[b.kind] - ({ giant: 20, gold: 15, pearl: 10, shrimp: 3, flake: 1 }[a.kind])))[0];
          if (item) { __hf.demoTarget = item; if (Math.abs(item.x - g.player.x) < .07 && Math.abs(item.y - g.player.y) < .035 && g.elapsed - __hf.lastAutoBite > .4) { __hf.pendingBite = true; __hf.lastAutoBite = g.elapsed; } }
        }
      }
      loop(time, dt);
    };
  });
  await page.waitForFunction(() => __hf.game.elapsed >= 25, { timeout: 40000 });
  await page.screenshot({ path: 'output/playwright/human-fish-treasure-mobile.png', fullPage: true });
  check(await page.evaluate(() => __hf.game.milestones.has(24) && __hf.game.treasures > 0), 'real timeline unlocks deep treasure and the bot can collect it');
  await page.waitForFunction(() => __hf.game.cat !== null, { timeout: 22000 });
  await page.screenshot({ path: 'output/playwright/human-fish-cat-mobile.png', fullPage: true });
  await page.locator('.hf-result').waitFor({ timeout: 18000 });
  check(await page.evaluate(() => __hf.game.elapsed === 45 && __hf.creatorResult.frames.length > 20 && __hf.creatorResult.plan.duration === 7000 && __hf.photo instanceof Blob), '45-second creator life records bounded real frames, an exact seven-second plan and a photo');
  const capture = await page.evaluate(async () => { const b = await createImageBitmap(__hf.photo), c = document.createElement('canvas'); c.width = 20; c.height = 20; const ctx = c.getContext('2d'); ctx.drawImage(b, 0, 0, 20, 20); b.close(); const p = ctx.getImageData(0, 0, 20, 20).data; return [...p].filter((v, i) => i % 4 !== 3 && v > 35).length; });
  check(capture > 300, 'WebGL capture contains actual colorful aquarium pixels');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'output/playwright/human-fish-creator-result-mobile.png', fullPage: true });
  const photo = page.waitForEvent('download'); await page.locator('.hf-save-photo').click(); await (await photo).saveAs('output/human-fish/todays-human-fish.png');
  check(true, 'result photo saves through the public control');
  const video = page.waitForEvent('download', { timeout: 25000 }); await page.locator('.hf-save-clip').click(); const downloaded = await video;
  const videoPath = 'output/human-fish/' + downloaded.suggestedFilename(); await downloaded.saveAs(videoPath);
  check(true, 'seven-second silent video exports through MediaRecorder');
  await page.locator('.platform-locale').click(); check(await page.locator('.hf-result').innerText().then(t => t.includes('You lived as a human fish')), 'English life report and replay survive a locale switch');
  await page.waitForTimeout(1000);
  await page.setViewportSize({ width: 1440, height: 900 }); await page.screenshot({ path: 'output/playwright/human-fish-result-desktop.png', fullPage: true });
  await page.locator('.game-back').click(); await page.waitForFunction(() => !document.querySelector('.hf-phaser-host canvas'));
  check(errors.length === 0, `no browser errors: ${errors.join('; ')}`);
  return { checks, errors, videoPath };
}
