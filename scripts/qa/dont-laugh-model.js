// Real FaceLandmarker/WASM smoke check on generated key art. No camera permission.
async (page) => {
  await page.clock.resume();const base=new URL(page.url()).origin;await page.goto(base+'/?qa=dont-laugh-model-'+Date.now()+'#/game/solo-dont-laugh');await page.waitForFunction(()=>document.querySelector('.launch-demo')?.disabled===false);
  return await page.evaluate(async()=>{
    const registry=await(await fetch('/src/platform/experiments.js')).text(),viewPath=registry.match(/import\("([^"]*dontLaugh\/view\.js[^"]*)"\)/)[1],viewSource=await(await fetch(viewPath)).text(),inputPath=viewSource.match(/from ["']([^"']*input\/dontLaughInput\.js[^"']*)["']/)[1],inputSource=await(await fetch(inputPath)).text();
    const vision=await import(inputSource.match(/from ["']([^"']*mediapipe[^"']*)["']/)[1]),{DontLaughInput}=await import(inputPath),signalPath=inputSource.match(/from ["']([^"']*dontLaugh\/signals\.js[^"']*)["']/)[1],{measureFace,SmileTracker}=await import(signalPath);
    const input=new DontLaughInput(document.createElement('video')),wasm=await vision.FilesetResolver.forVisionTasks('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm');let model,delegate='GPU';try{model=await input.createRecognizer(wasm,delegate);}catch{delegate='CPU';model=await input.createRecognizer(wasm,delegate);}
    try{
      const image=document.querySelector('.dl-cover img');await image.decode();const canvas=document.createElement('canvas');canvas.width=360;canvas.height=480;canvas.getContext('2d').drawImage(image,220,425,330,420,0,0,360,480);
      const start=performance.now(),result=model.detectForVideo(canvas,start),firstInferenceMs=Math.round(performance.now()-start),signal=measureFace(result,.75),tracker=new SmileTracker();
      if(!signal)throw Error('Real model did not find the primary generated face');for(let i=0;i<=22;i++)tracker.update(signal,i*40);
      if(!tracker.neutral||tracker.score>10)throw Error('Neutral real-model crop fails calibration');
      const warm=[];for(let i=0;i<3;i++){const at=performance.now()+i+1;model.detectForVideo(canvas,at);warm.push(Math.round(performance.now()-at));}
      return{model:'FaceLandmarker',delegate,faces:result.faceLandmarks.length,blendshapes:result.faceBlendshapes[0].categories.length,firstInferenceMs,warmInferenceMs:warm,neutralScore:tracker.score,neutralCalibrated:true,cameraRequested:false};
    }finally{model.close();}
  });
}
