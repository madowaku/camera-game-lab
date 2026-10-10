// Playwright CLI run-code --filename. Local Vite only; generated steering
// exercises the real view/renderer without opening a physical camera.
async (page) => {
  const base=new URL(page.url()).origin,checks=[],errors=[];
  const check=(ok,label)=>{if(!ok)throw Error(label);checks.push(label);};
  page.on('pageerror',error=>errors.push(error.message));
  await page.clock.resume();
  await page.setViewportSize({width:390,height:844});
  await page.goto(base+'/?qa=rival-sprint#tilt-turbo');
  await page.waitForFunction(()=>document.querySelector('.launch-demo')?.disabled===false);
  await page.evaluate(async()=>{
    const registry=await(await fetch('/src/platform/experiments.js')).text();
    const path=registry.match(/import\("([^"]*tiltTurbo\/view\.js[^"]*)"\)/)[1];
    const {TiltTurboView}=await import(path);
    const {roadCenter}=await import('/src/tiltTurbo/core.js');
    const setup=TiltTurboView.prototype.setup;
    TiltTurboView.prototype.setup=function(...args){window.__tt=this;return setup.apply(this,args);};
    window.__follow=()=>{
      __tt.getMotion=()=>({tracked:true,ready:true,roll:12,
        steering:roadCenter(__tt.game.elapsed+100,__tt.game.course.path)/(1.12*__tt.game.car.steeringGain)});
    };
  });
  await page.clock.install();
  await page.clock.pauseAt(new Date(await page.evaluate(()=>Date.now()+1000)));
  await page.locator('.launch-demo').click();
  await page.clock.runFor(3000);
  check(await page.evaluate(()=>__tt.game.position===5 && __tt.game.rivals.length===4),'starts behind four named racers');
  await page.evaluate(()=>__follow());
  await page.clock.runFor(6100);
  check(await page.evaluate(()=>__tt.game.position===4 && __tt.game.overtakes===1),'clean driving reaches and passes the first rival');
  check(await page.evaluate(()=>__tt.game.turboMs>0),'pass activates short automatic turbo');
  check((await page.locator('.tt-race-status').textContent()).includes('5台中4位'),'accessible HUD exposes live position');
  check((await page.locator('.tt-canvas').getAttribute('aria-label')).includes('POSITION 4/5'),'canvas label includes position');
  await page.screenshot({path:'output/playwright/pr17-rivals-turbo-390.png'});
  await page.locator('.tt-pause').click();
  const paused=await page.evaluate(()=>JSON.stringify([__tt.game.elapsed,__tt.game.distance,__tt.game.rivals.map(r=>r.distance),__tt.game.turboMs]));
  await page.clock.runFor(500);
  check(await page.evaluate(()=>JSON.stringify([__tt.game.elapsed,__tt.game.distance,__tt.game.rivals.map(r=>r.distance),__tt.game.turboMs]))===paused,'pause freezes both player and rivals');
  await page.locator('.tt-resume').click();
  await page.evaluate(()=>{__tt.reducedMotion=true;__tt.draw();});
  await page.screenshot({path:'output/playwright/pr17-rivals-turbo-reduced-390.png'});
  await page.clock.runFor(16000);
  await page.locator('.tt-result').waitFor();
  check(await page.evaluate(()=>__tt.game.result.position===1),'clean Toy Town run can win');
  check((await page.locator('.tt-finish-position').textContent()).includes('1位'),'winning result uses real finish rank');
  check(await page.locator('.tt-result').evaluate(report=>{
    const style=getComputedStyle(report);
    return style.backgroundColor==='rgb(246, 240, 221)' && style.color==='rgb(24, 60, 60)';
  }),'result report owns a readable paper background inside the shared menu');
  check(await page.evaluate(()=>document.querySelector('.tt-finish-position').getBoundingClientRect().top<document.querySelector('.tt-score').getBoundingClientRect().top),'finish position comes before score');
  await page.locator('.tt-standings summary').click();
  check(await page.locator('.tt-standings li').count()===5,'finish order includes the same persistent racers');
  check(await page.locator('.tt-standings li').first().evaluate(row=>row.classList.contains('tt-you')),'winner is first in the race order');
  await page.screenshot({path:'output/playwright/pr17-rivals-win-390.png',fullPage:true});
  await page.locator('[data-result-action="retry"]').click();
  await page.clock.runFor(3100);
  check(await page.evaluate(()=>__tt.game.position===5 && __tt.game.overtakes===0 && __tt.game.turboMs===0),'retry resets rank, rewards and turbo');
  await page.locator('.game-back').click();
  await page.clock.resume();
  await page.locator('.lab-feed').waitFor();
  check(errors.length===0,'no browser exceptions');
  return {checks,errors};
}
