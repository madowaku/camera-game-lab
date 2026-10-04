// Camera-free integration QA. Virtual timing does not establish human accuracy.
async (page) => {
  try {
  await page.clock.resume(); const base = new URL(page.url()).origin, checks = [], errors = [];
  const check = (ok, label) => { if (!ok) throw Error(label); checks.push(label); }; page.on('pageerror', e => errors.push(e.message));
  await page.goto(base + '/?qa=dont-laugh-' + Date.now() + '#/game/solo-dont-laugh');
  await page.waitForFunction(() => document.querySelector('.dl-entry .launch-demo')?.disabled === false);
  if (await page.evaluate(()=>document.documentElement.lang)!=='ja') await page.locator('.platform-locale').click();
  if(await page.locator('.game-music').getAttribute('aria-pressed')==='false')await page.locator('.game-music').click();
  for (const size of [{width:1440,height:900},{width:390,height:844},{width:360,height:800}]) {
    await page.setViewportSize(size); check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'entry no overflow '+size.width);
    check(await page.locator('.dl-cover img').evaluate(i=>i.complete&&i.naturalWidth>0),'Imagegen cover loads '+size.width);
    check(await page.locator('.launch-camera').evaluate(b=>b.getBoundingClientRect().height>=44),'reachable PLAY target '+size.width);
    check(await page.evaluate(()=>getComputedStyle(document.querySelector('.platform')).getPropertyValue('--pl-text').trim()==='#181b19'),'legible light theme '+size.width);
    await page.screenshot({path:`output/playwright/dont-laugh-entry-${size.width}.png`,fullPage:true});
  }
  check(await page.evaluate(()=>!performance.getEntriesByType('resource').some(e=>/\.task|\.wasm/.test(e.name))&&!document.querySelector('.dl-stage video').srcObject),'entrance requests no camera or model');
  await page.locator('.launch-howto').click();check((await page.locator('.sheet-content').textContent()).includes('おもちゃの一日'),'OpenTracks credit reachable');await page.keyboard.press('Escape');
  check(await page.locator('.launch-howto').evaluate(b=>b===document.activeElement),'instructions restore focus');
  await page.locator('.platform-locale').click();check((await page.locator('.dl-tagline').textContent()).includes('Your own face'),'English entrance');await page.locator('.platform-locale').click();
  await page.evaluate(async()=>{const registry=await(await fetch('/src/platform/experiments.js')).text(),path=registry.match(/import\("([^"]*dontLaugh\/view\.js[^"]*)"\)/)[1];const {DontLaughView}=await import(path),render=DontLaughView.prototype.render;DontLaughView.prototype.render=function(...a){window.__dl=this;return render.apply(this,a);};});
  await page.setViewportSize({width:390,height:844});await page.clock.install();await page.clock.pauseAt(await page.evaluate(()=>Date.now()+1000));await page.locator('[data-dl-mode="creator"]').click();await page.locator('[data-dl-face="HIDE"]').click();await page.locator('.launch-demo').click();
  await page.clock.runFor(2990);check(await page.evaluate(()=>__dl.phase==='countdown'&&__dl.game.elapsed===0),'3-second countdown precedes active clock');await page.clock.runFor(100);
  const advance=async time=>{const at=await page.evaluate(()=>__dl.game.elapsed);await page.clock.runFor(Math.max(0,Math.ceil((time-at)*1000)));};
  check(await page.evaluate(()=>__dl.phase==='playing'&&__dl.options.faceMode==='HIDE'&&__dl.options.creator),'CREATOR HIDE options reach game');
  await advance(1);await page.locator('.dl-pause').click();const at=await page.evaluate(()=>__dl.game.elapsed);await page.clock.runFor(1000);check(await page.evaluate(()=>__dl.game.elapsed)===at,'pause freezes clock');await page.locator('.dl-resume').click();
  await advance(5.2);check(await page.evaluate(()=>__dl.game.attack.type==='delay'),'level 2 delays face');await page.screenshot({path:'output/playwright/dont-laugh-delay-390.png',fullPage:true});
  await advance(6.4);check(await page.evaluate(()=>__dl.game.attack.type==='clones'),'self-clone attack');await page.screenshot({path:'output/playwright/dont-laugh-clones-390.png',fullPage:true});
  await page.keyboard.down('l');await page.clock.runFor(300);await page.keyboard.up('l');await page.clock.runFor(50);check(await page.evaluate(()=>__dl.phase==='playing'&&__dl.game.hold===0),'300ms smile survives and resets');
  await advance(12.15);check(await page.evaluate(()=>__dl.game.attack.type==='final'),'last 3 seconds FINAL ATTACK');await page.screenshot({path:'output/playwright/dont-laugh-final-390.png',fullPage:true});
  await page.locator('.dl-sfx').click();check(await page.locator('.dl-sfx').getAttribute('aria-pressed')==='false','SFX can mute');await page.locator('.game-music').click();check(await page.locator('.game-music').getAttribute('aria-pressed')==='false','BGM can mute');
  await advance(15);await page.clock.runFor(800);await page.locator('.dl-result').waitFor();
  check(await page.evaluate(()=>__dl.result.reason==='survived'&&Math.abs(__dl.result.elapsed-15)<.00001),'15-second measured survival');
  check((await page.locator('.dl-result').textContent()).includes('PRACTICE'),'practice provenance on result');
  check(await page.evaluate(()=>__dl.result.replay.frames.length>10&&__dl.result.replay.frames.length<=24&&__dl.result.replay.frames.at(-1).time-__dl.result.replay.frames[0].time<=1.5001),'replay bounded to last 1.5s');
  check(await page.evaluate(()=>!__dl.input.running&&!__dl.audio.context&&__dl.frameId==null&&!__dl.video.srcObject),'result releases camera, model, audio and animation');
  check(await page.locator('.dl-photo canvas').evaluate(c=>new Set(c.getContext('2d').getImageData(0,0,c.width,c.height).data).size>50),'snapshot has real pixel evidence');
  await page.clock.runFor(3500);await page.screenshot({path:'output/playwright/dont-laugh-survived-390.png',fullPage:true});
  check(await page.locator('.dl-save').isVisible(),'CREATOR clip save reachable');
  await page.setViewportSize({width:1440,height:900});await page.screenshot({path:'output/playwright/dont-laugh-result-1440.png',fullPage:true});
  await page.locator('.platform-locale').click();check((await page.locator('.dl-result').textContent()).includes('Still serious'),'English result');
  const old=await page.evaluate(()=>{window.__oldDl=__dl.result;return __dl.result.best;});await page.locator('[data-result-action="retry"]').click();await page.clock.runFor(3150);
  check(await page.evaluate(()=>__dl.source==='demo'&&__dl.game.elapsed<.3&&__oldDl.photo.width===0&&__oldDl.replay.frames.length===0),'retry resets score, keeps practice and discards previous faces');
  await page.keyboard.down('l');await page.clock.runFor(399);check(await page.evaluate(()=>__dl.phase==='playing'),'399ms held smile survives');await page.clock.runFor(40);await page.keyboard.up('l');await page.clock.runFor(800);await page.locator('.dl-result').waitFor();
  check(await page.evaluate(()=>__dl.result.reason==='laughed'&&__dl.result.elapsed<1&&__dl.result.best===15),'400ms held smile loses, best persists');await page.screenshot({path:'output/playwright/dont-laugh-caught-1440.png',fullPage:true});
  for(const size of [{width:360,height:800},{width:390,height:844}]){await page.setViewportSize(size);check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'result no overflow '+size.width);await page.screenshot({path:`output/playwright/dont-laugh-caught-${size.width}.png`,fullPage:true});}
  await page.clock.resume();await page.locator('.game-back').click();await page.locator('.lab-feed').waitFor();check(await page.evaluate(()=>!__dl.active&&__dl.result==null&&__dl.renderer.delayed.length===0),'exit drops input, face references and delayed crops');
  await page.goto(base+'/#/game/solo-finger-gun');await page.waitForFunction(()=>document.querySelector('.launch-camera')?.disabled===false);check(await page.evaluate(()=>getComputedStyle(document.querySelector('.platform')).getPropertyValue('--pl-bg').trim()!=='#f5f1e8'),'cached styles do not theme another experiment');
  check(errors.length===0,'no browser exceptions');return {checks,errors};
  } finally { await page.clock.resume(); }
}
