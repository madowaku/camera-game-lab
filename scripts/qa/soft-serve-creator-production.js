// Runs against dev / production using actual public controls. Use a fresh CLI
// session after each build: an older PWA controller may auto-reload mid-round.
async (page) => {
  const base=new URL(page.url()).origin,checks=[],errors=[];
  const check=(ok,name)=>{if(!ok)throw Error(name);checks.push(name);};
  page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>localStorage.setItem('camera-game-lab-locale','ja'));
  await page.clock.install();
  await page.setViewportSize({width:390,height:844});
  await page.goto(base+'/?qa=creator-flow&run='+Date.now()+'#/game/solo-soft-serve');
  await page.waitForFunction(()=>document.querySelector('.launch-demo')?.disabled===false);
  await page.locator('[data-creator-mode="creator"]').click();
  await page.locator('.launch-demo').click();await page.clock.runFor(1250);
  const box=await page.locator('.ss-stage').boundingBox();
  for(let i=0;i<40;i++){
    await page.mouse.move(box.x+box.width*(.5+Math.sin(i*.72)*Math.max(.045,.09-i*.0007)),box.y+box.height*.72);
    await page.clock.runFor(180);
  }
  check(parseInt(await page.locator('.ss-height').textContent())>=4,'actual creator demo winds four or more swirls');
  await page.locator('.ss-finish').click();await page.clock.runFor(30);
  let count=0;
  while(await page.locator('.ss-bite').isVisible()&&count++<15){await page.locator('.ss-bite').click();await page.clock.runFor(220);}
  await page.clock.runFor(1900);await page.locator('.creator-replay').waitFor();
  check(await page.locator('.creator-replay-canvas').evaluate(c=>c.width===270&&c.height===480),'built creator flow reaches portrait replay');
  await page.waitForTimeout(100);await page.screenshot({path:'output/playwright/creator-production-replay.png'});
  await page.clock.runFor(6700);await page.screenshot({path:'output/playwright/creator-production-outro.png'});
  check(await page.locator('.game-cache').isVisible()===false,'replay replaces live game UI');
  await page.locator('[data-creator-action="replay"]').click();await page.clock.runFor(250);
  await page.locator('[data-result-action="retry"]').click();await page.clock.runFor(1100);
  check(await page.locator('.ss-view').evaluate(e=>e.classList.contains('is-creator')),'built retry retains creator mode');
  await page.locator('.game-back').click();
  check(await page.evaluate(()=>!document.body.classList.contains('soft-serve-page')),'creator departure restores feed');
  check(errors.length===0,'no built creator errors');
  return {checks,errors,physicalDevice:false,syntheticInput:false};
}
