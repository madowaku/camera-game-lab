// Real MediaPipe models / WASM / inference; a blank canvas supplies the video.
// This verifies integration and cleanup, not human gesture accuracy.
async (page) => {
  const results = [], errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({width:390,height:844});
  for (const [id,selector,debug] of [['solo-maestro','.maestro-view','__maestro'],['tech-camera-instrument','.cmi-playground','__cameraInstrument']]) {
    await page.goto('http://127.0.0.1:5298/?debug=1&models='+Date.now()+'#/game/'+id);
    await page.locator(selector).waitFor({state:'attached'});
    await page.getByRole('button',{name:/カメラなしの練習|Camera-free practice/}).click();
    await page.waitForFunction(({selector,debug}) => document.querySelector(selector).parentElement[debug].phase==='playing',{selector,debug});
    await page.evaluate(({selector,debug}) => {
      window.modelSession=document.querySelector(selector).parentElement[debug];
      window.modelFrames=0; const parser=modelSession.input.processResult.bind(modelSession.input);
      modelSession.input.processResult=(result,at)=>{if(result!==undefined) modelFrames++;parser(result,at);};
      const canvas=document.createElement('canvas');canvas.width=360;canvas.height=640;
      window.modelStream=canvas.captureStream(15);
      window.modelPaint=setInterval(()=>canvas.getContext('2d').fillRect(0,0,360,640),66);
      modelSession.input.openCamera=async ()=>modelStream;
    },{selector,debug});
    const result = await page.evaluate(async () => {
      const at=performance.now();
      await Promise.race([modelSession.startCamera(),new Promise((_,reject)=>setTimeout(()=>reject(Error('Model startup timeout')),70000))]);
      if(modelSession.phase!=='playing') throw Error(modelSession.lastError?.message??'Camera model failed');
      return {running:modelSession.input.running,recognizer:!!modelSession.input.recognizer,modelStartupMs:Math.round(performance.now()-at)};
    });
    await page.waitForFunction(()=>modelFrames>=3,null,{timeout:15000});
    result.frames=await page.evaluate(()=>modelFrames);
    if(!result.running || !result.recognizer) throw Error(id+' model did not start');
    await page.evaluate(()=>{clearInterval(modelPaint);modelSession.deactivate();});
    result.released=await page.evaluate(()=>modelStream.getTracks().every(t=>t.readyState==='ended') && !modelSession.input.recognizer && !modelSession.input.running && !modelSession.video.srcObject && !modelSession.audio.context && !modelSession.raf);
    if(!result.released) throw Error(id+' model did not release');
    results.push({id,...result});
  }
  if(errors.length) throw Error(errors.join('; '));
  return {results,errors};
}
