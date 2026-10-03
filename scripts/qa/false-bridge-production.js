async (page) => {
  const base = new URL(page.url()).origin, checks = [], errors = [];
  const check = (ok,name) => { if (!ok) throw Error(name); checks.push(name); };
  page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(() => { localStorage.setItem('camera-game-lab-locale','ja'); window.__cameraCalls = 0; navigator.mediaDevices.getUserMedia = async () => { __cameraCalls++; throw Error('Unexpected camera request'); }; });
  await page.emulateMedia({ reducedMotion:'reduce' }); await page.clock.install();
  await page.setViewportSize({ width:360,height:800 }); await page.goto(base + '/?qa=false-bridge-production#/game/outcam-false-bridge');
  await page.waitForFunction(() => document.querySelector('.launch-demo')?.disabled === false); await page.locator('.launch-demo').click(); await page.clock.runFor(150);
  await page.locator('.fb-lock').click();
  await page.screenshot({ path:'output/playwright/false-bridge-review-ja.png' });
  for (const [width,height] of [[360,500],[800,360],[360,800]]) {
    await page.setViewportSize({width,height});
    check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${width}x${height}: no overflow`);
    for (const selector of ['[data-fb="primary"]','[data-fb="secondary"]']) {
      await page.locator(selector).scrollIntoViewIfNeeded(); const box = await page.locator(selector).boundingBox();
      check(box && box.height >= 44 && box.y >= 0 && box.y + box.height <= height, `${width}x${height}: review button reachable`);
    }
  }
  for (let stage=0; stage<5; stage++) {
    for (let part=0; part<(stage===4 ? 2 : 1); part++) {
      if (stage!==0 || part!==0) await page.locator('.fb-lock').click();
      await page.locator('[data-fb="primary"]').click();
      check(await page.locator('.fb-lock-flash').evaluate(el=>getComputedStyle(el).animationName)==='none','reduced motion disables LOCK flash');
      await page.clock.runFor(stage===4 && part===0 ? 1100 : 2600);
    }
    check((await page.locator('.fb-overlay h3').textContent())==='YOUR FIT!',`stage ${stage+1}: self-judgment is honestly labeled`);
    await page.locator('[data-fb="primary"]').click(); await page.clock.runFor(100);
  }
  await page.locator('.platform-result').waitFor({state:'visible'});
  check((await page.locator('.platform-result').textContent()).includes('自己確認 6回'),'all six manual locks preserve provenance');
  check(await page.evaluate(()=>__cameraCalls===0),'production demo requests no camera');
  await page.locator('[data-result-action="next"]').click(); await page.locator('.lab-feed').waitFor({state:'visible'});
  check(await page.locator('.lab-feed').isVisible(),'NEXT returns to discovery');
  check(errors.length===0,'production has no uncaught errors'); return {checks,errors,physicalDevice:false};
}
