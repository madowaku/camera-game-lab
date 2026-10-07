async (page) => {
  const checks=[];
  const check=(value,label)=>{if(!value)throw Error(label);checks.push(label);};
  await page.setViewportSize({width:390,height:844});
  for (const [id,selector,debug] of [['solo-maestro','.maestro-view','__maestro'],['tech-camera-instrument','.cmi-playground','__cameraInstrument']]) {
    await page.goto('http://127.0.0.1:5298/?debug=1&recovery='+Date.now()+'#/game/'+id);
    await page.locator(selector).waitFor({state:'attached'});
    await page.evaluate(({selector,debug})=>{
      window.recoverySession=document.querySelector(selector).parentElement[debug];
      recoverySession.input.start=async()=>{throw Object.assign(Error('Permission denied'),{name:'NotAllowedError'});};
    },{selector,debug});
    await page.locator('.launch-camera').click();
    await page.waitForFunction(()=>recoverySession.phase==='error');
    check(await page.evaluate(()=>recoverySession.lastError.name==='NotAllowedError' && !recoverySession.audio.context && !recoverySession.raf),id+' camera denial releases audio and RAF');
    await page.locator('.cmi-demo').click();await page.waitForFunction(()=>recoverySession.phase==='playing');
    check(await page.evaluate(()=>recoverySession.source==='demo' && recoverySession.audio.context.state==='running' && !recoverySession.input.running),id+' retries with functioning camera-free practice');
    if(id==='solo-maestro') await page.locator('[data-action=START]').click();
    else {await page.locator('.cmi-five').click();await page.locator('.cmi-backing').click();await page.waitForFunction(()=>recoverySession.backing.source);}
    await page.evaluate(()=>window.dispatchEvent(new Event('blur')));
    await page.waitForTimeout(200);
    check(await page.evaluate(()=>recoverySession.paused && (!recoverySession.backing || !recoverySession.backing.source) && (!recoverySession.audio.stems || Object.values(recoverySession.audio.stems).every(s=>s.gain.gain.value<.0001))),id+' background pauses and mutes every audio owner');
    await page.locator('.cmi-pause').click();await page.waitForFunction(()=>!recoverySession.paused);
    check(await page.evaluate(()=>recoverySession.audio.context.state==='running'),id+' explicit resume restores running audio');
    await page.locator('.game-back').click();
    // Exit while camera initialization is still pending, then resolve it late.
    await page.goto('http://127.0.0.1:5298/?debug=1&cancel='+Date.now()+'#/game/'+id);
    await page.locator(selector).waitFor({state:'attached'});
    await page.evaluate(({selector,debug})=>{
      window.recoverySession=document.querySelector(selector).parentElement[debug];
      recoverySession.input.start=()=>new Promise(resolve=>window.finishCamera=resolve);
      window.pendingStart=recoverySession.startCamera();
    },{selector,debug});
    await page.locator('.game-back').click();
    await page.evaluate(async()=>{finishCamera();await pendingStart;});
    check(await page.evaluate(()=>!recoverySession.active && !recoverySession.audio.context && !recoverySession.raf && recoverySession.phase==='idle'),id+' late initialization cannot restart an exited session');
  }
  return {checks};
}
