// Actual CDN/WASM/HandLandmarker load and blank-frame inference. No webcam.
async (page) => {
  await page.clock.resume(); const base = new URL(page.url()).origin;
  await page.goto(base + '/?qa=palm-model#/game/duo-palm-pong'); await page.clock.resume();
  await page.waitForFunction(() => document.querySelector('.pp-entry .launch-camera')?.disabled === false);
  return await page.evaluate(async () => {
    const source = await (await fetch('/src/input/palmPongInput.js')).text();
    const vision = await import(source.match(/from "([^"]*mediapipe[^"]*)"/)[1]);
    const { PalmPongInput } = await import('/src/input/palmPongInput.js');
    const files = await vision.FilesetResolver.forVisionTasks('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm');
    const input = new PalmPongInput(document.createElement('video'));
    let model, delegate = 'GPU';
    try { model = await input.createRecognizer(files, delegate); } catch { delegate = 'CPU'; model = await input.createRecognizer(files, delegate); }
    try {
      const canvas = document.createElement('canvas'); canvas.width = 1280; canvas.height = 720;
      const c = canvas.getContext('2d'); c.fillStyle = '#fbf3e4'; c.fillRect(0,0,1280,720);
      const result = model.detectForVideo(canvas, performance.now());
      if (!Array.isArray(result.landmarks) || result.landmarks.length) throw Error('Blank frame must not invent a hand');
      return { model: 'real HandLandmarker float16/1', wasm: 'tasks-vision 1.0.1', delegate, blankFrameHands: 0, cameraRequested: false };
    } finally { model.close(); }
  });
}
