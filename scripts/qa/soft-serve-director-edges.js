async (page) => {
  const base = new URL(page.url()).origin, checks = [], errors = [];
  const check = (ok, name) => { if (!ok) throw Error(name); checks.push(name); };
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(base + '/?qa=director-edges#/game/solo-soft-serve');
  await page.waitForFunction(() => document.querySelector('.launch-demo')?.disabled === false);
  await page.evaluate(async () => {
    const source = await (await fetch('/src/softServe/view.js')).text();
    const { CreatorMode } = await import(source.match(/from "([^"]*\/creator\/CreatorMode\.js[^"]*)"/)[1]);
    const { SoftServeGame } = await import(source.match(/from "([^"]*\/games\/softServe\.js[^"]*)"/)[1]);
    const step = SoftServeGame.prototype.step, finish = CreatorMode.prototype.finish;
    SoftServeGame.prototype.step = function (...args) { window.__game = this; const result = step.apply(this, args); if (this.elapsedMs > 5500) this.finish('splat'); return result; };
    CreatorMode.prototype.finish = async function (...args) { return window.__clip = await finish.apply(this, args); };
    window.__realShare = navigator.share; window.__realCanShare = navigator.canShare;
    Object.defineProperty(navigator, 'canShare', { configurable: true, value: () => true });
    Object.defineProperty(navigator, 'share', { configurable: true, value: async payload => { window.__sharedFile = payload.files[0]; } });
  });
  await page.locator('[data-creator-mode="creator"]').click(); await page.locator('.launch-demo').click();
  await page.locator('.ss-creator-face select').selectOption('HIDE');
  await page.locator('.creator-replay').waitFor({ timeout: 15000 });
  check(await page.evaluate(() => !__clip.events.some(e => e.type === 'HERO') && __clip.events.some(e => e.type === 'FAIL')), 'failed play yields FAIL without HERO');
  check(await page.evaluate(() => __clip.plans['15'].segments.some(s => s.kind === 'REACTION')), 'failed play retains reaction');
  await page.waitForFunction(() => !!__clip.files['15'] && !!__clip.files['7'], null, { timeout: 35000 });
  await page.locator('[data-creator-action="share"]').click();
  check(await page.evaluate(() => __sharedFile === __clip.files['15'] && __sharedFile instanceof File), 'SHARE passes the generated video File to native sharing');
  await page.locator('[data-creator-action="7"]').click();
  await page.locator('[data-creator-action="share"]').click();
  check(await page.evaluate(() => __sharedFile === __clip.files['7']), 'SHARE uses the selected seven-second version');
  // Unsupported browsers still get an automatic Canvas replay with recovery.
  await page.evaluate(() => { window.__nativeRecorder = window.MediaRecorder; window.MediaRecorder = undefined; });
  await page.locator('[data-result-action="retry"]').click();
  await page.locator('.creator-replay').waitFor({ timeout: 15000 });
  check(await page.locator('.creator-replay-canvas').isVisible(), 'unsupported encoder keeps the replay');
  check(await page.locator('.creator-export-status').innerText().then(t => t.includes('対応していません')), 'unsupported encoder has an explicit message');
  check(await page.locator('[data-creator-action="share"]').isDisabled(), 'unsupported video never offers a fake file share');
  await page.evaluate(() => { window.MediaRecorder = __nativeRecorder; });
  await page.locator('[data-result-action="retry"]').click();
  await page.locator('.creator-replay').waitFor({ timeout: 15000 });
  await page.locator('.game-back').click();
  await page.waitForTimeout(500);
  check(await page.evaluate(() => Object.keys(__clip.files).length === 0 && __clip.frames.length === 0), 'navigation during encoding discards media and cancels work');
  check(errors.length === 0, 'no failure/recovery browser errors');
  return { checks, errors, shareIsStubbed: true, physicalDevice: false };
}
