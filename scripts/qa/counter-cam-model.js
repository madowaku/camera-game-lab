// Actual MediaPipe WASM/model inference on a canvas; not a human accuracy test.
async (page) => {
  await page.clock.resume(); const base = new URL(page.url()).origin;
  await page.goto(base + '/?qa=counter-cam-model-' + Date.now() + '#/game/solo-counter-cam');
  await page.waitForFunction(() => document.querySelector('.cc-entry .launch-demo')?.disabled === false);
  return await page.evaluate(async () => {
    const registry = await (await fetch('/src/platform/experiments.js')).text(), viewPath = registry.match(/import\("([^"]*counterCam\/view\.js[^"]*)"\)/)[1];
    const source = await (await fetch(viewPath)).text(), inputPath = source.match(/from ["']([^"']*input\/counterCamInput\.js[^"']*)["']/)[1];
    const inputSource = await (await fetch(inputPath)).text(), vision = await import(inputSource.match(/from ["']([^"']*mediapipe[^"']*)["']/)[1]), { CounterCamInput } = await import(inputPath);
    const input = new CounterCamInput(document.createElement('video')), wasm = await vision.FilesetResolver.forVisionTasks('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm');
    let model, delegate='GPU'; try { model=await input.createRecognizer(wasm,delegate); } catch { delegate='CPU'; model=await input.createRecognizer(wasm,delegate); }
    try {
      const canvas=document.createElement('canvas'); canvas.width=360; canvas.height=640; const c=canvas.getContext('2d'); c.fillStyle='#142628'; c.fillRect(0,0,360,640);
      const start=performance.now(), result=model.detectForVideo(canvas,start), inferenceMs=performance.now()-start, warmInferenceMs=[];
      for (let i=0;i<3;i++) { const at=performance.now(); model.detectForVideo(canvas,at); warmInferenceMs.push(Math.round(performance.now()-at)); }
      if (!Array.isArray(result.landmarks)) throw Error('Missing pose model result');
      if (result.segmentationMasks?.length) throw Error('Unexpected segmentation output');
      return {model:'PoseLandmarker Lite',delegate,firstInferenceMs:Math.round(inferenceMs),warmInferenceMs,detected:result.landmarks.length,segmentation:false,cameraRequested:false};
    } finally { model.close(); }
  });
}
