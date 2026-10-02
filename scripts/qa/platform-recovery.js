// Dev-server QA only, in an isolated CLI browser. All permission results are simulated.
async (page) => {
  const base = new URL(page.url()).origin, checks = [];
  const check = (value, name) => { if (!value) throw Error(name); checks.push(name); };
  await page.goto(base + '/#/'); await page.reload();
  await page.evaluate(() => {
    Object.defineProperty(navigator, 'share', { configurable: true, value: undefined });
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async () => { throw Error('QA clipboard denied'); } } });
    document.execCommand = () => false;
  });
  await page.locator('.feed-card:not([inert]) [data-action="share"]').click();
  check(await page.locator('dialog textarea').isVisible(), 'share fallback exposes selectable URL');
  check((await page.locator('dialog textarea').inputValue()).includes('#/game/'), 'manual share contains canonical URL');
  await page.keyboard.press('Escape');
  await page.route('**/src/guardian/guardianExperience.js*', route => route.abort('failed'));
  await page.goto(base + '/#guardian');
  await page.locator('.launch-panel > button').waitFor();
  check(await page.locator('.launch-camera').isDisabled(), 'failed module import cannot start camera');
  await page.screenshot({ path: 'output/playwright/platform-import-error.png' });
  await page.unroute('**/src/guardian/guardianExperience.js*');
  await page.locator('.launch-panel > button').click();
  await page.waitForFunction(() => document.querySelector('.launch-camera')?.disabled === false);
  check(page.url().endsWith('#guardian'), 'reload recovers failed import and keeps deep link');
  await page.goto(base + '/#hand-beat');
  await page.waitForFunction(() => document.querySelector('.launch-camera')?.disabled === false);
  await page.evaluate(async () => {
    const source = await (await fetch('/src/input/bodyInput.js')).text();
    const vision = await import(source.match(/from "([^"]*mediapipe[^"]*)"/)[1]);
    vision.FilesetResolver.forVisionTasks = async () => ({});
    window.__closes = 0;
    vision.GestureRecognizer.createFromOptions = async () => ({ recognizeForVideo: () => ({ landmarks: [], gestures: [] }), close: () => window.__closes++ });
    navigator.mediaDevices.getUserMedia = async () => { throw new DOMException('QA permission denied', 'NotAllowedError'); };
  });
  await page.locator('.launch-camera').click();
  await page.waitForFunction(() => document.querySelector('#camera-status')?.textContent.toLowerCase().includes('error'));
  check(await page.locator('#camera-button').isEnabled(), 'permission denial leaves a retry control');
  check(await page.evaluate(() => window.__closes) === 1, 'denied permission closes loaded model');
  await page.locator('.game-back').click();
  await page.goto(base + '/#hand-beat');
  await page.waitForFunction(() => document.querySelector('.launch-camera')?.disabled === false);
  await page.evaluate(() => {
    navigator.mediaDevices.getUserMedia = () => new Promise(resolve => {
      window.__grant = () => { const canvas = document.createElement('canvas'); window.__lateStream = canvas.captureStream(1); resolve(window.__lateStream); };
    });
  });
  await page.locator('.launch-camera').click();
  await page.waitForFunction(() => typeof window.__grant === 'function');
  await page.locator('.game-back').click();
  await page.evaluate(() => window.__grant());
  await page.waitForFunction(() => window.__lateStream.getTracks().every(track => track.readyState === 'ended'));
  check(await page.locator('.lab-feed').isVisible(), 'late permission grant cannot reopen game');
  check(await page.evaluate(() => [...document.querySelectorAll('video')].every(video => !video.srcObject)), 'late permission grant releases stream');
  return { checks, synthetic: true, expectedConsoleErrors: 'aborted module fetch and denied media permission' };
}
