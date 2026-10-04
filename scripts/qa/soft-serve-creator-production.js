// Runs against dev / production using actual public controls. Use a fresh CLI
// session after each build: an older PWA controller may auto-reload mid-round.
async (page) => {
  const base=new URL(page.url()).origin,checks=[],errors=[];
  const check=(ok,name)=>{if(!ok)throw Error(name);checks.push(name);};
  page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>localStorage.setItem('camera-game-lab-locale','ja'));
  await page.setViewportSize({width:390,height:844});
  await page.goto(base+'/?qa=creator-flow&run='+Date.now()+'#/game/solo-soft-serve');
  await page.waitForFunction(()=>document.querySelector('.launch-demo')?.disabled===false);
  await page.locator('[data-creator-mode="creator"]').click();
  await page.locator('.launch-demo').click();await page.waitForTimeout(1250);
  const box=await page.locator('.ss-stage').boundingBox();
  for(let i=0;i<40;i++){
    await page.mouse.move(box.x+box.width*(.5+Math.sin(i*.72)*Math.max(.045,.09-i*.0007)),box.y+box.height*.72);
    await page.waitForTimeout(180);
  }
  check(parseInt(await page.locator('.ss-height').textContent())>=4,'actual creator demo winds four or more swirls');
  await page.locator('.ss-finish').click();await page.waitForTimeout(30);
  let count=0;
  while(await page.locator('.ss-bite').isVisible()&&count++<15){await page.locator('.ss-bite').click();await page.waitForTimeout(220);}
  await page.locator('.creator-replay').waitFor({timeout:10000});
  check(await page.locator('.creator-replay-canvas').evaluate(c=>c.width===540&&c.height===960),'built creator flow reaches portrait replay');
  await page.waitForTimeout(100);await page.screenshot({path:'output/playwright/creator-production-replay.png'});
  await page.waitForFunction(()=>document.querySelector('[data-creator-action="share"]')?.disabled===false,null,{timeout:20000});
  check(await page.locator('.creator-replay-video').evaluate(v=>v.videoWidth===540&&v.videoHeight===960&&v.duration<=15),'built output is a real portrait video within 15 seconds');
  await page.locator('[data-creator-action="7"]').click();
  await page.waitForFunction(()=>document.querySelector('[data-creator-action="share"]')?.disabled===false,null,{timeout:12000});
  check(await page.locator('.creator-replay-video').evaluate(v=>v.duration<=7&&v.duration>3),'built seven-second output can play');
  await page.screenshot({path:'output/playwright/creator-production-outro.png'});
  check(await page.locator('.game-cache').isVisible()===false,'replay replaces live game UI');
  await page.locator('[data-creator-action="replay"]').click();await page.waitForTimeout(250);
  await page.locator('[data-result-action="retry"]').click();await page.waitForTimeout(1100);
  check(await page.locator('.ss-view').evaluate(e=>e.classList.contains('is-creator')),'built retry retains creator mode');
  await page.locator('.game-back').click();
  check(await page.evaluate(()=>!document.body.classList.contains('soft-serve-page')),'creator departure restores feed');
  check(errors.length===0,'no built creator errors');
  return {checks,errors,physicalDevice:false,syntheticInput:false};
}
