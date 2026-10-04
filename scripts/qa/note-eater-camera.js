// Real browser-owned streams with synthetic landmarks; not a human Input Gate.
async (page) => {
  const base = new URL(page.url()).origin, checks = [], errors = [];
  const check = (ok,name) => {if(!ok)throw Error(name);checks.push(name);};
  page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>localStorage.setItem('camera-game-lab-locale','ja'));
  await page.setViewportSize({width:390,height:844});await page.goto(base+'/?qa=note-camera&run='+Date.now()+'#/game/solo-note-eater');
  await page.waitForFunction(()=>document.querySelector('.launch-camera')?.disabled===false);
  await page.clock.install({time:new Date('2026-10-03T00:00:00Z')});
  await page.evaluate(async()=>{
    const registrySource=await(await fetch('/src/platform/experiments.js')).text();
    const viewPath=registrySource.match(/import\("([^"]*\/noteEater\/view\.js[^"]*)"\)/)[1];
    const viewSource=await(await fetch(viewPath)).text();
    const inputPath=viewSource.match(/from "([^"]*\/input\/noteEaterInput\.js[^"]*)"/)[1];
    const inputSource=await(await fetch(inputPath)).text();
    const vision=await import(inputSource.match(/from "([^"]*mediapipe[^"]*)"/)[1]);
    const {NoteEaterInput}=await import(inputPath);
    const {NoteEaterView}=await import(viewPath);
    const {NoteEaterGame}=await import(viewSource.match(/from "([^"]*\/games\/noteEater\.js[^"]*)"/)[1]);
    const step=NoteEaterGame.prototype.step,start=NoteEaterInput.prototype.start,render=NoteEaterView.prototype.render;
    NoteEaterGame.prototype.step=function(...args){window.__game=this;return step.apply(this,args);};
    NoteEaterView.prototype.render=function(...args){window.__view=this;return render.apply(this,args);};
    NoteEaterInput.prototype.start=function(){
      Object.defineProperties(this.video,{currentTime:{configurable:true,get:()=>performance.now()/1000},readyState:{configurable:true,get:()=>3},videoWidth:{configurable:true,get:()=>270},videoHeight:{configurable:true,get:()=>480}});
      this.video.play=async()=>{};return start.call(this);
    };
    window.__signal={count:1,x:.5,y:.52,open:false};window.__requests=0;window.__closes=0;window.__tracks=[];window.__delegates=[];
    vision.FilesetResolver.forVisionTasks=async()=>({});
    vision.FaceLandmarker.createFromOptions=async(files,options)=>{
      __delegates.push(options.baseOptions.delegate);window.__faceCount=options.numFaces;
      if(options.baseOptions.delegate==='GPU'&&!window.__gpuFailed){window.__gpuFailed=true;throw Error('QA GPU unavailable');}
      return {close:()=>__closes++,detectForVideo:()=>({faceLandmarks:Array.from({length:__signal.count},()=>{
        const s=__signal,f=Array.from({length:478},()=>({x:s.x,y:s.y}));
        f[10]={x:s.x,y:s.y-.18};f[152]={x:s.x,y:s.y+.15};f[234]={x:s.x-.14,y:s.y};f[454]={x:s.x+.14,y:s.y};
        f[33]={x:s.x-.06,y:s.y-.06};f[263]={x:s.x+.06,y:s.y-.06};
        f[61]={x:s.x-.06,y:s.y+.04};f[291]={x:s.x+.06,y:s.y+.04};
        const gap=s.open?.024:.002;f[13]={x:s.x,y:s.y+.04-gap};f[14]={x:s.x,y:s.y+.04+gap};return f;
      })})};
    };
    const board=document.createElement('canvas');board.width=270;board.height=480;const c=board.getContext('2d');
    c.fillStyle='#476c5d';c.fillRect(0,0,270,480);c.fillStyle='#dbbca0';c.beginPath();c.ellipse(135,220,62,87,0,0,Math.PI*2);c.fill();
    const stream=()=>{const s=board.captureStream(30);__tracks.push(...s.getTracks());return s;};
    navigator.mediaDevices.getUserMedia=async constraints=>{__requests++;window.__constraints=constraints;if(window.__deny)throw new DOMException('QA denied','NotAllowedError');if(window.__delay)return new Promise(resolve=>window.__grant=()=>resolve(stream()));return stream();};
  });
  check(await page.evaluate(()=>__requests===0),'entry does not request camera');
  await page.locator('.launch-camera').click();await page.waitForFunction(()=>document.querySelector('.ne-stage video').srcObject);await page.clock.runFor(250);
  check(await page.evaluate(()=>__constraints.video.facingMode.exact==='user'&&__constraints.audio===false),'front camera only, no microphone');
  check(await page.evaluate(()=>__faceCount===2&&__delegates.join()==='GPU,CPU'),'Face Landmarker CPU fallback and ambiguous-face detection');
  await page.evaluate(()=>__signal.open=true);await page.clock.runFor(150);
  check(await page.evaluate(()=>__game.phase==='countdown'),'closed-open landmark input eats first choice');await page.clock.runFor(3100);
  await page.evaluate(()=>__game.notes.forEach(n=>{n.x=__game.mouth.x;n.y=__game.mouth.y;}));await page.clock.runFor(500);
  check(await page.evaluate(()=>__game.eaten===0),'holding tutorial mouth open does not eat in new round');
  await page.evaluate(()=>__signal.open=false);await page.clock.runFor(180);await page.evaluate(()=>__signal.open=true);await page.clock.runFor(180);
  check(await page.evaluate(()=>__game.eaten===1),'real input controller confirms one bite');await page.clock.runFor(800);check(await page.evaluate(()=>__game.eaten===1),'open mouth cannot repeatedly consume notes');
  await page.evaluate(()=>{__signal.count=0;});const before=await page.evaluate(()=>__game.elapsed);await page.clock.runFor(500);
  check(await page.evaluate(()=>__game.elapsed>0&&!__game.armed)&&await page.evaluate(()=>__game.elapsed)>before,'tracking loss continues round and disarms eating');
  check((await page.locator('.ne-overlay').textContent()).includes('カメラ'),'loss offers a concrete camera action');
  await page.evaluate(()=>__signal.count=1);await page.clock.runFor(200);check(await page.evaluate(()=>__game.eaten===1),'open-mouth recovery does not synthesize a bite');
  await page.evaluate(()=>__signal.open=false);await page.clock.runFor(200);check(await page.evaluate(()=>__game.armed),'close automatically re-arms after recovery');
  await page.evaluate(()=>__signal.count=2);await page.clock.runFor(200);check((await page.locator('.ne-overlay').textContent()).includes('ひとり'),'two faces offer a specific correction');
  await page.evaluate(()=>{__signal.count=1;__signal.x=.38;});await page.clock.runFor(200);check(await page.evaluate(()=>Math.abs(__game.mouth.x-.62)<.01),'face XY follows mirrored video');
  await page.screenshot({path:'output/playwright/note-eater-camera-390.png'});
  await page.clock.runFor(31000);await page.locator('.ne-result').waitFor();check(await page.evaluate(()=>__tracks.every(t=>t.readyState==='ended')&&__closes===1),'end releases stream and recognizer');
  check(!(await page.locator('.ne-result').textContent()).includes('練習'),'camera result is not labeled practice');
  await page.locator('[data-result-action="retry"]').click();await page.waitForFunction(()=>__requests===2);await page.clock.runFor(300);check(await page.evaluate(()=>__view.source==='camera'),'RETRY retains camera source');
  for(const mode of ['ORIGINAL','EFFECT','HIDE']) {
    await page.evaluate(()=>location.hash='#/');await page.locator('.lab-feed').waitFor();
    await page.evaluate(()=>{__signal.count=1;__signal.x=.5;__signal.open=false;location.hash='#/game/solo-note-eater';});
    await page.waitForFunction(()=>document.querySelector('.launch-camera')?.disabled===false);
    await page.locator('[data-creator-mode="creator"]').click();await page.locator('[data-face-mode="'+mode+'"]').click();
    await page.waitForFunction(()=>document.querySelector('.ne-stage video').srcObject);await page.clock.runFor(250);
    check(await page.evaluate(mode=>__view.creator?.faceMode===mode,mode),'creator starts in '+mode);
    check(await page.locator('.ne-creator').evaluate(c=>c.width===270&&c.height===480),'creator has portrait 9:16 composition in '+mode);
    if(mode==='HIDE') {
      await page.evaluate(()=>__signal.count=0);await page.clock.runFor(200);
      check(await page.locator('.ne-creator').evaluate(c=>c.getContext('2d').getImageData(5,5,1,1).data[0]>240),'HIDE masks the whole camera when tracking is lost');
      await page.evaluate(()=>__signal.count=1);await page.clock.runFor(250);
    }
    await page.evaluate(()=>__signal.open=true);await page.clock.runFor(150);await page.clock.runFor(3100);
    for(let i=0;i<9;i++) {
      await page.evaluate(()=>{__signal.open=false;__game.notes.forEach(n=>{n.x=__game.mouth.x;n.y=__game.mouth.y;});});await page.clock.runFor(180);
      await page.evaluate(()=>__signal.open=true);await page.clock.runFor(180);
    }
    check(await page.evaluate(()=>__game.maxGroove>=80&&__view.highlights.some(e=>e.type==='FAST_3_EATS'&&e.data.priority===100)),'creator receives high-groove three-bite hook in '+mode);
    await page.screenshot({path:'output/playwright/note-eater-creator-'+mode+'.png'});
    await page.clock.runFor(31000);await page.locator('.ne-replay').waitFor();
    check(await page.evaluate(()=>__view.creatorResult?.frames.length>0&&__view.creatorResult.faceMode===__view.options.faceMode),'creator result retains treated replay frames in '+mode);
    await page.locator('.ne-replay-play').click();await page.clock.runFor(200);
    check(await page.locator('.creator-replay-canvas').evaluate(c=>{const p=c.getContext('2d').getImageData(0,0,c.width,c.height).data;return p.some((n,i)=>i%4===3&&n>0);}),'replay paints in '+mode);
    await page.screenshot({path:'output/playwright/note-eater-creator-result-'+mode+'.png'});
  }
  await page.goto(base+'/?qa=note-camera-denied&run='+Date.now()+'#/game/solo-note-eater');await page.waitForFunction(()=>document.querySelector('.launch-camera')?.disabled===false);
  // Reinstall a lightweight denied input to check user-visible recovery.
  await page.evaluate(async()=>{const {NoteEaterInput}=await import('/src/input/noteEaterInput.js');NoteEaterInput.prototype.start=async function(){throw new DOMException('QA denied','NotAllowedError');};});
  await page.locator('.launch-camera').click();await page.locator('.ne-practice').waitFor();check((await page.locator('.ne-overlay').textContent()).includes('許可'),'permission rejection offers retry or practice');
  await page.locator('.ne-practice').click();await page.clock.runFor(100);check((await page.locator('.ne-source').textContent()).includes('練習'),'denied camera can recover to practice');
  await page.goto(base+'/#/');check(errors.length===0,'no unhandled camera browser errors');return {checks,errors};
}
