async (page) => {
  await page.clock.resume(); const base=new URL(page.url()).origin, checks=[], errors=[];
  const check=(ok,label)=>{ if(!ok) throw Error(label); checks.push(label); }; page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/?qa=pose-wall-production-'+Date.now()+'#/game/solo-pose-wall'); await page.waitForFunction(()=>document.querySelector('.pw-entry .launch-demo')?.disabled===false);
  await page.setViewportSize({width:360,height:800});
  check(await page.locator('.pw-cover img').evaluate(i=>i.complete&&i.naturalWidth>0),'built Imagegen cover loads');
  check(await page.evaluate(()=>!performance.getEntriesByType('resource').some(e=>/\.wasm|\.task|poseWall-.*\.js/.test(e.name))),'entry loads no model or BGM');
  await page.clock.install(); await page.locator('.launch-demo').click(); await page.clock.runFor(650);
  for(let i=0;i<5;i++){ await page.locator('[data-pose="'+i+'"]').click(); await page.clock.runFor(3000); }
  await page.locator('.pw-result').waitFor();
  check((await page.locator('.pw-result h2').textContent()).trim()==='100%','production perfect round has 100% measured result');
  check((await page.locator('[data-rank="PERFECT"] b').first().textContent())==='5','five PERFECT results');
  check((await page.locator('.pw-practice-label').textContent()).includes('PRACTICE'),'production result labels camera-free practice');
  check(await page.evaluate(()=>!performance.getEntriesByType('resource').some(e=>/\.mp3(?:\?|$)/.test(e.name))),'music is bundled into lazy JS instead of a standalone MP3 URL');
  await page.locator('[data-result-action="retry"]').click(); await page.clock.runFor(650);
  check(await page.locator('[data-pose="0"]').isVisible(),'production retry restores pose controls');
  await page.screenshot({path:'output/playwright/pose-wall-production-360.png',fullPage:true});
  check(await page.evaluate(()=>document.querySelector('.pw-rest').getBoundingClientRect().bottom<=innerHeight),'mobile practice controls stay in the viewport');
  await page.locator('.game-back').click(); await page.locator('.lab-feed').waitFor(); check(errors.length===0,'production has no browser exceptions'); return {checks,errors};
}
