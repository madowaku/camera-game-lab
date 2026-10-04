async page => {
  const base = new URL(page.url()).origin, checks = [], errors = [], glWarnings = [];
  const check = (ok, label) => { if (!ok) throw Error(label); checks.push(label); };
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (/too many active webgl|INVALID_OPERATION/i.test(message.text())) glWarnings.push(message.text()); });
  try {
  const threeRequested = () => page.evaluate(() => performance.getEntriesByType('resource').some(r => /three(?:\.js|_.*\.js)|visual3d\/|\/threeScene\.js/.test(r.name)));
  await page.goto(base + '/#/', { waitUntil: 'networkidle' });
  check(!(await threeRequested()), 'Feed requests no Three modules');
  await page.goto(base + '/#/game/solo-ghost-trail');
  await page.locator('.launch-demo').waitFor();
  await page.waitForFunction(() => !document.querySelector('.launch-demo').disabled);
  await page.locator('.launch-demo').click();
  check(!(await threeRequested()), '2D GHOST TRAIL practice requests no Three modules');
  await page.goto(base + '/#/game/solo-body-wings');
  await page.waitForFunction(() => !document.querySelector('.bw-entry .launch-demo')?.disabled);
  check(!(await threeRequested()), 'BODY WINGS entrance does not load Three');
  await page.evaluate(async () => {
    const registry = await (await fetch('/src/platform/experiments.js')).text();
    const path = registry.match(/import\("([^"]*wings\/view\.js[^"]*)"\)/)[1];
    const { BodyWingsView } = await import(path), setup = BodyWingsView.prototype.setup;
    BodyWingsView.prototype.setup = function(...args) {
      window.__bw = this; this.saveReceipt = () => {}; return setup.apply(this, args);
    };
  });
  await page.clock.install();
  await page.clock.pauseAt(new Date(await page.evaluate(() => Date.now() + 100)));
  await page.setViewportSize({ width: 360, height: 800 });
  await page.locator('.launch-demo').click();
  check(await page.evaluate(async () => { await __bw.visual3dReady; return !!__bw.threeScene; }), 'shared Three layer initializes');
  check(await page.locator('.bw-world canvas').count() === 1, 'one WebGL canvas per activation');
  check(await page.evaluate(() => !__bw.video.srcObject && !__bw.input.running), 'Demo opens no camera');
  await page.clock.runFor(4650);
  await page.locator('.bw-stage').focus(); await page.keyboard.down('ArrowLeft');
  await page.clock.runFor(300); await page.keyboard.up('ArrowLeft'); await page.clock.runFor(700);
  check(await page.evaluate(() => __bw.game.phase === 'playing' && __bw.game.tutorialDone), 'keyboard left completes original tutorial');
  await page.locator('.bw-pause').click();
  const paused = await page.evaluate(() => ({ time: __bw.game.time, calls: __bw.visual3d.renderer.info.render.frame }));
  await page.clock.runFor(500);
  check(await page.evaluate(p => __bw.game.time === p.time && __bw.visual3d.renderer.info.render.frame === p.calls, paused), 'pause freezes game and WebGL rendering');
  for (const size of [{ width: 360, height: 800 }, { width: 720, height: 1280 }, { width: 1440, height: 900 }, { width: 800, height: 360 }]) {
    await page.setViewportSize(size); await page.clock.runFor(50);
    check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'no horizontal overflow at ' + size.width + 'x' + size.height);
    check(await page.evaluate(() => {
      const v = __bw.visual3d, box = document.querySelector('.bw-world').getBoundingClientRect();
      return Math.abs(v.camera.aspect - Math.round(box.width) / Math.round(box.height)) < .001;
    }), 'projection resizes at ' + size.width + 'x' + size.height);
    await page.screenshot({ path: `output/playwright/body-wings-three-${size.width}x${size.height}.png`, fullPage: true });
  }
  check(await page.evaluate(() => {
    const v = __bw.visual3d, gl = v.renderer.getContext(), pixel = new Uint8Array(4);
    v.render(performance.now(), { force: true }); gl.readPixels(5, 5, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
    return pixel[3] > 0 && pixel[2] > 50;
  }), 'real WebGL framebuffer contains sky pixels');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.waitForFunction(() => __bw.reducedMotion && __bw.visual3d.reducedMotion);
  await page.clock.runFor(100);
  check(await page.evaluate(() => __bw.reducedMotion && __bw.visual3d.reducedMotion && __bw.threeScene.trails.every(t => t.count === 0) && __bw.threeScene.impact.geometry.drawRange.count === 8), 'live reduced motion works while paused');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.setViewportSize({ width: 360, height: 800 });
  await page.locator('.bw-pause').click(); await page.clock.runFor(50);
  check(await page.evaluate(p => __bw.game.time > p.time, paused), 'resume advances original flight');
  await page.screenshot({ path: 'output/playwright/body-wings-three-flight-360.png', fullPage: true });
  await page.evaluate(() => window.dispatchEvent(new Event('blur'))); const hiddenTime = await page.evaluate(() => __bw.game.time);
  await page.clock.runFor(300); check(await page.evaluate(t => __bw.game.time === t, hiddenTime), 'background blur freezes flight');
  await page.evaluate(() => window.dispatchEvent(new Event('focus'))); await page.clock.runFor(50);
  check(await page.evaluate(t => __bw.game.time > t, hiddenTime), 'foreground resumes flight');

  // Drive only the existing demo input, not game state, through a complete round.
  while (await page.evaluate(() => __bw.phase !== 'result')) {
    await page.evaluate(async () => {
      const { RING_LINE } = await import('/src/games/bodyWings.js');
      __bw.pointerTilt = Math.max(-.3, Math.min(.3, ((RING_LINE[__bw.game.attempts]?.x ?? .5) - __bw.game.x) * 2));
    });
    await page.clock.runFor(100);
    if (await page.evaluate(() => __bw.game.boosted && !window.__boostShot)) {
      await page.screenshot({ path: 'output/playwright/body-wings-three-boost-360.png', fullPage: true });
      await page.evaluate(() => { window.__boostShot = true; });
    }
  }
  check(await page.evaluate(() => __bw.game.result.seconds === 30 && __bw.game.result.boosts > 0), 'original 30-second course and BOOST finish normally');
  check(await page.evaluate(() => !__bw.visual3d && !__bw.threeScene && __bw.raf == null), 'result releases Three through platform lifecycle');
  await page.locator('[data-result-action="retry"]').click();
  check(await page.evaluate(async () => { await __bw.visual3dReady; return !!__bw.visual3d; }), 'RETRY creates a fresh renderer');
  const beforeLoss = await page.evaluate(() => __bw.game.time);
  await page.evaluate(() => __bw.visual3d.renderer.forceContextLoss());
  await page.waitForFunction(() => !!__bw.visual3dError);
  await page.clock.runFor(100);
  check(await page.evaluate(t => !__bw.visual3d && __bw.game.time > t && !document.querySelector('.bw-world canvas'), beforeLoss), 'context loss disposes WebGL and continues Canvas2D');
  check(await page.evaluate(() => __bw.canvas.getContext('2d').getImageData(5, 5, 1, 1).data[3] === 255), 'fallback restores opaque full 2D sky');
  await page.screenshot({ path: 'output/playwright/body-wings-three-fallback-360.png', fullPage: true });

  for (let i = 0; i < 10; i++) {
    await page.locator('.game-back').click();
    await page.locator('.lab-feed').waitFor();
    check(await page.evaluate(() => !__bw.active && !__bw.visual3d && !__bw.threeScene && __bw.raf == null && !__bw.video.srcObject), 'exit cleanup ' + (i + 1));
    await page.evaluate(() => { location.hash = '#/game/solo-body-wings'; });
    await page.waitForFunction(() => document.querySelector('.bw-entry .launch-demo')?.disabled === false);
    await page.locator('.launch-demo').click();
    check(await page.evaluate(async () => { await __bw.visual3dReady; return !!__bw.visual3d && document.querySelectorAll('.bw-world canvas').length === 1; }), 'cached controller reactivation ' + (i + 1));
  }
  await page.locator('.game-back').click();
  await page.locator('.lab-feed').waitFor();
  check(errors.length === 0, 'no uncaught browser exceptions: ' + errors.join('; '));
  check(glWarnings.length === 0, 'no WebGL context exhaustion or double-loss warnings');
  await page.clock.resume();
  return { checks, errors };
  } finally { await page.clock.resume(); }
}
