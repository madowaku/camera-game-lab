async (page) => {
  const base=new URL(page.url()).origin;
  const checks=[]; const errors=[]; page.on('pageerror',error=>errors.push(error.message));
  await page.setViewportSize({width:720,height:1280});
  const games=[['#duo','duo',37000],['#guardian','guardian',41000],['#note-blaster','blaster',37000],['#watermelon','watermelon',37000]];
  await page.clock.install();
  for(const [hash,name,duration] of games){
    await page.goto(base+'/'+hash);
    await page.waitForFunction(()=>document.querySelector('.launch-demo')?.disabled === false);
    await page.locator('.launch-demo').click();
    await page.clock.runFor(duration);
    await page.locator('.platform-result').waitFor({state:'visible',timeout:5000});
    await page.screenshot({path:'output/playwright/platform-'+name+'-result.png'});
    checks.push(name+' legacy deep link and demo complete');
    await page.locator('[data-result-action="retry"]').click();
    if(await page.locator('.platform-result').isVisible())throw Error(name+' retry did not clear result');
    checks.push(name+' retry');
    await page.locator('.game-back').click();
    await page.locator('.lab-feed').waitFor({state:'visible'});
    if(await page.evaluate(()=>[...document.querySelectorAll('video')].some(v=>v.srcObject)))throw Error(name+' stream leaked');
  }
  if(errors.length)throw Error(errors.join(';'));
  return {checks,errors};
}
