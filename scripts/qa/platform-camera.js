// Dev-server QA only: substitutes model inference and media devices. No hardware claims.
async (page) => {
  await page.reload();
  const checks=[];
  const check=(condition,name)=>{if(!condition)throw Error(name); checks.push(name);};
  await page.goto('http://127.0.0.1:5173/#hand-beat');
  await page.waitForFunction(()=>document.querySelector('.launch-camera')?.disabled === false);
  await page.evaluate(async () => {
    const source=await (await fetch('/src/input/bodyInput.js')).text();
    const url=source.match(/from "([^"]*mediapipe[^"]*)"/)[1];
    const vision=await import(url);
    window.__modelCloses=0; window.__tracks=[]; window.__mediaRequests=0;
    vision.FilesetResolver.forVisionTasks=async()=>({});
    const face = Array.from({length:478},()=>({x:0.5,y:0.5,z:0}));
    face[61]={x:0.4,y:0.55}; face[291]={x:0.6,y:0.55}; face[13]={x:0.5,y:0.55}; face[14]={x:0.5,y:0.558};
    const recognizer=()=>({ recognizeForVideo:()=>({landmarks:[],gestures:[]}), detectForVideo:()=>({faceLandmarks:[face],landmarks:[]}), close:()=>window.__modelCloses++ });
    vision.GestureRecognizer.createFromOptions=async()=>recognizer();
    vision.FaceLandmarker.createFromOptions=async()=>recognizer();
    vision.PoseLandmarker.createFromOptions=async()=>recognizer();
    const canvas=document.createElement('canvas'); canvas.width=720;canvas.height=1280;
    const ctx=canvas.getContext('2d'); ctx.fillStyle='#24332c';ctx.fillRect(0,0,720,1280);
    window.__qaCanvasTimer=setInterval(()=>{ctx.fillRect(0,0,720,1280);},100);
    window.__qaAudio=new AudioContext();
    navigator.mediaDevices.getUserMedia=async constraints=>{
      window.__mediaRequests++;
      const stream=constraints.video ? canvas.captureStream(10) : window.__qaAudio.createMediaStreamDestination().stream;
      window.__tracks.push(...stream.getTracks());return stream;
    };
  });
  check(await page.evaluate(()=>window.__mediaRequests)===0,'deep link and preflight never request camera');
  await page.locator('.launch-camera').click();
  await page.waitForFunction(()=>window.__mediaRequests===1);
  await page.waitForFunction(()=>document.querySelector('#play-button')?.disabled && document.querySelector('#camera-status')?.textContent.toLowerCase().includes('ready'));
  await page.clock.install();
  await page.clock.runFor(18000);
  await page.locator('.platform-result').waitFor({state:'visible'});
  check(await page.evaluate(()=>window.__tracks.every(t=>t.readyState==='ended')),'solo camera tracks end on RESULT');
  check(await page.evaluate(()=>window.__modelCloses)>0,'solo MediaPipe closed on RESULT');
  await page.locator('[data-result-action="retry"]').click();
  await page.waitForFunction(()=>window.__mediaRequests===2);
  check(await page.evaluate(()=>window.__tracks.filter(t=>t.readyState==='live').length)===1,'RETRY acquires exactly one camera');
  await page.locator('.game-back').click();
  await page.locator('.lab-feed').waitFor({state:'visible'});
  check(await page.evaluate(()=>window.__tracks.every(t=>t.readyState==='ended')),'back cleans camera');
  for (const hash of ['#finger-gun','#eat-dont-eat']) {
    await page.clock.resume();
    await page.goto('http://127.0.0.1:5173/'+hash);
    await page.waitForFunction(()=>document.querySelector('.launch-camera')?.disabled === false);
    await page.evaluate(()=>{window.__qaStarted=false;const started=event=>{if(event.detail.name==='game_start'){window.__qaStarted=true;window.removeEventListener('camera-lab:platform',started);}};window.addEventListener('camera-lab:platform',started);});
    await page.locator('.launch-camera').click();
    await page.waitForFunction(()=>window.__qaStarted);
    await page.clock.runFor(18000);
    await page.locator('.platform-result').waitFor({state:'visible'});
    check(await page.evaluate(()=>window.__tracks.every(t=>t.readyState==='ended')),hash+' automatically starts and releases camera on RESULT');
    await page.locator('.game-back').click();
  }
  await page.goto('http://127.0.0.1:5173/#note-blaster');
  await page.waitForFunction(()=>document.querySelector('.launch-camera')?.disabled === false);
  await page.locator('.launch-camera').click();
  await page.waitForFunction(()=>window.__tracks.filter(t=>t.readyState==='live').length===2);
  check(await page.evaluate(()=>window.__tracks.filter(t=>t.readyState==='live').length)===2,'voice game has camera plus microphone');
  await page.locator('.game-back').click();
  await page.locator('.lab-feed').waitFor({state:'visible'});
  check(await page.evaluate(()=>window.__tracks.every(t=>t.readyState==='ended')),'leaving voice calibration ends both tracks');
  check(await page.evaluate(()=>[...document.querySelectorAll('video')].every(v=>!v.srcObject)),'no video retains a stream');
  await page.evaluate(()=>{clearInterval(window.__qaCanvasTimer);window.__qaAudio.close();});
  return {checks, synthetic:true};
}
