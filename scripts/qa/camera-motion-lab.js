// Run via playwright-cli run-code --filename. Uses native practice controls;
// instrumentation observes decisions and effects without assigning success.
async page => {
  const base = new URL(page.url()).origin, checks = [], errors = [], failed = [];
  const check = (value, name) => { if (!value) throw Error(name); checks.push(name); };
  page.on('pageerror', e => errors.push(e.message));
  page.on('response', r => { if (r.status() >= 400) failed.push(`${r.status()} ${r.url()}`); });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.addInitScript(() => {
    localStorage.setItem('camera-game-lab-platform-onboarded-v1', 'true');
    localStorage.setItem('camera-game-lab-locale', 'ja');
    localStorage.setItem('camera-game-lab-bgm-v1', 'false');
    window.__mediaRequests = 0;
    navigator.mediaDevices.getUserMedia = async () => { window.__mediaRequests++; throw Error('Unexpected camera/microphone request'); };
  });
  await page.clock.install();
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 100));
  const advanceUntil = async (predicate, label, limit = 100) => {
    for (let i = 0; i < limit; i++) {
      if (await page.evaluate(predicate)) return;
      await page.clock.runFor(100);
    }
    throw Error(label);
  };
  const launch = async (id, variant = 'B') => {
    await page.goto(`${base}/?motionLab=${variant}#/game/${id}`);
    await page.waitForFunction(() => document.querySelector('.launch-demo')?.disabled === false);
    await page.evaluate(async () => {
      const source = await (await fetch('/src/platform/launcher.js')).text();
      const path = source.match(/from ['"]([^'"]*motionDirector\.js[^'"]*)['"]/)[1];
      const { MotionDirector } = await import(path);
      window.__labEvents = [];
      const update = MotionDirector.prototype.update, burst = MotionDirector.prototype.burst;
      MotionDirector.prototype.update = function (instance, ...rest) {
        window.__motion = this; window.__view = instance;
        return update.call(this, instance, ...rest);
      };
      MotionDirector.prototype.burst = function (kind, label, point) {
        const result = burst.call(this, kind, label, point);
        if (kind !== 'start' && this.layer?.lastElementChild) {
          window.__labEvents.push({ kind, point, preset: this.labPreset, enhanced: this.layer.lastElementChild.classList.contains('motion-burst--lab') });
        }
        return result;
      };
    });
    await page.locator('.launch-demo').click();
    await page.clock.runFor(700);
    if (id === 'duo-palm-pong') await page.locator('.pp-start').click();
    if (id === 'solo-hand-spell' && await page.locator('.hs-skip').isVisible()) await page.locator('.hs-skip').click();
    await advanceUntil(() => window.__motion?.started, `${id}: game started`);
  };
  const trigger = async id => {
    if (id === 'solo-air-slash') await page.keyboard.press('x');
    if (id === 'solo-tilt-turbo') { await page.keyboard.down('ArrowLeft'); await page.clock.runFor(160); await page.keyboard.up('ArrowLeft'); }
    if (id === 'voice-note-blaster') {
      await advanceUntil(() => __view.game.enemies.length > 0, 'blaster spawns a target');
      const key = String(await page.evaluate(() => __view.game.enemies[0].lane + 1));
      await page.keyboard.down(key);
      await advanceUntil(() => __labEvents.length > 0, 'blaster native key hits a target');
      await page.keyboard.up(key);
    }
    await advanceUntil(() => __labEvents.length > 0, `${id}: actual success produces motion`);
  };
  const ids = ['solo-air-slash', 'solo-tilt-turbo', 'voice-note-blaster', 'duo-palm-pong'];
  for (const size of [{ width: 390, height: 844 }, { width: 1440, height: 900 }]) {
    await page.setViewportSize(size);
    for (const id of ids) {
      await launch(id); await trigger(id);
      check(await page.evaluate(() => __labEvents[0].enhanced), `${id}: B effect ${size.width}`);
      check(await page.evaluate(() => __motion.layer.children.length <= 3), `${id}: bounded geometry`);
      check(await page.locator('.motion-layer').evaluate(el => getComputedStyle(el).pointerEvents === 'none'), `${id}: controls remain reachable`);
      check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${id}: fits ${size.width}`);
      check(await page.evaluate(() => __mediaRequests === 0), `${id}: practice starts no sensors`);
      if (id === 'solo-air-slash') {
        check(await page.evaluate(() => __view.game.xSlashes === 1), 'AIR SLASH uses a judged crossing');
        check(await page.locator('.motion-caption').count() === 0, 'X-SLASH keeps one native caption');
      }
      if (id === 'duo-palm-pong') {
        check(await page.evaluate(() => Math.abs(__labEvents[0].point.x - __view.game.lastHit.x / 16) < .001), 'rebound is at paddle contact');
        check(await page.locator('.motion-caption').count() === 0, 'Phaser owns rally text');
      }
      if (id === 'voice-note-blaster') {
        check(await page.evaluate(() => Math.abs(parseFloat(__motion.layer.lastElementChild.style.getPropertyValue('--burst-x')) / 100 - __labEvents.at(-1).point.x) < .001), 'blaster pulse stays on the hit near the stage edge');
      }
      // Freeze CSS only for a legible visual inspection of the actual burst.
      await page.evaluate(() => {
        for (const burst of document.querySelectorAll('.motion-burst--lab')) {
          for (const animation of burst.getAnimations({ subtree: true })) { animation.pause(); animation.currentTime = 160; }
        }
      });
      await page.screenshot({ path: `output/playwright/motion-lab-${id}-${size.width}.png`, fullPage: true });
      await page.emulateMedia({ reducedMotion: 'reduce' }); await page.clock.runFor(32);
      check(await page.locator('.motion-burst').count() === 0, `${id}: live reduced motion clears geometry`);
      await page.locator('.game-back').click(); await page.clock.runFor(32);
      check(await page.locator('[data-motion-lab]').count() === 0, `${id}: route clears B state`);
      await page.emulateMedia({ reducedMotion: 'no-preference' });
    }
  }
  // The original three pilots keep their identity after expanding the registry.
  await page.setViewportSize({ width: 390, height: 844 });
  for (const id of ['solo-maru-magic', 'solo-hand-spell', 'solo-toy-drum']) {
    await launch(id);
    if (id === 'solo-maru-magic') {
      check(await page.locator('.motion-burst--lab').count() === 0, 'MARU waits for a completed circle');
      const b = await page.locator('.maru-stage').boundingBox(), radius = b.width * .22;
      await page.mouse.move(b.x + b.width / 2 + radius, b.y + b.height / 2); await page.mouse.down();
      for (let i = 1; i <= 48; i++) {
        const a = i / 48 * Math.PI * 2;
        await page.mouse.move(b.x + b.width / 2 + Math.cos(a) * radius, b.y + b.height / 2 + Math.sin(a) * radius);
        await page.clock.runFor(20);
      }
      await page.mouse.up();
    } else if (id === 'solo-hand-spell') {
      await advanceUntil(() => __view.game.scene === 'input', 'HAND SPELL reaches the input phase');
      for (const sign of ['ONE', 'TWO', 'THREE']) { await page.locator(`[data-hs-sign="${sign}"]`).click(); await page.clock.runFor(100); }
    } else { await page.keyboard.press('d'); }
    await advanceUntil(() => __labEvents.length > 0, `${id}: original B cue still fires`);
    check(await page.evaluate(() => __labEvents[0].enhanced), `${id}: original B motif`);
    check(await page.locator('.motion-lab-glyph').count() > 0, `${id}: original glyph retained`);
    await page.clock.resume(); await page.waitForTimeout(1050);
    check(await page.locator('.motion-burst--lab').count() === 0, `${id}: real CSS lifetime removes burst`);
    await page.clock.pauseAt(await page.evaluate(() => Date.now() + 100));
    await page.locator('.game-back').click();
  }
  // A comparison must still use each game's existing presentation.
  await page.setViewportSize({ width: 390, height: 844 });
  for (const id of ids) {
    await launch(id, 'A'); await trigger(id);
    check(await page.evaluate(() => __labEvents.every(e => !e.enhanced)), `${id}: A has no B geometry`);
    await page.locator('.game-back').click();
  }
  // Pause/resume/retry on a new preset, through the game's own controls.
  await launch('voice-note-blaster'); await trigger('voice-note-blaster');
  await page.locator('.nb-pause').click(); await page.clock.runFor(32);
  check(await page.locator('.motion-burst').count() === 0, 'pause clears B effects');
  const before = await page.evaluate(() => __labEvents.length);
  await page.locator('.nb-pause').click(); await page.clock.runFor(32);
  check(await page.evaluate(() => __labEvents.length) === before, 'resume does not replay previous hit');
  await page.clock.runFor(31000);
  await page.clock.resume(); await page.waitForTimeout(850);
  check(await page.locator('.motion-layer').count() === 0, 'result removes B layer');
  await page.locator('[data-result-action="retry"]').click();
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 100));
  await advanceUntil(() => __motion?.started, 'retry starts fresh director');
  check(await page.evaluate(() => __view.game.hits === 0 && __motion.previous.success === 0), 'retry resets success baseline');
  await page.locator('.game-back').click();
  await page.clock.resume();
  check(errors.length === 0, 'no browser errors: ' + errors.join('; '));
  check(failed.length === 0, 'no broken resources: ' + failed.join('; '));
  return { checks: checks.length, errors, failed, physicalCamera: false, recordingIncludesDomEffects: false };
}
