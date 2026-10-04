// Built-bundle smoke test using public UI only.
async (page)=>{
  const base=new URL(page.url()).origin,checks=[],errors=[];const check=(ok,label)=>{if(!ok)throw Error(label);checks.push(label);};page.on('pageerror',e=>errors.push(e.message));
  await page.goto('about:blank');await page.addInitScript(()=>{if(location.protocol.startsWith('http')){localStorage.setItem('camera-game-lab-locale','en');localStorage.setItem('human-clock-difficulty','easy');}});
  await page.goto(base+'/?qa=hc-built-'+Date.now()+'#/game/solo-human-clock');await page.waitForFunction(()=>document.querySelector('.hc-entry .launch-demo')?.disabled===false);
  await page.setViewportSize({width:390,height:844});await page.emulateMedia({reducedMotion:'reduce'});
  check(await page.locator('.hc-cover img').evaluate(i=>i.complete&&i.naturalWidth>0),'built Imagegen art loads');
  check(await page.evaluate(()=>!performance.getEntriesByType('resource').some(e=>/\.task|\.wasm/.test(e.name)||/humanClock-.*\.js/.test(e.name)&&e.decodedBodySize>100000)),'built entry loads no model or BGM');
  await page.clock.install();await page.locator('.launch-demo').click();await page.clock.runFor(700);
  const solve=async()=>{
    const text=await page.locator('.hc-target strong').textContent(),[hour,minute]=text.split(':').map(Number),values={hour:(hour%12)*30+minute*.5,minute:minute*6};
    for(const side of ['hour','minute'])await page.locator(`[data-angle="${side}"]`).evaluate((el,value)=>{el.value=String(value);el.dispatchEvent(new Event('input',{bubbles:true}));},values[side]);
    await page.clock.runFor(450);
  };
  await solve();check(await page.locator('.hc-score').textContent()==='01','built controls complete actual displayed time');
  check(await page.locator('.hc-feedback').isVisible(),'built success animation visible under reduced motion');
  await page.screenshot({path:'output/playwright/human-clock-production-tick-390.png',fullPage:true});
  // Select a stationary direction which cannot solve any new question by itself.
  await page.clock.runFor(600);for(const side of ['hour','minute'])await page.locator(`[data-angle="${side}"]`).evaluate(el=>{el.value='135';el.dispatchEvent(new Event('input',{bubbles:true}));});
  await page.clock.runFor(30000);await page.locator('.hc-result').waitFor();
  check((await page.locator('.hc-result').textContent()).includes('1TIME')&&(await page.locator('.hc-result').textContent()).includes('Camera-free practice'),'built measured one-clock result');
  await page.screenshot({path:'output/playwright/human-clock-production-result-390.png',fullPage:true});
  for(const width of [390,360]){
    await page.setViewportSize({width,height:844});
    check(await page.locator('.hc-result-art>span').evaluate(span=>span.getBoundingClientRect().bottom<=span.parentElement.getBoundingClientRect().bottom),'result banner text fits '+width);
    check(await page.locator('[data-result-action="next"]').evaluate(b=>getComputedStyle(b).whiteSpace==='nowrap'&&b.scrollWidth<=b.clientWidth),'NEXT label fits '+width);
    check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'result has no overflow '+width);
    await page.screenshot({path:`output/playwright/human-clock-production-result-${width}.png`,fullPage:true});
  }
  await page.locator('[data-result-action="retry"]').click();await page.clock.runFor(700);check(await page.locator('.hc-score').textContent()==='00','built RETRY resets round');
  await page.locator('.game-back').click();await page.locator('.lab-feed').waitFor();check(await page.locator('.lab-feed').isVisible(),'built exit returns to feed');
  await page.clock.resume();check(errors.length===0,'built bundle has no browser exceptions');return{checks,errors};
}
