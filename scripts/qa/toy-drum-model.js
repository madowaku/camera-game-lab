// Real WASM/model load, with blank-frame inference and no webcam request.
async (page) => {
  await page.clock.resume(); const base = new URL(page.url()).origin;
  await page.goto(base + '/?qa=toy-model-' + Date.now() + '#/game/solo-toy-drum');
  await page.waitForFunction(() => document.querySelector('.td-entry .launch-camera')?.disabled === false);
  return await page.evaluate(async () => {
    const registry = await (await fetch('/src/platform/experiments.js')).text(), path = registry.match(/import\("([^"]*\/toyDrum\/view\.js[^"]*)"\)/)[1];
    const source = await (await fetch(path)).text(), inputPath = source.match(/from "([^"]*\/input\/toyDrumInput\.js[^"]*)"/)[1];
    const inputSource = await (await fetch(inputPath)).text(), vision = await import(inputSource.match(/from "([^"]*mediapipe[^"]*)"/)[1]);
    const { ToyDrumInput } = await import(inputPath); const files = await vision.FilesetResolver.forVisionTasks('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm');
    const input = new ToyDrumInput(document.createElement('video')); let model, delegate = 'GPU';
    try { model = await input.createRecognizer(files, delegate); } catch { delegate = 'CPU'; model = await input.createRecognizer(files, delegate); }
    try { const canvas = document.createElement('canvas'); canvas.width = 720; canvas.height = 1280; const c = canvas.getContext('2d'); c.fillStyle = '#fff0d7'; c.fillRect(0,0,720,1280); const result = model.detectForVideo(canvas,performance.now()); if (!Array.isArray(result.landmarks) || result.landmarks.length) throw Error('Blank frame must not invent hands'); return { model: 'real HandLandmarker float16/1', wasm: 'tasks-vision 1.0.1', delegate, blankFrameHands: result.landmarks.length, cameraRequested: false }; } finally { model.close(); }
  });
}
