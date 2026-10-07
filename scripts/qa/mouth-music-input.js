// Injected landmarks exercise the real mouth signal/state/projection pipeline.
// No actual camera, model inference or physical latency claims.
async (page) => {
  const checks = [], errors = [];
  const check = (ok, label) => { if (!ok) throw Error(label); checks.push(label); };
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('http://127.0.0.1:5298/?debug=1#/game/tech-mouth-music');
  await page.waitForFunction(() => !document.querySelector('.launch-demo')?.disabled);
  await page.evaluate(() => { window.__mm = document.querySelector('.mm-view').parentElement.__mouthMusic; });
  await page.getByRole('button', { name: 'カメラなしの練習', exact: true }).click();
  await page.waitForFunction(() => __mm.phase === 'countdown');
  await page.evaluate(() => {
    __mm.source = 'camera';
    Object.defineProperty(__mm.video, 'videoWidth', { configurable: true, value: 640 });
    Object.defineProperty(__mm.video, 'videoHeight', { configurable: true, value: 480 });
    window.__mouth = 'closed';
    window.__feed = setInterval(() => {
      const points = Array.from({ length: 478 }, () => ({ x: .5, y: .5, z: 0 }));
      points[10] = { x: .5, y: .15 }; points[152] = { x: .5, y: .85 };
      points[234] = { x: .2, y: .5 }; points[454] = { x: .8, y: .5 };
      points[61] = { x: .42, y: .58 }; points[291] = { x: .58, y: .58 };
      const gap = __mouth === 'open' ? .09 : .002;
      points[13] = { x: .5, y: .58 - gap / 2 }; points[14] = { x: .5, y: .58 + gap / 2 };
      const faceLandmarks = __mouth === 'missing' ? [] : __mouth === 'multiple' ? [points, points] : [points];
      __mm.input.processResult({ faceLandmarks }, performance.now());
    }, 50);
  });
  await page.waitForFunction(() => __mm.phase === 'playing' && __mm.game.armed);
  check(await page.evaluate(() => __mm.raw.state === 'CLOSED' && __mm.currentSample.mouth && !__mm.inputLost), 'real face geometry, MouthState and mirrored cover projection accept closed-mouth input');
  await page.waitForFunction(() => __mm.game.notes.some(n => __mm.game.distance(n, __mm.game.mouth) < .08));
  await page.evaluate(() => { __mouth = 'open'; });
  await page.waitForFunction(() => __mm.game.eaten === 1);
  check(await page.evaluate(() => __mm.raw.state === 'OPEN' && __mm.dispatchMs !== null && __mm.audio.lead.activeVoices > 0), 'CLOSED → OPEN from landmarks dispatches Tone in the real view loop');
  await page.waitForTimeout(1600);
  check(await page.evaluate(() => __mm.game.eaten === 1), 'held-open face input does not repeat');
  await page.evaluate(() => { __mouth = 'missing'; });
  await page.waitForFunction(() => __mm.inputLost && __mm.game.paused);
  const at = await page.evaluate(() => __mm.game.elapsed);
  await page.waitForTimeout(200);
  check(await page.evaluate(t => __mm.game.elapsed === t && __mm.audio.paused, at), 'face loss freezes time and music');
  await page.evaluate(() => { __mouth = 'open'; });
  await page.waitForFunction(() => !__mm.inputLost && !__mm.game.paused);
  await page.waitForTimeout(150);
  check(await page.evaluate(() => __mm.game.eaten === 1 && !__mm.game.armed), 'reacquiring an open mouth does not manufacture a bite');
  await page.evaluate(() => { __mouth = 'multiple'; });
  await page.waitForFunction(() => __mm.inputLost);
  check(await page.evaluate(() => __mm.raw.faces === 2), 'multiple faces are rejected by the existing signal');
  await page.evaluate(() => { clearInterval(__feed); __mm.source = 'demo'; });
  await page.locator('.game-back').click();
  await page.goto('http://127.0.0.1:5298/?debug=1#/game/tech-mouth-music');
  await page.waitForFunction(() => !document.querySelector('.launch-camera')?.disabled);
  await page.evaluate(() => {
    window.__mm = document.querySelector('.mm-view').parentElement.__mouthMusic;
    __mm.input.start = async () => { throw new DOMException('Synthetic permission denial', 'NotAllowedError'); };
  });
  await page.getByRole('button', { name: 'PLAY ↗', exact: true }).click();
  await page.waitForFunction(() => __mm.phase === 'error');
  check(await page.evaluate(() => !__mm.audio.toneContext && !__mm.input.running && !__mm.raf), 'denied camera cancels the already-unlocked audio and exposes recovery');
  await page.locator('.mm-demo').click();
  await page.waitForFunction(() => __mm.phase === 'countdown' && __mm.audio.metrics().state === 'running');
  check(await page.evaluate(() => __mm.source === 'demo'), 'permission-error recovery launches camera-free practice');
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await page.waitForFunction(() => __mm.backgroundPaused && __mm.game.paused);
  await page.locator('.mm-pause').click();
  await page.waitForFunction(() => !__mm.game.paused);
  check(await page.evaluate(() => __mm.audio.metrics().state === 'running' && !__mm.backgroundPaused), 'explicit RESUME recovers audio after background interruption');
  await page.locator('.game-back').click();
  check(errors.length === 0, `no browser errors: ${errors.join('; ')}`);
  return { checks, errors };
}
