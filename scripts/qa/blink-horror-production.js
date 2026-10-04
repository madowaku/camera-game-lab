// Compiled production smoke test: no game internals or camera fixture required.
async (page) => {
 const checks=[],errors=[],base=new URL(page.url()).origin;
 const check=(ok,name)=>{if(!ok)throw Error(name);checks.push(name);}; page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{localStorage.setItem('camera-game-lab-locale','ja');localStorage.setItem('camera-game-lab-platform-onboarded-v1','true');window.__requests=0;navigator.mediaDevices.getUserMedia=async()=>{__requests++;throw new DOMException('QA denied','NotAllowedError');};});
 await page.clock.install();await page.clock.pauseAt(new Date());await page.setViewportSize({width:390,height:844});
 await page.goto(base+'/?qa=blink-production#/game/solo-blink-horror');await page.waitForFunction(()=>document.querySelector('.launch-demo')?.disabled===false);
 await page.locator('.launch-howto').click();check((await page.locator('.sheet-content').textContent()).includes('不穏ROOM'),'OpenTracks credit appears in production');await page.keyboard.press('Escape');
 await page.locator('.launch-demo').click();await page.clock.runFor(800);await page.locator('.bh-hide').focus();await page.keyboard.down('Space');await page.clock.runFor(160);await page.keyboard.up('Space');await page.clock.runFor(1600);
 check(await page.locator('.bh-corridor').evaluate(i=>i.complete&&i.naturalWidth>0),'bundled Imagegen background loads');
 for(let i=0;i<160 && await page.locator('.bh-stage').getAttribute('data-stage')!=='HIDE';i++)await page.clock.runFor(100);
 await page.locator('.bh-hide').focus();await page.keyboard.down('Space');await page.clock.runFor(150);await page.keyboard.up('Space');await page.clock.runFor(100);
 for(let i=0;i<40 && await page.locator('.bh-stage').getAttribute('data-stage')!=='DONT_LOOK';i++)await page.clock.runFor(100);
 await page.keyboard.down('Space');await page.clock.runFor(4300);await page.keyboard.up('Space');await page.clock.runFor(15500);
 await page.locator('.platform-result').waitFor({state:'visible'});check((await page.locator('.bh-receipt').textContent()).includes('ESCAPED'),'full production round escapes');
 check(await page.evaluate(()=>__requests===0),'practice requests no camera');check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'production has no horizontal overflow');
 await page.screenshot({path:'output/playwright/blink-v2-production-result-390.png',fullPage:true});check(errors.length===0,'no production page errors');await page.clock.resume();return{checks,errors};
}
