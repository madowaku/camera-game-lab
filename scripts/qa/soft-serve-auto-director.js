// Native browser video encoding plus synthetic camera/input. No physical face
// or human game-feel verdict is inferred from this test.
async (page) => {
  const base = new URL(page.url()).origin, checks = [], errors = [];
  const check = (ok, name) => { if (!ok) throw Error(name); checks.push(name); };
  page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto(base + '/?qa=auto-director#/game/solo-soft-serve');
  await page.waitForFunction(() => document.querySelector('.launch-demo')?.disabled === false);
  await page.evaluate(async () => {
    const source = await (await fetch('/src/softServe/view.js')).text();
    const { CreatorMode } = await import(source.match(/from "([^"]*\/creator\/CreatorMode\.js[^"]*)"/)[1]);
    const { SoftServeGame } = await import(source.match(/from "([^"]*\/games\/softServe\.js[^"]*)"/)[1]);
    const { SoftServeInput } = await import(source.match(/from "([^"]*\/input\/softServeInput\.js[^"]*)"/)[1]);
    const step = SoftServeGame.prototype.step, compose = CreatorMode.prototype.compose, finish = CreatorMode.prototype.finish, stop = SoftServeInput.prototype.stop;
    window.__costs = []; window.__cameraRequests = 0; window.__tracks = [];
    SoftServeGame.prototype.step = function (...args) { window.__game = this; return step.apply(this, args); };
    CreatorMode.prototype.compose = function (...args) { window.__creator = this; const start = performance.now(); const value = compose.apply(this, args); __costs.push(performance.now() - start); return value; };
    CreatorMode.prototype.finish = async function (...args) { const result = await finish.apply(this, args); window.__clip = result; return result; };
    SoftServeInput.prototype.start = async function () {
      __cameraRequests++;
      const camera = document.createElement('canvas'); camera.width = 540; camera.height = 960;
      const c = camera.getContext('2d'), stream = camera.captureStream(20);
      __tracks.push(...stream.getTracks()); this.session = { stream }; this.video.srcObject = stream;
      const started = performance.now();
      this.qaTimer = setInterval(() => {
        const game = window.__game, t = performance.now() - started, reaction = game?.result;
        c.fillStyle = reaction ? '#7dc9b5' : '#cad9cc'; c.fillRect(0, 0, 540, 960);
        c.fillStyle = '#517b69'; c.fillRect(160, 500, 220, 460);
        c.fillStyle = '#d6aa8c'; c.beginPath(); c.ellipse(270, 355, 115, 156, 0, 0, Math.PI * 2); c.fill();
        c.fillStyle = '#483b34'; c.fillRect(212, 314, 22, 12); c.fillRect(301, 314, 22, 12);
        c.fillStyle = '#ad5358'; c.beginPath(); c.ellipse(270, 438, reaction ? 40 : 24, reaction ? 28 : 12, 0, 0, Math.PI * 2); c.fill();
        const face = { left: .285, right: .715, top: .2, bottom: .53, eyeLeft: { x: .41, y: .33 }, eyeRight: { x: .59, y: .33 }, mouth: { x: .5, y: .454 } };
        let x = .5 + Math.sin(t / 230) * .075;
        if (game?.amount >= 3 || game?.phase === 'eat') x = .8;
        const tip = game?.tip ?? { x: .8, y: .5 };
        this.onFrame({ hand: { x: 1 - x, y: .72 }, mouth: { x: 1 - tip.x, y: tip.y }, open: t % 600 < 220, face });
      }, 50);
      await this.video.play();
    };
    SoftServeInput.prototype.stop = function () { clearInterval(this.qaTimer); return stop.call(this); };
  });
  await page.locator('[data-creator-mode="creator"]').click();
  check(await page.locator('.creator-notice').innerText().then(t => t.includes('15') && t.includes('端末')), 'privacy and automatic clips are explained before camera');
  await page.locator('[data-face-mode="ORIGINAL"]').click();
  await page.waitForFunction(() => window.__game?.amount > 1);
  check(await page.evaluate(() => __creator.events.events.some(e => e.type === 'FIRST_SUCCESS')), 'game events reach director');
  await page.screenshot({ path: 'output/playwright/autodirector-live-360.png' });
  await page.waitForFunction(() => __creator.heroTimestamp !== undefined, { timeout: 20000 });
  const hero = await page.evaluate(() => __creator.heroTimestamp);
  await page.waitForTimeout(1800);
  check(await page.evaluate(() => __tracks[0].readyState === 'live'), 'camera remains live during reaction');
  check(await page.locator('.ss-view').evaluate(e => e.classList.contains('is-reaction')), 'reaction UI becomes quiet');
  await page.screenshot({ path: 'output/playwright/autodirector-reaction-360.png' });
  await page.locator('.creator-replay').waitFor({ timeout: 10000 });
  check(await page.evaluate(() => __tracks.every(t => t.readyState === 'ended')), 'camera is released after reaction');
  check(await page.evaluate(hero => __clip.events.find(e => e.type === 'HERO').timestamp === hero, hero), 'HERO timestamp is preserved');
  check(await page.evaluate(hero => __clip.frames.some(f => f.at <= hero - 4800) && __clip.frames.at(-1).at >= hero + 2900, hero), 'real composited frames cover HERO preparation and reaction');
  await page.waitForFunction(() => !!__clip.files['15'] && !!__clip.files['7'], { timeout: 35000 });
  const clips = await page.evaluate(async () => {
    const data = {};
    for (const format of ['15', '7']) {
      const file = __clip.files[format], video = document.createElement('video'), url = URL.createObjectURL(file);
      video.muted = true; video.src = url;
      await new Promise((resolve, reject) => { video.onloadedmetadata = resolve; video.onerror = reject; });
      // WebM's streaming header can report Infinity; seeking resolves duration.
      if (!Number.isFinite(video.duration)) { video.currentTime = 100; await new Promise(resolve => video.onseeked = resolve); }
      data[format] = { name: file.name, bytes: file.size, mime: file.type, duration: video.duration, width: video.videoWidth, height: video.videoHeight, plan: __clip.plans[format].duration };
      URL.revokeObjectURL(url);
    }
    return data;
  });
  for (const format of ['15', '7']) {
    check(clips[format].bytes > 10000, 'native ' + format + ' SEC video is nonempty');
    check(clips[format].duration >= clips[format].plan / 1000 - .3 && clips[format].duration <= Number(format) + .05, format + ' SEC encoded duration preserves the whole edit and fits limit');
    check(clips[format].width / clips[format].height === 9 / 16, format + ' SEC actual video is portrait');
  }
  await page.locator('[data-creator-action="7"]').click();
  check(await page.locator('.creator-replay-video').isVisible(), '7 SEC encoded video can replay');
  await page.locator('[data-creator-action="replay"]').click();
  const count = await page.evaluate(() => JSON.parse(localStorage.getItem('camera-game-lab-soft-serve-rounds')).length);
  await page.locator('[data-creator-action="15"]').click();
  const download = page.waitForEvent('download');
  await page.locator('[data-creator-action="save"]').click();
  await (await download).saveAs('output/playwright/autodirector-15.' + (clips['15'].mime.includes('mp4') ? 'mp4' : 'webm'));
  check(await page.evaluate(() => JSON.parse(localStorage.getItem('camera-game-lab-soft-serve-rounds')).length) === count, 'replay/save never duplicate round results');
  for (const size of [{ width: 360, height: 800 }, { width: 720, height: 1280 }, { width: 1440, height: 900 }]) {
    await page.setViewportSize(size);
    check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'no horizontal overflow ' + size.width);
    await page.screenshot({ path: 'output/playwright/autodirector-result-' + size.width + '.png' });
  }
  await page.locator('[data-result-action="retry"]').click();
  await page.waitForFunction(() => window.__creator.recording && __game.phase === 'serve');
  check(await page.evaluate(() => __cameraRequests === 2), 'retry returns to the same camera creator mode');
  await page.locator('.ss-creator-face select').selectOption('HIDE');
  check(await page.evaluate(() => __creator.faceMode === 'HIDE'), 'face mode can change during play');
  await page.locator('.game-back').click();
  check(await page.evaluate(() => __tracks.every(t => t.readyState === 'ended') && __creator.recorder.allFrames().length === 0), 'leaving releases stream and frame buffers');
  const compositionMs = await page.evaluate(() => { const sorted = [...__costs].sort((a, b) => a - b); return { mean: __costs.reduce((a, b) => a + b, 0) / __costs.length, p95: sorted[Math.floor(sorted.length * .95)], max: sorted.at(-1) }; });
  await page.goto(base + '/?qa=auto-play#/game/solo-soft-serve');
  await page.locator('.launch-demo').click();
  await page.waitForTimeout(400);
  check(await page.locator('.creator-scene').isHidden(), 'normal PLAY has no recorder canvas');
  await page.locator('.game-back').click();
  check(errors.length === 0, 'no browser errors');
  return { checks, clips, errors, syntheticCamera: true, physicalDevice: false, compositionMs };
}
