// Loads the actual MediaPipe WASM/model. A toy canvas is not a human accuracy test.
async (page) => {
  await page.clock.resume(); const base = new URL(page.url()).origin;
  await page.goto(base + '/?qa=pose-wall-model-' + Date.now() + '#/game/solo-pose-wall');
  await page.waitForFunction(() => document.querySelector('.pw-entry .launch-demo')?.disabled === false);
  return await page.evaluate(async () => {
    const registry = await (await fetch('/src/platform/experiments.js')).text(), viewPath = registry.match(/import\("([^"]*poseWall\/view\.js[^"]*)"\)/)[1];
    const source = await (await fetch(viewPath)).text(), inputPath = source.match(/from ["']([^"']*input\/poseWallInput\.js[^"']*)["']/)[1];
    const inputSource = await (await fetch(inputPath)).text(), vision = await import(inputSource.match(/from ["']([^"']*mediapipe[^"']*)["']/)[1]), { PoseWallInput } = await import(inputPath);
    const input = new PoseWallInput(document.createElement('video')), wasm = await vision.FilesetResolver.forVisionTasks('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm');
    let model, delegate='GPU'; try { model=await input.createRecognizer(wasm,delegate); } catch { delegate='CPU'; model=await input.createRecognizer(wasm,delegate); }
    try {
      const canvas=document.createElement('canvas'); canvas.width=360; canvas.height=600; const c=canvas.getContext('2d'); c.fillStyle='#fff2ba'; c.fillRect(0,0,360,600);
      const start=performance.now(), result=model.detectForVideo(canvas,start), inferenceMs=performance.now()-start, warmInferenceMs=[];
      for (let i=0;i<3;i++) { const at=performance.now(); model.detectForVideo(canvas,at); warmInferenceMs.push(Math.round(performance.now()-at)); }
      if (!Array.isArray(result.landmarks)) throw Error('Missing pose model result');
      if (result.segmentationMasks?.length) throw Error('Unexpected segmentation output');
      return { model:'PoseLandmarker Lite', delegate, firstInferenceMs:Math.round(inferenceMs), warmInferenceMs, detected:result.landmarks.length, segmentation:false, cameraRequested:false };
    } finally { model.close(); }
  });
}
