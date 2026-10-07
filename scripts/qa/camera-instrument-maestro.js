// Real Chromium + WebAudio evidence. Landmarks below are synthetic, not a phone playtest.
// playwright-cli -s=maestro run-code --filename=scripts/qa/camera-instrument-maestro.js
async (page) => {
  const base = 'http://127.0.0.1:5298', checks = [], errors = [];
  const check = (ok, name) => { if (!ok) throw Error(name); checks.push(name); };
  page.on('pageerror', e => errors.push(e.message));
  await page.setViewportSize({width:390,height:844});
  await page.goto(base+'/?debug=1&qa='+Date.now()+'#/game/solo-maestro');
  await page.locator('.maestro-view').waitFor({state:'attached'});
  const japanese=page.getByRole('button',{name:'日本語に切り替える',exact:true});
  if(await japanese.count()) await japanese.click();
  await page.waitForFunction(() => !document.querySelector('.launch-demo')?.disabled);
  await page.evaluate(() => { window.ma = document.querySelector('.maestro-view').parentElement.__maestro; });
  check(await page.evaluate(() => !ma.audio.context && !ma.input.running), 'MAESTRO entrance owns no audio context or camera');
  await page.screenshot({path:'output/playwright/maestro-entry-390.png',fullPage:true});
  await page.getByRole('button',{name:'カメラなしの練習',exact:true}).click();
  await page.waitForFunction(() => ma.phase === 'playing');
  check(await page.evaluate(() => ma.audio.context.state === 'running' && !ma.input.running && !ma.video.srcObject), 'practice unlocks actual AudioContext without camera/model');
  await page.locator('[data-action=START]').click();
  await page.waitForFunction(() => ma.game.state === 'PLAY');
  check(await page.evaluate(() => {
    const stems=Object.values(ma.audio.stems); return stems.length===3 && new Set(stems.map(s=>s.startedAt)).size===1 && stems.every(s=>Math.abs(s.source.buffer.duration-32)<.001 && s.source.loop);
  }), 'three genuine 32s decoded loops share one sample-clock start');
  await page.locator('[data-action=BRASS]').click();
  await page.locator('[data-action=PERCUSSION]').click();
  await page.locator('.maestro-slider').fill('0.95');
  await page.waitForFunction(() => ma.game.finaleReady && ma.audio.stems.brass.gain.gain.value>.6);
  await page.evaluate(() => { window.maContext=ma.audio.context; window.ana=maContext.createAnalyser(); ana.fftSize=2048; ma.audio.master.connect(ana); });
  await page.waitForTimeout(150);
  check(await page.evaluate(() => { const a=new Float32Array(2048); ana.getFloatTimeDomainData(a); return a.some(v=>Math.abs(v)>.003); }), 'the three-stem graph produces a real waveform');
  await page.screenshot({path:'output/playwright/maestro-forte-390.png',fullPage:true});
  await page.locator('[data-action=CUT]').click();
  await page.waitForTimeout(220);
  check(await page.evaluate(() => { const a=new Float32Array(2048); ana.getFloatTimeDomainData(a); return ma.game.state==='CUT' && a.every(v=>Math.abs(v)<.0001); }), 'CUT actually silences the complete audio graph');
  check(await page.locator('.maestro-musician.is-playing').count()===0,'CUT freezes every musician');
  await page.locator('[data-action=START]').click();
  await page.waitForFunction(() => ma.game.state === 'PLAY');
  await page.locator('[data-action=FINALE]').click();
  await page.waitForFunction(() => ma.game.state === 'BRAVO');
  check(await page.evaluate(() => ma.fx.length===65 && ma.applauded && ma.audio.buffers.applause.duration>3),'guarded finale produces confetti and decoded OtoLogic applause');
  check(await page.locator('.cmi-credit a[href*=otologic]').isVisible(),'OtoLogic credit appears in the live game');
  await page.screenshot({path:'output/playwright/maestro-bravo-390.png',fullPage:true});
  await page.locator('.maestro-again').click();
  await page.waitForFunction(() => ma.game.state==='PLAY');
  await page.locator('.cmi-pause').click();
  const clock = await page.evaluate(() => ma.clock);
  await page.waitForTimeout(200);
  check(await page.evaluate(t => ma.clock===t && ma.paused,clock),'manual pause freezes session time');
  await page.locator('.cmi-pause').click();
  await page.waitForFunction(() => !ma.paused);
  await page.locator('.cmi-sound').click();
  await page.waitForTimeout(150);
  check(await page.evaluate(() => ma.audio.master.gain.value<.0001),'sound switch mutes music and all effects');
  await page.locator('.cmi-sound').click();
  for (const [width,height] of [[360,800],[720,1280],[1440,900]]) {
    await page.setViewportSize({width,height});
    check(await page.evaluate(() => document.documentElement.scrollWidth<=innerWidth),'MAESTRO fits width '+width);
    check(await page.locator('[data-action=FINALE]').evaluate(el => el.getBoundingClientRect().bottom<=innerHeight),'MAESTRO controls fit viewport '+width);
  }
  // Drive the real Pose result parser and real crop mapper, while retaining the
  // permission-free session. Confidence/crop/loss still use production rules.
  await page.evaluate(async () => {
    const poseCanvas=document.createElement('canvas');poseCanvas.width=720;poseCanvas.height=1280;
    ma.video.srcObject=poseCanvas.captureStream(15);poseCanvas.getContext('2d').fillRect(0,0,720,1280);await ma.video.play();
    ma.source='camera';ma.mapper.reset();ma.game.tutorial=3;ma.game.state='PLAY';ma.raw=null;
    window.posePoints=Array.from({length:33},()=>({x:.5,y:.5,z:0,visibility:1}));
    posePoints[11]={x:.35,y:.45,visibility:1};posePoints[12]={x:.65,y:.45,visibility:1};
    posePoints[15]={x:.15,y:.32,visibility:1};posePoints[16]={x:.85,y:.32,visibility:1};
    ma.input.processResult({landmarks:[posePoints]},performance.now());
  });
  await page.waitForTimeout(80);
  check(await page.evaluate(() => !!ma.pose),'Pose parser/crop mapping reaches live normalized input');
  await page.evaluate(() => { ma.input.processResult({landmarks:[]},performance.now()); });
  await page.waitForTimeout(1050);
  check(await page.evaluate(() => ma.game.state==='PLAY' && ma.lossGain===1),'pose loss keeps music for the initial grace interval');
  await page.waitForTimeout(1400);
  check(await page.evaluate(() => ma.lossGain===0 && ma.game.state==='PLAY'),'long pose loss fades the music without ending free play');
  await page.evaluate(() => {
    window.poseLoop=setInterval(()=>ma.input.processResult({landmarks:[posePoints]},performance.now()),65);
  });
  await page.waitForTimeout(160);
  check(await page.evaluate(() => ma.lossGain===1 && ma.game.state==='PLAY'),'pose recovery restores music without false CUT/FINALE');
  await page.evaluate(() => { clearInterval(poseLoop);ma.video.srcObject.getTracks().forEach(t=>t.stop());ma.video.srcObject=null; });
  await page.locator('.game-back').click();
  await page.waitForTimeout(100);
  check(await page.evaluate(() => !ma.active && !ma.raf && !ma.input.running && !ma.audio.context && maContext.state==='closed'),'MAESTRO exit releases camera, loops, AudioContext and RAF');
  await page.setViewportSize({width:390,height:844});
  await page.goto(base+'/?debug=1&qa='+Date.now()+'#/game/tech-camera-instrument');
  await page.locator('.cmi-playground').waitFor({state:'attached'});
  await page.waitForFunction(() => !document.querySelector('.launch-demo')?.disabled);
  await page.evaluate(() => { window.ci=document.querySelector('.cmi-playground').parentElement.__cameraInstrument; });
  check(await page.evaluate(() => !ci.audio.context && !ci.input.running),'Playground entrance has no camera or AudioContext');
  await page.getByRole('button',{name:'カメラなしの練習',exact:true}).click();
  await page.waitForFunction(() => ci.phase==='playing');
  const stage=page.locator('.cmi-playground .cmi-stage');
  for (const point of [[.25,.4],[.7,.4],[.5,.7]]) {
    const r=await stage.boundingBox(); await page.mouse.click(r.x+r.width*point[0],r.y+r.height*point[1]);
  }
  check(await page.evaluate(() => !ci.placing && ci.instrument.zones.map(z=>z.soundId).join(',')==='C4,E4,G4'),'three screen taps create C/E/G and enter free play');
  await page.waitForTimeout(130); await stage.focus(); await page.keyboard.press('1');
  check(await page.evaluate(() => ci.instrument.hits===4),'keyboard dispatch plays the actual first zone');
  await page.locator('.cmi-five').click();
  check(await page.evaluate(() => ci.instrument.zones.length===5),'one click creates the five-spot preset');
  await page.locator('.cmi-bank').selectOption('drums');
  check(await page.evaluate(() => ci.instrument.zones.map(z=>z.soundId).join(',')==='kick,snare,hat,tom,clap'),'DRUM bank replaces all five assignments');
  await page.locator('.cmi-edit').click();
  const r=await stage.boundingBox();
  await page.mouse.move(r.x+r.width*.23,r.y+r.height*.35);await page.mouse.down();
  await page.mouse.move(r.x+r.width*.38,r.y+r.height*.5,{steps:8});await page.mouse.up();
  check(await page.evaluate(() => Math.abs(ci.instrument.zones[0].x-.38)<.02),'edit drag moves a normalized zone');
  await page.mouse.click(r.x+r.width*.38,r.y+r.height*.5);
  check(await page.evaluate(() => ci.instrument.zones.length===4),'edit tap removes the chosen zone');
  await page.locator('.cmi-edit').click();
  await page.locator('.cmi-backing').click();
  await page.waitForFunction(() => ci.backing.buffer && ci.backing.source);
  check(await page.evaluate(() => ci.backing.track.id==='toyDrum'),'optional backing decodes the licensed OpenTracks track');
  await page.locator('.cmi-pause').click();
  check(await page.evaluate(() => ci.paused && !ci.backing.source),'pause immediately stops the OpenTracks bed');
  await page.locator('.cmi-pause').click();
  await page.waitForFunction(() => !ci.paused);
  for (const [width,height] of [[360,800],[720,1280],[1440,900]]) {
    await page.setViewportSize({width,height});
    check(await page.evaluate(() => document.documentElement.scrollWidth<=innerWidth),'Playground fits width '+width);
  }
  await page.setViewportSize({width:390,height:844});
  await page.screenshot({path:'output/playwright/camera-instrument-play-390.png',fullPage:true});
  // Reuse the real Hand parser and camera crop, with a fake video stream only.
  await page.evaluate(async () => {
    ci.instrument.clear();ci.instrument.addZone({x:.5,y:.5,soundId:'C4'});ci.instrument.hits=0;ci.placing=false;
    const canvas=document.createElement('canvas');canvas.width=720;canvas.height=1280;
    ci.video.srcObject=canvas.captureStream(15);canvas.getContext('2d').fillRect(0,0,720,1280);await ci.video.play();ci.source='camera';
    window.handY=.3;window.handLoop=setInterval(()=>{
      const points=Array.from({length:21},()=>({x:.5,y:handY,z:0}));
      ci.input.processResult({landmarks:[points]},performance.now());handY=Math.min(.51,handY+.025);
    },50);
  });
  await page.waitForTimeout(800);
  check(await page.evaluate(() => ci.instrument.hits===1),'Hand parser and cover crop create one real camera hit');
  await page.waitForTimeout(300);
  check(await page.evaluate(() => ci.instrument.hits===1),'a parked tracked finger cannot retrigger');
  await page.evaluate(() => { clearInterval(handLoop);ci.input.processResult({landmarks:[]},performance.now()); });
  await page.waitForTimeout(100);
  check(await page.evaluate(() => ci.instrument.zones.length===1 && !ci.found),'hand loss keeps placed spots intact');
  await page.evaluate(() => { ci.video.srcObject.getTracks().forEach(t=>t.stop());ci.video.srcObject=null; });
  await page.getByRole('button',{name:'Switch to English',exact:true}).click();
  check(await page.locator('.cmi-hint').textContent().then(t=>t.includes('Lift your finger')),'live locale change updates input guidance');
  await page.locator('.game-back').click();
  check(await page.evaluate(() => !ci.active && !ci.raf && !ci.audio.context && !ci.backing.context && !ci.input.running),'Playground exit releases both audio owners and camera');
  check(errors.length===0,'no page errors: '+errors.join('; '));
  return {checks,errors};
}
