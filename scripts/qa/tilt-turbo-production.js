async(page)=>{
  await page.clock.resume();const base=new URL(page.url()).origin,checks=[],errors=[];const check=(ok,label)=>{if(!ok)throw Error(label);checks.push(label);};page.on('pageerror',e=>errors.push(e.message));
  await page.setViewportSize({width:390,height:844});await page.goto(base+'/?qa=tilt-production-'+Date.now()+'#tilt-turbo');await page.waitForFunction(()=>document.querySelector('.tt-entry .launch-demo')?.disabled===false);
  check((await page.title()).startsWith('TILT TURBO'),'production alias resolves');check(await page.locator('.tt-cover img').evaluate(i=>i.complete&&i.naturalWidth>0),'production cover loads');
  check(await page.evaluate(()=>!document.querySelector('.tt-stage video').srcObject&&!performance.getEntriesByType('resource').some(e=>/\.task|\.wasm/.test(e.name))),'production entrance sensor-free');
  await page.locator('[data-creator-mode="creator"]').click();await page.locator('[data-face-mode="HIDE"]').click();await page.clock.install();await page.clock.pauseAt(new Date(await page.evaluate(()=>Date.now()+1000)));await page.locator('.launch-demo').click();await page.clock.runFor(3050);
  await page.keyboard.down('ArrowLeft');await page.clock.runFor(350);await page.keyboard.up('ArrowLeft');await page.screenshot({path:'output/playwright/tilt-turbo-production-play-390.png',fullPage:true});
  check(await page.locator('.tt-practice').evaluate(e=>e.getBoundingClientRect().bottom<=innerHeight),'production mobile controls fit');
  check(await page.locator('.tt-canvas').evaluate(canvas=>{const d=canvas.getContext('2d').getImageData(0,0,360,640).data;let orange=0;for(let i=0;i<d.length;i+=4)if(d[i]>180&&d[i+1]>40&&d[i+1]<150&&d[i+2]<100)orange++;return orange>3000;}),'production car and avatar render');
  for(let i=0;i<22;i++){await page.clock.runFor(1000);await page.waitForTimeout(25);}await page.locator('.tt-result').waitFor();
  check((await page.locator('.tt-result').textContent()).includes('20.00 SEC'),'production fixed finish');check((await page.locator('.tt-result').textContent()).includes('PRACTICE'),'production practice provenance');check(await page.locator('.tt-replay-canvas').isVisible(),'production creator replay');
  await page.screenshot({path:'output/playwright/tilt-turbo-production-result-390.png',fullPage:true});
  // Use real time for MediaRecorder; the result only records its local canvas.
  await page.clock.resume();const downloadPromise=page.waitForEvent('download');await page.locator('.tt-save').click();const download=await downloadPromise;await download.saveAs('output/playwright/'+download.suggestedFilename());check(/tilt-turbo-.*\.(webm|mp4)$/.test(download.suggestedFilename()),'production seven-second clip downloads');
  await page.locator('[data-result-action="retry"]').click();await page.waitForFunction(()=>document.querySelector('.tt-source')?.textContent.includes('CREATOR'));check(await page.locator('.tt-practice').isVisible(),'production retry keeps demo and creator');
  await page.locator('.game-back').click();await page.locator('.lab-feed').waitFor();check(await page.locator('.feed-card[data-id="solo-tilt-turbo"] .game-preview img').evaluate(i=>i.complete&&i.naturalWidth>0),'production feed cover loads');
  check(errors.length===0,'no production browser exceptions');return {checks,errors};
}
