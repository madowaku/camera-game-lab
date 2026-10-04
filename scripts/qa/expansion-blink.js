// V0.2 browser QA through real practice controls. Does not certify camera hardware.
async (page) => {
  const base = new URL(page.url()).origin, checks = [], errors = [];
  const check = (ok, name) => { if (!ok) throw Error(name); checks.push(name); };
  page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(() => {
    localStorage.setItem('camera-game-lab-platform-onboarded-v1', 'true'); localStorage.setItem('camera-game-lab-locale', 'en');
    window.__mediaRequests = 0; navigator.mediaDevices.getUserMedia = async () => { __mediaRequests++; throw new DOMException('QA denial', 'NotAllowedError'); };
    Object.defineProperty(navigator, 'share', { configurable: true, value: undefined });
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async text => { window.__shared = text; } } });
  });
  await page.clock.install(); await page.clock.pauseAt(new Date());
  const pulse = async () => { await page.locator('.bh-hide').focus(); await page.keyboard.down('Space'); await page.clock.runFor(150); await page.keyboard.up('Space'); await page.clock.runFor(70); };
  const waitStage = async stage => { for (let i = 0; i < 180; i++) { if (await page.locator('.bh-stage').getAttribute('data-stage') === stage) return; await page.clock.runFor(100); } throw Error('stage not reached: ' + stage); };
  for (const [width, height] of [[360,800],[720,1280],[1440,900]]) {
    await page.setViewportSize({ width, height }); const requests = []; const collect = r => requests.push(r.url()); page.on('request', collect);
    await page.goto(base + '/?qa=blink-v2-' + width + '#/feed/solo-blink-horror');
    const card = page.locator('[data-id="solo-blink-horror"]'); await card.waitFor(); await page.clock.runFor(100);
    check(!requests.some(u => /src\/(blink|input)\/|\.task|\.wasm/.test(u)), width + ': Feed stays sensor/model free'); page.off('request', collect);
    await page.screenshot({ path: 'output/playwright/blink-v2-feed-' + width + '.png' }); await card.locator('[data-action="play"]').click();
    await page.waitForFunction(() => document.querySelector('.launch-demo')?.disabled === false);
    check((await page.locator('.arcade-steps').textContent()).includes('locker'), width + ': entrance teaches v0.2 rules');
    await page.screenshot({ path: 'output/playwright/blink-v2-entry-' + width + '.png', fullPage:true });
    await page.locator('.launch-demo').click(); await page.clock.runFor(800);
    check((await page.locator('.bh-message').textContent()).includes('Close both eyes once'), width + ': calibration requires closed confirmation');
    await pulse(); await page.clock.runFor(1400);
    check(await page.locator('.bh-stage').getAttribute('data-monster') === '0', width + ': open eyes do not approach monster');
    await page.clock.runFor(2200); check((await page.locator('.bh-progress-value').textContent()) !== 'EXIT 100m', width + ': eyes open advance to exit');
    await page.screenshot({ path: 'output/playwright/blink-v2-run-' + width + '.png' });
    check(await page.locator('.bh-corridor').evaluate(i => i.complete && i.naturalWidth > 0), width + ': Imagegen corridor loads');
    await pulse(); check(await page.locator('.bh-stage').getAttribute('data-monster') === '1', width + ': blink adds exactly one stage');
    await page.screenshot({ path: 'output/playwright/blink-v2-reflection-' + width + '.png' });
    await page.locator('.bh-pause').click(); const frozen = await page.locator('.bh-progress-value').textContent(); await page.clock.runFor(2000);
    check(await page.locator('.bh-progress-value').textContent() === frozen, width + ': manual pause freezes distance');
    await page.locator('.bh-pause').click(); await page.clock.runFor(500); await waitStage('HIDE');
    check((await page.locator('.bh-message').textContent()).includes('BLINK NOW'), width + ': locker teaches safe blink');
    await pulse(); await pulse(); check(await page.locator('.bh-stage').getAttribute('data-monster') === '1', width + ': repeated locker blinks are safe');
    check((await page.locator('.bh-message').textContent()).includes('SAFE BLINK'), width + ': safe blink receives feedback');
    await page.screenshot({ path: 'output/playwright/blink-v2-locker-' + width + '.png' }); await waitStage('DONT_LOOK');
    check((await page.locator('.bh-message').textContent()).includes('DON’T LOOK'), width + ': rule reversal is explicit');
    await page.screenshot({ path: 'output/playwright/blink-v2-dont-look-' + width + '.png' });
    await page.locator('.bh-hide').focus(); await page.keyboard.down('Space'); await waitStage('GO'); await page.keyboard.up('Space'); await page.clock.runFor(900);
    check(await page.locator('.bh-stage').getAttribute('data-monster') === '1', width + ': successful pass adds no danger');
    check(await page.locator('.bh-stage').getAttribute('data-stage') === 'RUN', width + ': GO resumes running');
    await page.clock.runFor(11500); check(await page.locator('.bh-stage').evaluate(e => e.classList.contains('is-escaped')), width + ': EXIT opens and closes');
    await page.clock.runFor(1100); await pulse(); check(await page.locator('.bh-stage').evaluate(e => e.classList.contains('is-peek')), width + ': final blink triggers harmless reflection');
    await page.clock.runFor(2000); await page.locator('.platform-result').waitFor({state:'visible'});
    check((await page.locator('.bh-receipt').textContent()).includes('ESCAPED'), width + ': result is escaped');
    check((await page.locator('.bh-receipt').textContent()).includes('BEST'), width + ': blink/time/best metrics are visible');
    check(await page.evaluate(() => !document.querySelector('video').srcObject && window.__mediaRequests === 0), width + ': practice never requests camera');
    check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), width + ': no horizontal overflow');
    await page.screenshot({ path:'output/playwright/blink-v2-result-' + width + '.png',fullPage:true });
    await page.locator('[data-result-action="share"]').click(); check(await page.evaluate(() => /Practice.*ESCAPED/.test(__shared) && __shared.includes('#/game/solo-blink-horror')), width + ': share preserves practice and outcome');
    await page.locator('[data-result-action="retry"]').click(); await page.clock.runFor(800); await pulse(); await page.clock.runFor(1400);
    for(let i=0;i<4;i++) await pulse(); await page.clock.runFor(1100); await page.locator('.platform-result').waitFor({state:'visible'});
    check((await page.locator('.bh-receipt').textContent()).includes('CAUGHT'), width + ': four unsafe blinks cause caught');
    await page.locator('.platform-locale').click(); check((await page.locator('.bh-source').textContent()).includes('練習'), width + ': Japanese result keeps provenance');
    await page.locator('[data-result-action="next"]').click(); check(!page.url().includes('#/game/solo-blink-horror'), width + ': NEXT departs');
  }
  check(errors.length === 0, 'no uncaught browser errors'); await page.clock.resume(); return { checks, errors, physicalDevice:false };
}
