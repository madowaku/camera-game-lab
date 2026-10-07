// Run with: playwright-cli -s=mouth-music run-code --filename=scripts/qa/mouth-music.js
// Synthetic desktop browser evidence; physical Android and subjective sound remain manual.
async (page) => {
  const checks = [], errors = [], base = 'http://127.0.0.1:5298';
  const check = (ok, name) => { if (!ok) throw Error(name); checks.push(name); };
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(base + '/?debug=1#/game/tech-mouth-music');
  await page.getByRole('button', { name: 'カメラなしの練習', exact: true }).waitFor();
  await page.waitForFunction(() => !document.querySelector('.launch-demo')?.disabled);
  await page.evaluate(() => { window.__mm = document.querySelector('.mm-view').parentElement.__mouthMusic; });
  check(await page.evaluate(() => !__mm.audio.toneContext && !__mm.input.running), 'entrance creates neither audio context nor camera');
  await page.setViewportSize({ width: 360, height: 800 });
  await page.screenshot({ path: 'output/playwright/mouth-music-entry-360.png', fullPage: true });
  await page.getByRole('button', { name: 'カメラなしの練習', exact: true }).click();
  await page.waitForFunction(() => __mm.phase === 'playing');
  check(await page.evaluate(() => __mm.audio.metrics().state === 'running' && __mm.audio.transport.bpm.value === 100 && !__mm.input.running && !__mm.video.srcObject), 'PLAY unlocks Tone; 100 BPM transport; practice has no camera');
  await page.locator('.mm-pause').click();
  await page.waitForFunction(() => __mm.game.paused);
  const elapsed = await page.evaluate(() => __mm.game.elapsed);
  await page.waitForTimeout(300);
  check(await page.evaluate(at => __mm.game.elapsed === at && __mm.audio.paused, elapsed), 'pause freezes round and mutes music');
  await page.locator('.mm-pause').click();
  await page.waitForFunction(() => !__mm.game.paused);
  await page.locator('.mm-stage').focus();
  await page.keyboard.down('Space');
  await page.waitForTimeout(250);
  const eaten = await page.evaluate(() => __mm.game.eaten);
  await page.waitForTimeout(1700);
  check(await page.evaluate(n => __mm.game.eaten === n, eaten), 'holding Space never generates repeat bites');
  await page.keyboard.up('Space');
  await page.evaluate(() => {
    window.__rawAudio = __mm.audio.toneContext.rawContext;
    window.__analyser = __rawAudio.createAnalyser(); __analyser.fftSize = 1024;
    __mm.audio.master.connect(__analyser);
    window.__auto = setInterval(() => {
      const group = __mm.game.notes.filter(n => n.born === __mm.game.notes[0]?.born);
      if (__mm.game.phase === 'playing' && __mm.game.armed && group.length && group.every(n => __mm.game.distance(n, __mm.game.mouth) < .11)) __mm.bite();
    }, 25);
  });
  await page.waitForFunction(() => __mm.game.eaten >= 2);
  check(await page.evaluate(() => {
    const values = new Float32Array(1024); __analyser.getFloatTimeDomainData(values);
    return values.some(v => Math.abs(v) > .0001) && __mm.dispatchMs !== null;
  }), 'real Tone graph produces a waveform after bites');
  await page.locator('.mm-sound').click();
  await page.waitForTimeout(100);
  check(await page.evaluate(() => !__mm.sound && __mm.audio.master.gain.value === 0), 'SOUND OFF mutes output');
  await page.locator('.mm-sound').click();
  await page.locator('.mm-mode').selectOption('se');
  check(await page.evaluate(() => __mm.audio.mode === 'se'), 'SIMPLE SE comparison selects a fixed beep without accompaniment');
  await page.locator('.mm-mode').selectOption('music');
  await page.locator('.mm-backing').click();
  check(await page.evaluate(() => !__mm.audio.backing), 'backing can be compared separately');
  await page.locator('.mm-backing').click();
  for (const size of [{ width: 360, height: 800 }, { width: 720, height: 1280 }]) {
    await page.setViewportSize(size);
    check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth && __mm.canvas.width <= __mm.stage.clientWidth * 1.5 + 1), `no overflow and bounded DPR at ${size.width}×${size.height}`);
    check(await page.evaluate(() => __mm.$('.mm-bite').getBoundingClientRect().bottom <= innerHeight), `practice bite button fits viewport at ${size.width}×${size.height}`);
    await page.screenshot({ path: `output/playwright/mouth-music-play-${size.width}.png`, fullPage: true });
  }
  await page.waitForFunction(() => __mm.game.chords >= 1, { timeout: 20000 });
  check(await page.evaluate(() => __mm.game.maxCombo >= 5 && __mm.game.melody.some(n => n.types.length >= 2)), 'natural spawns grow music and generate chords');
  await page.waitForFunction(() => __mm.phase === 'result', { timeout: 40000 });
  await page.evaluate(() => { clearInterval(__auto); __analyser.disconnect(); });
  check(await page.evaluate(() => __mm.game.elapsed === 30000 && !__mm.audio.toneContext && !__mm.input.running), '30-second result releases input, audio and timers');
  check(await page.evaluate(() => __mm.game.triads >= 1 && __mm.game.maxCombo >= 20), 'natural finale produces triads and reaches SPARKLE');
  await page.locator('.mm-listen').click();
  await page.waitForTimeout(300);
  check(await page.locator('.mm-listen').textContent() === '■ STOP', 'result starts original-timing polyphonic replay');
  await page.locator('.mm-listen').click();
  await page.locator('.mm-validation summary').click();
  await page.locator('.mm-verdict-form button[type=submit]').click();
  check(await page.evaluate(() => {
    const saved = JSON.parse(localStorage.getItem('camera-game-lab-tech-003-validation')).at(-1);
    return saved.feedback.verdict === 'PENDING' && saved.feedback.q5 === 'pending' && saved.source === 'demo';
  }), 'manual validation defaults to untested; retains practice provenance');
  await page.screenshot({ path: 'output/playwright/mouth-music-result.png', fullPage: true });
  for (let i = 0; i < 3; i++) {
    await page.locator('[data-result-action=retry]').click();
    await page.waitForFunction(() => __mm.phase === 'countdown' && __mm.audio.metrics().state === 'running');
    check(await page.evaluate(() => __mm.game.eaten === 0 && __mm.audio.nodes.length === 10 && document.querySelectorAll('.mm-stage canvas').length === 1), `retry ${i + 1} resets one graph and one canvas`);
    await page.evaluate(() => { __mm.game.finish(); });
    await page.locator('.mm-result').waitFor();
  }
  await page.locator('.game-back').click();
  check(await page.evaluate(() => !__mm.active && !__mm.audio.toneContext && !__mm.raf && !__mm.input.running), 'route exit leaves no camera, audio or animation loop');
  check(errors.length === 0, `no browser errors: ${errors.join('; ')}`);
  return { checks, errors };
}
