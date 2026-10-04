// Real MediaPipe model/WASM inference on a synthetic video; no physical camera.
async page => {
  await page.clock.resume(); const base = new URL(page.url()).origin, checks = [];
  const check = (ok, label) => { if (!ok) throw Error(label); checks.push(label); };
  await page.goto(base + '/?qa=hs-model-' + Date.now() + '#/game/solo-hand-spell'); await page.waitForFunction(() => document.querySelector('.hs-entry .launch-camera')?.disabled === false);
  await page.evaluate(async () => {
    localStorage.setItem('camera-game-lab-hand-spell-tutorial-camera', 'done');
    const registry = await (await fetch('/src/platform/experiments.js')).text(), path = registry.match(/import\("([^"]*handSpell\/view\.js[^"]*)"\)/)[1];
    const { HandSpellView } = await import(path), setup = HandSpellView.prototype.setup;
    HandSpellView.prototype.setup = function (...args) { window.__hs = this; return setup.apply(this, args); };
    navigator.mediaDevices.getUserMedia = async constraints => {
      window.__hsConstraints = constraints;
      const canvas = document.createElement('canvas'); canvas.width = 540; canvas.height = 960; const c = canvas.getContext('2d');
      window.__hsFixtureTicker = setInterval(() => { c.fillStyle = '#333333'; c.fillRect(0, 0, 540, 960); c.fillStyle = '#555555'; c.fillRect(270 + Math.sin(performance.now() / 600) * 50, 480, 20, 20); }, 40);
      const stream = canvas.captureStream(24); window.__hsModelStream = stream; return stream;
    };
  });
  await page.locator('.launch-camera').click();
  await page.waitForFunction(() => window.__hs?.input.at > 0 || window.__hs?.phase === 'error', null, { timeout: 60000 });
  const state = await page.evaluate(() => ({ phase: __hs.phase, error: __hs.error?.message, running: __hs.input.running, at: __hs.input.at, hands: __hs.input.hands.length, recognizer: !!__hs.input.recognizer, constraints: __hsConstraints }));
  check(state.phase !== 'error' && state.running && state.recognizer && state.at > 0, 'real hand and face models load and infer: ' + JSON.stringify(state));
  check(state.hands === 0, 'blank synthetic video cannot invent a hand'); check(state.constraints.audio === false && state.constraints.video.facingMode.exact === 'user', 'front camera with no audio requested');
  await page.locator('.game-back').click(); check(await page.evaluate(() => __hsModelStream.getTracks().every(t => t.readyState === 'ended') && !__hs.input.recognizer), 'actual model and stream lifecycle closes on exit');
  await page.evaluate(() => clearInterval(__hsFixtureTicker)); return { checks, actualMediaPipeInference: true, physicalCameraTested: false };
}
