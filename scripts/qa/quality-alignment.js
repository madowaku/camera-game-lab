// Entrances on the built site; demo runs use the real existing controllers.
async (page) => {
  const base=new URL(page.url()).origin, checks=[], errors=[], failed=[];
  const check=(ok,name)=>{if(!ok)throw Error(name);checks.push(name);};
  page.on('pageerror',e=>errors.push(e.message));
  page.on('response',r=>{if(r.status()>=400)failed.push(r.url()+': '+r.status());});
  await page.addInitScript(()=>{
    localStorage.setItem('camera-game-lab-platform-onboarded-v1','true');
    window.__permissionRequests=0;
    navigator.mediaDevices.getUserMedia=async()=>{window.__permissionRequests++;throw new DOMException('QA denied','NotAllowedError');};
    Object.defineProperty(navigator,'share',{configurable:true,value:undefined});
    Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>window.__sharedText=text}});
  });
  await page.emulateMedia({reducedMotion:'reduce'});
  const ids=['solo-hand-beat','solo-finger-gun','solo-eat-dont-eat','solo-blink-horror','solo-pinch-world','solo-ghost-trail','voice-note-blaster','duo-tiny-bot-duel','guardian-spirit','outcam-watermelon-guide','outcam-false-bridge','outcam-frame-smuggler','solo-daitai-hero','outcam-the-camera-is-it'];
  for(const locale of ['ja','en']) {
    await page.goto(base+'/#/');await page.evaluate(locale=>localStorage.setItem('camera-game-lab-locale',locale),locale);
    for(const size of [{width:390,height:844},{width:360,height:500},{width:1440,height:900}]) {
      await page.setViewportSize(size);
      for(const id of ids) {
        await page.goto(base+'/?qa=quality#/game/'+id);
        await page.waitForFunction(()=>document.querySelector('.launch-camera')?.disabled===false);
        check(await page.locator('.arcade-steps li').count()===3,`${locale} ${size.width} ${id}: three actions`);
        check(await page.locator('.arcade-hero img').isVisible(),`${locale} ${size.width} ${id}: illustrated scene`);
        check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${locale} ${size.width} ${id}: fits width`);
        await page.locator('.launch-camera').scrollIntoViewIfNeeded();
        check(await page.locator('.launch-camera').isVisible(),`${locale} ${size.width} ${id}: PLAY reachable`);
        check(await page.evaluate(()=>__permissionRequests===0),`${locale} ${size.width} ${id}: permission waits for PLAY`);
        await page.locator('.launch-howto').click();
        check(await page.locator('.arcade-howto li').count()===3,`${locale} ${size.width} ${id}: full how-to`);
        await page.keyboard.press('Escape');
        check(await page.locator('.launch-howto').evaluate(e=>e===document.activeElement),`${locale} ${size.width} ${id}: how-to returns focus`);
        if(locale==='ja' && ['solo-finger-gun','solo-eat-dont-eat','duo-tiny-bot-duel','solo-ghost-trail'].includes(id) && size.height!==500){
          await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:`output/playwright/quality-${id}-${size.width}.png`});
        }
      }
    }
  }
  await page.setViewportSize({width:390,height:844});
  await page.goto(base+'/#/explore');
  check(await page.locator('.explore-card').count()>=15,'catalog preserves all 15 games');
  check(await page.locator('.explore-art img[src^="/artwork/"]').count()===15,'all 15 games use generated cover artwork');
  await page.screenshot({path:'output/playwright/quality-explore-390.png'});
  const demos=[['duo-tiny-bot-duel',37000],['guardian-spirit',41000],['voice-note-blaster',37000],['outcam-watermelon-guide',37000],['solo-daitai-hero',34000],['solo-ghost-trail',37000],['solo-blink-horror',34000],['outcam-frame-smuggler',37000],['outcam-the-camera-is-it',37000]];
  await page.clock.install();
  for(const [id,duration] of demos) {
    await page.goto(base+'/?qa=quality#/game/'+id);
    await page.waitForFunction(()=>document.querySelector('.launch-demo')?.disabled===false);
    await page.locator('.launch-demo').click();
    if(id==='outcam-frame-smuggler') { await page.clock.runFor(1100); await page.locator('.fs-start').click(); }
    await page.clock.runFor(duration);
    await page.locator('.arcade-result-card').waitFor({state:'visible'});
    check((await page.locator('.arcade-result-source').textContent()).includes('PRACTICE'),id+': result labels practice');
    check(await page.evaluate(()=>__permissionRequests===0),id+': demo never requests camera');
    check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),id+': result fits mobile');
    check(await page.locator('[data-result-action="retry"]').evaluate(e=>e===document.activeElement),id+': result focuses retry');
    await page.locator('[data-result-action="share"]').click();
    check(await page.evaluate(id=>/practice|demo/i.test(__sharedText)&&__sharedText.includes('#/game/'+id),id),id+': share labels practice and canonical URL');
    await page.screenshot({path:'output/playwright/quality-result-'+id+'.png'});
    if(id==='duo-tiny-bot-duel')check(await page.locator('.duo-metrics').isVisible(),'duel keeps playtest/export details');
    if(id==='outcam-frame-smuggler')check(await page.locator('.fs-swap').isVisible(),'smuggler keeps swap roles');
    if(id==='guardian-spirit') {
      await page.locator('.gs-enter-photo').click();
      check(await page.locator('.guardian-stage').isVisible(),'guardian PHOTO MODE restores its stage');
      check(await page.locator('.gs-shot').isVisible(),'guardian PHOTO MODE keeps capture');
    }
    await page.locator('[data-result-action="retry"]').click();await page.clock.runFor(800);
    check(!(await page.locator('.platform-result').isVisible()),id+': retry clears result');
    await page.locator('.game-back').click();
    await page.locator('.lab-feed').waitFor();
  }
  await page.clock.resume();
  await page.goto(base+'/#/game/solo-soft-serve');
  await page.waitForFunction(()=>document.querySelector('.launch-demo')?.disabled===false);
  check(await page.locator('.ss-entry').isVisible(),'SOFT SERVE retains its custom presentation');
  check(await page.locator('.creator-mode-tabs').isVisible(),'SOFT SERVE retains CREATOR');
  await page.locator('.game-back').click();
  await page.locator('.lab-feed').waitFor();
  check(await page.evaluate(()=>!document.body.classList.contains('soft-serve-page')&&!document.querySelector('.platform--arcade')),'route restores feed theme');
  check(errors.length===0,'no uncaught browser errors: '+errors.join(';'));
  check(failed.length===0,'no broken resources: '+failed.join(';'));
  return {checks:checks.length,entrances:84,demoRounds:demos.length,errors,failed,physicalDevice:false};
}
