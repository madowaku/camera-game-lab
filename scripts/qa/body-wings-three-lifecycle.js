async page => {
  const base = new URL(page.url()).origin, checks = [], errors = [];
  const check = (ok, label) => { if (!ok) throw Error(label); checks.push(label); };
  page.on('pageerror', e => errors.push(e.message));
  let releaseImport, reachedImport;
  const barrier = new Promise(resolve => { releaseImport = resolve; });
  const reached = new Promise(resolve => { reachedImport = resolve; });
  await page.route('**/src/wings/threeScene.js*', async route => { reachedImport(); await barrier; await route.continue(); });
  try {
    await page.goto(base + '/#/game/solo-body-wings');
    await page.waitForFunction(() => document.querySelector('.bw-entry .launch-demo')?.disabled === false);
    await page.evaluate(async () => {
      const registry = await (await fetch('/src/platform/experiments.js')).text();
      const path = registry.match(/import\("([^"]*wings\/view\.js[^"]*)"\)/)[1];
      const { BodyWingsView } = await import(path), setup = BodyWingsView.prototype.setup;
      BodyWingsView.prototype.setup = function(...args) { window.__bw = this; this.saveReceipt = () => {}; return setup.apply(this, args); };
    });
    await page.locator('.launch-demo').click(); await reached;
    await page.evaluate(() => { window.__oldReady = __bw.visual3dReady; });
    await page.locator('.game-back').click(); await page.locator('.lab-feed').waitFor();
    check(await page.locator('.bw-world canvas').count() === 0, 'leave during pending import creates no renderer');
    await page.evaluate(() => { location.hash = '#/game/solo-body-wings'; });
    await page.waitForFunction(() => document.querySelector('.bw-entry .launch-demo')?.disabled === false);
    await page.locator('.launch-demo').click(); releaseImport();
    check(await page.evaluate(async () => {
      const old = await __oldReady, current = await __bw.visual3dReady;
      return old === null && !!current && document.querySelectorAll('.bw-world canvas').length === 1;
    }), 'late import completion cannot resurrect an old activation');
    await page.unroute('**/src/wings/threeScene.js*');
    check(await page.evaluate(() => {
      const v = __bw.visual3d, time = __bw.game.time, now = performance.now();
      for (let i = 1; i <= 100; i++) v.render(now + i * 40);
      return v.quality.id === 'low' && v.renderer.getPixelRatio() === 1 &&
        __bw.threeScene.trails.every(t => t.visiblePoints === 12) && __bw.game.time === time;
    }), 'slow-frame samples lower DPR and trail budget without stepping the game');
    await page.evaluate(() => { window.__oldRenderer = __bw.visual3d.renderer; window.__oldContext = __oldRenderer.getContext(); });
    await page.locator('.game-back').click(); await page.locator('.lab-feed').waitFor();
    check(await page.evaluate(() => __oldContext.isContextLost() && __oldRenderer.info.memory.geometries === 0 && !__bw.threeScene && __bw.raf == null), 'deactivation releases context, geometry and view RAF');

    await page.evaluate(() => {
      window.__getContext = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function(type, ...args) { return /^webgl/.test(type) ? null : __getContext.call(this, type, ...args); };
      location.hash = '#/game/solo-body-wings';
    });
    await page.waitForFunction(() => document.querySelector('.bw-entry .launch-demo')?.disabled === false);
    await page.locator('.launch-demo').click();
    check(await page.evaluate(async () => { await __bw.visual3dReady; return !!__bw.visual3dError && !__bw.visual3d && !document.querySelector('.bw-world canvas'); }), 'WebGL initialization failure uses full Canvas2D');
    await page.waitForFunction(() => __bw.game.phase === 'transform' || __bw.game.phase === 'tutorial');
    check(await page.evaluate(() => __bw.game.time >= 500 && __bw.canvas.getContext('2d').getImageData(5, 5, 1, 1).data[3] === 255), 'failed WebGL does not block demo gameplay');
    await page.evaluate(() => { HTMLCanvasElement.prototype.getContext = __getContext; __bw.startDemo(); });
    check(await page.evaluate(async () => { await __bw.visual3dReady; return !!__bw.visual3d && !__bw.visual3dError; }), 'new activation retries a transient WebGL failure');
    check(await page.evaluate(async () => {
      const { BodyWingsThreeScene } = await import('/src/wings/threeScene.js');
      const update = BodyWingsThreeScene.prototype.update, counts = new Map();
      BodyWingsThreeScene.prototype.update = function() {
        this.root.traverse(object => {
          for (const resource of [object.geometry, object.material].filter(Boolean)) {
            if (counts.has(resource)) continue;
            counts.set(resource, 0); resource.addEventListener('dispose', () => counts.set(resource, counts.get(resource) + 1));
          }
        });
        throw new Error('Injected initial scene render failure');
      };
      try {
        __bw.startDemo(); await __bw.visual3dReady;
        return !__bw.visual3d && !__bw.threeScene && counts.size > 10 && [...counts.values()].every(n => n === 1);
      } finally { BodyWingsThreeScene.prototype.update = update; }
    }), 'initial scene render failure releases every installed resource exactly once');
    await page.locator('.game-back').click(); await page.locator('.lab-feed').waitFor();

    await page.goto(base + '/scripts/qa/body-wings.html');
    await page.locator('#run').click();
    await page.waitForFunction(() => /checks passed|FAIL/.test(document.querySelector('#report').textContent), null, { timeout: 60000 });
    const cameraReport = await page.locator('#report').textContent();
    check(!cameraReport.includes('FAIL') && cameraReport.includes('24 checks passed'), '24 synthetic camera / face privacy / CREATOR / denial checks pass with Three enabled');
    await page.screenshot({ path: 'output/playwright/body-wings-three-camera-checks.png', fullPage: true });

    await page.goto(base + '/#/game/solo-hand-spell');
    await page.waitForFunction(() => document.querySelector('.hs-entry .launch-demo')?.disabled === false);
    await page.locator('.launch-demo').click(); await page.locator('.hs-stage .three-visual-layer').waitFor();
    check(await page.locator('.hs-stage .three-visual-layer').count() === 1, 'HAND SPELL still creates the same shared renderer');
    await page.locator('.game-back').click(); await page.locator('.lab-feed').waitFor();
    check(await page.locator('.hs-stage .three-visual-layer').count() === 0, 'HAND SPELL still releases shared renderer');
    check(errors.length === 0, 'no uncaught browser exceptions: ' + errors.join('; '));
    return { checks, cameraReport, errors };
  } finally { releaseImport(); await page.unroute('**/src/wings/threeScene.js*'); }
}
