async (page) => {
  const checks = [], errors = [], check = (ok, name) => { if (!ok) throw new Error(name); checks.push(name); };
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('http://127.0.0.1:5191/?rpbcamera=' + Date.now() + '#/game/duo-rock-paper-boom');
  await page.locator('.rpb-entry .launch-camera:not(:disabled)').waitFor();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(async () => {
    const { experiments } = await import('/src/platform/experiments.js');
    const factory = await experiments.find(g => g.id === 'duo-rock-paper-boom').load();
    const temporary = factory(document.createElement('div'), 'ja'), proto = Object.getPrototypeOf(temporary), notify = proto.notify;
    proto.notify = function (...args) { window.__rpb = this; return notify.apply(this, args); };
    const inputProto = Object.getPrototypeOf(temporary.input);
    window.__recognizerClosed = 0; window.__hands = ['Closed_Fist', 'Victory']; window.__denied = true;
    inputProto.createRecognizer = async () => ({
      recognizeForVideo: () => ({ landmarks: window.__hands.map((_, i) => Array.from({ length: 21 }, () => ({ x: i === 0 ? .25 : i === 1 ? .75 : .3, y: .5, z: 0 }))), gestures: window.__hands.map(categoryName => [{ categoryName, score: .96 }]) }),
      close: () => { window.__recognizerClosed++; },
    });
    Object.defineProperty(navigator.mediaDevices, 'getUserMedia', { configurable: true, value: async constraints => {
      window.__requestedConstraints = constraints;
      if (window.__denied) throw new DOMException('Denied in QA', 'NotAllowedError');
      const canvas = document.createElement('canvas'); canvas.width = 360; canvas.height = 640; const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#395164'; ctx.fillRect(0, 0, 360, 640);
      const stream = canvas.captureStream(30), track = stream.getVideoTracks()[0], original = track.getSettings.bind(track);
      track.getSettings = () => ({ ...original(), facingMode: 'environment' }); window.__stream = stream;
      const draw = () => { if (track.readyState !== 'live') return; ctx.fillStyle = '#396070'; ctx.fillRect(Math.random() * 360, 400, 3, 3); requestAnimationFrame(draw); }; draw();
      return stream;
    } });
    temporary.deactivate();
  });
  await page.locator('.launch-camera').click();
  await page.locator('.rpb-camera-retry').waitFor({ timeout: 60000 });
  check(await page.evaluate(() => __requestedConstraints.audio === false && __requestedConstraints.video.facingMode.exact === 'environment'), 'requests only the rear camera, with microphone disabled');
  check(await page.evaluate(() => __rpb.phase === 'error' && !__rpb.input.running && !__rpb.video.srcObject && __recognizerClosed > 0), 'permission denial releases recognizer and offers recovery');
  await page.screenshot({ path: 'output/playwright/rock-paper-boom-camera-denied.png' });
  await page.evaluate(() => { window.__denied = false; });
  await page.locator('.rpb-camera-retry').click();
  await page.waitForFunction(() => __rpb.game.phase === 'countdown', { timeout: 60000 });
  check(await page.evaluate(() => __rpb.source === 'camera' && __rpb.input.running && __rpb.input.detected === 2), 'synthetic rear stream runs the shared camera lifecycle and assigns two hands');
  await page.waitForFunction(() => __rpb.game.phase === 'freeze');
  check(await page.evaluate(() => __rpb.game.result.winner === 1 && __rpb.game.result.p1 === 'ROCK' && __rpb.game.result.p2 === 'SCISSORS'), 'camera inference pipeline locks the two correct screen-side signs');
  await page.screenshot({ path: 'output/playwright/rock-paper-boom-camera-freeze.png' });
  await page.waitForFunction(() => __rpb.game.phase === 'again');
  await page.evaluate(() => { window.__originalStream = __rpb.input.stream; window.__hands = ['Closed_Fist']; });
  await page.locator('.rpb-again').click(); await page.waitForFunction(() => __rpb.game.phase === 'retry');
  check(await page.evaluate(() => __rpb.game.result === null && __rpb.input.stream === __originalStream), 'one missing camera hand retries without declaring a winner or reopening camera');
  await page.screenshot({ path: 'output/playwright/rock-paper-boom-show-hand.png' });
  await page.evaluate(() => { window.__hands = ['Open_Palm', 'Closed_Fist', 'Victory']; });
  await page.waitForFunction(() => __rpb.game.phase === 'ready' && __rpb.input.hands[0]?.ambiguous);
  check(await page.evaluate(() => !__rpb.game.ready && document.querySelector('.rpb-start').disabled), 'extra hand on P1 side blocks the camera countdown');
  await page.evaluate(() => { window.__hands = ['Open_Palm', 'Closed_Fist']; });
  await page.waitForFunction(() => __rpb.game.phase === 'freeze');
  check(await page.evaluate(() => __rpb.game.result.move === 'GIANT PALM' && __rpb.input.stream === __originalStream), 'restored clear hands automatically recover into a new valid finish with the same camera');
  await page.locator('.game-back').click(); await page.waitForFunction(() => !document.querySelector('.rpb-phaser canvas'));
  check(await page.evaluate(() => __stream.getTracks().every(t => t.readyState === 'ended') && !__rpb.input.running && !__rpb.video.srcObject), 'exit stops synthetic media tracks and clears video');
  check(errors.length === 0, 'camera lifecycle produces no browser errors');
  return { checks, errors, limitation: 'Synthetic camera and synthetic recognition: not a physical human-hand accuracy test.' };
}
