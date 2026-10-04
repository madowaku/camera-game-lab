// Run with playwright-cli run-code --filename. This checks synthetic behavior;
// real palms and human delight are separate device playtest gates.
async page => {
  await page.clock.resume();
  const base=new URL(page.url()).origin,checks=[],errors=[];
  const check=(ok,label)=>{if(!ok)throw Error(label);checks.push(label);};
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('about:blank');
  await page.addInitScript(()=>{if(location.protocol.startsWith('http'))localStorage.setItem('camera-game-lab-locale','ja');});
  await page.goto(base+'/#/game/solo-wipe');
  await page.waitForFunction(()=>document.querySelector('.wipe-entry .launch-demo')?.disabled===false);
  await page.evaluate(async()=>{
    const registry=await (await fetch('/src/platform/experiments.js')).text(),path=registry.match(/import\("([^"]*wipe\/view\.js[^"]*)"\)/)[1];
    const {WipeView}=await import(path),render=WipeView.prototype.render;
    WipeView.prototype.render=function(...args){window.__wipe=this;return render.apply(this,args);};
  });
  for(const size of [{width:1440,height:900},{width:390,height:844},{width:360,height:800}]){
    await page.setViewportSize(size);
    check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'entry fits '+size.width);
    check(await page.locator('.wipe-cover img').evaluate(i=>i.complete&&i.naturalWidth>0),'Imagegen cover loads '+size.width);
    check(await page.locator('.launch-camera').evaluate(b=>b.getBoundingClientRect().height>=44),'PLAY touch target '+size.width);
    await page.screenshot({path:`output/playwright/wipe-entry-${size.width}.png`,fullPage:true});
  }
  check(await page.evaluate(()=>!performance.getEntriesByType('resource').some(e=>/\.task|\.wasm/.test(e.name))&&!document.querySelector('.wipe-stage video').srcObject),'entry starts no sensors or models');
  await page.locator('.launch-howto').click();check((await page.locator('.sheet-content').textContent()).includes('お掃除しましょ'),'OpenTracks credit is reachable');await page.keyboard.press('Escape');
  await page.locator('.platform-locale').click();check((await page.locator('.wipe-tagline').textContent()).includes('perfect shine'),'English entry');await page.locator('.platform-locale').click();
  await page.locator('button[data-wipe-mode="duo"]').click();await page.waitForFunction(()=>location.hash==='#/game/duo-wipe'&&document.querySelector('.wipe-entry')?.dataset.wipeMode==='duo'&&document.querySelector('.wipe-entry .launch-demo')?.disabled===false);
  check(await page.locator('button[data-wipe-mode="duo"]').getAttribute('aria-pressed')==='true','mode picker uses canonical DUO route');
  await page.locator('button[data-wipe-mode="solo"]').click();await page.waitForFunction(()=>location.hash==='#/game/solo-wipe'&&document.querySelector('.wipe-entry')?.dataset.wipeMode==='solo'&&document.querySelector('.wipe-entry .launch-demo')?.disabled===false);
  await page.setViewportSize({width:390,height:844});
  await page.locator('[data-wipe-recording="creator"]').click();await page.locator('[data-wipe-face="HIDE"]').click();
  await page.clock.install();
  await page.locator('.launch-demo').click();await page.locator('.wipe-play').waitFor();
  const advance=async ms=>{await page.clock.runFor(ms);};
  await advance(100);
  check(await page.evaluate(()=>__wipe.game.percent()===0&&__wipe.phase==='waiting'),'practice waits at opaque 0%');
  const b=await page.locator('.wipe-stage').boundingBox();
  await page.mouse.move(b.x+b.width*.15,b.y+b.height*.18);await page.mouse.down();await advance(150);
  await page.mouse.move(b.x+b.width*.75,b.y+b.height*.2,{steps:10});await advance(150);await page.mouse.up();
  check(await page.evaluate(()=>__wipe.game.percent()>0&&__wipe.game.percent()<100),'actual mouse drag cleans glass');
  check(await page.evaluate(()=>__wipe.creator.frames.length>0),'CREATOR captures composed frames');
  await page.screenshot({path:'output/playwright/wipe-play-390.png',fullPage:true});
  await page.locator('.wipe-pause').click();const at=await page.evaluate(()=>__wipe.game.elapsed);await advance(800);check(await page.evaluate(()=>__wipe.game.elapsed)===at,'pause freezes round');await page.locator('.wipe-resume').click();
  await page.locator('.wipe-sound').click();check(await page.locator('.wipe-sound').getAttribute('aria-pressed')==='false','SFX mute works');await page.locator('.wipe-sound').click();
  await page.locator('.game-music').click();check(await page.locator('.game-music').getAttribute('aria-pressed')==='false','BGM mute works');await page.locator('.game-music').click();
  // Synthetic sweep feeds the same game API; only the opening drag uses the OS mouse.
  await page.evaluate(()=>{
    const g=__wipe.game;
    for(let pass=0;pass<3;pass++)for(let y=0;y<=1.00001;y+=.06)for(let k=0;k<=20;k++)g.wipe({x:k/20,y,id:999,radius:.135,present:true});
  });
  await advance(200);check(await page.evaluate(()=>__wipe.game.phase==='finish'&&__wipe.game.percent()===100),'actual zero dirt gives PERFECT');
  await page.screenshot({path:'output/playwright/wipe-perfect-390.png',fullPage:true});
  await advance(1500);await page.locator('.wipe-result').waitFor();
  check((await page.locator('.wipe-result').textContent()).includes('PERFECT WINDOW!'),'result reports PERFECT');
  check((await page.locator('.wipe-result').textContent()).includes('PRACTICE'),'result labels practice');
  check(await page.evaluate(()=>!__wipe.input.running&&!__wipe.audio.context&&__wipe.frameId===null),'result releases camera, sound and animation');
  check(await page.locator('.wipe-replay canvas').count()===1,'7-second replay available');
  await page.screenshot({path:'output/playwright/wipe-result-390.png',fullPage:true});
  await page.clock.resume();
  await page.locator('[data-wipe-clip="encode"]').click();
  await page.waitForFunction(()=>document.querySelector('[data-wipe-clip="save"]')?.disabled===false,{},{timeout:16000});
  check((await page.locator('.wipe-export-status').textContent()).includes('できました'),'7-second video encodes');
  const downloadPending=page.waitForEvent('download');await page.locator('[data-wipe-clip="save"]').click();const download=await downloadPending;
  await download.saveAs('output/playwright/'+download.suggestedFilename());check(/camera-game-049-7s\.(mp4|webm)$/.test(download.suggestedFilename()),'encoded WIPE video can be saved');
  await page.locator('[data-result-action="retry"]').click();await page.locator('.wipe-play').waitFor();
  check(await page.evaluate(()=>__wipe.source==='demo'&&__wipe.game.percent()===0&&__wipe.options.faceMode==='HIDE'),'retry keeps practice and HIDE with fresh dirt');
  await page.locator('.game-back').click();await page.goto(base+'/#/game/duo-wipe');
  await page.waitForFunction(()=>document.querySelector('.wipe-entry .launch-demo')?.disabled===false);
  check(await page.locator('button[data-wipe-mode="duo"]').getAttribute('aria-pressed')==='true','canonical DUO starts DUO');
  await page.locator('.launch-demo').click();await page.locator('.wipe-play').waitFor();await page.clock.pauseAt(await page.evaluate(()=>Date.now()+100));
  const d=await page.locator('.wipe-stage').boundingBox();await page.mouse.move(d.x+d.width*.1,d.y+d.height*.3);await page.mouse.down();await advance(150);await page.mouse.move(d.x+d.width*.45,d.y+d.height*.3,{steps:6});await advance(150);await page.mouse.up();
  check(await page.evaluate(()=>__wipe.game.percent(0)>0&&__wipe.game.percent(1)===0),'left drag cannot clean right lane');
  await page.evaluate(()=>{const g=__wipe.game;for(let i=0;i<g.cells.length;i++)if(g.sideFor(i)===1&&i%4)g.cells[i]=0;g.revision++;const big=g.patches.find(p=>p.type==='big'&&p.side===0);big.indices.forEach(i=>g.cells[i]=0);g.revision++;});
  await advance(150);check(await page.evaluate(()=>__wipe.game.attacks[0]===1),'BIG BUBBLE sends one splash');
  await page.screenshot({path:'output/playwright/wipe-duo-390.png',fullPage:true});
  await page.evaluate(()=>{const g=__wipe.game;for(let pass=0;pass<3;pass++)for(let y=0;y<=1.00001;y+=.06)for(let k=0;k<=20;k++)g.wipe({x:k/40,y,id:888,radius:.095,present:true});});
  await advance(1700);await page.locator('.wipe-result').waitFor();check((await page.locator('.wipe-result').textContent()).includes('P1 WINS!'),'DUO first clear wins');
  await page.screenshot({path:'output/playwright/wipe-duo-result-390.png',fullPage:true});
  await page.locator('.platform-locale').click();check((await page.locator('.wipe-result').textContent()).includes('Wiping time'),'result localizes');
  await page.locator('.game-back').click();await page.locator('.lab-feed').waitFor();await page.clock.resume();
  check(await page.evaluate(()=>!__wipe.active&&__wipe.frameId===null),'exit cleans controller');
  check(errors.length===0,'no browser exceptions');return {checks,errors};
}
