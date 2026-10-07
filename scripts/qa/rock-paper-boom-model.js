async (page) => {
  await page.goto('http://127.0.0.1:5191/#/game/duo-rock-paper-boom');
  await page.locator('.rpb-entry .launch-demo:not(:disabled)').waitFor();
  return await page.evaluate(async () => {
    const { FilesetResolver } = await import('/node_modules/@mediapipe/tasks-vision/vision_bundle.mjs');
    const { RockPaperBoomInput } = await import('/src/input/rockPaperBoomInput.js');
    const input = new RockPaperBoomInput(document.createElement('video'));
    const vision = await FilesetResolver.forVisionTasks('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm');
    let recognizer, delegate = 'GPU';
    try { recognizer = await input.createRecognizer(vision, delegate); }
    catch { delegate = 'CPU'; recognizer = await input.createRecognizer(vision, delegate); }
    try {
      const canvas = document.createElement('canvas'); canvas.width = 360; canvas.height = 640;
      const ctx = canvas.getContext('2d'); ctx.fillStyle = '#172333'; ctx.fillRect(0, 0, 360, 640);
      const result = recognizer.recognizeForVideo(canvas, performance.now());
      if (result.landmarks.length !== 0 || result.gestures.length !== 0) throw new Error('Blank input unexpectedly recognizes a hand');
      return { realModelLoaded: true, delegate, blankHands: result.landmarks.length, cameraRequested: false, limitation: 'Model boot/inference only; not human accuracy or Android performance.' };
    } finally { recognizer.close(); }
  });
}
