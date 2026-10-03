async (page) => {
  const base = new URL(page.url()).origin, checks = [], errors = [], failed = [], musicRequests = [];
  const check = (ok, name) => { if (!ok) throw Error(name); checks.push(name); };
  page.on('pageerror', e => errors.push(e.message));
  page.on('requestfailed', r => failed.push(r.url()));
  page.on('request', r => { if (/\/assets\/(music\/|milkPudding-|stageOne-|uneasyRoom-|fingerGunTheme-)/.test(r.url())) musicRequests.push(r.url()); });
  await page.addInitScript(() => {
    localStorage.setItem('camera-game-lab-platform-onboarded-v1', 'true');
    localStorage.setItem('camera-game-lab-locale', 'ja');
    window.__musicNodes = [];
    window.__spriteDraws = 0;
    const draw = CanvasRenderingContext2D.prototype.drawImage;
    CanvasRenderingContext2D.prototype.drawImage = function (...args) {
      if (args[0]?.src?.includes('bot-sprites-v1')) __spriteDraws++;
      return draw.apply(this, args);
    };
    const Ctor = window.AudioContext ?? window.webkitAudioContext;
    const original = Ctor.prototype.createBufferSource;
    Ctor.prototype.createBufferSource = function () {
      const node = original.call(this), start = node.start.bind(node), stop = node.stop.bind(node);
      node.start = (...args) => { if (node.loop) { node.__active = true; __musicNodes.push(node); } return start(...args); };
      node.stop = (...args) => { node.__active = false; return stop(...args); };
      return node;
    };
  });
  const active = () => page.evaluate(() => __musicNodes.filter(n => n.__active).length);
  for (const viewport of [{width:390,height:844},{width:1440,height:1000}]) {
    await page.setViewportSize(viewport); await page.goto(base+'/?media=art#/explore');
    check(await page.locator('.explore-card').count()>=15,`${viewport.width}: 15 covers`);
    for (const img of await page.locator('.explore-art img[src^="/artwork/"]').all()) {
      await img.scrollIntoViewIfNeeded();
      await img.evaluate(e => e.decode());
      check(await img.evaluate(e => e.naturalWidth===768 && e.naturalHeight===768),'generated cover decoded');
    }
    check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${viewport.width}: no overflow`);
    if(viewport.width===1440) { await page.evaluate(()=>scrollTo(0,0)); await page.screenshot({path:'output/playwright/generated-explore-1440.png',fullPage:true}); }
  }
  check(musicRequests.length===0,'browsing loads no music');
  await page.setViewportSize({width:390,height:844});
  for (const id of ['solo-hand-beat','solo-soft-serve','solo-finger-gun','solo-eat-dont-eat','solo-daitai-hero']) {
    await page.goto(base+'/?media=entry#/game/'+id);
    await page.waitForFunction(()=>document.querySelector('.launch-camera')?.disabled===false);
    const image=page.locator('.arcade-hero img,.ss-key-art'); await image.evaluate(e=>e.decode());
    check(await image.isVisible(),id+': generated entrance');
    check(await active()===0,id+': entrance is silent');
    check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),id+': mobile width');
    await page.screenshot({path:`output/playwright/generated-${id}-390.png`,fullPage:true});
  }
  await page.goto(base+'/?media=music#/game/solo-soft-serve');
  await page.waitForFunction(()=>document.querySelector('.launch-demo')?.disabled===false);
  const before=musicRequests.length;
  await page.locator('.launch-demo').click();
  await page.waitForFunction(()=>__musicNodes.some(n=>n.__active));
  check(musicRequests.length>before,'PLAY lazily loads licensed music');
  check(await active()===1,'one music loop after PLAY');
  check(await page.evaluate(()=>{
    const a=__musicNodes.find(n=>n.__active).buffer.getChannelData(0);let sum=0;
    for(let i=0;i<Math.min(a.length,44100*4);i+=10)sum+=a[i]*a[i];return sum>.01;
  }),'real MP3 decodes into audible samples');
  await page.locator('.game-music').click();
  check(await active()===0,'BGM OFF silences the loop');
  check(await page.locator('.game-music').getAttribute('aria-pressed')==='false','mute state is accessible');
  await page.locator('.game-music').click(); await page.waitForFunction(()=>__musicNodes.some(n=>n.__active));
  await page.locator('.ss-pause').click(); await page.waitForFunction(()=>!__musicNodes.some(n=>n.__active));
  check(await active()===0,'manual pause silences BGM');
  await page.locator('.ss-pause').click(); await page.waitForFunction(()=>__musicNodes.some(n=>n.__active));
  await page.screenshot({path:'output/playwright/generated-soft-serve-play-390.png'});
  await page.clock.install(); await page.goto(base+'/?media=round#/game/solo-soft-serve');
  await page.waitForFunction(()=>document.querySelector('.launch-demo')?.disabled===false);
  await page.locator('.launch-demo').click(); await page.clock.runFor(38000);
  await page.locator('.ss-result-card').waitFor({state:'visible'});
  check(await active()===0,'result stops BGM');
  await page.locator('[data-result-action="retry"]').click(); await page.clock.runFor(800);
  await page.waitForFunction(()=>__musicNodes.some(n=>n.__active));
  check(await active()===1,'retry starts one fresh loop');
  await page.locator('.game-back').click(); await page.locator('.lab-feed').waitFor();
  check(await active()===0,'leaving stops every music loop'); await page.clock.resume();
  await page.goto(base+'/?media=voice#/game/voice-note-blaster');
  await page.waitForFunction(()=>document.querySelector('.launch-camera')?.disabled===false);
  check(await page.locator('.game-music').isDisabled(),'voice mode keeps music silent');
  await page.locator('.game-info').click();
  check((await page.locator('.game-music-credit').textContent()).includes('練習のみ'),'credits explain microphone-safe music');
  check(await page.locator('.game-music-credit a').getAttribute('href')==='https://opentracks.com/bgm/detail/1982','direct OpenTracks credit');
  await page.keyboard.press('Escape');
  await page.locator('.launch-demo').click(); await page.clock.runFor(3600);
  await page.waitForFunction(()=>__musicNodes.some(n=>n.__active));
  check(await active()===1,'voice practice has music');
  await page.locator('.game-back').click(); check(await active()===0,'voice practice releases music');
  await page.setViewportSize({width:1440,height:900});
  await page.goto(base+'/?media=sprites#/game/duo-tiny-bot-duel');
  await page.waitForFunction(()=>document.querySelector('.launch-demo')?.disabled===false);
  await page.locator('.launch-demo').click(); await page.clock.runFor(3600);
  await page.waitForFunction(()=>__spriteDraws>0);
  check(await page.evaluate(()=>__spriteDraws>0),'actual duel draws generated bot sprites');
  await page.screenshot({path:'output/playwright/generated-duel-play-1440.png'});
  await page.setViewportSize({width:390,height:844});
  await page.goto(base+'/?media=sprites#/game/solo-daitai-hero');
  await page.waitForFunction(()=>document.querySelector('.launch-demo')?.disabled===false);
  await page.locator('.launch-demo').click(); await page.clock.runFor(3600);
  await page.locator('.dh-enemy img').evaluate(e=>e.decode());
  check(await page.locator('.dh-enemy img').isVisible(),'actual quiz shows generated hero');
  await page.screenshot({path:'output/playwright/generated-hero-play-390.png'});
  await page.locator('.game-back').click(); await page.locator('.lab-feed').waitFor();
  check(await active()===0,'sprite rounds release music');
  check(errors.length===0,'no uncaught errors: '+errors.join(';'));
  check(failed.length===0,'no broken resources: '+failed.join(';'));
  return {checks:checks.length,errors,failed,physicalDevice:false};
}
