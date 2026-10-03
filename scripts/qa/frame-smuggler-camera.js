// Synthetic raw hand landmarks, real MediaStreamTracks. Not a physical playtest.
async (page) => {
  const base = new URL(page.url()).origin, checks = [], errors = [];
  const check = (value, name) => { if (!value) throw new Error(name); checks.push(name); };
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => { localStorage.setItem('camera-game-lab-locale', 'en'); localStorage.removeItem('camera-game-lab-frame-smuggler-v1'); });
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto(base + '/?qa=smuggler-camera#/game/outcam-frame-smuggler');
  await page.waitForFunction(() => !document.querySelector('.launch-camera')?.disabled); await page.clock.install();
  await page.evaluate(async () => {
    const source = await (await fetch('/src/input/bodyInput.js')).text();
    const vision = await import(source.match(/from "([^"]*mediapipe[^"]*)"/)[1]);
    const { SmugglerInput } = await import('/src/smuggler/input.js');
    const start = SmugglerInput.prototype.start;
    SmugglerInput.prototype.start = function () {
      Object.defineProperty(this.video, 'currentTime', { configurable: true, get: () => window.__stalled ? 0 : performance.now() / 1000 });
      return start.call(this);
    };
    window.__hand = { x: .5, y: .5, present: true }; window.__tracks = []; window.__closes = 0; window.__requests = [];
    vision.FilesetResolver.forVisionTasks = async () => ({});
    vision.GestureRecognizer.createFromOptions = async () => ({
      recognizeForVideo: () => {
        if (!__hand.present) return {};
        // Convert visible-stage coordinates back to camera coordinates; the app
        // must apply the forward transform to align the cargo with the video.
        const video = document.querySelector('.fs-stage video'), stage = document.querySelector('.fs-stage').getBoundingClientRect();
        const scale = Math.max(stage.width / video.videoWidth, stage.height / video.videoHeight);
        const x = video.classList.contains('is-mirrored') ? 1 - __hand.x : __hand.x;
        const point = { x: (x * stage.width + (video.videoWidth * scale - stage.width) / 2) / (video.videoWidth * scale), y: (__hand.y * stage.height + (video.videoHeight * scale - stage.height) / 2) / (video.videoHeight * scale), z: 0 };
        return { landmarks: [Array.from({ length: 21 }, () => ({ ...point }))] };
      }, close: () => window.__closes++,
    });
    const canvas = document.createElement('canvas'); canvas.width = 360; canvas.height = 640;
    const ctx = canvas.getContext('2d'); ctx.fillStyle = '#536759'; ctx.fillRect(0, 0, 360, 640);
    window.__paint = setInterval(() => ctx.fillRect(0, 0, 360, 640), 30);
    const stream = facing => {
      const media = canvas.captureStream(30); for (const track of media.getVideoTracks()) { const settings = track.getSettings.bind(track); track.getSettings = () => ({ ...settings(), facingMode: facing }); }
      window.__tracks.push(...media.getTracks()); return media;
    };
    navigator.mediaDevices.getUserMedia = async constraints => {
      __requests.push(constraints); if (window.__deny) throw new DOMException('QA denial', 'NotAllowedError');
      const facing = constraints.video.facingMode.exact;
      if (window.__delay) return new Promise(resolve => { window.__grant = () => resolve(stream(facing)); });
      return stream(facing);
    };
  });
  await page.locator('.launch-camera').click(); check(await page.evaluate(() => __requests.length === 0), 'camera choice precedes media permission');
  await page.locator('[data-fs="connect"]').click(); await page.waitForFunction(() => document.querySelector('.fs-game')?.dataset.phase === 'ready'); await page.clock.runFor(650);
  check(await page.evaluate(() => __requests[0].audio === false && __requests[0].video.facingMode.exact === 'environment'), 'rear camera explicitly requested without microphone');
  check(await page.locator('.fs-start').isEnabled(), 'raw palm attaches cargo and enables START');
  await page.locator('input[value="user"]').check(); await page.waitForFunction(() => __requests.length === 2 && document.querySelector('.fs-game')?.dataset.phase === 'ready'); await page.clock.runFor(650);
  check(await page.evaluate(() => __tracks[0].readyState === 'ended' && __closes === 1), 'front switch releases rear track and model');
  check(await page.locator('.fs-stage video').evaluate(el => el.classList.contains('is-mirrored')), 'front camera video is mirrored');
  await page.evaluate(() => { __hand.x = .25; }); await page.clock.runFor(100);
  check(Math.abs(parseFloat(await page.locator('.fs-cargo').evaluate(el => el.style.left)) - 25) < .1, 'mirrored cargo aligns with rendered hand');
  await page.evaluate(() => { __hand.x = .5; }); await page.clock.runFor(500); await page.locator('.fs-start').click(); await page.clock.runFor(2100);
  await page.evaluate(() => { __hand.present = false; }); await page.clock.runFor(500);
  check((await page.locator('.fs-tracking').textContent()).includes('LOST CARGO'), 'center tracking loss is LOST, not hidden');
  await page.evaluate(() => { __hand.present = true; }); await page.clock.runFor(200);
  await page.evaluate(() => { __stalled = true; }); await page.clock.runFor(750);
  const frozen = await page.locator('.fs-clock').textContent(); await page.clock.runFor(1300);
  check(await page.locator('.fs-pause-overlay').isVisible() && await page.locator('.fs-clock').textContent() === frozen, 'stalled video pauses round rather than clearing inspection');
  await page.evaluate(() => { __stalled = false; }); await page.clock.runFor(150); await page.locator('[data-fs="resume"]').click();
  const phase = () => page.locator('.fs-game').getAttribute('data-phase'); let departed = false;
  for (let i = 0; i < 170 && await phase() !== 'result'; i++) {
    if (await phase() === 'hide' && !departed) {
      await page.evaluate(() => { __hand.x = .15; }); await page.clock.runFor(40);
      await page.evaluate(() => { __hand.x = .03; }); await page.clock.runFor(17);
      await page.evaluate(() => { __hand.present = false; }); departed = true;
      await page.clock.runFor(250); check((await page.locator('.fs-tracking').textContent()).includes('OUT OF FRAME'), 'edge departure plus continued empty inference confirms outside');
    } else if (await phase() === 'return') { await page.evaluate(() => { __hand.present = true; __hand.x = .5; }); departed = false; }
    await page.clock.runFor(200);
  }
  await page.locator('.platform-result').waitFor({ state: 'visible' });
  check((await page.locator('.fs-stats').textContent()).includes('4 / 4'), 'raw hand path clears all four inspections');
  check(await page.evaluate(() => __tracks.every(t => t.readyState === 'ended') && __closes === 2 && !document.querySelector('.fs-stage video').srcObject), 'result releases every track, model and video reference');
  await page.locator('.fs-survey summary').click();
  const answers = ['yes', 'yes', 'unobserved', 'unobserved', 'unobserved', 'unobserved'];
  for (let i = 0; i < 6; i++) await page.locator('.fs-questions select').nth(i).selectOption(answers[i]);
  await page.locator('.platform-locale').click(); check(await page.locator('.fs-questions select').nth(2).inputValue() === 'unobserved', 'language switch preserves unsaved observation answers');
  await page.locator('.fs-save').click();
  check(await page.evaluate(() => JSON.parse(localStorage.getItem('camera-game-lab-frame-smuggler-v1'))[0].observations.naturalConversation === 'unobserved'), 'observations save exactly the human-entered answers');
  const downloadEvent = page.waitForEvent('download'); await page.locator('[data-fs="export"]').click();
  const download = await downloadEvent; await download.saveAs('output/playwright/frame-smuggler-synthetic-records.json');
  check(download.suggestedFilename() === 'frame-smuggler-playtests.json', 'JSON export is downloadable');
  await page.screenshot({ path: 'output/playwright/frame-smuggler-observations-360.png', fullPage: true });
  await page.locator('[data-fs="swap"]').click(); check(await phase() === 'setup', 'camera role swap waits for partner and explicit camera enable');
  await page.locator('[data-fs="connect"]').click(); await page.waitForFunction(() => __requests.length === 3); await page.clock.runFor(650);
  await page.locator('.game-back').click(); check(await page.evaluate(() => __tracks.every(t => t.readyState === 'ended')), 'leaving READY stops camera');
  await page.evaluate(() => { __delay = true; location.hash = '#smuggler'; }); await page.waitForFunction(() => !document.querySelector('.launch-camera')?.disabled);
  await page.locator('.launch-camera').click(); await page.locator('[data-fs="connect"]').click(); await page.waitForFunction(() => typeof __grant === 'function');
  await page.locator('.game-back').click(); await page.evaluate(() => __grant()); await page.clock.runFor(100);
  check(await page.evaluate(() => __tracks.every(t => t.readyState === 'ended')), 'late permission after exit cannot revive camera');
  await page.evaluate(() => { __delay = false; __deny = true; location.hash = '#smuggler'; }); await page.waitForFunction(() => !document.querySelector('.launch-camera')?.disabled);
  await page.locator('.launch-camera').click(); await page.locator('[data-fs="connect"]').click(); await page.locator('.fs-error').waitFor({ state: 'visible' });
  await page.locator('[data-fs="demo"]').click(); await page.clock.runFor(550); await page.locator('.fs-start').click(); await page.clock.runFor(33000);
  await page.locator('.platform-result').waitFor({ state: 'visible' });
  check((await page.locator('.platform-result').textContent()).includes('練習'), 'permission denial recovers to clearly labeled practice');
  const requests = await page.evaluate(() => __requests.length); await page.locator('[data-result-action="retry"]').click(); await page.clock.runFor(550);
  check(await phase() === 'ready' && await page.evaluate(() => __requests.length) === requests, 'shared RETRY preserves recovered practice source');
  await page.locator('.game-back').click(); await page.evaluate(() => { clearInterval(__paint); localStorage.removeItem('camera-game-lab-frame-smuggler-v1'); });
  check(errors.length === 0, 'no uncaught browser errors');
  return { checks, errors, synthetic: true, physicalDevice: false, humanPlaytest: false };
}
