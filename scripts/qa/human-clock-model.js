// Actual downloaded MediaPipe models; a blank canvas does not test human input.
async (page) => {
  await page.clock.resume();const base=new URL(page.url()).origin;
  await page.goto(base+'/?qa=hc-model-'+Date.now()+'#/game/solo-human-clock');
  await page.waitForFunction(()=>document.querySelector('.hc-entry .launch-demo')?.disabled===false);
  return await page.evaluate(async()=>{
    const registry=await(await fetch('/src/platform/experiments.js')).text(),viewPath=registry.match(/import\("([^"]*humanClock\/view\.js[^"]*)"\)/)[1];
    const viewText=await(await fetch(viewPath)).text(),inputPath=viewText.match(/from ["']([^"']*input\/humanClockInput\.js[^"']*)["']/)[1];
    const inputText=await(await fetch(inputPath)).text(),vision=await import(inputText.match(/from ["']([^"']*mediapipe[^"']*)["']/)[1]);
    const {HumanClockInput}=await import(inputPath),input=new HumanClockInput(document.createElement('video'));
    const wasm=await vision.FilesetResolver.forVisionTasks('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm');
    let model,delegate='GPU';try{model=await input.createRecognizer(wasm,delegate);}catch{delegate='CPU';model=await input.createRecognizer(wasm,delegate);}
    try{
      const canvas=document.createElement('canvas');canvas.width=360;canvas.height=480;const c=canvas.getContext('2d');c.fillStyle='#142420';c.fillRect(0,0,360,480);
      const start=performance.now(),result=model.detectForVideo(canvas,start),firstInferenceMs=Math.round(performance.now()-start),warmInferenceMs=[];
      for(let i=0;i<3;i++){const at=performance.now();model.detectForVideo(canvas,at);warmInferenceMs.push(Math.round(performance.now()-at));}
      if(!Array.isArray(result.hand.landmarks)||!Array.isArray(result.pose.landmarks))throw Error('Missing model outputs');
      return{models:['HandLandmarker','PoseLandmarker Lite'],delegate,firstInferenceMs,warmInferenceMs,cameraRequested:false};
    }finally{model.close();}
  });
}
