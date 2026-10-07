async page => {
  const base = new URL(page.url()).origin, checks = [], errors = [];
  const check = (ok, label) => { if (!ok) throw new Error(label); checks.push(label); };
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(base + '/?qa=avatar-wings-' + Date.now() + '#/game/solo-body-wings');
  await page.waitForFunction(() => document.querySelector('.bw-entry .launch-demo')?.disabled === false);
  await page.evaluate(async () => {
    const { experiments } = await import('/src/platform/experiments.js');
    const create = await experiments.find(g => g.id === 'solo-body-wings').load(), probe = create(document.createElement('div'), 'ja');
    const prototype = Object.getPrototypeOf(probe), setup = prototype.setup;
    prototype.setup = function (...args) { window.__bw = this; return setup.apply(this, args); }; probe.deactivate();
  });
  await page.locator('[data-creator-mode=creator]').click(); await page.locator('[data-face-mode=AVATAR]').click();
  await page.locator('.launch-demo').click();
  await page.waitForFunction(() => !!window.__bw?.puppet?.canvas);
  check(await page.evaluate(() => __bw.options.faceMode === 'AVATAR' && __bw.puppet.backend === 'canvas' && !__bw.video.srcObject && !__bw.input.running), 'BODY WINGS AVATAR opts into a lightweight shared bird driver');
  check(await page.evaluate(() => document.querySelectorAll('.bw-world canvas').length === 1 && !!__bw.input.onMotionResult), 'bird adds no extra WebGL context; existing inference has an opt-in consumer');
  await page.clock.install(); await page.clock.pauseAt(new Date(await page.evaluate(() => Date.now() + 100)));
  try {
    await page.clock.runFor(4650); await page.locator('.bw-stage').focus(); await page.keyboard.down('ArrowLeft'); await page.clock.runFor(400); await page.keyboard.up('ArrowLeft'); await page.clock.runFor(800);
    check(await page.evaluate(() => __bw.game.phase === 'playing' && __bw.game.tutorialDone), 'existing flight tutorial and game rules still progress');
    await page.locator('.bw-pause').click(); const before = await page.evaluate(() => __bw.game.time); await page.clock.runFor(300);
    check(await page.evaluate(t => __bw.game.time === t, before), 'pause freezes the existing flight'); await page.locator('.bw-pause').click();
    await page.setViewportSize({ width: 390, height: 844 }); await page.clock.runFor(200);
    await page.screenshot({ path: 'output/playwright/avatar-body-wings.png', fullPage: true });
    check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'bird integration has no portrait overflow');
    // Verify sharing of a real PoseLandmarkerResult before the demo's next tick.
    check(await page.evaluate(() => {
      const p = Array.from({ length: 33 }, () => ({ x: .5, y: .5, z: 0, visibility: 1 }));
      p[11].x = .65; p[12].x = .35; p[13].x = .8; p[14].x = .2; p[15].x = .9; p[16].x = .1;
      __bw.input.processResult({ landmarks: [p], segmentationMasks: [] }, performance.now());
      return __bw.puppet.normalized.tracking.pose && __bw.puppet.normalized.body.leftShoulder.z === .5;
    }), 'existing pose result reaches MotionFrame without another recognition');
    check(await page.evaluate(() => {
      const c = document.createElement('canvas'), ctx = c.getContext('2d'), old = ctx.drawImage.bind(ctx); let rawDraws = 0;
      ctx.drawImage = (source, ...args) => { if (source instanceof HTMLVideoElement) rawDraws++; else old(source, ...args); };
      const original = __bw.canvas.getContext.bind(__bw.canvas); __bw.canvas.getContext = () => ctx;
      try { __bw.renderer.draw(__bw.game, { video: __bw.video, input: __bw.input, pose: __bw.raw, demo: false, faceMode: 'AVATAR', avatarCanvas: __bw.puppet.canvas, hybrid: false, width: 270, height: 480 }); }
      finally { __bw.canvas.getContext = original; }
      return rawDraws === 0;
    }), 'camera-mode renderer never draws camera imagery in AVATAR');
    await page.clock.runFor(34000); await page.locator('.bw-result').waitFor();
    check(await page.evaluate(() => __bw.creatorResult?.faceMode === 'AVATAR' && __bw.creatorResult.frames.length > 5 && !__bw.puppet && !__bw.puppetHost && !__bw.input.onMotionResult), 'bird replay survives result while live puppet and input subscription are released');
    await page.locator('[data-result-action=retry]').click(); await page.waitForFunction(() => !!__bw.puppet?.canvas);
    check(await page.evaluate(() => document.querySelectorAll('.avatar-canvas-fallback').length === 1), 'retry mounts one bird');
    await page.locator('.game-back').click();
    check(await page.evaluate(() => !__bw.active && !__bw.puppet && !__bw.visual3d && !__bw.input.onMotionResult), 'exit releases bird and the existing sky');
    check(errors.length === 0, 'BODY WINGS integration has no browser errors');
    return { checks, errors };
  } finally { await page.clock.resume(); }
}
