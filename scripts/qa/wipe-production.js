// Verify the built deployment artifact without development imports or test hooks.
async page=>{
  const base=new URL(page.url()).origin,checks=[],errors=[],failed=[];
  const check=(ok,label)=>{if(!ok)throw Error(label);checks.push(label);};page.on('pageerror',e=>errors.push(e.message));page.on('requestfailed',r=>failed.push(r.url()));
  await page.goto(base+'/?qa=wipe-production#/game/solo-wipe');await page.waitForFunction(()=>document.querySelector('.wipe-entry .launch-demo')?.disabled===false);
  for(const size of [{width:1440,height:900},{width:390,height:844}]){
    await page.setViewportSize(size);check(await page.locator('.wipe-cover img').evaluate(i=>i.complete&&i.naturalWidth>0),'built cover loads '+size.width);check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'built entry fits '+size.width);
  }
  await page.locator('.launch-demo').click();await page.locator('.wipe-stage').waitFor();await page.locator('.wipe-stage').scrollIntoViewIfNeeded();
  const b=await page.locator('.wipe-stage').boundingBox();await page.mouse.move(b.x+b.width*.2,b.y+b.height*.3);await page.mouse.down();await page.waitForTimeout(150);await page.mouse.move(b.x+b.width*.75,b.y+b.height*.3,{steps:15});await page.waitForTimeout(120);await page.mouse.up();
  check(await page.locator('[data-side="0"] strong').textContent()!=='0%','built mouse drag cleans glass');
  check(await page.locator('.wipe-canvas').evaluate(c=>{const p=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let varied=false;for(let i=0;i<p.length;i+=800)if(p[i]!==p[0]){varied=true;break;}return varied;}),'built canvas contains varied rendered pixels');
  await page.screenshot({path:'output/playwright/wipe-production-play-390.png',fullPage:true});
  await page.locator('.game-back').click();await page.locator('.lab-feed').waitFor();
  await page.evaluate(()=>{location.hash='#/game/duo-wipe';});await page.waitForFunction(()=>document.querySelector('.wipe-entry')?.dataset.wipeMode==='duo'&&document.querySelector('.launch-demo')?.disabled===false);
  await page.locator('.launch-demo').click();await page.locator('[data-side="1"]').waitFor();check(await page.locator('.wipe-play').getAttribute('data-mode')==='duo','built DUO module loads');
  await page.screenshot({path:'output/playwright/wipe-production-duo-390.png',fullPage:true});await page.locator('.game-back').click();await page.locator('.lab-feed').waitFor();
  check(errors.length===0,'no built browser exceptions');check(failed.length===0,'no failed built asset requests');return {checks,errors,failed};
}
