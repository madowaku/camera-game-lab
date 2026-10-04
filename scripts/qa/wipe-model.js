// Actual MediaPipe WASM/model inference; blank frame is not a human tracking test.
async page=>{
  await page.clock.resume();const base=new URL(page.url()).origin;await page.goto(base+'/?qa=wipe-model#/game/solo-wipe');
  await page.waitForFunction(()=>document.querySelector('.wipe-entry .launch-camera')?.disabled===false);
  return await page.evaluate(async()=>{
    const registry=await(await fetch('/src/platform/experiments.js')).text(),viewPath=registry.match(/import\("([^"]*wipe\/view\.js[^"]*)"\)/)[1];
    const viewSource=await(await fetch(viewPath)).text(),inputPath=viewSource.match(/from ["']([^"']*input\/wipeInput\.js[^"']*)["']/)[1];
    const source=await(await fetch(inputPath)).text(),vision=await import(source.match(/from ["']([^"']*mediapipe[^"']*)["']/)[1]);
    const {WipeInput}=await import(inputPath),input=new WipeInput(document.createElement('video'));
    const files=await vision.FilesetResolver.forVisionTasks('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm');
    let model,delegate='GPU';try{model=await input.createRecognizer(files,delegate);}catch{delegate='CPU';model=await input.createRecognizer(files,delegate);}
    try{const canvas=document.createElement('canvas');canvas.width=720;canvas.height=1280;const c=canvas.getContext('2d');c.fillStyle='#f0f6ec';c.fillRect(0,0,720,1280);const result=model.detectForVideo(canvas,performance.now());if(!Array.isArray(result.landmarks)||result.landmarks.length)throw Error('Blank image invents palms');return {model:'real HandLandmarker float16/1',wasm:'tasks-vision 1.0.1',delegate,blankFrameHands:0,cameraRequested:false};}finally{model.close();}
  });
}
