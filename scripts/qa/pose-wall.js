// Camera-free browser QA. Synthetic timing does not establish human input gates.
async (page) => {
  await page.clock.resume(); const base = new URL(page.url()).origin, checks = [], errors = [];
  const check = (ok, label) => { if (!ok) throw Error(label); checks.push(label); };
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('about:blank'); await page.addInitScript(() => { if (location.protocol.startsWith('http')) localStorage.setItem('camera-game-lab-locale', 'ja'); });
  await page.goto(base + '/?qa=pose-wall-' + Date.now() + '#/game/solo-pose-wall');
  await page.waitForFunction(() => document.querySelector('.pw-entry .launch-demo')?.disabled === false);
  for (const size of [{ width: 1440, height: 900 }, { width: 360, height: 800 }, { width: 390, height: 844 }, { width: 720, height: 1280 }]) {
    await page.setViewportSize(size);
    check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'entry no overflow ' + size.width);
    check(await page.locator('.pw-cover img').evaluate(i => i.complete && i.naturalWidth > 0), 'Imagegen art loads ' + size.width);
    check(await page.locator('.launch-camera').evaluate(b => b.getBoundingClientRect().height >= 44), '44px PLAY target ' + size.width);
    await page.screenshot({ path: `output/playwright/pose-wall-entry-${size.width}.png`, fullPage: true });
  }
  check(await page.evaluate(() => !performance.getEntriesByType('resource').some(e => /\.task|\.wasm/.test(e.name)) && !document.querySelector('.pw-stage video').srcObject), 'entry starts no sensors or model');
  await page.locator('.launch-howto').click(); check((await page.locator('.sheet-content').textContent()).includes('おもちゃの一日'), 'licensed OpenTracks credit reachable'); await page.keyboard.press('Escape');
  check(await page.locator('.launch-howto').evaluate(b => b === document.activeElement), 'instructions restore focus');
  await page.locator('.platform-locale').click(); check((await page.locator('.pw-tagline').textContent()).includes('Make the shape'), 'English entry'); await page.locator('.platform-locale').click();
  await page.evaluate(async () => {
    const registry = await (await fetch('/src/platform/experiments.js')).text(), path = registry.match(/import\("([^"]*poseWall\/view\.js[^"]*)"\)/)[1];
    const { PoseWallView } = await import(path), render = PoseWallView.prototype.render;
    PoseWallView.prototype.render = function (...args) { window.__pw = this; return render.apply(this, args); };
    window.__poseHelpers = await import('/src/poseWall/poses.js');
  });
  await page.setViewportSize({ width: 390, height: 844 }); await page.clock.install(); await page.locator('.launch-demo').click(); await page.clock.runFor(650);
  check(await page.evaluate(() => __pw.phase === 'running' && __pw.game.elapsed < .2), 'READY starts five-wall active clock after 500ms');
  const advance = async elapsed => { const current = await page.evaluate(() => __pw.game.elapsed); await page.clock.runFor(Math.max(0, Math.ceil((elapsed - current) * 1000))); };
  await page.keyboard.press('1'); await advance(1.7);
  await page.locator('.pw-pause').click(); const pauseAt = await page.evaluate(() => __pw.game.elapsed); await page.clock.runFor(1000);
  check(await page.evaluate(() => __pw.game.elapsed) === pauseAt, 'pause freezes wall'); await page.locator('.pw-resume').click();
  await advance(2.1); check(await page.evaluate(() => __pw.game.walls[0].rank === 'PERFECT'), 'Y scores PERFECT after fresh hold on resume');
  await page.screenshot({ path: 'output/playwright/pose-wall-perfect-390.png', fullPage: true });
  await advance(3.08); await page.keyboard.press('2');
  const rect = await page.locator('.pw-stage canvas').boundingBox(), wrist = await page.evaluate(() => __pw.pose.arms[0].wrist);
  await page.mouse.move(rect.x + wrist.x * rect.width, rect.y + wrist.y * rect.height); await page.mouse.down(); await page.mouse.move(rect.x + rect.width * .46, rect.y + wrist.y * rect.height, { steps: 5 }); await page.mouse.up();
  check(await page.evaluate(() => __pw.selected === -2 && __pw.pose.arms[0].wrist.x > .4), 'drag independently moves an actual wrist');
  await advance(5.1); check(await page.evaluate(() => __pw.game.walls[1].rank === 'CLEAR'), 'changed wrist gives measured CLEAR');
  await advance(6.08); await page.locator('[data-pose="2"]').click();
  await page.evaluate(() => { __pw.pose = __poseHelpers.makePose(__pw.game.target.angles.map(a => a + 45)); }); await advance(8.1);
  check(await page.evaluate(() => __pw.game.walls[2].rank === 'SQUEEZE'), 'partial directional match gives SQUEEZE'); await page.screenshot({ path: 'output/playwright/pose-wall-squeeze-390.png', fullPage: true });
  await advance(9.08); await page.keyboard.press('0'); await advance(11.1);
  check(await page.evaluate(() => __pw.game.walls[3].rank === 'CRASH' && __pw.game.phase === 'playing'), 'CRASH breaks wall but round continues'); await page.screenshot({ path: 'output/playwright/pose-wall-crash-390.png', fullPage: true });
  await advance(12.08); await page.keyboard.press('5');
  check(await page.locator('.pw-cue small').textContent() === 'FINAL WALL', 'fifth wall identified');
  await page.locator('.game-music').click(); check(await page.locator('.game-music').getAttribute('aria-pressed') === 'false', 'BGM can mute during play'); await page.locator('.game-music').click();
  await advance(15.1); await page.locator('.pw-result').waitFor();
  check(await page.evaluate(() => __pw.game.result.walls.length === 5 && __pw.game.result.counts.PERFECT === 2 && __pw.game.result.counts.CLEAR === 1 && __pw.game.result.counts.SQUEEZE === 1 && __pw.game.result.counts.CRASH === 1), 'result reports all five measured ranks');
  check((await page.locator('.pw-result').textContent()).includes('PRACTICE'), 'result marks practice provenance');
  check(await page.evaluate(() => !__pw.input.running && !__pw.audio.context && __pw.frameId == null), 'result releases input, audio and animation');
  for (const size of [{ width: 360, height: 800 }, { width: 1440, height: 900 }]) { await page.setViewportSize(size); check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'result no overflow ' + size.width); await page.screenshot({ path: `output/playwright/pose-wall-result-${size.width}.png`, fullPage: true }); }
  await page.locator('.platform-locale').click(); check((await page.locator('.pw-result').textContent()).includes('Average match'), 'English measured result');
  await page.locator('[data-result-action="retry"]').click(); await page.clock.runFor(600);
  check(await page.evaluate(() => __pw.source === 'demo' && __pw.game.walls.length === 0 && __pw.game.elapsed < .15), 'retry stays practice and starts clean');
  await page.setViewportSize({ width: 1440, height: 900 }); await page.keyboard.press('1'); await page.clock.runFor(500); await page.screenshot({ path: 'output/playwright/pose-wall-play-1440.png', fullPage: true });
  await page.locator('.game-back').click(); await page.locator('.lab-feed').waitFor();
  check(await page.evaluate(() => !__pw.active && __pw.frameId == null), 'exit cleans listeners and animation');
  await page.goto(base + '/#/game/solo-finger-gun'); await page.waitForFunction(() => document.querySelector('.launch-camera')?.disabled === false);
  check(await page.evaluate(() => getComputedStyle(document.querySelector('.platform')).getPropertyValue('--pl-bg').trim() !== '#fff7e7'), 'cached POSE WALL styles do not theme another game');
  check(errors.length === 0, 'no browser exceptions');
  return { checks, errors };
}
