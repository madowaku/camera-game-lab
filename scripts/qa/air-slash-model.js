// Actual model creation/inference without requesting a camera. This is not a human playtest.
async page => {
  await page.clock.resume(); const base = new URL(page.url()).origin;
  await page.goto(base + '/?qa=as-model-' + Date.now() + '#/game/solo-air-slash');
  await page.waitForFunction(() => document.querySelector('.as-entry .launch-demo')?.disabled === false);
  return await page.evaluate(async () => {
    const { AirSlashInput } = await import('/src/input/airSlashInput.js'), { FilesetResolver } = await import('/node_modules/@mediapipe/tasks-vision/vision_bundle.mjs');
    const input = new AirSlashInput(document.createElement('video')), wasm = await FilesetResolver.forVisionTasks('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm');
    let model, delegate = 'GPU'; try { model = await input.createRecognizer(wasm, delegate); } catch { delegate = 'CPU'; model = await input.createRecognizer(wasm, delegate); }
    try {
      const canvas = document.createElement('canvas'); canvas.width = 540; canvas.height = 960; const c = canvas.getContext('2d'); c.fillStyle = '#132428'; c.fillRect(0, 0, 540, 960);
      const at = performance.now(), start = performance.now(), result = model.detectForVideo(canvas, at), firstInferenceMs = Math.round(performance.now() - start);
      const warmInferenceMs = []; for (let i = 1; i <= 3; i++) { const before = performance.now(); model.detectForVideo(canvas, at + i * 150); warmInferenceMs.push(Math.round(performance.now() - before)); }
      if (!Array.isArray(result.landmarks) || !Array.isArray(result.face?.detections)) throw Error('Missing actual model outputs');
      return { models: ['HandLandmarker', 'FaceDetector BlazeFace'], delegate, firstInferenceMs, warmInferenceMs, cameraRequested: false, humanInputVerified: false };
    } finally { model.close(); }
  });
}
