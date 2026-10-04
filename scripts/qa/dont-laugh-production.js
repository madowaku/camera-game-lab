// Bundled production smoke check with real wall-clock pointer input.
async (page) => {
  const base=new URL(page.url()).origin,checks=[],errors=[];const check=(ok,label)=>{if(!ok)throw Error(label);checks.push(label);};page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/?qa=dont-laugh-production-'+Date.now()+'#/game/solo-dont-laugh');await page.waitForFunction(()=>document.querySelector('.launch-demo')?.disabled===false);
  for(const size of[{width:1440,height:900},{width:390,height:844}]){await page.setViewportSize(size);check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'production entry fits '+size.width);check(await page.locator('.dl-cover img').evaluate(i=>i.complete&&i.naturalWidth>0),'production artwork '+size.width);await page.screenshot({path:`output/playwright/dont-laugh-production-entry-${size.width}.png`,fullPage:true});}
  await page.locator('[data-dl-mode="creator"]').click();await page.locator('[data-dl-face="HIDE"]').click();await page.locator('.launch-demo').click();await page.waitForFunction(()=>document.querySelector('.dl-smile')?.disabled===false);
  check(await page.locator('.dl-stage canvas').evaluate(c=>new Set(c.getContext('2d').getImageData(0,0,c.width,c.height).data).size>50),'production playfield has rendered pixels');
  const b=await page.locator('.dl-smile').boundingBox();await page.mouse.move(b.x+b.width/2,b.y+b.height/2);await page.mouse.down();await page.waitForTimeout(500);await page.mouse.up();await page.locator('.dl-result').waitFor({timeout:5000});
  check((await page.locator('.dl-result-title').textContent()).includes('CAUGHT YOU.'),'real pointer hold loses');check(await page.locator('.dl-save').isVisible(),'production CREATOR save present');
  check(await page.locator('.dl-photo canvas').evaluate(c=>new Set(c.getContext('2d').getImageData(0,0,c.width,c.height).data).size>50),'production frozen result has pixels');
  check(await page.evaluate(()=>!document.querySelector('.dl-stage video').srcObject&&!performance.getEntriesByType('resource').some(e=>/\.task|\.wasm/.test(e.name))),'production practice uses no camera/model');
  await page.screenshot({path:'output/playwright/dont-laugh-production-caught-390.png',fullPage:true});await page.locator('[data-result-action="retry"]').click();await page.waitForFunction(()=>document.querySelector('.dl-smile')?.disabled===false);check(await page.locator('.dl-stage').isVisible(),'production retry works');
  await page.locator('.game-back').click();await page.locator('.lab-feed').waitFor();check(errors.length===0,'no production browser exceptions');return{checks,errors};
}
