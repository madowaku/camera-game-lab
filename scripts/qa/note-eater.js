// Playwright CLI run-code. Practice controls, pixels and actual Web Audio.
async (page) => {
  const base = new URL(page.url()).origin, checks = [], errors = [];
  const check = (ok, name) => { if (!ok) throw Error(name); checks.push(name); };
  page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(() => { localStorage.setItem('camera-game-lab-locale', 'ja'); localStorage.setItem('camera-game-lab-platform-onboarded-v1', 'true'); });
  for (const size of [{width:390,height:844},{width:360,height:800},{width:360,height:500},{width:1440,height:900}]) {
    await page.setViewportSize(size); await page.goto(base + '/?qa=note-eater&width=' + size.width + '&height=' + size.height + '#/game/solo-note-eater');
    await page.waitForFunction(() => document.querySelector('.launch-demo')?.disabled === false);
    check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'no horizontal overflow at ' + size.width + 'x' + size.height);
    check(await page.locator('.ne-cover img').evaluate(img => img.complete && img.naturalWidth > 0), 'generated image loads at ' + size.width + 'x' + size.height);
    const b = await page.locator('.launch-demo').boundingBox();
    if (size.height > 500) check(b.y + b.height <= size.height, 'primary actions fit first screen at ' + size.width);
    check(await page.locator('[data-creator-mode="creator"]').evaluate(e => e.getBoundingClientRect().height >= 44), 'creator touch target at ' + size.width);
    await page.screenshot({ path: 'output/playwright/note-eater-launch-' + size.width + '-' + size.height + '.png' });
  }
  await page.setViewportSize({width:390,height:844});
  await page.goto(base + '/?qa=note-practice&run=' + Date.now() + '#/game/solo-note-eater'); await page.waitForFunction(() => document.querySelector('.launch-demo')?.disabled === false);
  check(await page.evaluate(() => !document.querySelector('.ne-stage video').srcObject && !performance.getEntriesByType('resource').some(e=>/\.task|\.wasm/.test(e.name))), 'browsing has no camera stream or inference download');
  await page.evaluate(async () => {
    const source = await (await fetch('/src/noteEater/view.js')).text();
    const { NoteEaterGame } = await import(source.match(/from "([^"]*\/games\/noteEater\.js[^"]*)"/)[1]);
    const step = NoteEaterGame.prototype.step;
    NoteEaterGame.prototype.step = function(...args) { window.__noteGame = this; return step.apply(this,args); };
    const { NoteEaterAudio } = await import(source.match(/from "([^"]*\/noteEater\/audio\.js[^"]*|[^\"]*\/audio\.js[^\"]*)"/)[1]);
    const note = NoteEaterAudio.prototype.note;
    window.__noteTimes=[]; window.__melodyTones=[];
    NoteEaterAudio.prototype.note=function(...args){ window.__noteAudio=this; __noteTimes.push({midi:args[0],quiet:!!args[1],at:this.context?.currentTime}); if(window.__recordMelody)__melodyTones.push(args[0]); return note.apply(this,args); };
  });
  await page.clock.install({ time: new Date('2026-10-03T00:00:00Z') });
  await page.locator('.launch-demo').click(); await page.clock.runFor(150);
  check(await page.evaluate(()=>__noteGame.phase==='tutorial'&&__noteGame.notes.length===1), 'one tutorial note');
  await page.screenshot({path:'output/playwright/note-eater-tutorial-390.png'});
  await page.locator('.ne-bite').click(); await page.clock.runFor(120);
  check(await page.evaluate(()=>__noteGame.phase==='countdown'&&__noteTimes.some(n=>!n.quiet)), 'first bite sounds immediately and begins countdown');
  check(await page.locator('.ne-cue').textContent()==='3','countdown begins at 3');
  await page.clock.runFor(3100);
  check(await page.evaluate(()=>__noteGame.phase==='playing'&&__noteGame.eaten===0&&__noteGame.notes.length===8),'round starts with eight choices; tutorial excluded');
  check(await page.evaluate(()=>new Set(__noteGame.notes.map(n=>n.type)).size===5),'all five pitches are available at the start');
  const bounds = await page.locator('.ne-stage').boundingBox();
  const aim = async () => {
    let p;
    for(let i=0;i<12&&!p;i++) {
      p=await page.evaluate(()=>__noteGame.notes.map(n=>({x:Math.max(.07,Math.min(.93,n.x)),y:Math.max(.13,Math.min(.89,n.y)),distance:Math.hypot(n.x-Math.max(.07,Math.min(.93,n.x)),(n.y-Math.max(.13,Math.min(.89,n.y)))*16/9)})).find(n=>n.distance<.14));
      if(!p)await page.clock.runFor(200);
    }
    if(!p)throw Error('a choice must enter the practice view');
    await page.mouse.move(bounds.x+bounds.width*p.x,bounds.y+bounds.height*p.y); await page.clock.runFor(90);
  };
  await aim(); await page.locator('.ne-stage').focus(); await page.keyboard.down('Space'); await page.clock.runFor(700);
  check(await page.evaluate(()=>__noteGame.eaten===1),'held Space produces exactly one bite');
  await page.keyboard.up('Space'); await page.clock.runFor(90);
  for(let i=0;i<8;i++){await aim();await page.locator('.ne-bite').click();await page.clock.runFor(180);}
  check(await page.evaluate(()=>__noteGame.eaten>=7&&__noteGame.maxGroove>=80),'practice bites build groove above 80');
  check(await page.evaluate(()=>__noteGame.notes.length===12),'high groove brings twelve playable notes');
  check(await page.locator('.ne-view').evaluate(e=>e.classList.contains('is-party')),'high groove turns on the party frame');
  check(await page.locator('.ne-canvas').evaluate(c=>{const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let n=0;for(let i=0;i<d.length;i+=4)if(d[i]>160&&d[i]<250&&d[i+1]<150&&d[i+2]<150)n++;return n>100;}),'playable canvas has colored pixel evidence');
  await page.screenshot({path:'output/playwright/note-eater-playing-390.png'});
  await page.setViewportSize({width:1440,height:900});await page.clock.runFor(32);
  check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'desktop party scene has no horizontal overflow');
  check(await page.locator('.ne-stage').evaluate(e=>Math.abs(e.getBoundingClientRect().width/e.getBoundingClientRect().height-9/16)<.01),'desktop party scene retains portrait framing');
  await page.screenshot({path:'output/playwright/note-eater-playing-1440.png'});
  await page.setViewportSize({width:390,height:844});await page.clock.runFor(32);
  await page.locator('.ne-pause').click(); const before=await page.evaluate(()=>__noteGame.elapsed); await page.clock.runFor(2200);
  check(await page.evaluate(()=>__noteGame.elapsed)===before,'pause freezes round timer');
  check(await page.evaluate(()=>__noteAudio.voices.size===0&&__noteAudio.master.gain.value===0),'pause silences percussion and all stereo echoes'); await page.locator('.ne-pause').click();
  await page.locator('.ne-sound').click(); check(await page.locator('.ne-sound').getAttribute('aria-pressed')==='false','sound can be muted');
  await page.locator('.platform-locale').click(); check((await page.locator('.ne-source').textContent()).includes('practice'),'language switch keeps the round');
  await page.evaluate(()=>window.dispatchEvent(new Event('blur'))); const blurred=await page.evaluate(()=>__noteGame.elapsed); await page.clock.runFor(1200);
  check(await page.evaluate(()=>__noteGame.elapsed)===blurred,'background focus pauses without losing progress');await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
  await page.clock.runFor(31000); await page.locator('.ne-result').waitFor();
  check((await page.locator('.ne-result').textContent()).includes('Camera-free practice'),'result preserves practice provenance');
  check(await page.evaluate(()=>__noteGame.result.durationMs===30000),'round completes at thirty active seconds');
  check(await page.evaluate(()=>JSON.parse(localStorage.getItem('camera-game-lab-note-eater-rounds')).at(-1).melody.length===__noteGame.eaten),'local receipt stores ordered melody');
  check(await page.evaluate(()=>!document.querySelector('.ne-stage video').srcObject),'result releases camera');
  await page.screenshot({path:'output/playwright/note-eater-result-390.png'});
  await page.evaluate(()=>{window.__recordMelody=true;__melodyTones=[];});await page.locator('.ne-melody-play').click();
  await page.waitForFunction(()=>__melodyTones.length>0);
  check(await page.evaluate(()=>JSON.stringify(__melodyTones)===JSON.stringify(__noteGame.result.melody.map(n=>n.midi))),'Web Audio replays exactly the eaten order including repeats');
  await page.locator('.ne-melody-play').click();check((await page.locator('.ne-melody-play').textContent()).includes('PLAY'),'replay can stop');
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('camera-game-lab-note-eater-rounds')).length);
  await page.locator('.platform-locale').click();check(await page.evaluate(()=>JSON.parse(localStorage.getItem('camera-game-lab-note-eater-rounds')).length)===saved,'language change does not duplicate receipts');
  await page.locator('[data-result-action="retry"]').click();await page.clock.runFor(150);
  check(await page.evaluate(()=>__noteGame.phase==='tutorial'&&__noteGame.eaten===0&&__noteGame.source==='demo'),'RETRY preserves source and resets the round');
  await page.goto(base+'/#/explore');await page.locator('input').fill('NOTE EATER');check(await page.getByText('NOTE EATER',{exact:true}).count()>0,'experiment is discoverable');
  check(errors.length===0,'no unhandled browser errors');return {checks,errors};
}
