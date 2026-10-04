// Synthetic body landmarks with actual canvas MediaStream tracks. No human
// accuracy claim, and no physical camera request.
async (page) => {
  await page.clock.resume(); const base = new URL(page.url()).origin, checks = [], errors = [];
  const check = (ok, label) => { if (!ok) throw Error(label); checks.push(label); }; page.on('pageerror', e => errors.push(e.message));
  await page.setViewportSize({ width: 390, height: 844 }); await page.goto(base + '/?qa=counter-cam-camera-' + Date.now() + '#/game/solo-counter-cam');
  await page.waitForFunction(() => document.querySelector('.cc-entry .launch-camera')?.disabled === false);
  await page.evaluate(async () => {
    const registry = await (await fetch('/src/platform/experiments.js')).text(), viewPath = registry.match(/import\("([^"]*counterCam\/view\.js[^"]*)"\)/)[1];
    const viewSource = await (await fetch(viewPath)).text(), inputPath = viewSource.match(/from ["']([^"']*input\/counterCamInput\.js[^"']*)["']/)[1];
    const inputSource = await (await fetch(inputPath)).text(), vision = await import(inputSource.match(/from ["']([^"']*mediapipe[^"']*)["']/)[1]);
    const { CounterCamView } = await import(viewPath), { CounterCamInput } = await import(inputPath), render = CounterCamView.prototype.render, start = CounterCamInput.prototype.start;
    CounterCamView.prototype.render = function (...args) { window.__cc = this; return render.apply(this, args); };
    CounterCamInput.prototype.start = function () { Object.defineProperty(this.video, 'currentTime', { configurable: true, get: () => performance.now() / 1000 }); return start.call(this); };
    window.__neutral = () => {
      const lm = Array.from({ length: 33 }, () => ({ x: .5, y: .5, z: 0, visibility: 1, presence: 1 }));
      lm[0].y = .32; lm[7].x = .45; lm[8].x = .55; lm[2].x = .47; lm[5].x = .53;
      for (const [i,x,y] of [[11,.35,.48],[12,.65,.48],[13,.32,.6],[14,.68,.6],[15,.38,.49],[16,.62,.49]]) lm[i] = { ...lm[i],x,y };
      return lm;
    };
    window.__lm = __neutral(); window.__requests = 0; window.__closes = 0; window.__tracks = []; window.__delegates = [];
    vision.FilesetResolver.forVisionTasks = async () => ({});
    vision.PoseLandmarker.createFromOptions = async (_, options) => {
      window.__options = options; __delegates.push(options.baseOptions.delegate); if (__delegates.length === 1) throw Error('QA GPU fallback');
      return { close: () => __closes++, detectForVideo: () => ({ landmarks: __lm ? [__lm] : [] }) };
    };
    const board = document.createElement('canvas'); board.width = 720; board.height = 1280; const c = board.getContext('2d');
    c.fillStyle = '#a64aa1'; c.fillRect(0,0,720,1280);
    c.fillStyle = '#e8bd95'; c.beginPath(); c.arc(360,410,80,0,Math.PI*2); c.fill(); c.fillStyle = '#31546a'; c.fillRect(240,620,240,600);
    setInterval(() => { c.fillStyle = '#a64aa1'; c.fillRect(0,0,10,10); },50);
    const stream = () => { const s = board.captureStream(30); __tracks.push(...s.getTracks()); return s; };
    navigator.mediaDevices.getUserMedia = async constraints => { __requests++; window.__constraints = constraints;
      if (__deny) throw new DOMException('QA denial','NotAllowedError'); if (__delay) return new Promise(resolve => { window.__grant = () => resolve(stream()); }); return stream(); };
    window.__deny = window.__delay = false;
  });
  await page.locator('[data-creator-mode="creator"]').click(); await page.locator('[data-face-mode="HIDE"]').click();
  await page.locator('.launch-camera').click(); await page.waitForFunction(() => window.__cc?.input.running); await page.clock.install();
  await page.evaluate(() => { __lm[11].x = .12; __lm[12].x = .88; }); await page.clock.runFor(900);
  check(await page.evaluate(() => __cc.calibration === 0 && __cc.game.elapsed === 0), 'too-close shoulders cannot start calibration');
  check((await page.locator('.cc-hint').textContent()).includes('STEP BACK'), 'distance gives STEP BACK');
  await page.evaluate(() => { __lm = __neutral(); }); await page.clock.runFor(750);
  check(await page.evaluate(() => __cc.calibration === 1), 'neutral establishes calibration baseline');
  await page.evaluate(() => { __lm[15].z = -.4; }); await page.clock.runFor(100);
  check(await page.evaluate(() => __cc.calibration === 2), 'forward-depth camera punch confirms calibration');
  await page.evaluate(() => { __lm = __neutral(); __lm.forEach(p => p.x += .12); }); await page.clock.runFor(100);
  await page.evaluate(() => { __lm = __neutral(); __lm.forEach(p => p.x -= .12); }); await page.clock.runFor(100);
  await page.evaluate(() => { __lm = __neutral(); }); await page.clock.runFor(650);
  check(await page.evaluate(() => __cc.phase === 'playing' && __cc.options.faceMode === 'HIDE'), 'actual camera sways start HIDE creator');
  check(await page.evaluate(() => __constraints.audio === false && __constraints.video.facingMode.exact === 'user'), 'front camera only; no microphone');
  check(await page.evaluate(() => __delegates.slice(0,2).join() === 'GPU,CPU' && __options.numPoses === 1 && !__options.outputSegmentationMasks), 'CPU fallback and single lightweight pose');
  const punchCount = await page.evaluate(() => __cc.game.hits); await page.keyboard.press('Space'); await page.keyboard.press('ArrowLeft'); await page.clock.runFor(50);
  check(await page.evaluate(n => __cc.game.hits === n && __cc.currentMotion.head === 0, punchCount), 'demo controls cannot affect camera round');
  await page.screenshot({ path:'output/playwright/counter-cam-camera-hide-390.png',fullPage:true });
  const until = async stage => { for (let i=0;i<100;i++) { if(await page.evaluate(s=>__cc.game.stage===s,stage)) return; await page.clock.runFor(50); } throw Error('stage timeout '+stage); };
  await until('telegraph'); await page.clock.runFor(650); await page.evaluate(() => { __lm = __neutral(); __lm.forEach(p => p.x += .12); }); await until('counter');
  await page.clock.runFor(170); await page.evaluate(() => { __lm[15].z = -.4; }); await page.clock.runFor(100);
  check(await page.evaluate(() => __cc.game.perfectCounters === 1 && __cc.game.enemyHp === 560), 'landmarks trigger dodge then perfect counter');
  await page.evaluate(() => { __lm = __neutral(); __lm[15].visibility = 0; }); await page.clock.runFor(600);
  const lostAt = await page.evaluate(() => __cc.game.elapsed); await page.clock.runFor(500);
  check(await page.evaluate(at => __cc.inputLost && __cc.game.paused && __cc.game.elapsed === at,lostAt), 'missing wrist pauses active clock');
  await page.evaluate(() => { __lm = null; }); await page.clock.runFor(300);
  check(await page.evaluate(() => { const [r,g,b] = __cc.canvas.getContext('2d').getImageData(20,180,1,1).data; return !(r > 100 && b > 100 && g < 110); }), 'HIDE does not draw raw purple camera when face is missing');
  await page.screenshot({ path:'output/playwright/counter-cam-tracking-lost-390.png',fullPage:true });
  await page.evaluate(() => { __lm = __neutral(); }); await page.clock.runFor(350);
  check(await page.evaluate(() => !__cc.inputLost && !__cc.game.paused && __cc.game.hits === 1), 'stable recovery resumes with no false punch');
  await until('telegraph'); await page.evaluate(() => { __lm[11].x = .12; __lm[12].x = .88; }); await page.clock.runFor(100);
  check(await page.evaluate(() => __cc.inputLost && __cc.game.paused), 'moving too close pauses immediately');
  await page.evaluate(() => { __lm = __neutral(); }); await page.clock.runFor(350);
  check(await page.evaluate(() => __cc.game.stage === 'idle' && __cc.game.stageTime < 200), 'recovery discards attack and gives a full fresh warning');
  for (let i=0;i<3;i++) {
    await page.evaluate(()=>{__lm=__neutral();}); await until('telegraph'); await page.clock.runFor(650);
    await page.evaluate(()=>{__lm=__neutral();__lm.forEach(p=>p.x+=.12);}); await until('counter'); await page.clock.runFor(170);
    await page.evaluate(()=>{__lm[15].z=-.4;}); await page.clock.runFor(100);
  }
  check(await page.evaluate(()=>__cc.game.special===100&&__cc.game.counters===4),'camera counters fill special gauge');
  await page.evaluate(()=>{__lm=__neutral();}); await page.clock.runFor(550);
  await page.evaluate(()=>{__lm[15].z=-.4;}); await page.clock.runFor(100);
  check(await page.evaluate(()=>__cc.game.history.some(e=>e.type==='MEGA PUNCH')&&__cc.game.special===0&&__cc.game.enemyHp===80),'camera retraction and forward punch trigger charged mega');
  await page.locator('.game-back').click(); await page.locator('.lab-feed').waitFor();
  check(await page.evaluate(() => __tracks.every(t=>t.readyState === 'ended') && __closes===1 && !__cc.creator), 'exit closes tracks, model and recording');
  await page.clock.resume(); await page.evaluate(() => { __delay=true; location.hash='#/game/solo-counter-cam'; }); await page.waitForFunction(()=>document.querySelector('.launch-camera')?.disabled===false);
  await page.locator('.launch-camera').click(); await page.waitForFunction(()=>typeof __grant==='function'); await page.locator('.game-back').click(); await page.locator('.lab-feed').waitFor();
  await page.evaluate(()=>{ __grant(); __delay=false; }); await page.waitForFunction(()=>__tracks.every(t=>t.readyState==='ended'));
  check(await page.evaluate(()=>!__cc.active && !__cc.video.srcObject && __closes===2), 'late permission after navigation cannot revive camera');
  await page.evaluate(()=>{ __deny=true; location.hash='#/game/solo-counter-cam'; }); await page.waitForFunction(()=>document.querySelector('.launch-camera')?.disabled===false); await page.locator('.launch-camera').click(); await page.locator('.cc-demo').waitFor();
  check((await page.locator('.cc-overlay h2').textContent()).includes('使えません'), 'camera denial provides clear recovery');
  await page.locator('.cc-demo').click(); await page.clock.install(); await page.clock.runFor(750);
  check(await page.evaluate(()=>__cc.source==='demo' && __cc.calibration===1 && __tracks.every(t=>t.readyState==='ended')), 'camera denial recovers to separate practice');
  await page.locator('.game-back').click(); await page.locator('.lab-feed').waitFor(); await page.clock.resume();
  check(errors.length===0,'no browser exceptions'); return {checks,errors};
}
