// CLI browser QA: actual touch/mouse and DOM controls, no automatic game hooks.
async (page) => {
  const base = new URL(page.url()).origin, checks = [], errors = [];
  const check = (ok, name) => { if (!ok) throw Error(name); checks.push(name); };
  page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(() => {
    localStorage.setItem('camera-game-lab-platform-onboarded-v1', 'true'); localStorage.setItem('camera-game-lab-locale', 'en');
    window.__bridgeRequests = 0;
    navigator.mediaDevices.getUserMedia = async () => { window.__bridgeRequests++; throw new DOMException('QA denied', 'NotAllowedError'); };
    Object.defineProperty(navigator, 'share', { configurable: true, value: undefined });
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async text => { window.__bridgeShared = text; } } });
  });
  await page.clock.install();
  const stages = [[{ x:180,y:244,angle:0 }], [{ x:213,y:222,angle:90 }], [{ x:180,y:148,angle:0 }], [{ x:180,y:179,angle:0 }], [{ x:180,y:219,angle:0 },{ x:244,y:282,angle:90 }]];
  for (const [width,height] of [[360,800],[720,1280],[1440,900]]) {
    await page.setViewportSize({ width,height });
    const requests = [], collect = request => requests.push(request.url()); page.on('request', collect);
    await page.goto(base + '/?qa=false-bridge-' + width + '#/feed/outcam-false-bridge');
    const card = page.locator('[data-id="outcam-false-bridge"]'); await card.waitFor(); await page.clock.runFor(200);
    check(!requests.some(url => /src\/falseBridge\/|mediapipe|\.task(?:\?|$)/.test(url)), `${width}: feed loads no game, sensor or model`); page.off('request', collect);
    await page.screenshot({ path: `output/playwright/false-bridge-feed-${width}.png` });
    await card.locator('[data-action="play"]').click(); await page.locator('.launch-demo').waitFor();
    await page.waitForFunction(() => document.querySelector('.launch-demo')?.disabled === false);
    check((await page.locator('.launch-reason').textContent()).includes('rear camera'), `${width}: explains perspective and rear camera`);
    await page.locator('.launch-demo').click(); await page.clock.runFor(250);
    const scene = page.locator('.fb-scene');
    await page.locator('.fb-lock').click();
    check((await page.locator('.fb-overlay h3').textContent()) === 'LOOK GOOD?', `${width}: empty lock asks for judgment`);
    await page.locator('[data-fb="secondary"]').click(); check(await page.locator('.fb-lock').isEnabled(), `${width}: retry resumes alignment`);
    const client = width === 360 ? await page.context().newCDPSession(page) : null;
    for (let stage = 0; stage < stages.length; stage++) {
      for (let part = 0; part < stages[stage].length; part++) {
        const target = stages[stage][part];
        // Dispatch range input through the same DOM path as native slider input.
        await page.locator('.fb-angle').evaluate((el, value) => { el.value = value; el.dispatchEvent(new Event('input', { bubbles:true })); }, target.angle);
        await page.locator('.fb-size').evaluate(el => { el.value = 1; el.dispatchEvent(new Event('input', { bubbles:true })); });
        await scene.scrollIntoViewIfNeeded(); const b = await scene.boundingBox(), point = { x:b.x + target.x / 360 * b.width, y:b.y + target.y / 440 * b.height };
        if (client) { await client.send('Input.dispatchTouchEvent',{ type:'touchStart',touchPoints:[{ ...point,id:1 }] }); await client.send('Input.dispatchTouchEvent',{ type:'touchEnd',touchPoints:[] }); }
        else { await page.mouse.move(point.x,point.y); await page.mouse.down(); await page.mouse.up(); }
        await page.clock.runFor(300);
        check((await page.locator('.fb-feedback').textContent()) === 'LOCK READY', `${width}: stage ${stage+1} part ${part+1} aligns`);
        await page.screenshot({ path:`output/playwright/false-bridge-stage-${stage+1}-${part+1}-${width}.png` });
        await page.locator('.fb-lock').click(); await page.clock.runFor(stage === 4 && part === 0 ? 1100 : 2600);
        if (stage === 4 && part === 0) {
          check(await page.locator('.fb-lock').isEnabled() && (await page.locator('.fb-part').textContent()) === '2 / 2', `${width}: first lock stays while next part is aligned`);
          await page.screenshot({ path:`output/playwright/false-bridge-first-lock-${width}.png` });
        }
      }
      check(await page.locator('.fb-overlay.is-clear').isVisible(), `${width}: stage ${stage+1} animates to clear`);
      await page.locator('[data-fb="primary"]').click(); await page.clock.runFor(100);
    }
    await page.locator('.platform-result').waitFor({ state:'visible' });
    check((await page.locator('.fb-receipt').textContent()).includes('WORLD COMPLETE'), `${width}: completes all five worlds`);
    check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${width}: no horizontal overflow`);
    await page.locator('[data-result-action="share"]').click();
    check(await page.evaluate(() => __bridgeShared.includes('Demo') && __bridgeShared.includes('5/5 CLEAR') && __bridgeShared.includes('#/game/outcam-false-bridge')), `${width}: share preserves demo and route`);
    await page.locator('.platform-locale').click();
    check((await page.locator('.fb-receipt').textContent()).includes('デモの結果'), `${width}: Japanese results`);
    await page.screenshot({ path:`output/playwright/false-bridge-result-ja-${width}.png` });
    await page.locator('.platform-locale').click(); await page.locator('[data-result-action="retry"]').click(); await page.clock.runFor(100);
    check((await page.locator('.fb-stage-label').textContent()).includes('01 / FALSE BRIDGE'), `${width}: retry resets stage`);
    await scene.focus(); const angle = await page.locator('.fb-angle').inputValue(); await page.keyboard.press('e');
    check(Number(await page.locator('.fb-angle').inputValue()) > Number(angle), `${width}: keyboard rotates material`);
    await page.locator('.fb-pause').click(); check(await page.locator('.fb-lock').isDisabled(), `${width}: pause blocks LOCK`); await page.locator('[data-fb="primary"]').click();
    check(await page.locator('.fb-lock').isEnabled(), `${width}: explicit resume restores input`);
    check(await page.evaluate(() => __bridgeRequests === 0), `${width}: demo never requests camera`);
    if (client) await client.detach();
  }
  await page.goto(base + '/#false-bridge'); await page.waitForFunction(() => document.querySelector('.launch-camera')?.disabled === false);
  await page.locator('.launch-camera').click(); await page.locator('[data-fb="secondary"]').waitFor({ state:'visible' });
  check((await page.locator('.fb-overlay h3').textContent()).includes('Rear camera unavailable'), 'permission denial has recovery');
  await page.locator('[data-fb="secondary"]').click(); await page.clock.runFor(150);
  check(await page.locator('.fb-lock').isEnabled(), 'permission denial can recover into demo');
  check(errors.length === 0, 'no unhandled page errors');
  return { checks, errors, physicalDevice:false, touchAt360:true };
}
