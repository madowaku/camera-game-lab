async(page)=>{
  const base=new URL(page.url()).origin,checks=[],errors=[],check=(ok,name)=>{if(!ok)throw Error(name);checks.push(name);};
  page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{localStorage.setItem('camera-game-lab-locale','ja');localStorage.setItem('camera-game-lab-platform-onboarded-v1','true');});
  await page.goto(base+'/?hookprod='+Date.now()+'#/game/solo-hook');await page.locator('.launch-demo:not(:disabled)').waitFor();
  check(await page.locator('.hook-roster img').evaluateAll(a=>a.every(i=>i.complete&&i.naturalWidth>0)),'production packages all five generated fish');
  await page.setViewportSize({width:390,height:844});await page.clock.install();await page.locator('.launch-demo').click();await page.clock.runFor(400);
  await page.waitForFunction(()=>document.querySelectorAll('.hook-stage canvas').length===2);await page.clock.pauseAt(await page.evaluate(()=>Date.now()));
  check(await page.locator('.hook-hint').evaluate(e=>e.getBoundingClientRect().bottom<=innerHeight),'mobile controls and instructions fit viewport');
  await page.locator('.hook-action').click();await page.clock.runFor(1700);check(await page.locator('.hook-stage').getAttribute('data-phase')==='bite','touch cast reaches BITE in production');
  const b=await page.locator('.hook-stage').boundingBox();await page.mouse.move(b.x+b.width*.5,b.y+b.height*.55);await page.mouse.down();await page.mouse.move(b.x+b.width*.5,b.y+b.height*.38,{steps:5});await page.mouse.up();await page.clock.runFor(100);
  check(await page.locator('.hook-stage').getAttribute('data-phase')==='fight','real upward drag hooks in production');
  let held=null;
  for(let i=0;i<30;i++){
    if(await page.locator('.hook-stage').getAttribute('data-phase')!=='fight')break;
    const next=await page.locator('[data-pull][data-cue=true]').getAttribute('data-pull');
    if(next!==held){await page.mouse.up();const p=await page.locator(`[data-pull="${next}"]`).boundingBox();await page.mouse.move(p.x+p.width*.5,p.y+p.height*.5);await page.mouse.down();held=next;}
    await page.clock.runFor(120);
  }
  await page.mouse.up();check(await page.locator('.hook-stage').getAttribute('data-phase')==='landing','held touch counterpull lands a fish');await page.clock.runFor(350);await page.screenshot({path:'output/playwright/hook-production-landing.png'});
  await page.clock.runFor(1100);check(await page.locator('.hook-count').textContent()==='01','production shows one real catch');
  await page.screenshot({path:'output/playwright/hook-production-catch.png'});
  await page.locator('.hook-pause').click();const time=await page.locator('.hook-time').textContent();await page.clock.runFor(900);check(await page.locator('.hook-time').textContent()===time,'production pause freezes timer');await page.locator('.hook-resume').click();
  await page.locator('.hook-locale').click();check((await page.locator('.hook-source').textContent()).includes('PRACTICE'),'production JA/EN preserves touch round');
  await page.clock.runFor(31000);await page.locator('.hook-result').waitFor();await page.clock.runFor(1000);
  check(await page.locator('.hook-result-score strong').evaluate(e=>Number(e.textContent.replaceAll(',',''))>0),'production reports the earned catch score');
  check(await page.locator('.hook-save-photo').count()===1,'production offers only player-selected photo saving');
  const download=page.waitForEvent('download');await page.locator('.hook-save-photo').click();const file=await download;check(file.suggestedFilename()==='hook-big-catch.png','photo saves a real local PNG');
  await page.locator('.hook-result-score').scrollIntoViewIfNeeded();await page.screenshot({path:'output/playwright/hook-production-result.png'});
  await page.locator('[data-result-action=retry]').click();await page.clock.runFor(300);check(await page.locator('.hook-count').textContent()==='00','production retry resets catches');
  await page.clock.resume();await page.locator('.game-back').click();await page.waitForFunction(()=>!document.querySelector('.hook-stage canvas'));
  check(await page.locator('.platform-header').isVisible(),'feed header returns after immersive play');check(errors.length===0,'no uncaught production errors');return{checks,errors};
}
