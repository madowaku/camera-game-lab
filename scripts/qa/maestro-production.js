// Observe the compiled game through its public UI and actual WebAudio graph.
async (page) => {
  const checks=[],errors=[];
  const check=(value,label)=>{if(!value)throw Error(label);checks.push(label);};
  await page.addInitScript(()=>{
    if(window.__maestroQAHooked) return;
    window.__maestroQAHooked=true;
    window.qaContexts=[];
    const Native=window.AudioContext;
    window.AudioContext=class extends Native {
      constructor(...args){super(...args);this.qaSources=[];this.qaGains=[];window.qaContexts.push(this);}
      createBufferSource(){const source=super.createBufferSource();this.qaSources.push(source);return source;}
      createGain(){const gain=super.createGain();this.qaGains.push(gain);return gain;}
    };
  });
  page.on('pageerror',e=>errors.push(e.message));
  await page.setViewportSize({width:390,height:844});
  await page.goto('http://127.0.0.1:5299/?qa='+Date.now()+'#/game/solo-maestro');
  await page.getByRole('button',{name:/カメラなしの練習|Camera-free practice/}).click();
  await page.locator('[data-action=START]').waitFor();
  await page.locator('.cmi-overlay').waitFor({state:'hidden'});
  await page.locator('[data-action=START]').click();
  check(await page.evaluate(()=>qaContexts[0].qaSources.filter(s=>s.loop).length===3),'compiled MAESTRO starts three decoded loop sources');
  check(await page.evaluate(()=>qaContexts[0].qaSources.filter(s=>s.loop).every(s=>Math.abs(s.buffer.duration-32)<.001)),'compiled Vorbis stems retain exact 32s duration');
  await page.locator('[data-action=BRASS]').click();
  await page.locator('[data-action=PERCUSSION]').click();
  await page.locator('.maestro-slider').fill('0.95');
  await page.locator('[data-action=FINALE]').waitFor({state:'visible'});
  await page.waitForFunction(()=>!document.querySelector('[data-action=FINALE]').disabled);
  await page.evaluate(()=>{window.qaAna=qaContexts[0].createAnalyser();qaAna.fftSize=2048;qaContexts[0].qaGains[0].connect(qaAna);});
  await page.waitForTimeout(220);
  check(await page.evaluate(()=>{const values=new Float32Array(2048);qaAna.getFloatTimeDomainData(values);return values.some(v=>Math.abs(v)>.003); }),'compiled mix produces an audible waveform');
  await page.locator('[data-action=CUT]').click();await page.waitForTimeout(220);
  check(await page.evaluate(()=>{const values=new Float32Array(2048);qaAna.getFloatTimeDomainData(values);return values.every(v=>Math.abs(v)<.0001); }),'compiled CUT silences the actual graph');
  await page.locator('[data-action=START]').click();await page.locator('[data-action=FINALE]').click();
  await page.locator('.maestro-bravo').waitFor();
  check(await page.locator('.cmi-credit a[href*=otologic]').isVisible(),'compiled game displays OtoLogic attribution');
  await page.waitForFunction(()=>qaContexts[0].qaSources.some(s=>!s.loop && s.buffer?.duration===4));
  check(true,'compiled BRAVO plays the four-second OtoLogic recording');
  await page.screenshot({path:'output/playwright/maestro-production-bravo-390.png',fullPage:true});
  await page.locator('.game-back').click();
  await page.waitForFunction(()=>qaContexts.every(c=>c.state==='closed'));
  check(true,'compiled exit closes AudioContext');
  await page.goto('http://127.0.0.1:5299/?qa='+Date.now()+'#/game/tech-camera-instrument');
  await page.getByRole('button',{name:/カメラなしの練習|Camera-free practice/}).click();
  await page.locator('.cmi-overlay').waitFor({state:'hidden'});
  await page.locator('.cmi-five').click();
  await page.locator('.cmi-bank').selectOption('toy');
  const stage=page.locator('.cmi-stage');await stage.focus();await page.keyboard.press('1');
  await page.waitForFunction(()=>qaContexts[0].qaSources.some(s=>s.buffer?.duration===2));
  check(true,'compiled Playground keyboard plays a decoded toy bell');
  await page.locator('.cmi-backing').click();
  await page.waitForFunction(()=>qaContexts.some(c=>c.qaSources.some(s=>s.loop && s.buffer?.duration>30)));
  check(true,'compiled optional OpenTracks accompaniment decodes and loops');
  await page.locator('.game-back').click();await page.waitForFunction(()=>qaContexts.every(c=>c.state==='closed'));
  check(true,'compiled Playground closes both audio owners');
  check(errors.length===0,'no compiled page errors');
  return {checks,errors};
}
