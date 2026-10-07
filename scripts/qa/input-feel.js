// Synthetic browser verification. Human camera feel and Android latency need
// the separate A401OP playtest; this script never requests a physical camera.
async (page) => {
  const base = new URL(page.url()).origin, checks = [], errors = [];
  const check = (ok, name) => { if (!ok) throw new Error(name); checks.push(name); };
  page.on('pageerror', error => errors.push(error.message));
  await page.clock.resume();
  for (const variant of ['A', 'B']) {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto(`${base}/?qa=feel-${Date.now()}&debug=1&feel=${variant}#/game/duo-palm-pong`);
    await page.waitForFunction(() => document.querySelector('.launch-demo')?.disabled === false);
    await page.evaluate(async () => {
      const { experiments } = await import('/src/platform/experiments.js');
      const factory = await experiments.find(game => game.id === 'duo-palm-pong').load();
      const probe = factory(document.createElement('div'), 'ja'), proto = Object.getPrototypeOf(probe), draw = proto.draw;
      proto.draw = function (...args) { window.__pp = this; return draw.apply(this, args); }; probe.deactivate();
    });
    await page.locator('.launch-demo').click();
    await page.waitForFunction(() => window.__pp?.game.ready && !!__pp.scene?.ball);
    check(await page.evaluate(v => __pp.paddleFeel.variant === v && __pp.scene.debugEnabled, variant), `URL selects ${variant} and enables HUD`);
    check(await page.evaluate(() => ['RAW', 'STABLE', 'FEEL'].every(label => __pp.scene.debugText.text.includes(label))), `three debug layers displayed ${variant}`);
    check(await page.evaluate(() => !__pp.video.srcObject && !__pp.input.running), `practice never opens a camera ${variant}`);
    const positions = await page.evaluate(async () => {
      __pp.updateDemo = () => {};
      __pp.demoPoints[0].x = 5.5;
      await new Promise(requestAnimationFrame); await new Promise(requestAnimationFrame);
      return { truth: __pp.game.paddles[0].x, visual: __pp.scene.paddles[0].x / __pp.scene.sx,
        stable: __pp.feelDebug.stable[0].x, feel: __pp.feelDebug.feel[0].x };
    });
    check(Math.abs(positions.truth - 5.5) < 1e-8 && positions.truth === positions.stable, `collision truth follows the input immediately ${variant}`);
    check(Math.abs(positions.visual - positions.feel) < 1e-8 && Math.abs(positions.visual - positions.truth) <= .080001, `sprite uses bounded visual output ${variant}`);
    if (variant === 'A') check(Math.abs(positions.visual - positions.truth) < 1e-8, 'A retains exact original paddle position');
    else check(Math.abs(positions.visual - positions.truth) > 1e-5, 'B actually applies presentation smoothing');
    await page.locator('.pp-start').click(); await page.waitForFunction(() => __pp.game.phase === 'playing');
    for (const size of [{ width: 1280, height: 720 }, { width: 390, height: 844 }]) {
      await page.setViewportSize(size); await page.waitForTimeout(100);
      check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `no overflow ${variant} ${size.width}`);
      check(await page.evaluate(() => __pp.scene.debugText.width <= __pp.scene.scale.width && __pp.canvas.width > 0), `HUD and canvas fit ${variant} ${size.width}`);
      await page.screenshot({ path: `output/playwright/input-feel-palm-${variant}-${size.width}.png`, fullPage: true });
    }
    await page.locator('.pp-pause').click();
    const frozen = await page.evaluate(() => ({ time: __pp.game.elapsed, x: __pp.scene.paddles[0].x }));
    await page.waitForTimeout(120);
    check(await page.evaluate(before => __pp.game.elapsed === before.time && __pp.scene.paddles[0].x === before.x, frozen), `pause freezes clock and follower ${variant}`);
    // Loss/recovery goes through the actual bridge and render loop. No inertia
    // can keep a stale visible hand moving or draw a sweep across reacquisition.
    await page.evaluate(() => { __pp.demoPoints[0].present = false; });
    await page.waitForFunction(() => __pp.paddleFeel.points[0]?.present === false);
    check(await page.evaluate(() => __pp.feelDebug.stable[0].present === false && __pp.scene.paddles[0].alpha === .25), `loss immediately marks visual unavailable ${variant}`);
    await page.evaluate(() => Object.assign(__pp.demoPoints[0], { x: 3.5, present: true, continuous: false }));
    await page.waitForFunction(() => __pp.paddleFeel.points[0]?.present && __pp.paddleFeel.points[0].x === 3.5);
    check(await page.evaluate(() => __pp.paddleFeel.points[0].x === __pp.game.paddles[0].x), `reacquisition resets visual position ${variant}`);
    await page.setViewportSize({ width: 1280, height: 720 });
    const camera = await page.evaluate(async () => {
      __pp.source = 'camera';
      const landmarks = x => Array.from({ length: 21 }, () => ({ x, y: .5 }));
      for (let i = 0; i < 5; i++) {
        __pp.input.processResult({ landmarks: [landmarks(.75), landmarks(.25)] }, performance.now());
        await new Promise(resolve => setTimeout(resolve, 35));
      }
      return { raw: __pp.feelDebug.raw, stable: __pp.feelDebug.stable, feel: __pp.feelDebug.feel, truth: __pp.game.paddles };
    });
    check(camera.raw.every(p => p?.present) && camera.stable.every(p => p?.present) && camera.feel.every(p => p?.present), `synthetic camera reaches all three layers ${variant}`);
    check(Math.abs(camera.raw[0].x - 4) < 1e-8 && Math.abs(camera.truth[0].x - camera.stable[0].x) < 1e-8, `camera is mirrored once and preserves collision truth ${variant}`);
    await page.evaluate(() => __pp.input.processResult({ landmarks: [] }, performance.now()));
    await page.waitForFunction(() => __pp.feelDebug.stable.every(p => !p.present));
    check(await page.evaluate(() => __pp.paddleFeel.points.every(p => !p?.present)), `missing camera hands never extrapolate ${variant}`);
    await page.locator('.game-back').click();
    await page.waitForFunction(() => !__pp.active);
    check(await page.evaluate(() => !__pp.active && __pp.paddleFeel.points.every(p => p === null)), `exit resets feel state ${variant}`);
  }
  await page.goto(`${base}/?qa=feel-${Date.now()}&debug=1#tilt-turbo`);
  await page.waitForFunction(() => document.querySelector('.launch-demo')?.disabled === false);
  await page.evaluate(async () => {
    const { experiments } = await import('/src/platform/experiments.js');
    const factory = await experiments.find(game => game.id === 'solo-tilt-turbo').load();
    const probe = factory(document.createElement('div'), 'ja'), proto = Object.getPrototypeOf(probe), draw = proto.draw;
    proto.draw = function (...args) { window.__tt = this; return draw.apply(this, args); }; probe.deactivate();
  });
  await page.locator('.launch-demo').click(); await page.waitForFunction(() => window.__tt?.currentMotion?.tracked);
  await page.keyboard.down('ArrowLeft'); await page.waitForTimeout(200); await page.keyboard.up('ArrowLeft');
  check(await page.evaluate(() => __tt.game.x < -.5), 'TILT TURBO keeps responsive left steering');
  for (const size of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(size); await page.waitForTimeout(100);
    check(await page.locator('.tt-feel-debug').isVisible(), `TILT debug visible ${size.width}`);
    check((await page.locator('.tt-feel-debug').textContent()).includes('STABLE'), `TILT three-layer debug ${size.width}`);
    check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `TILT no overflow ${size.width}`);
    await page.screenshot({ path: `output/playwright/input-feel-tilt-${size.width}.png`, fullPage: true });
  }
  await page.evaluate(() => {
    __tt.source = 'camera'; __tt.signal.neutral = 0;
    __tt.motion = { ...__tt.signal.sample(15, performance.now()), at: performance.now() };
  });
  await page.waitForFunction(() => document.querySelector('.tt-feel-debug').textContent.includes('steering'));
  check(await page.evaluate(() => __tt.motion.debug.raw === 15 && __tt.motion.debug.stable === __tt.motion.roll), 'camera signal exposes raw roll, stable roll and final steering');
  await page.waitForTimeout(300);
  check((await page.locator('.tt-feel-debug').textContent()).includes('RAW    LOST'), 'TILT stale camera input is marked LOST in HUD');
  await page.locator('.game-back').click();
  await page.waitForFunction(() => !__tt.active);
  check(await page.evaluate(() => !__tt.active && !__tt.input.running), 'TILT exit stops input');
  check(errors.length === 0, `no browser exceptions: ${errors.join('; ')}`);
  return { checks, errors };
}
