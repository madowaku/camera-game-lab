// Browser interaction checks. Camera accuracy and game feel need human playtests.
async (page) => {
  await page.clock.resume();
  const base = new URL(page.url()).origin, checks = [], errors = [];
  const check = (ok, name) => { if (!ok) throw Error(name); checks.push(name); };
  page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(() => localStorage.setItem('camera-game-lab-locale', 'ja'));
  await page.goto(base + '/?qa=handy-pals#/game/solo-handy-pals');
  await page.clock.resume();
  await page.waitForFunction(() => document.querySelector('.hp-entry .launch-demo')?.disabled === false);
  for (const size of [{ width: 390, height: 844 }, { width: 1440, height: 900 }, { width: 320, height: 640 }]) {
    await page.setViewportSize(size);
    check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'no launch overflow ' + size.width);
    check(await page.locator('.hp-cover img').evaluate(i => i.complete && i.naturalWidth > 0), 'generated cover loads ' + size.width);
    check(await page.locator('.launch-camera').evaluate(e => e.getBoundingClientRect().height >= 44), 'camera touch target ' + size.width);
    if (size.width !== 320) {
      const b = await page.locator('.launch-demo').boundingBox();
      check(b.y + b.height <= size.height, 'both play controls fit first viewport ' + size.width);
    }
    await page.screenshot({ path: `output/playwright/handy-pals-entry-${size.width}.png` });
  }
  check(await page.evaluate(() => !performance.getEntriesByType('resource').some(e => /\.task|\.wasm/.test(e.name)) && !document.querySelector('.hp-stage video').srcObject), 'browsing has no sensor or model requests');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('[data-pal-slot="left"][data-species="bunny"]').click();
  check(await page.locator('[data-pal-slot="left"][data-species="bunny"]').getAttribute('aria-pressed') === 'true', 'independent left character selection');
  await page.locator('[data-pal-slot="left"][data-species="bear"]').click();
  await page.locator('.launch-howto').click();
  check((await page.locator('.sheet-content').textContent()).includes('ハイタッチ'), 'how-to teaches large hand movements');
  check((await page.locator('.sheet-content').textContent()).includes('ぷかぷか'), 'music credit in how-to');
  await page.keyboard.press('Escape');
  check(await page.locator('.launch-howto').evaluate(e => document.activeElement === e), 'how-to returns focus');
  await page.evaluate(async () => {
    const registry = await (await fetch('/src/platform/experiments.js')).text();
    const path = registry.match(/import\("([^"]*\/handy\/view\.js[^"]*)"\)/)[1];
    const { HandyPalsView } = await import(path);
    const render = HandyPalsView.prototype.render;
    HandyPalsView.prototype.render = function (...args) { window.__hpView = this; return render.apply(this, args); };
  });
  await page.clock.install({ time: new Date('2026-10-03T15:15:00Z') });
  await page.locator('.launch-demo').click(); await page.clock.runFor(400);
  check(await page.evaluate(() => __hpView.game.phase === 'intro'), 'practice begins with automatic pop');
  await page.clock.runFor(1300);
  check(await page.evaluate(() => __hpView.game.interaction?.type === 'highFive' && __hpView.game.interaction.automatic), 'automatic greeting needs no player movement');
  await page.clock.runFor(1800);
  check(await page.evaluate(() => __hpView.game.phase === 'playing'), 'free dance starts after intro');
  check(await page.locator('.hp-canvas').evaluate(c => { const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let brown = 0; for (let i = 0; i < d.length; i += 4) if (d[i] > 140 && d[i] < 235 && d[i + 1] < 170 && d[i + 2] < 120) brown++; return brown > 500; }), 'canvas contains rendered bear sprite pixels');
  check(await page.evaluate(async () => {
    const { palPose } = await import('/src/handy/renderer.js');
    const g = __hpView.game, p = { ...g.pals[1], x: .06, y: .28, dance: 'jump', danceAt: g.elapsed - .55 };
    const pose = palPose(p, g);
    return pose.y - pose.lift - pose.size * pose.sy > 150 && pose.x > 140;
  }), 'high edge-of-frame jumps keep the whole bunny below the cue');
  check(await page.evaluate(async () => {
    const { palPose } = await import('/src/handy/renderer.js');
    return [.06, .94].every(x => {
      const g = { ...__hpView.game, phase: 'pose', pals: __hpView.game.pals.map(p => ({ ...p, x })) };
      return palPose(g.pals[1], g).x - palPose(g.pals[0], g).x > 180;
    });
  }), 'final photo keeps both faces visible when hands meet at either frame edge');
  const stage = await page.locator('.hp-stage').boundingBox(), point = (x,y) => ({ x: stage.x + stage.width * x, y: stage.y + stage.height * y });
  const a = point(.28, .72), b = point(.28, .43);
  await page.mouse.move(a.x, a.y); await page.mouse.down();
  await page.mouse.move(b.x, b.y, { steps: 15 }); await page.clock.runFor(300); await page.mouse.up();
  check(await page.evaluate(() => __hpView.demoPoints[0].y < .46), 'drag moves left hand independently');
  await page.clock.runFor(900);
  await page.locator('[data-move="highFive"]').click(); await page.clock.runFor(300);
  check(await page.evaluate(() => __hpView.game.highFives === 1), 'practice proximity produces real high-five');
  await page.clock.runFor(1500); await page.locator('[data-move="hug"]').click(); await page.clock.runFor(200);
  check(await page.evaluate(() => __hpView.game.hugs === 1), 'closer palms produce hug');
  await page.screenshot({ path: 'output/playwright/handy-pals-hug-390.png' });
  await page.clock.runFor(1300); await page.locator('[data-move="spin"]').click(); await page.clock.runFor(1700);
  check(await page.evaluate(() => __hpView.game.actions.has('spin')), 'circle practice control goes through movement-to-turn classification');
  await page.locator('[data-move="sparkle"]').click(); await page.clock.runFor(900);
  check(await page.evaluate(() => __hpView.game.actions.has('sparkle')), 'open palm starts sparkly pose');
  await page.locator('.hp-stage').focus(); const xBefore = await page.evaluate(() => __hpView.demoPoints[1].x);
  await page.keyboard.down('ArrowRight'); await page.clock.runFor(200); await page.keyboard.up('ArrowRight');
  check(await page.evaluate(() => __hpView.demoPoints[1].x) > xBefore, 'arrows move right hand');
  await page.locator('.hp-pause').click(); const pausedAt = await page.evaluate(() => __hpView.game.elapsed); await page.clock.runFor(1400);
  check(await page.evaluate(() => __hpView.game.elapsed) === pausedAt, 'pause freezes round');
  await page.locator('.hp-resume').click(); await page.clock.runFor(100);
  await page.locator('.hp-sound').click(); check(await page.locator('.hp-sound').getAttribute('aria-pressed') === 'false', 'effects can be muted independently');
  await page.locator('.game-music').click(); check(await page.locator('.game-music').getAttribute('aria-pressed') === 'false', 'shared BGM switch works');
  await page.locator('.platform-locale').click(); check((await page.locator('.hp-source').textContent()).includes('PRACTICE'), 'live language switch preserves source');
  await page.evaluate(() => window.dispatchEvent(new Event('blur'))); const hiddenAt = await page.evaluate(() => __hpView.game.elapsed); await page.clock.runFor(900);
  check(await page.evaluate(() => __hpView.game.elapsed) === hiddenAt, 'window blur pauses play');
  await page.locator('.hp-resume').click(); await page.clock.runFor(100);
  const elapsed = await page.evaluate(() => __hpView.game.elapsed); await page.clock.runFor(Math.max(0, 25500 - elapsed * 1000));
  check((await page.locator('.hp-cue strong').textContent()).includes('POSE!'), '25-second pose countdown');
  await page.screenshot({ path: 'output/playwright/handy-pals-pose-390.png' });
  await page.clock.runFor(4600); await page.locator('.hp-result').waitFor();
  check((await page.locator('.hp-result').textContent()).includes('PRACTICE'), 'result labels practice');
  check(!(await page.locator('.hp-result').textContent()).match(/pts|SCORE|点/), 'result contains no score');
  check(await page.locator('.hp-result-photo').evaluate(i => i.complete && i.naturalWidth === 720), 'final photo is real rendered canvas image');
  check(await page.evaluate(() => __hpView.game.result.image instanceof File && __hpView.game.result.image.size > 1000), 'shareable PNG prepared before share click');
  const downloadPromise = page.waitForEvent('download'); await page.locator('.hp-save').click();
  const download = await downloadPromise; await download.saveAs('output/playwright/handy-pals-photo.png');
  check(download.suggestedFilename() === 'handy-pals-todays-duo.png', 'photo download works');
  check(await page.evaluate(() => !__hpView.input.running && !__hpView.audio.context && __hpView.abort.signal.aborted), 'result releases input, effect audio and event listeners');
  await page.screenshot({ path: 'output/playwright/handy-pals-result-390.png' });
  await page.locator('[data-result-action="retry"]').click(); await page.clock.runFor(350);
  check(await page.evaluate(() => __hpView.source === 'demo' && __hpView.game.phase === 'intro' && !__hpView.game.result), 'retry keeps practice and resets round');
  check(await page.locator('.hp-result-photo').getAttribute('src') === null, 'retry discards previous souvenir pixels');
  await page.setViewportSize({ width: 1440, height: 900 }); await page.clock.runFor(3300);
  check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'desktop game has no overflow');
  await page.screenshot({ path: 'output/playwright/handy-pals-playing-1440.png' });
  await page.goto(base + '/#/'); check(errors.length === 0, 'no unhandled browser errors');
  return { checks, errors };
}
