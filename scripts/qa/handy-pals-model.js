// Real CDN/WASM/model load and blank-frame inference, without opening a webcam.
async (page) => {
  await page.clock.resume();
  const base = new URL(page.url()).origin;
  await page.goto(base + '/?qa=handy-model#/game/solo-handy-pals');
  await page.clock.resume();
  await page.waitForFunction(() => document.querySelector('.hp-entry .launch-demo')?.disabled === false);
  return await page.evaluate(async () => {
    const registry = await (await fetch('/src/platform/experiments.js')).text(), path = registry.match(/import\("([^"]*\/handy\/view\.js[^"]*)"\)/)[1];
    const source = await (await fetch(path)).text(), inputPath = source.match(/from "([^"]*\/input\/handyPalsInput\.js[^"]*)"/)[1];
    const inputSource = await (await fetch(inputPath)).text(), vision = await import(inputSource.match(/from "([^"]*mediapipe[^"]*)"/)[1]);
    const { HandyPalsInput } = await import(inputPath);
    const files = await vision.FilesetResolver.forVisionTasks('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm');
    const input = new HandyPalsInput(document.createElement('video'));
    let model, delegate = 'GPU';
    try { model = await input.createRecognizer(files, delegate); }
    catch { delegate = 'CPU'; model = await input.createRecognizer(files, delegate); }
    try {
      const canvas = document.createElement('canvas'); canvas.width = 400; canvas.height = 500;
      const c = canvas.getContext('2d'); c.fillStyle = '#ffe9ca'; c.fillRect(0, 0, 400, 500);
      const result = model.detectForVideo(canvas, performance.now());
      if (!Array.isArray(result.landmarks) || result.landmarks.length) throw Error('Blank frame must not invent hands');
      return { model: 'real HandLandmarker float16/1', wasm: 'tasks-vision 1.0.1', delegate, blankFrameHands: result.landmarks.length, cameraRequested: false };
    } finally { model.close(); }
  });
}
