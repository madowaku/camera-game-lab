// Synthetic camera/model inference. Does not claim physical phone validation.
async (page) => {
  const base = new URL(page.url()).origin, checks = [], errors = [];
  page.on('pageerror', e => errors.push(e.message));
  const check = (ok, label) => { if (!ok) throw Error(label); checks.push(label); };
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(base + '/#/feed/solo-maru-magic');
  await page.reload();
  await page.locator('.camera-ui-toggle').waitFor();
  check(!(await page.evaluate(() => performance.getEntriesByType('resource').some(e => e.name.includes('tasks-vision')))), 'MediaPipe is not loaded with the FEED');
  await page.evaluate(async () => {
    const source = await (await fetch('/src/input/bodyInput.js')).text();
    const vision = await import(source.match(/from "([^"]*mediapipe[^"]*)"/)[1]);
    vision.FilesetResolver.forVisionTasks = async () => ({});
    window.__menuPoint = null; window.__tracks = []; window.__requests = 0; window.__closed = 0;
    vision.HandLandmarker.createFromOptions = async () => ({
      detectForVideo: () => ({ landmarks: window.__menuPoint ? [Array.from({ length: 21 }, () => ({ x: 1 - window.__menuPoint.x / innerWidth, y: window.__menuPoint.y / innerHeight }))] : [] }),
      close: () => window.__closed++
    });
    const canvas = document.createElement('canvas'); canvas.width = 390; canvas.height = 844;
    window.__cameraCanvas = canvas;
    const ctx = canvas.getContext('2d');
    window.__cameraTick = setInterval(() => { ctx.fillStyle = '#263825'; ctx.fillRect(0, 0, 390, 844); }, 40);
    window.__mockMedia = async () => {
      window.__requests++;
      const stream = canvas.captureStream(25); window.__tracks.push(...stream.getTracks()); return stream;
    };
    navigator.mediaDevices.getUserMedia = window.__mockMedia;
  });
  const pointAt = async selector => page.locator(selector).evaluate(el => {
    const b = el.getBoundingClientRect(); window.__menuPoint = { x: b.left + b.width / 2, y: b.top + b.height / 2 };
  });
  await page.locator('.camera-ui-toggle').click();
  await page.waitForFunction(() => document.querySelector('.camera-ui-toggle').getAttribute('aria-busy') === 'false' && window.__requests === 1);
  check(await page.locator('.camera-ui-toggle').getAttribute('aria-pressed') === 'true', 'Explicit ON enables camera UI');
  await pointAt('.feed-card:not([inert]) .feed-play');
  await page.waitForFunction(() => document.querySelector('.launch-camera')?.disabled === false);
  check(page.url().includes('/game/solo-maru-magic'), 'AIR TAP navigates from FEED to launch');
  check(await page.evaluate(() => window.__tracks.filter(t => t.readyState === 'live').length) <= 1, 'Menu transitions retain at most one camera stream');
  await page.waitForFunction(() => window.__requests >= 2);
  await pointAt('.launch-demo');
  await page.waitForFunction(() => document.querySelector('.camera-ui').hidden && !document.querySelector('.game-cache').hidden);
  check(await page.evaluate(() => window.__tracks.every(t => t.readyState === 'ended')), 'Menu stream is stopped before gameplay');
  check(await page.evaluate(() => window.__closed >= 2), 'Menu models are released');
  // Draw a circle through the existing touch-practice path.
  await page.locator('.maru-stage').waitFor();
  await page.setViewportSize({ width: 360, height: 668 });
  await page.evaluate(() => window.scrollTo(0, 150));
  const stage = await page.locator('.maru-stage').boundingBox();
  const playScroll = await page.evaluate(() => scrollY);
  const cx = stage.x + stage.width * .5, cy = stage.y + stage.height * .5, r = stage.width * .22;
  await page.mouse.move(cx + r, cy); await page.mouse.down();
  for (let i = 1; i <= 48; i++) { const a = i / 48 * Math.PI * 2; await page.mouse.move(cx + Math.cos(a) * r, cy + Math.sin(a) * r); }
  await page.mouse.up();
  await page.locator('.inline-round-controls').waitFor({ state: 'visible' });
  await page.waitForFunction(() => window.__tracks.some(t => t.readyState === 'live'));
  check(await page.locator('.camera-ui-toggle').getAttribute('aria-pressed') === 'true', 'Opt-in resumes on results');
  const retryBox = await page.locator('[data-inline-action="retry"]').boundingBox();
  const resultStage = await page.locator('.maru-stage').boundingBox();
  check(Math.abs(resultStage.y - stage.y) < 2 && await page.evaluate(() => scrollY) === playScroll, 'MARU completion preserves the canvas and scroll position');
  check(retryBox.y >= 0 && retryBox.y + retryBox.height <= 668, 'Retry is visible on a short phone viewport without scrolling');
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  for (const selector of ['.camera-ui-toggle', '[data-inline-action="retry"]', '[data-inline-action="next"]']) {
    const b = await page.locator(selector).boundingBox();
    check(b.y >= 0 && b.y + b.height <= 668, `Fixed MARU result control stays visible after scrolling: ${selector}`);
  }
  await page.screenshot({ path: 'output/playwright/ui-maru-result.png' });
  await pointAt('[data-inline-action="retry"]');
  await page.waitForFunction(() => document.querySelector('.inline-round-controls').hidden);
  check(await page.evaluate(() => window.__tracks.every(t => t.readyState === 'ended')), 'AIR RETRY releases the menu stream');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('.game-back').click();
  await page.waitForFunction(() => window.__tracks.some(t => t.readyState === 'live'));
  const before = await page.locator('.feed-card:not([inert])').getAttribute('data-id');
  for (const y of [640, 575, 500, 430]) { await page.evaluate(y => { window.__menuPoint = { x: 35, y }; }, y); await page.waitForTimeout(110); }
  await page.waitForFunction(id => document.querySelector('.feed-card:not([inert])').dataset.id !== id, before);
  const after = await page.locator('.feed-card:not([inert])').getAttribute('data-id');
  for (const y of [365, 300, 235]) { await page.evaluate(y => { window.__menuPoint = { x: 35, y }; }, y); await page.waitForTimeout(110); }
  check(await page.locator('.feed-card:not([inert])').getAttribute('data-id') === after, 'AIR SCROLL advances one card per gesture');
  await page.evaluate(() => { window.__menuPoint = null; });
  await page.locator('.camera-ui-toggle').click();
  check(await page.evaluate(() => window.__tracks.every(t => t.readyState === 'ended')), 'OFF releases camera tracks');
  await page.evaluate(() => { navigator.mediaDevices.getUserMedia = async () => { throw new DOMException('Denied', 'NotAllowedError'); }; });
  await page.locator('.camera-ui-toggle').click();
  await page.waitForFunction(() => document.querySelector('.camera-ui-toggle').getAttribute('aria-pressed') === 'false');
  check(await page.locator('.camera-ui-status').textContent().then(t => t.includes('タッチ')), 'Denied permission leaves touch available');
  check(await page.locator('.feed-card:not([inert]) .feed-play').isEnabled(), 'Touch PLAY remains usable after denial');
  // Permission resolves after leaving the FEED: the late stream must be stopped.
  await page.evaluate(() => {
    navigator.mediaDevices.getUserMedia = async () => {
      const stream = await window.__mockMedia();
      await new Promise(resolve => { window.__resolvePermission = resolve; }); return stream;
    };
  });
  await page.locator('.camera-ui-toggle').click();
  await page.waitForFunction(() => typeof window.__resolvePermission === 'function');
  await page.locator('[data-nav="explore"]').click();
  await page.locator('.explore-page').waitFor();
  await page.evaluate(() => window.__resolvePermission());
  await page.waitForFunction(() => window.__tracks.every(t => t.readyState === 'ended'));
  check(await page.evaluate(() => window.__tracks.every(t => t.readyState === 'ended')), 'Late permission after navigation never leaks a stream');
  // Camera-based MARU result borrows its existing model, preserving 700ms retry.
  await page.evaluate(() => { navigator.mediaDevices.getUserMedia = window.__mockMedia; window.__menuPoint = null; window.__cameraCanvas.width = 1280; window.__cameraCanvas.height = 720; });
  await page.goto(base + '/#/game/solo-maru-magic');
  await page.waitForFunction(() => document.querySelector('.launch-camera')?.disabled === false && window.__tracks.some(t => t.readyState === 'live'));
  await pointAt('.launch-camera');
  await page.waitForFunction(() => document.querySelector('.maru-stage')?.dataset.source === 'camera' && document.querySelector('.camera-ui').hidden);
  await page.waitForFunction(() => window.__tracks.some(t => t.readyState === 'live'));
  await page.evaluate(() => { window.__menuPoint = { x: 270, y: 422 }; });
  await page.waitForTimeout(450);
  for (let i = 1; i <= 36; i++) {
    await page.evaluate(i => { const a = i / 36 * Math.PI * 2; window.__menuPoint = { x: 195 + Math.cos(a) * 75, y: 422 + Math.sin(a) * 75 }; }, i);
    await page.waitForTimeout(55);
  }
  await page.locator('.inline-round-controls').waitFor({ state: 'visible' });
  const cameraRequests = await page.evaluate(() => window.__requests);
  check(await page.evaluate(() => window.__tracks.filter(t => t.readyState === 'live').length) === 1, 'MARU camera result has exactly one camera');
  await pointAt('[data-inline-action="retry"]');
  await page.waitForFunction(() => document.querySelector('.inline-round-controls').hidden);
  check(await page.evaluate(() => window.__requests) === cameraRequests, 'MARU AIR RETRY reuses its camera and model');
  await page.waitForTimeout(700);
  check(await page.evaluate(() => document.querySelector('.maru-stage').dataset.phase === 'ready' && document.querySelector('.maru-cue').dataset.ready !== 'true'), 'Holding the fixed retry position cannot arm a new circle');
  await page.evaluate(() => { window.__menuPoint = { x: 270, y: 422 }; });
  await page.waitForFunction(() => document.querySelector('.maru-cue').dataset.ready === 'true');
  check(true, 'Moving to a new start point rearms MARU normally');
  await page.locator('.game-back').click();
  await page.waitForFunction(() => !document.querySelector('.camera-ui').hidden);
  await page.evaluate(() => { window.__menuPoint = null; });
  await page.locator('.camera-ui-toggle').click();
  await page.waitForFunction(() => window.__tracks.every(t => t.readyState === 'ended'));
  // A regular timed result reacquires menu input, then supports retry and next.
  await page.goto(base + '/#/game/guardian-spirit');
  await page.waitForFunction(() => document.querySelector('.launch-demo')?.disabled === false);
  await page.locator('.camera-ui-toggle').click();
  await page.waitForFunction(() => window.__tracks.some(t => t.readyState === 'live'));
  await page.locator('.launch-demo').click();
  await page.clock.install();
  await page.clock.runFor(42000); await page.clock.resume();
  await page.locator('.platform-result').waitFor({ state: 'visible' });
  await page.waitForFunction(() => window.__tracks.some(t => t.readyState === 'live'));
  const regularRetry = await page.locator('[data-result-action="retry"]').boundingBox();
  check(regularRetry.y + regularRetry.height <= 844, 'Regular result retry fits without scrolling');
  await pointAt('[data-result-action="retry"]');
  await page.waitForFunction(() => document.querySelector('.platform-result').hidden);
  check(await page.evaluate(() => window.__tracks.every(t => t.readyState === 'ended')), 'Regular AIR RETRY stops the menu camera before play');
  await page.evaluate(() => { window.__menuPoint = null; });
  await page.clock.runFor(42000); await page.clock.resume();
  await page.locator('.platform-result').waitFor({ state: 'visible' });
  await page.waitForFunction(() => window.__tracks.some(t => t.readyState === 'live'));
  await pointAt('[data-result-action="next"]');
  await page.locator('.lab-feed').waitFor();
  check(page.url().includes('/feed/') && !page.url().endsWith('guardian-spirit'), 'Regular AIR NEXT returns to the next game');
  await page.evaluate(() => { window.__menuPoint = null; });
  await page.locator('.camera-ui-toggle').click();
  await page.waitForFunction(() => window.__tracks.every(t => t.readyState === 'ended'));
  await page.evaluate(() => clearInterval(window.__cameraTick));
  check(!errors.length, `No page errors: ${errors.join('; ')}`);
  return { checks, errors, synthetic: true };
}
