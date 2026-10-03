// Visual-state injection complements the real mouse/touch and synthetic-camera flow checks.
async (page) => {
  const base=new URL(page.url()).origin,checks=[],errors=[];
  const check=(ok,name)=>{if(!ok)throw Error(name);checks.push(name);};
  page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>localStorage.setItem('camera-game-lab-locale','ja'));
  await page.clock.install({time:new Date('2026-10-03T00:00:00Z')});
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.setViewportSize({width:390,height:844});
  await page.goto(base+'/?qa=visual&run='+Date.now()+'#/game/solo-soft-serve');
  await page.waitForFunction(()=>document.querySelector('.launch-demo')?.disabled===false);
  await page.locator('.launch-howto').click();
  check(await page.locator('.ss-howto li').count()===3,'how-to opens three actions');
  await page.locator('.sheet-close').click();
  await page.evaluate(async()=>{
    const source=await(await fetch('/src/softServe/view.js')).text();
    const {SoftServeGame}=await import(source.match(/from "([^"]*\/games\/softServe\.js[^"]*)"/)[1]);
    const original=SoftServeGame.prototype.step;
    SoftServeGame.prototype.step=function(...args){window.__game=this;return original.apply(this,args);};
    window.__seed=n=>{
      const g=window.__game;g.reset('demo');
      for(let t=0;t<1000;t+=20)g.step(20,{hand:{x:.5,y:.72}});
      let t=0;
      while(g.amount<n&&g.phase==='serve'){g.step(20,{hand:{x:.5+Math.sin(t/230)*Math.max(.025,.105-g.amount*.007)*.9,y:.72}});t+=20;}
    };
    window.__shareText='';
    Object.defineProperty(navigator,'share',{configurable:true,value:undefined});
    Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>window.__shareText=text}});
  });
  await page.locator('.launch-demo').click();await page.clock.runFor(1100);
  await page.locator('.ss-sound').click();
  check((await page.locator('.ss-sound').textContent()).includes('OFF'),'sound off with reduced motion');
  for(const n of [3,7,11]){
    await page.evaluate(n=>__seed(n),n);await page.clock.runFor(20);
    check(parseInt(await page.locator('.ss-height').textContent())===n,'actual '+n+'-swirl height');
    await page.screenshot({path:'output/playwright/soft-serve-'+n+'-swirls.png'});
  }
  await page.evaluate(()=>{__seed(3);__game.completeServe();});await page.clock.runFor(20);
  await page.locator('.ss-bite').click();await page.clock.runFor(160);
  await page.screenshot({path:'output/playwright/soft-serve-bite.png'});
  await page.evaluate(()=>{while(__game.amount>1)__game.bite();});
  await page.clock.runFor(20);await page.locator('.ss-bite').click();await page.clock.runFor(50);
  check(await page.locator('.ss-stage').evaluate(e=>e.classList.contains('is-finishing')),'last bite enters presentation before result');
  check(!(await page.locator('.platform-result').isVisible()),'result stays hidden during finish');
  await page.locator('.ss-pause').click();await page.clock.runFor(1600);
  check(!(await page.locator('.platform-result').isVisible()),'manual pause freezes finish presentation');
  await page.locator('.ss-pause').click();await page.clock.runFor(850);
  check((await page.locator('.platform-result h2').textContent()).includes('3段 完食'),'made height retained on clean result');
  const before=await page.evaluate(()=>JSON.parse(localStorage.getItem('camera-game-lab-soft-serve-rounds')).length);
  check(await page.locator('.ss-result-food').evaluate(c=>c.width>0&&c.height>0),'made shape painted after all cream is eaten');
  await page.locator('[data-result-action="share"]').click();
  check(await page.evaluate(()=>__shareText.includes('練習')&&__shareText.includes('3段完食！君は何段いける？')&&__shareText.includes('#/game/solo-soft-serve')),'clipboard challenge uses true result and canonical URL');
  await page.locator('.platform-locale').click();
  check((await page.locator('.ss-result-card').textContent()).includes('swirls eaten'),'English result re-renders');
  check(await page.evaluate(()=>JSON.parse(localStorage.getItem('camera-game-lab-soft-serve-rounds')).length)===before,'locale change does not append a receipt');
  await page.locator('.platform-locale').click();
  for(const size of [{width:360,height:800},{width:390,height:844},{width:720,height:1280},{width:360,height:500},{width:1440,height:900}]){
    await page.setViewportSize(size);
    check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'result fits width '+size.width+'x'+size.height);
    await page.locator('[data-result-action="retry"]').scrollIntoViewIfNeeded();
    check(await page.locator('[data-result-action="retry"]').isVisible(),'retry reachable '+size.width+'x'+size.height);
    await page.screenshot({path:'output/playwright/soft-serve-result-'+size.width+'x'+size.height+'.png'});
  }
  await page.setViewportSize({width:390,height:844});
  for(const outcome of ['splat','melted','empty']){
    await page.locator('[data-result-action="retry"]').click();await page.clock.runFor(1000);
    await page.evaluate(outcome=>{__seed(outcome==='empty'?0:3);__game.finish(outcome);},outcome);
    await page.clock.runFor(900);
    const text=await page.locator('.platform-result').textContent();
    check(!text.includes('段 完食')&&!text.includes('ごちそうさま'),'failure '+outcome+' never claims clean');
    await page.screenshot({path:'output/playwright/soft-serve-result-'+outcome+'.png'});
    await page.locator('[data-result-action="share"]').click();
    check(await page.evaluate(()=>__shareText.includes('段つくった')&&!__shareText.includes('段完食')),'failure challenge '+outcome);
  }
  // Leaving midway through a finish cannot deliver an old result into a new round.
  await page.locator('[data-result-action="retry"]').click();await page.clock.runFor(1000);
  await page.evaluate(()=>{__seed(1);__game.completeServe();while(__game.phase!=='result')__game.bite();});
  await page.clock.runFor(50);await page.locator('.game-back').click();await page.clock.runFor(1000);
  check(!(await page.locator('.platform-result').isVisible()),'route departure cancels pending finish');
  check(await page.evaluate(()=>!document.body.classList.contains('soft-serve-page')),'feed restores its original theme');
  check(errors.length===0,'no browser errors in visual states');
  return {checks,errors,syntheticStates:true,physicalDevice:false};
}
