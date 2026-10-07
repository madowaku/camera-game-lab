async (page) => {
  const base = 'http://127.0.0.1:5189', checks = [], errors = [];
  const check = (ok, label) => { if (!ok) throw Error(label); checks.push(label); };
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(base + '/?hfcamera=' + Date.now() + '#/game/solo-human-fish');
  await page.locator('.launch-camera:not([disabled])').waitFor();
  await page.evaluate(async () => {
    const { experiments } = await import('/src/platform/experiments.js');
    const factory = await experiments.find(g => g.id === 'solo-human-fish').load();
    const temporary = factory(document.createElement('div'), 'ja'), proto = Object.getPrototypeOf(temporary), start = proto.startCamera;
    proto.startCamera = function () { window.__hf = this; this.input.start = async () => { throw new DOMException('QA denied', 'NotAllowedError'); }; return start.call(this); };
    temporary.deactivate();
  });
  await page.locator('.launch-camera').click(); await page.locator('.hf-fallback').waitFor();
  check(await page.evaluate(() => __hf.phase === 'error' && !__hf.input.running && !__hf.video.srcObject), 'denied camera leaves no stream and offers reconnect or touch');
  await page.locator('.hf-fallback').click(); await page.waitForFunction(() => __hf.phase === 'playing');
  check(await page.evaluate(() => __hf.source === 'demo' && __hf.game.elapsed < 1), 'denied camera recovers into a clean practice life');
  await page.locator('.game-back').click();

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(base + '/?hfcamera=' + Date.now() + '#/game/solo-human-fish');
  await page.locator('.launch-camera:not([disabled])').waitFor();
  await page.locator('[data-creator-mode="creator"]').click(); await page.locator('[data-face-mode="ORIGINAL"]').click();
  await page.evaluate(async () => {
    const { experiments } = await import('/src/platform/experiments.js');
    const factory = await experiments.find(g => g.id === 'solo-human-fish').load();
    const temporary = factory(document.createElement('div'), 'ja'), proto = Object.getPrototypeOf(temporary), start = proto.startCamera;
    proto.startCamera = function () {
      window.__hf = this; const view = this, input = this.input;
      const stop = input.stop.bind(input);
      input.stop = () => { clearInterval(window.__faceTimer); stop(); };
      input.start = async () => {
        const canvas = document.createElement('canvas'); canvas.width = 640; canvas.height = 480;
        const c = canvas.getContext('2d'); c.fillStyle = '#b8d2d0'; c.fillRect(0, 0, 640, 480);
        c.fillStyle = '#e5ad85'; c.beginPath(); c.ellipse(320, 240, 64, 96, 0, 0, Math.PI * 2); c.fill();
        for (const x of [296, 344]) { c.fillStyle = '#fff'; c.beginPath(); c.ellipse(x, 216, 12, 8, 0, 0, 7); c.fill(); c.fillStyle = '#37465d'; c.beginPath(); c.arc(x, 216, 5, 0, 7); c.fill(); }
        c.fillStyle = '#bf785a'; c.beginPath(); c.ellipse(320, 248, 7, 13, 0, 0, 7); c.fill();
        c.fillStyle = '#8e4f4f'; c.beginPath(); c.ellipse(320, 280, 18, 5, 0, 0, 7); c.fill();
        const stream = canvas.captureStream(24); window.__testTracks = stream.getTracks();
        input.session = { stream, recognizer: { close() {} } }; view.video.srcObject = stream; await view.video.play(); input.running = true; input.onStatus('READY');
        window.__head = { x: .5, y: .5, open: false, lost: false, multiple: false };
        const frame = () => {
          if (!input.running) return; const h = window.__head, dx = h.x - .5, dy = h.y - .5;
          const p = Array.from({ length: 468 }, () => ({ x: .5 + dx, y: .5 + dy, z: 0 }));
          const set = (i, x, y) => { p[i] = { x: x + dx, y: y + dy, z: 0 }; };
          set(10, .5, .3); set(152, .5, .7); set(234, .4, .5); set(454, .6, .5);
          set(33, .46, .45); set(263, .54, .45); set(61, .44, .57); set(291, .56, .57);
          set(13, .5, h.open ? .54 : .565); set(14, .5, h.open ? .60 : .575);
          input.processResult({ faceLandmarks: h.lost ? [] : h.multiple ? [p, p] : [p] }, performance.now());
        }; frame(); window.__faceTimer = setInterval(frame, 50);
      }; return start.call(this);
    }; temporary.deactivate();
  });
  await page.locator('.launch-camera').click(); await page.waitForFunction(() => window.__hf?.phase === 'playing');
  check(await page.evaluate(() => __hf.source === 'camera' && __hf.signal.neutral && __hf.packet.face && __hf.options.faceMode === 'ORIGINAL'), 'synthetic tracked face calibrates through the real mouth/landmark pipeline');
  await page.evaluate(() => { __head.x = .59; __head.y = .43; });
  await page.waitForFunction(() => __hf.game.player.x < .25 && __hf.game.atSurface);
  check(await page.evaluate(() => __hf.game.breaths === 0), 'mirrored head movement swims left/up without automatic breathing');
  await page.evaluate(() => { __hf.game.oxygen = 20; __head.open = true; });
  await page.waitForFunction(() => __hf.game.breaths === 1);
  await page.waitForTimeout(350); check(await page.evaluate(() => __hf.game.breaths === 1 && __hf.game.oxygen > 95), 'held-open mouth produces one actual gasp');
  await page.screenshot({ path: 'output/playwright/human-fish-camera-original.png', fullPage: true });
  const hash = async () => page.evaluate(() => __hf.scene.faceTexture.context.getImageData(216, 63, 68, 86).data.reduce((a, b) => a + b, 0));
  const original = await hash(); await page.evaluate(() => { __hf.options.faceMode = 'EFFECT'; }); await page.waitForTimeout(150);
  const effect = await hash(); await page.screenshot({ path: 'output/playwright/human-fish-camera-effect.png', fullPage: true });
  await page.evaluate(() => { __hf.options.faceMode = 'HIDE'; }); await page.waitForTimeout(150);
  const hidden = await hash(); check(original !== effect && effect !== hidden, 'ORIGINAL / EFFECT / HIDE produce distinct face-treated textures');
  await page.evaluate(() => { __head.lost = true; }); await page.waitForFunction(() => __hf.inputLost);
  const frozen = await page.evaluate(() => ({ elapsed: __hf.game.elapsed, oxygen: __hf.game.oxygen, ...__hf.game.player }));
  await page.waitForTimeout(350);
  check(await page.evaluate(f => __hf.game.elapsed === f.elapsed && __hf.game.oxygen === f.oxygen && __hf.game.player.x === f.x && __hf.game.player.y === f.y, frozen), 'sustained face loss floats in place and freezes oxygen/time');
  await page.screenshot({ path: 'output/playwright/human-fish-tracking-loss.png', fullPage: true });
  await page.evaluate(() => { __head.lost = false; }); await page.waitForFunction(() => !__hf.inputLost); await page.waitForTimeout(180);
  check(await page.evaluate(() => __hf.game.breaths === 1 && __hf.game.elapsed > 0), 'open-mouth tracking recovery cannot invent another breath');
  await page.evaluate(() => { __head.open = false; }); await page.waitForTimeout(180);
  await page.evaluate(() => { __hf.game.oxygen = 20; __head.open = true; }); await page.waitForFunction(() => __hf.game.breaths === 2);
  check(true, 'close then reopen rearms the real mouth after recovery');
  await page.evaluate(() => { __head.multiple = true; }); await page.waitForFunction(() => __hf.inputLost);
  check(true, 'multiple faces are rejected rather than switching the player');
  await page.evaluate(() => { __head.multiple = false; }); await page.waitForFunction(() => !__hf.inputLost);
  await page.locator('.hf-pause').click(); const paused = await page.evaluate(() => __hf.game.elapsed); await page.waitForTimeout(200);
  check(await page.evaluate(t => __hf.game.elapsed === t, paused), 'camera pause freezes simulation while keeping recovery controls');
  await page.locator('.hf-resume').click();
  await page.evaluate(() => { __hf.game.oxygen = .01; }); await page.locator('.hf-result').waitFor(); await page.waitForTimeout(1000);
  check(await page.evaluate(() => __testTracks.every(t => t.readyState === 'ended') && !__hf.input.running && !__hf.video.srcObject && __hf.creatorResult.source === 'camera'), 'result releases synthetic camera tracks and retains camera provenance');
  await page.locator('.game-back').click(); await page.waitForFunction(() => !document.querySelector('.hf-phaser-host canvas'));
  check(errors.length === 0, `no camera browser errors: ${errors.join('; ')}`);
  return { checks, errors, note: 'Synthetic media and landmarks; physical camera/MediaPipe model inference still require a device playtest.' };
}
