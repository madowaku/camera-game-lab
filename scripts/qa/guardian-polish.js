// Run via playwright-cli run-code --filename. Synthetic camera/combat evidence.
async (page) => {
  const checks = [], errors = [], failedAssets = [];
  let guardianModule;
  const check = (ok, label) => { if (!ok) throw Error(label); checks.push(label); };
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => { if (response.url().includes('/artwork/guardian/') && response.status() >= 400) failedAssets.push(response.url()); });
  page.on('request', request => { if (request.url().includes('/src/guardian/guardianExperience.js')) guardianModule = request.url(); });
  await page.clock.resume();
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(new URL(page.url()).origin + '/?qa=guardian-polish-' + Math.random().toString(36).slice(2) + '#guardian');
  const localeToggle = page.locator('.platform-locale');
  if ((await localeToggle.textContent()).trim() === 'JA') await localeToggle.click();
  await page.getByRole('button', { name: 'カメラなしで練習', exact: true }).waitFor();
  await page.waitForFunction(() => document.querySelector('.launch-demo')?.disabled === false);
  check(Boolean(guardianModule), 'guardian module loads');
  await page.evaluate(async (url) => {
    const { GuardianExperience } = await import(url);
    const activate = GuardianExperience.prototype.activate;
    GuardianExperience.prototype.activate = function(...args) { window.__guardian = this; return activate.apply(this, args); };
  }, guardianModule);
  await page.clock.install();
  await page.clock.pauseAt(new Date(Date.now() + 500));
  await page.getByRole('button', { name: 'カメラなしで練習', exact: true }).click();
  await page.clock.runFor(5400);
  check(await page.evaluate(() => __guardian.game.phase === 'playing'), 'actual launch and countdown reach combat');
  check(await page.locator('[data-spirit]').count() === 4, 'four selectable companions');
  await page.waitForFunction(() => [...__guardian.renderer.images.values()].every(image => image.complete && image.naturalWidth > 0));
  for (const id of ['warden', 'luna', 'moss', 'kitsu']) {
    await page.locator(`[data-spirit="${id}"]`).click();
    await page.clock.runFor(120);
    check(await page.evaluate(id => __guardian.renderer.spirit.id === id, id), id + ' changes the live rig');
    check(await page.locator(`[data-spirit="${id}"]`).getAttribute('aria-pressed') === 'true', id + ' selection accessible');
    await page.locator('.guardian-stage').screenshot({ path: `output/playwright/guardian-polish-${id}.png` });
  }
  await page.evaluate(() => {
    __guardian.game.enemies = [0.16, 0.25, 0.8].map((x, id) => ({ id, x, y: .42, age: 0, side: x < .5 ? -1 : 1, attackAt: 5000 }));
  });
  await page.getByRole('button', { name: 'A / PUNCH L', exact: true }).click();
  await page.clock.runFor(90);
  check(await page.evaluate(() => __guardian.game.defeated === 2), 'left punch defeats two left demons');
  check((await page.locator('.gs-feedback').textContent()).includes('×2'), 'multi-smash feedback shows actual kills');
  await page.locator('.guardian-stage').screenshot({ path: 'output/playwright/guardian-polish-smash.png' });
  await page.getByRole('button', { name: 'S / SHOT', exact: true }).click();
  await page.clock.runFor(100);
  check(await page.evaluate(() => __guardian.game.defeated === 3), 'spirit shot defeats assisted target');
  await page.getByRole('button', { name: 'F / SHIELD', exact: true }).click();
  check(await page.evaluate(() => __guardian.game.shieldMs > 0), 'shield follows the same game rules');
  await page.getByRole('button', { name: '一時停止', exact: true }).click();
  const elapsed = await page.evaluate(() => __guardian.game.elapsedMs);
  await page.clock.runFor(1000);
  check(await page.evaluate(() => __guardian.game.elapsedMs) === elapsed, 'manual pause freezes the round');
  await page.getByRole('button', { name: '再開', exact: true }).click();
  await page.getByRole('button', { name: '人体ロストを試す', exact: true }).click();
  await page.clock.runFor(500);
  const lostTime = await page.evaluate(() => __guardian.game.elapsedMs);
  await page.clock.runFor(1000);
  check(await page.evaluate(() => __guardian.game.elapsedMs) === lostTime, 'tracking loss freezes combat');
  await page.getByRole('button', { name: 'プレイヤーを戻す', exact: true }).click();
  await page.clock.runFor(3200);
  check(await page.evaluate(() => !__guardian.game.paused), 'continuous presence resumes combat');

  await page.setViewportSize({ width: 390, height: 844 });
  await page.clock.runFor(120);
  check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'no mobile horizontal overflow');
  await page.locator('.guardian-stage').screenshot({ path: 'output/playwright/guardian-polish-mobile.png' });
  await page.locator('.gs-composition-settings summary').click();
  await page.locator('.gs-player-size').fill('35');
  await page.clock.runFor(120);
  check(await page.evaluate(() => __guardian.renderer.playerSize === .35), 'display size slider updates composition');
  await page.locator('.gs-player-size').fill('55');
  await page.locator('.gs-composition-settings summary').click();

  // Exercise the real mask composition with a synthetic near-camera person.
  await page.evaluate(async () => {
    const { demoGuardianPose } = await import('/src/input/guardianGestures.js');
    const player = document.createElement('canvas'); player.width = 720; player.height = 1280;
    const ctx = player.getContext('2d'); ctx.fillStyle = '#ffd1a6'; ctx.fillRect(120, 0, 480, 1280);
    ctx.fillStyle = '#43271f'; ctx.fillRect(240, 100, 55, 55); ctx.fillRect(425, 100, 55, 55);
    const stream = player.captureStream(30); window.__guardianSyntheticStream = stream;
    __guardian.video.srcObject = stream; await __guardian.video.play();
    const pose = demoGuardianPose(); pose.shoulderWidth = .6;
    __guardian.source = 'camera'; __guardian.status = 'READY';
    __guardian.input.mask.width = 720; __guardian.input.mask.height = 1280;
    __guardian.input.maskContext.fillStyle = '#ffffff'; __guardian.input.maskContext.fillRect(120, 0, 480, 1280);
    __guardian.input.maskReady = true;
    __guardian.input.sample = () => ({ present: true, pose, actions: [] });
    __guardian.input.gestures.reset();
  });
  await page.clock.runFor(250);
  await page.locator('.guardian-stage').screenshot({ path: 'output/playwright/guardian-polish-near-camera.png' });
  check((await page.locator('.gs-framing').textContent()).includes('この距離でOK'), 'near camera accepted while person is shrunk');
  await page.evaluate(() => { __guardian.game.elapsedMs = 22000; __guardian.game.boss = true; __guardian.game.gauge = 1; __guardian.game.act({ type: 'ascend' }); });
  await page.clock.runFor(6100);
  check(await page.evaluate(() => __guardian.game.result?.victory === true), 'ascension completes victory and photo');
  await page.waitForFunction(() => __guardian.photoUrl !== null);
  // The launcher releases the camera at results and reacquires it for photos.
  await page.evaluate(() => {
    __guardian.input.start = async () => {
      __guardian.input.running = true; __guardian.input.maskReady = true; __guardian.status = 'READY';
    };
  });
  await page.getByRole('button', { name: '撮影モードへ', exact: true }).click();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const photoFrames = [];
  for (let i = 0; i < 4; i++) {
    await page.clock.runFor(120);
    photoFrames.push(await page.evaluate(() => __guardian.renderer.canvas.toDataURL()));
    await page.locator('.guardian-stage').screenshot({ path: `output/playwright/guardian-polish-photo-${i}.png` });
    await page.getByRole('button', { name: 'POSE 切替', exact: true }).click();
  }
  check(new Set(photoFrames).size === 4, 'all four photo poses remain distinct after a shielded victory');
  await page.getByRole('button', { name: '写真のUI ON', exact: true }).click();
  await page.getByRole('button', { name: 'SHOT 撮影', exact: true }).click();
  await page.waitForFunction(() => __guardian.photoCount >= 2);
  check(await page.locator('.gs-stage-bottom').isHidden(), 'photo UI hides');
  const download = page.waitForEvent('download');
  await page.getByRole('link', { name: '写真を保存', exact: true }).click();
  const file = await download; await file.saveAs('output/playwright/guardian-polish-photo-export.png');
  check(file.suggestedFilename() === 'guardian-spirit.png', 'compact player and selected spirit export as local PNG');
  await page.getByRole('button', { name: 'Switch to English', exact: true }).click();
  check(await page.locator('.gs-spirit-picker').getAttribute('aria-label') === 'CHOOSE YOUR COMPANION', 'English companion UI');
  // Resize the layout separately from the synthetic capture stream / virtual clock.
  await page.evaluate(() => {
    __guardian.source = 'demo'; __guardian.video.pause(); __guardian.video.srcObject = null;
    __guardian.input.running = false;
  });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  // Element screenshot cleanup may await a frame after viewport changes.
  await page.clock.resume();
  await page.setViewportSize({ width: 844, height: 390 });
  await page.waitForTimeout(120);
  check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'landscape reduced-motion layout fits');
  await page.locator('.guardian-stage').screenshot({ path: 'output/playwright/guardian-polish-landscape.png' });
  // Close this isolated CLI browser after the run to release its synthetic stream.
  check(failedAssets.length === 0, 'all spirit assets load successfully');
  check(errors.length === 0, 'no browser runtime errors: ' + errors.join('; '));
  // Assertions throw on failure; the CLI reports successful completion.
}
