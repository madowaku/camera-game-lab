// Synthetic creator frames test composition/replay; no physical camera is used.
async (page) => {
  const base=new URL(page.url()).origin,checks=[],errors=[];
  const check=(ok,name)=>{if(!ok)throw Error(name);checks.push(name);};
  page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>localStorage.setItem('camera-game-lab-locale','ja'));
  await page.setViewportSize({width:390,height:844});
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.goto(base+'/?qa=creator&run='+Date.now()+'#/game/solo-soft-serve');
  await page.waitForFunction(()=>document.querySelector('.launch-demo')?.disabled===false);
  await page.evaluate(()=>{window.__realNow=performance.now.bind(performance);});
  await page.clock.install();
  await page.evaluate(async()=>{
    const source=await(await fetch('/src/softServe/view.js')).text();
    const {SoftServeGame}=await import(source.match(/from "([^"]*\/games\/softServe\.js[^"]*)"/)[1]);
    const {SoftServeInput}=await import(source.match(/from "([^"]*\/input\/softServeInput\.js[^"]*)"/)[1]);
    SoftServeInput.prototype.start=async()=>{throw new DOMException('QA permission denied','NotAllowedError');};
    const original=SoftServeGame.prototype.step;
    SoftServeGame.prototype.step=function(...args){window.__game=this;return original.apply(this,args);};
    const {CreatorMode}=await import(source.match(/from "([^"]*\/creator\/CreatorMode\.js[^"]*)"/)[1]);
    const {drawSoftServe}=await import(source.match(/from "([^"]*\/softServe\/renderer\.js[^"]*)"/)[1]);
    const compose=CreatorMode.prototype.compose;
    const fake=document.createElement('canvas');fake.width=270;fake.height=480;
    Object.assign(fake,{videoWidth:270,videoHeight:480,readyState:3,srcObject:{}});
    const c=fake.getContext('2d');c.fillStyle='#b7c4ba';c.fillRect(0,0,270,480);
    c.fillStyle='#d6aa8c';c.beginPath();c.ellipse(135,177,58,78,0,0,Math.PI*2);c.fill();
    c.fillStyle='#483b34';c.fillRect(107,157,12,6);c.fillRect(151,157,12,6);c.fillStyle='#ad5358';c.beginPath();c.ellipse(135,218,16,10,0,0,Math.PI*2);c.fill();
    const face={left:.285,right:.715,top:.2,bottom:.53,eyeLeft:{x:.41,y:.33},eyeRight:{x:.59,y:.33},mouth:{x:.5,y:.454}};
    window.__costs=[];
    CreatorMode.prototype.compose=function(video,food,data){window.__creator=this;const start=__realNow();if(window.__game)drawSoftServe(food,__game,{demo:false,animation:this.__animation});compose.call(this,fake,food,{...data,source:'camera',face,open:true});__costs.push(__realNow()-start);};
    window.__seed=n=>{
      __game.reset('demo');
      for(let t=0;t<1000;t+=20)__game.step(20,{hand:{x:.5,y:.72}});
      let t=0;while(__game.amount<n&&__game.phase==='serve'){__game.step(20,{hand:{x:.5+Math.sin(t/230)*Math.max(.025,.105-__game.amount*.007)*.9,y:.72}});t+=20;}
    };
  });
  for(const mode of ['ORIGINAL','EFFECT','HIDE']){
    await page.locator('[data-creator-mode="creator"]').click();
    check(await page.locator('.creator-face-picker').isVisible(),'one-step '+mode+' selector');
    await page.waitForTimeout(200);
    await page.screenshot({path:'output/playwright/creator-entry-'+mode+'.png'});
    await page.locator('[data-face-mode="'+mode+'"]').click();
    await page.locator('.ss-recovery').waitFor();
    check(await page.locator('.ss-retry').isVisible(),'face choice immediately starts camera '+mode);
    await page.locator('.ss-demo').click();await page.clock.runFor(1200);
    check(await page.locator('.ss-view').evaluate(e=>e.classList.contains('is-creator')),'creator enabled '+mode);
    const box=await page.locator('.ss-stage').boundingBox();
    check(Math.abs(box.width/box.height-9/16)<.001,'9:16 scene '+mode);
    await page.evaluate(()=>__seed(3));
    for(let i=0;i<4;i++){await page.clock.runFor(200);await page.waitForTimeout(40);}
    await page.screenshot({path:'output/playwright/creator-face-'+mode+'.png'});
    check(await page.evaluate(mode=>__creator.faceMode===mode,mode),'selected face mode reaches compositor '+mode);
    check(await page.evaluate(()=>__creator.highlights.events.some(e=>e.type==='perfect')),'game emits perfect highlight '+mode);
    await page.evaluate(()=>__seed(10));await page.clock.runFor(900);
    check(await page.evaluate(()=>__creator.highlights.events.some(e=>e.type==='fail')),'game emits oversize highlight '+mode);
    await page.screenshot({path:'output/playwright/creator-ohno-'+mode+'.png'});
    await page.evaluate(()=>{__game.completeServe();while(__game.phase!=='result')__game.bite();});
    await page.clock.runFor(300);await page.waitForTimeout(50);
    await page.screenshot({path:'output/playwright/creator-delicious-'+mode+'.png'});
    check(await page.evaluate(()=>__creator.highlights.events.some(e=>e.type==='finish'&&e.data.final)),'game emits final-bite highlight '+mode);
    check(!(await page.locator('.platform-result').isVisible()),'creator finale precedes replay '+mode);
    for(let i=0;i<8;i++){await page.clock.runFor(220);await page.waitForTimeout(35);}
    await page.locator('.creator-replay').waitFor();
    check(await page.evaluate(()=>__creator.frames.length===0&&__creator.live.length===0),'game recorder releases its buffers after replay handoff '+mode);
    check(await page.locator('.creator-replay-canvas').evaluate(c=>c.width===270&&c.height===480),'replay canvas preserves portrait pixels '+mode);
    await page.clock.runFor(6500);await page.waitForTimeout(40);
    await page.screenshot({path:'output/playwright/creator-replay-outro-'+mode+'.png'});
    await page.locator('[data-creator-action="replay"]').click();await page.clock.runFor(400);await page.waitForTimeout(50);
    await page.screenshot({path:'output/playwright/creator-replay-'+mode+'.png'});
    const count=await page.evaluate(()=>JSON.parse(localStorage.getItem('camera-game-lab-soft-serve-rounds')).length);
    await page.locator('[data-creator-action="replay"]').click();await page.clock.runFor(100);
    check(await page.evaluate(()=>JSON.parse(localStorage.getItem('camera-game-lab-soft-serve-rounds')).length)===count,'REPLAY does not append a result '+mode);
    await page.locator('[data-result-action="retry"]').click();await page.clock.runFor(1200);
    check(await page.evaluate(mode=>__creator.faceMode===mode,mode),'PLAY AGAIN retains creator face mode '+mode);
    await page.locator('.game-back').click();
    await page.evaluate(()=>{location.hash='#/game/solo-soft-serve';});
    await page.waitForFunction(()=>document.querySelector('.launch-demo')?.disabled===false);
  }
  check(await page.evaluate(()=>__costs.every(Number.isFinite)),'composition timing collected');
  check(errors.length===0,'no creator browser errors');
  return {checks,errors,synthetic:true,physicalDevice:false,compositionMs:await page.evaluate(()=>({mean:__costs.reduce((a,b)=>a+b,0)/__costs.length,max:Math.max(...__costs),frames:__costs.length}))};
}
