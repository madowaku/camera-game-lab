// Exercises real shared camera lifecycle, with a canvas stream and fake models.
// This does not measure human landmark accuracy or physical Android performance.
async page => {
  const base = new URL(page.url()).origin, checks = [], errors = [];
  const check = (ok, label) => { if (!ok) throw new Error(label); checks.push(label); };
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(base + '/?debug=1&qa=camera-' + Date.now() + '#/game/tech-camera-puppet');
  await page.waitForFunction(() => document.querySelector('.launch-camera')?.disabled === false);
  await page.evaluate(async () => {
    const inputPrototype = Object.getPrototypeOf(document.querySelector('.platform-game-module').__puppetTest.input);
    window.__cameraStats = { streams: 0, pose: 0, face: 0, closed: 0, stopped: 0 };
    window.__lostFace = false; window.__lostPose = false;
    const canvas = document.createElement('canvas'); canvas.width = 640; canvas.height = 480;
    const c = canvas.getContext('2d'); c.fillStyle = '#ff0000'; c.fillRect(0, 0, 640, 480);
    navigator.mediaDevices.getUserMedia = async () => { __cameraStats.streams++; const stream = canvas.captureStream(30); window.__stream = stream; return stream; };
    inputPrototype.createRecognizer = async function () {
      const pose = Array.from({ length: 33 }, () => ({ x: .5, y: .5, z: 0, visibility: 1 }));
      pose[11] = { x: .65, y: .4, z: 0, visibility: 1 }; pose[12] = { x: .35, y: .4, z: 0, visibility: 1 };
      pose[13] = { x: .8, y: .4, z: 0, visibility: 1 }; pose[15] = { x: .9, y: .4, z: 0, visibility: 1 };
      pose[14] = { x: .2, y: .4, z: 0, visibility: 1 }; pose[16] = { x: .1, y: .4, z: 0, visibility: 1 };
      const face = Array.from({ length: 478 }, () => ({ x: .5, y: .4, z: 0 }));
      face[33].x = .4; face[263].x = .6; face[61].x = .42; face[291].x = .58;
      face[13].y = .52; face[14].y = .56;
      const models = { pose: { close() { __cameraStats.closed++; } }, face: { close() { __cameraStats.closed++; } } };
      return { models, detect: () => {
        if (models.pose) __cameraStats.pose++; if (models.face) __cameraStats.face++;
        return { pose: models.pose && !__lostPose ? { landmarks: [pose] } : null, face: models.face && !__lostFace ? { faceLandmarks: [face], faceBlendshapes: [{ categories: [{ categoryName: 'jawOpen', score: .85 }, { categoryName: 'eyeBlinkLeft', score: .6 }] }],
          facialTransformationMatrixes: [{ rows: 4, columns: 4, data: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1] }] } : null };
      }, close() { Object.values(models).forEach(model => model.close()); } };
    };
    // Give the video decoded updates while the picture remains a red sentinel.
    window.__videoPaint = setInterval(() => { c.fillRect(0, 0, 640, 480); }, 33);
  });
  await page.locator('[data-puppet-mode=creator]').click(); await page.locator('.launch-camera').click();
  await page.waitForFunction(() => document.querySelector('.platform-game-module')?.__puppetTest?.phase === 'playing');
  await page.evaluate(() => window.__puppet = document.querySelector('.platform-game-module').__puppetTest);
  await page.waitForFunction(() => __puppet.avatar.frame.tracking.face && __puppet.avatar.frame.face.mouthOpen > .8);
  check(await page.evaluate(() => __cameraStats.streams === 1 && __cameraStats.face === __cameraStats.pose && __puppet.video.hidden), 'face and pose share one front stream and one inference per model; camera is hidden');
  await page.waitForTimeout(1000);
  check(await page.evaluate(() => __cameraStats.face <= 40), 'dual inference stays at or below 20 Hz');
  check(await page.evaluate(() => { const p = __puppet.capture.getContext('2d').getImageData(2, 2, 1, 1).data; return !(p[0] > 240 && p[1] < 20 && p[2] < 20); }), 'AVATAR recording excludes the red camera sentinel');
  await page.locator('.puppet-pause').click(); const before = await page.evaluate(() => __cameraStats.face); await page.waitForTimeout(150);
  check(await page.evaluate(n => __cameraStats.face === n, before), 'pause also suspends recognition'); await page.locator('.puppet-pause').click();
  await page.evaluate(() => window.__lostFace = true); await page.waitForFunction(() => !__puppet.avatar.frame.tracking.face);
  check(await page.evaluate(() => __puppet.avatar.frame.tracking.pose && __puppet.avatar.frame.tracking.leftHand), 'face loss leaves upper-body motion live');
  await page.evaluate(() => window.__lostPose = true); await page.waitForFunction(() => __puppet.avatar.recovery.status.pose === 'IDLE');
  check(await page.evaluate(() => __puppet.video.hidden), 'full tracking loss never reveals camera video');
  await page.evaluate(() => { window.__lostFace = false; window.__lostPose = false; }); await page.waitForFunction(() => __puppet.avatar.recovery.status.face === 'LIVE');
  await page.locator('.puppet-settings summary').click(); await page.locator('.puppet-driver').selectOption('vrm'); await page.waitForFunction(() => !!__puppet.avatar.driver?.vrm);
  check(await page.evaluate(() => __cameraStats.streams === 1), 'driver swap adds no stream or recognition pass');
  await page.evaluate(() => __puppet.input.setQuality('LOW'));
  check(await page.evaluate(() => __cameraStats.closed === 1 && !__puppet.input.recognizer.models.face), 'LOW releases face model without reopening the stream');
  await page.locator('.puppet-finish').click(); await page.locator('.puppet-result').waitFor();
  check(await page.evaluate(() => __stream.getTracks().every(t => t.readyState === 'ended') && __cameraStats.closed === 2 && !__puppet.video.srcObject), 'result stops the stream and closes each model once');
  await page.locator('.game-back').click(); await page.evaluate(() => clearInterval(__videoPaint));
  check(errors.length === 0, 'synthetic camera flow has no browser errors');
  return { checks, errors };
}
