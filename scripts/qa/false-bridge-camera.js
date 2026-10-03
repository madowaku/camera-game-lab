// A generated landscape MediaStream exercises the real video/crop/pixel path.
// This proves plumbing, never physical camera alignment or human game feel.
async (page) => {
  const base = new URL(page.url()).origin, checks = [], errors = [];
  const check = (ok, name) => { if (!ok) throw Error(name); checks.push(name); };
  page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(() => localStorage.setItem('camera-game-lab-locale','en'));
  await page.setViewportSize({ width:360,height:800 }); await page.goto(base + '/?qa=false-bridge-camera#/game/outcam-false-bridge');
  await page.waitForFunction(() => document.querySelector('.launch-camera')?.disabled === false);
  await page.clock.install();
  await page.evaluate(() => {
    const canvas = document.createElement('canvas'); canvas.width = 1280; canvas.height = 720; const c = canvas.getContext('2d');
    window.__bridgeTracks = []; window.__bridgeConstraints = []; window.__bridgeObjects = []; window.__bridgeDark = false;
    window.__bridgePaint = () => {
      c.resetTransform(); c.fillStyle = __bridgeDark ? '#080808' : '#a0b0aa'; c.fillRect(0,0,1280,720);
      // Project the target through the inverse of a centered cover crop.
      c.translate((1280 - 720 * 360 / 440) / 2,0); c.scale(720 / 440,720 / 440);
      c.fillStyle = __bridgeDark ? '#161616' : '#eb9261';
      for (const s of __bridgeObjects) {
        c.save(); c.translate(s.x,s.y); c.rotate(s.angle * Math.PI / 180); c.beginPath();
        if (s.kind === 'circle') c.ellipse(0,0,s.w/2,s.h/2,0,0,Math.PI*2);
        else if (s.kind === 'hat') { c.moveTo(-s.w*.325,-s.h/2);c.lineTo(s.w*.325,-s.h/2);c.lineTo(s.w/2,s.h/2);c.lineTo(-s.w/2,s.h/2);c.closePath(); }
        else c.rect(-s.w/2,-s.h/2,s.w,s.h);
        c.fill(); c.restore();
      }
      __bridgeTracks.filter(t => t.readyState === 'live').forEach(t => t.requestFrame?.());
    };
    __bridgePaint();
    navigator.mediaDevices.getUserMedia = async constraints => {
      __bridgeConstraints.push(constraints);
      const create = () => { const stream = canvas.captureStream(30), track = stream.getVideoTracks()[0], settings = track.getSettings.bind(track); track.getSettings = () => ({ ...settings(), facingMode:'environment' }); __bridgeTracks.push(track); __bridgePaint(); return stream; };
      if (window.__bridgeDelay) return new Promise(resolve => { window.__bridgeGrant = () => resolve(create()); });
      return create();
    };
    window.__bridgePaintTimer = setInterval(__bridgePaint,30);
  });
  const paint = async (objects = [], dark = false) => {
    await page.evaluate(async ({ objects,dark }) => {
      __bridgeObjects = objects; __bridgeDark = dark;
      const video = document.querySelector('.fb-scene video');
      const presented = video.srcObject ? new Promise(resolve => video.requestVideoFrameCallback(resolve)) : Promise.resolve();
      __bridgePaint(); await presented;
    }, { objects,dark });
    await page.clock.runFor(250);
  };
  const beginCalibration = async (dark = false) => { await paint([],dark); await page.locator('[data-fb="primary"]').click(); await page.clock.runFor(1200); check(await page.locator('.fb-lock').isEnabled(), 'one-second background capture enables alignment'); };
  const pixel = target => page.locator('.fb-world').evaluate((canvas,p) => Array.from(canvas.getContext('2d').getImageData(Math.round(p.x*2),Math.round(p.y*2),1,1).data),target);
  await page.locator('.launch-camera').click(); await page.waitForFunction(() => document.querySelector('.fb-scene video')?.readyState >= 2); await page.clock.runFor(200);
  check(await page.evaluate(() => __bridgeConstraints[0].audio === false && __bridgeConstraints[0].video.facingMode.exact === 'environment'), 'rear camera only; no audio requested');
  await beginCalibration();
  await page.locator('.fb-pause').click();
  check(await page.evaluate(() => __bridgeTracks.every(t => t.readyState === 'ended')), 'pause stops the real MediaStreamTrack');
  await page.locator('[data-fb="primary"]').click(); await page.waitForFunction(() => document.querySelector('.fb-scene video')?.readyState >= 2); await page.clock.runFor(100);
  check((await page.locator('.fb-overlay h3').textContent()).includes('Clear the guide'), 'resume asks for a fresh background');
  const stages = [
    [{x:180,y:244,w:158,h:26,angle:0,kind:'bar'}], [{x:213,y:222,w:152,h:26,angle:90,kind:'bar'}],
    [{x:180,y:148,w:112,h:112,angle:0,kind:'circle'}], [{x:180,y:179,w:128,h:76,angle:0,kind:'hat'}],
    [{x:180,y:219,w:158,h:24,angle:0,kind:'bar'},{x:244,y:282,w:104,h:26,angle:90,kind:'bar'}],
  ];
  let firstBridgePixel;
  for (let stage = 0; stage < 5; stage++) {
    for (let part = 0; part < stages[stage].length; part++) {
      const target = stages[stage][part], dark = stage === 2;
      await beginCalibration(dark); await paint([target],dark);
      if (!dark) check((await page.locator('.fb-feedback').textContent()) === 'LOCK READY', `camera stage ${stage+1}/${part+1}: real RGB comparison aligns`);
      await page.locator('.fb-lock').click();
      if (dark) {
        check((await page.locator('.fb-overlay p').textContent()).includes('Too dark'), 'darkness enters explicit self-judgment');
        await page.locator('[data-fb="primary"]').click();
      }
      const frozen = await pixel(target); await paint([],!dark);
      check(JSON.stringify(await pixel(target)) === JSON.stringify(frozen), `camera stage ${stage+1}/${part+1}: cutout survives changing source`);
      if (stage === 4 && part === 0) firstBridgePixel = frozen;
      if (stage === 4 && part === 1) check(JSON.stringify(await pixel(stages[4][0])) === JSON.stringify(firstBridgePixel), 'first part remains pixel-identical after second capture');
      await page.screenshot({ path:`output/playwright/false-bridge-camera-${stage+1}-${part+1}.png` });
      await page.clock.runFor(stage === 4 && part === 0 ? 1000 : 2500);
    }
    await page.locator('.fb-overlay.is-clear').waitFor({state:'visible'}); await page.locator('[data-fb="primary"]').click(); await page.clock.runFor(100);
  }
  await page.locator('.platform-result').waitFor({state:'visible'});
  check((await page.locator('.platform-result').textContent()).includes('Camera · 5/5 CLEAR'), 'camera result keeps source provenance');
  check(await page.evaluate(() => __bridgeTracks.every(t => t.readyState === 'ended')), 'result stops every acquired camera track');
  const receipt = await page.evaluate(() => JSON.parse(localStorage.getItem('camera-game-lab-false-bridge-v1')).at(-1));
  check(receipt.source === 'camera' && receipt.selfJudged === 1 && receipt.stages.flatMap(s=>s.parts).length === 6, 'receipt records one self-judgment and six parts');
  check(!JSON.stringify(receipt).includes('data:image'), 'receipt has no camera images');
  await page.locator('[data-result-action="retry"]').click(); await page.waitForFunction(() => document.querySelector('.fb-scene video')?.readyState >= 2); await page.clock.runFor(100);
  check(await page.evaluate(() => __bridgeTracks.filter(t => t.readyState === 'live').length === 1), 'retry opens exactly one camera stream');
  await page.evaluate(() => __bridgeTracks.at(-1).dispatchEvent(new Event('ended'))); await page.clock.runFor(100);
  check(await page.locator('.fb-lock').isDisabled() && (await page.locator('.fb-overlay p').textContent()).includes('camera stopped'), 'interrupted stream pauses with recovery');
  await page.locator('.game-back').click();
  check(await page.evaluate(() => __bridgeTracks.every(t => t.readyState === 'ended') && !document.querySelector('.fb-scene video').srcObject && document.querySelector('.fb-world').getContext('2d').getImageData(360,440,1,1).data[3] === 0), 'exit releases tracks and clears retained image pixels');
  await page.evaluate(() => { __bridgeDelay = true; location.hash = '#/game/outcam-false-bridge'; });
  await page.waitForFunction(() => document.querySelector('.launch-camera')?.disabled === false); await page.locator('.launch-camera').click(); await page.waitForFunction(() => typeof __bridgeGrant === 'function');
  await page.locator('.game-back').click(); await page.evaluate(() => __bridgeGrant()); await page.clock.runFor(100);
  check(await page.evaluate(() => __bridgeTracks.every(t => t.readyState === 'ended')), 'late permission after exit is stopped');
  await page.evaluate(() => { delete window.__bridgeGrant; location.hash = '#/game/outcam-false-bridge'; });
  await page.waitForFunction(() => document.querySelector('.launch-camera')?.disabled === false); await page.locator('.launch-camera').click(); await page.waitForFunction(() => typeof __bridgeGrant === 'function');
  await page.evaluate(() => { Object.defineProperty(document,'hidden',{ configurable:true,value:true }); document.dispatchEvent(new Event('visibilitychange')); });
  check((await page.locator('.fb-overlay h3').textContent()) === 'PAUSED' && await page.locator('[data-fb="primary"]').isEnabled(), 'backgrounding during pending permission leaves an explicit resume action');
  await page.evaluate(() => { __bridgeGrant(); Object.defineProperty(document,'hidden',{ configurable:true,value:false }); document.dispatchEvent(new Event('visibilitychange')); __bridgeDelay = false; });
  await page.clock.runFor(100);
  check(await page.evaluate(() => __bridgeTracks.every(t => t.readyState === 'ended')), 'permission granted while backgrounded cannot revive the camera');
  await page.locator('[data-fb="primary"]').click(); await page.waitForFunction(() => document.querySelector('.fb-scene video')?.readyState >= 2); await page.clock.runFor(100);
  check((await page.locator('.fb-overlay h3').textContent()).includes('Clear the guide'), 'pending-permission interruption can resume and recalibrate');
  await page.locator('.game-back').click();
  await page.evaluate(() => clearInterval(__bridgePaintTimer)); check(errors.length === 0,'no uncaught camera-path errors');
  return { checks, errors, synthetic:true, physicalDevice:false };
}
