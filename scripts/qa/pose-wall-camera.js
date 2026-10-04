// Synthetic upper-body landmarks with real MediaStream tracks. No human claims.
async (page) => {
  await page.clock.resume(); const base = new URL(page.url()).origin, checks = [], errors = [];
  const check = (ok, label) => { if (!ok) throw Error(label); checks.push(label); }; page.on('pageerror', e => errors.push(e.message));
  await page.setViewportSize({ width: 390, height: 844 }); await page.goto(base + '/?qa=pose-wall-camera-' + Date.now() + '#/game/solo-pose-wall');
  await page.waitForFunction(() => document.querySelector('.pw-entry .launch-camera')?.disabled === false);
  await page.evaluate(async () => {
    const registry = await (await fetch('/src/platform/experiments.js')).text(), viewPath = registry.match(/import\("([^"]*poseWall\/view\.js[^"]*)"\)/)[1];
    const viewSource = await (await fetch(viewPath)).text(), inputPath = viewSource.match(/from ["']([^"']*input\/poseWallInput\.js[^"']*)["']/)[1];
    const inputSource = await (await fetch(inputPath)).text(), vision = await import(inputSource.match(/from ["']([^"']*mediapipe[^"']*)["']/)[1]);
    const { PoseWallView } = await import(viewPath), { PoseWallInput } = await import(inputPath), render = PoseWallView.prototype.render, start = PoseWallInput.prototype.start;
    PoseWallView.prototype.render = function (...args) { window.__pw = this; return render.apply(this, args); };
    PoseWallInput.prototype.start = function () { Object.defineProperty(this.video, 'currentTime', { configurable: true, get: () => performance.now() / 1000 }); return start.call(this); };
    const { makePose, POSES } = await import('/src/poseWall/poses.js'); window.__poses = POSES;
    window.__lmFor = index => {
      const pose = makePose(POSES[index].angles, { aspect: 720 / 1280 }), lm = Array.from({ length: 33 }, () => ({ x:.5, y:.5, visibility:0 }));
      const map = p => ({ x:1-p.x, y:p.y, visibility:1 }); lm[0] = map(pose.nose);
      pose.arms.forEach((a,i) => { lm[11+i]=map(a.shoulder); lm[13+i]=map(a.elbow); lm[15+i]=map(a.wrist); }); return lm;
    };
    window.__lm = __lmFor(0); window.__requests = 0; window.__closes = 0; window.__tracks = []; window.__delegates = [];
    vision.FilesetResolver.forVisionTasks = async () => ({});
    vision.PoseLandmarker.createFromOptions = async (_, options) => {
      window.__options = options; __delegates.push(options.baseOptions.delegate); if (__delegates.length === 1) throw Error('QA GPU fallback');
      return { close: () => __closes++, detectForVideo: () => ({ landmarks: __lm ? [__lm] : [] }) };
    };
    const board = document.createElement('canvas'); board.width = 720; board.height = 1280; const c = board.getContext('2d');
    c.fillStyle='#e0efcb'; c.fillRect(0,0,720,1280); c.fillStyle='#e8bd95'; c.beginPath(); c.arc(360,670,65,0,Math.PI*2); c.fill(); c.fillStyle='#4075be'; c.fillRect(290,790,140,490);
    window.__paint = setInterval(() => { c.fillStyle='#e0efcb'; c.fillRect(0,0,10,10); }, 50);
    const stream = () => { const s = board.captureStream(30); __tracks.push(...s.getTracks()); return s; };
    navigator.mediaDevices.getUserMedia = async constraints => { __requests++; window.__constraints = constraints; if (window.__deny) throw new DOMException('QA denial','NotAllowedError'); if (window.__delay) return new Promise(resolve => { window.__grant = () => resolve(stream()); }); return stream(); };
  });
  await page.locator('.launch-camera').click(); await page.waitForFunction(() => window.__pw?.input.running); await page.clock.install(); await page.clock.runFor(650);
  check(await page.evaluate(() => __pw.phase === 'running' && __pw.game.elapsed < .3), 'face plus shoulders automatically starts first wall after READY');
  check(await page.evaluate(() => __constraints.audio === false && __constraints.video.facingMode.exact === 'user'), 'front camera without microphone');
  check(await page.evaluate(() => __delegates.slice(0,2).join() === 'GPU,CPU' && __options.numPoses === 1 && __options.outputSegmentationMasks === false), 'PoseLandmarker fallback and lightweight single-body options');
  const beforeKey = await page.evaluate(() => JSON.stringify(__pw.pose)); await page.keyboard.press('5'); check(await page.evaluate(() => JSON.stringify(__pw.pose)) === beforeKey, 'practice pose keys cannot control camera input');
  await page.evaluate(() => { __lm[15].visibility=0; }); await page.clock.runFor(110);
  check(await page.evaluate(() => __pw.pose.arms[0].wrist != null && !__pw.inputLost), 'temporary wrist loss interpolates without stopping');
  await page.clock.runFor(140); check(await page.evaluate(() => __pw.pose.arms[0].wrist == null), 'wrist interpolation expires');
  check((await page.locator('.pw-footer p').textContent()).includes('腕'), 'missing wrist gives arm-in-frame guide');
  await page.evaluate(() => { __lm=__lmFor(0); }); await page.clock.runFor(100);
  await page.evaluate(() => { __lm=null; }); await page.clock.runFor(650); const lostAt=await page.evaluate(() => __pw.game.elapsed); await page.clock.runFor(400);
  check(await page.evaluate(at => __pw.inputLost && __pw.game.elapsed === at, lostAt), 'core tracking loss pauses the active clock');
  await page.evaluate(() => { __lm=__lmFor(0); }); await page.clock.runFor(300); check(await page.evaluate(() => !__pw.inputLost && !__pw.game.paused), 'stable core landmarks automatically recover');
  for (let i=0;i<5;i++) {
    await page.evaluate(index => { __lm=__lmFor(index); },i);
    const end=i*3+2.1, current=await page.evaluate(() => __pw.game.elapsed); await page.clock.runFor(Math.max(0,Math.ceil((end-current)*1000)));
    check(await page.evaluate(index => __pw.game.walls[index]?.rank === 'PERFECT',i), 'tracked '+i+' pose graded PERFECT');
    if (i<4) { const next=i*3+3.08, at=await page.evaluate(() => __pw.game.elapsed); await page.clock.runFor(Math.max(0,Math.ceil((next-at)*1000))); }
  }
  await page.screenshot({ path:'output/playwright/pose-wall-camera-390.png', fullPage:true });
  await page.clock.runFor(1000); await page.locator('.pw-result').waitFor();
  check(await page.evaluate(() => __tracks.every(t=>t.readyState==='ended') && __closes===1 && __pw.game.result.score===100), 'camera result releases real tracks and model');
  await page.clock.resume(); await page.locator('.game-back').click(); await page.locator('.lab-feed').waitFor();
  await page.evaluate(() => { __delay=true; location.hash='#/game/solo-pose-wall'; }); await page.waitForFunction(() => document.querySelector('.launch-camera')?.disabled===false);
  await page.locator('.launch-camera').click(); await page.waitForFunction(() => typeof __grant==='function'); await page.locator('.game-back').click(); await page.locator('.lab-feed').waitFor();
  await page.evaluate(() => { __grant(); __delay=false; }); await page.waitForFunction(() => __tracks.every(t=>t.readyState==='ended'));
  check(await page.evaluate(() => !__pw.active && !__pw.video.srcObject && __closes===2), 'late camera permission after navigation is cancelled and released');
  await page.evaluate(() => { __deny=true; location.hash='#/game/solo-pose-wall'; }); await page.waitForFunction(() => document.querySelector('.launch-camera')?.disabled===false); await page.locator('.launch-camera').click();
  await page.locator('.pw-demo').waitFor(); check((await page.locator('.pw-overlay h2').textContent()).includes('使えません'), 'denied camera gives useful recovery');
  await page.locator('.pw-demo').click(); await page.clock.install(); await page.clock.runFor(650);
  check(await page.evaluate(() => __pw.source==='demo' && __pw.phase==='running' && __tracks.every(t=>t.readyState==='ended')), 'denied camera recovers to camera-free practice');
  await page.locator('.game-back').click(); await page.locator('.lab-feed').waitFor(); await page.clock.resume();
  check(errors.length===0, 'no browser exceptions'); return { checks, errors };
}
