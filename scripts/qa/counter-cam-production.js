async (page) => {
  await page.clock.resume(); for (const key of ['KeyG','KeyF','ArrowLeft','ArrowRight']) await page.keyboard.up(key);
  const base=new URL(page.url()).origin,checks=[],errors=[]; const check=(ok,label)=>{if(!ok)throw Error(label);checks.push(label);};
  page.on('pageerror',e=>errors.push(e.message));
  await page.setViewportSize({width:390,height:844}); await page.goto(base+'/?qa=counter-cam-production-'+Date.now()+'#counter-cam');
  await page.waitForFunction(()=>document.querySelector('.cc-entry .launch-demo')?.disabled===false);
  check((await page.title()).startsWith('COUNTER CAM'),'production alias resolves canonical game');
  check(await page.locator('.cc-cover img').evaluate(i=>i.complete&&i.naturalWidth>0),'production generated cover loads');
  check(await page.evaluate(()=>!document.querySelector('.cc-stage video').srcObject&&!performance.getEntriesByType('resource').some(e=>/\.task|\.wasm/.test(e.name))),'production entry is sensor-free');
  await page.clock.install();await page.clock.pauseAt(new Date(await page.evaluate(()=>Date.now()+1000)));await page.locator('.launch-demo').click();await page.clock.runFor(750);
  check((await page.locator('.cc-hint').textContent()).includes('拳'),'production calibration asks for punch');
  await page.keyboard.press('Space');await page.clock.runFor(50);await page.keyboard.down('ArrowLeft');await page.clock.runFor(50);await page.keyboard.up('ArrowLeft');await page.keyboard.down('ArrowRight');await page.clock.runFor(50);await page.keyboard.up('ArrowRight');await page.clock.runFor(600);
  check(await page.locator('.cc-calibration').isHidden(),'production movement tutorial reaches fight');
  await page.keyboard.down('KeyG');await page.clock.runFor(1800);
  check(await page.locator('.cc-charge').evaluate(b=>b.getBoundingClientRect().bottom<=innerHeight),'production practice controls fit mobile screen');
  check(await page.locator('.cc-canvas').evaluate(canvas=>{const d=canvas.getContext('2d').getImageData(0,0,360,640).data;let bright=0;for(let i=0;i<d.length;i+=4)if(d[i]>150)bright++;return bright>5000;}),'production game canvas draws robot and HUD');
  await page.screenshot({path:'output/playwright/counter-cam-production-play-390.png',fullPage:true});
  await page.clock.runFor(31000);await page.keyboard.up('KeyG');await page.locator('.cc-result').waitFor();
  check((await page.locator('.cc-result h2').textContent()).includes('TIME UP'),'production round reaches measured TIME UP');
  check((await page.locator('.cc-result').textContent()).includes('PRACTICE'),'production result shows practice provenance');
  await page.locator('[data-result-action="retry"]').click();await page.clock.runFor(750);
  check((await page.locator('.cc-hint').textContent()).includes('拳'),'production RETRY returns to clean calibration');
  await page.locator('.game-back').click();await page.locator('.lab-feed').waitFor();
  check(await page.locator('.feed-card[data-id="solo-counter-cam"] .game-preview img').evaluate(async i=>{await i.decode();return i.complete&&i.naturalWidth>0;}),'production feed preview loads');
  await page.clock.resume();check(errors.length===0,'no production browser exceptions');return {checks,errors};
}
