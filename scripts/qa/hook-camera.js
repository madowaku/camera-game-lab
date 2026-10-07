async (page) => {
  const base=new URL(page.url()).origin, checks=[], errors=[], check=(ok,name)=>{if(!ok)throw Error(name);checks.push(name);};
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/?hookcamera='+Date.now()+'#/game/solo-hook');
  await page.locator('.hook-entry .launch-camera:not(:disabled)').waitFor();await page.setViewportSize({width:390,height:844});
  await page.evaluate(async()=>{
    const {experiments}=await import('/src/platform/experiments.js'),factory=await experiments.find(g=>g.id==='solo-hook').load();
    const temporary=factory(document.createElement('div'),'ja'),proto=Object.getPrototypeOf(temporary),notify=proto.notify;
    proto.notify=function(...a){window.__hook=this;return notify.apply(this,a);};
    window.__denied=true;window.__hands=[{x:.5,y:.6}];window.__recognizerClosed=0;
    Object.getPrototypeOf(temporary.input).createRecognizer=async()=>({detectForVideo:()=>({landmarks:__hands.map(h=>Array.from({length:21},()=>({x:1-h.x,y:h.y,z:0})))}),close:()=>{__recognizerClosed++;}});
    Object.defineProperty(navigator.mediaDevices,'getUserMedia',{configurable:true,value:async constraints=>{
      window.__constraints=constraints;if(__denied)throw new DOMException('Denied in QA','NotAllowedError');
      const canvas=document.createElement('canvas');canvas.width=360;canvas.height=640;const c=canvas.getContext('2d');
      c.fillStyle='#e3ece5';c.fillRect(0,0,360,640);c.fillStyle='#598d80';c.fillRect(80,150,200,350);
      const stream=canvas.captureStream(30),track=stream.getVideoTracks()[0],settings=track.getSettings.bind(track);
      track.getSettings=()=>({...settings(),facingMode:'user'});window.__stream=stream;
      const draw=()=>{if(track.readyState!=='live')return;c.fillStyle='#609c8d';c.fillRect(Math.random()*360,400,2,2);requestAnimationFrame(draw);};draw();return stream;
    }});temporary.deactivate();
  });
  await page.locator('.launch-camera').click();await page.locator('.hook-reconnect').waitFor({timeout:60000});
  check(await page.evaluate(()=>__constraints.audio===false&&__constraints.video.facingMode.exact==='user'),'requests only front camera with microphone off');
  check(await page.evaluate(()=>__hook.phase==='error'&&!__hook.input.running&&!__hook.video.srcObject&&__recognizerClosed>0),'denial releases camera and recognizer');
  await page.screenshot({path:'output/playwright/hook-camera-denied.png'});
  await page.evaluate(()=>{__denied=false;});await page.locator('.hook-reconnect').click();
  await page.waitForFunction(()=>__hook.phase==='playing',{timeout:60000});
  check(await page.evaluate(()=>__hook.source==='camera'&&__hook.input.running&&__hook.video.srcObject===__stream),'synthetic stream exercises real camera lifecycle and hand projection');
  await page.evaluate(()=>{__hands=[{x:.68,y:.6}];});await page.waitForFunction(()=>['cast','wait'].includes(__hook.game.phase));
  check(await page.evaluate(()=>__hook.game.casts===1),'large raw palm motion casts');await page.evaluate(()=>{__hands=[{x:.5,y:.6}];});
  await page.waitForFunction(()=>__hook.game.phase==='bite');await page.waitForTimeout(100);await page.evaluate(()=>{__hands=[{x:.5,y:.42}];});
  await page.waitForFunction(()=>__hook.game.phase==='fight');check(await page.evaluate(()=>__hook.game.hooks===1),'upward raw palm motion hooks');
  await page.evaluate(()=>{__hands=[];});await page.waitForFunction(()=>__hook.inputLost);
  const frozen=await page.evaluate(()=>[__hook.game.elapsed,__hook.game.tension,__hook.game.fishX,__hook.game.age]);await page.waitForTimeout(600);
  check(JSON.stringify(await page.evaluate(()=>[__hook.game.elapsed,__hook.game.tension,__hook.game.fishX,__hook.game.age]))===JSON.stringify(frozen),'lost hand freezes timer, tension, fish and bite/fight clocks');
  await page.screenshot({path:'output/playwright/hook-camera-lost.png'});
  await page.evaluate(()=>{__hands=[{x:.5,y:.42}];});await page.waitForFunction(()=>!__hook.inputLost);
  check(await page.evaluate(()=>__hook.game.misses===0&&Math.abs(__hook.motion.pull)<.01),'reacquisition rebases motion without false hook or defeat');
  for(let i=0;i<40;i++){if(await page.evaluate(()=>__hook.game.phase!=='fight'))break;await page.evaluate(()=>{__hands=[{x:.5-__hook.game.direction*.135,y:.42}];});await page.waitForTimeout(100);}
  await page.waitForFunction(()=>__hook.game.phase==='catch');await page.waitForFunction(()=>!!__hook.photo);
  check(await page.evaluate(()=>__hook.game.catches.length===1&&__hook.photo.size>10000),'camera counterpull catches fish and composites local camera photo');
  await page.screenshot({path:'output/playwright/hook-camera-catch.png'});
  await page.locator('.hook-pause').click();const paused=await page.evaluate(()=>__hook.game.elapsed);await page.waitForTimeout(350);
  check(await page.evaluate(()=>__hook.game.elapsed)===paused,'camera manual pause retains the stream but stops active time');await page.locator('.hook-resume').click();
  await page.locator('.game-back').click();await page.waitForFunction(()=>!document.querySelector('.hook-phaser canvas'));
  check(await page.evaluate(()=>__stream.getTracks().every(t=>t.readyState==='ended')&&!__hook.input.running&&!__hook.audio.context&&!__hook.three.layer),'exit ends actual synthetic tracks and both renderer lifetimes');
  check(errors.length===0,'no uncaught camera errors');return{checks,errors};
}
