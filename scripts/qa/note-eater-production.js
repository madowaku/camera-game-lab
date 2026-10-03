// Built bundle smoke check using only public controls, including touch input.
async (page) => {
  const base=new URL(page.url()).origin,checks=[],errors=[];
  const check=(ok,name)=>{if(!ok)throw Error(name);checks.push(name);};page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>localStorage.setItem('camera-game-lab-locale','en'));
  await page.setViewportSize({width:390,height:844});await page.goto(base+'/?qa=note-eater-production&run='+Date.now()+'#/game/solo-note-eater');
  await page.waitForFunction(()=>document.querySelector('.launch-demo')?.disabled===false);
  if(await page.evaluate(()=>document.documentElement.lang)!=='en')await page.locator('.platform-locale').click();
  check(await page.locator('.ne-cover img').evaluate(i=>i.complete&&i.naturalWidth>0),'built artwork loads');
  check(await page.evaluate(()=>!performance.getEntriesByType('resource').some(e=>/\.wasm|\.task/.test(e.name))),'built entrance does not request models');
  await page.clock.install({time:new Date('2026-10-03T00:00:00Z')});
  await page.locator('.launch-demo').click();await page.clock.runFor(150);await page.locator('.ne-bite').click();await page.clock.runFor(3300);
  check(await page.locator('.ne-cue').textContent()==='Which note next?','built tutorial reaches main round');
  const bounds=await page.locator('.ne-stage').boundingBox(),cdp=await page.context().newCDPSession(page);
  await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true});
  for(const [x,y] of [[.12,.35],[.85,.5],[.5,.15],[.5,.82],[.25,.6],[.7,.3],[.5,.5],[.25,.4],[.8,.65]]) {
    const touch=(x,y)=>[{x:bounds.x+bounds.width*x,y:bounds.y+bounds.height*y,id:1}];
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:touch(.5,.55)});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:touch(x,y)});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    await page.locator('.ne-bite').click();await page.clock.runFor(1700);
  }
  check(parseInt(await page.locator('.ne-count').textContent())>0,'built touch aiming and bite controls eat notes');
  await page.screenshot({path:'output/playwright/note-eater-production-playing-390.png'});
  await page.clock.runFor(31000);await page.locator('.ne-result').waitFor();
  check((await page.locator('.ne-result').textContent()).includes('Camera-free practice'),'built result retains source');
  check(await page.locator('.ne-melody-play').isEnabled(),'built melody is available');
  await page.locator('.ne-melody-play').click();check((await page.locator('.ne-melody-play').textContent()).includes('STOP'),'built replay starts');await page.locator('.ne-melody-play').click();
  await page.screenshot({path:'output/playwright/note-eater-production-result-390.png'});
  await page.locator('[data-result-action="retry"]').click();await page.clock.runFor(100);check((await page.locator('.ne-source').textContent()).includes('practice'),'built retry retains practice');
  await page.setViewportSize({width:1440,height:900});check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'built desktop has no overflow');
  await page.screenshot({path:'output/playwright/note-eater-production-tutorial-1440.png'});
  await page.goto(base+'/#/');check(errors.length===0,'no built bundle browser errors');return{checks,errors};
}
