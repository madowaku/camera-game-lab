// Production bundle, public controls, real two-pointer touch and Web Audio nodes.
async (page) => {
  await page.clock.resume(); const checks = [], errors = [], check = (ok, name) => { if (!ok) throw Error(name); checks.push(name); };
  page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(() => {
    localStorage.setItem('camera-game-lab-locale','en'); localStorage.setItem('camera-game-lab-bgm-v1','true');
    window.__audioContexts = []; window.__musicSources = [];
    const Ctor = window.AudioContext;
    if (Ctor) window.AudioContext = function (...args) { const c = new Ctor(...args), create = c.createBufferSource.bind(c); c.createBufferSource = () => { const n = create(); __musicSources.push(n); return n; }; __audioContexts.push(c); return c; };
  });
  await page.setViewportSize({ width:390,height:844 });
  await page.goto(new URL(page.url()).origin + '/?qa=toy-production#/game/solo-toy-drum');
  await page.waitForFunction(() => document.querySelector('.td-entry .launch-demo')?.disabled === false);
  check(await page.locator('.td-cover img').evaluate(i => i.complete && i.naturalWidth > 0), 'production Imagegen cover loads');
  check(await page.evaluate(() => !performance.getEntriesByType('resource').some(e => /\.task|\.wasm/.test(e.name))), 'production entrance starts no camera models');
  await page.clock.install(); await page.locator('.launch-demo').click(); await page.clock.runFor(500);
  await page.waitForFunction(() => __musicSources.some(s => s.loop && s.buffer?.duration > 35));
  check(await page.evaluate(() => __audioContexts.some(c => c.state === 'running') && __musicSources.some(s => s.loop && s.buffer)), 'licensed inline BGM decodes and plays in real Web Audio');
  const cdp = await page.context().newCDPSession(page); await cdp.send('Emulation.setTouchEmulationEnabled',{ enabled:true });
  const touch = async (points) => { const b = await page.locator('.td-stage').boundingBox(); await cdp.send('Input.dispatchTouchEvent',{ type:'touchStart', touchPoints:points.map(([x,y],i) => ({ x:b.x+b.width*x, y:b.y+b.height*y, id:i+1 })) }); await cdp.send('Input.dispatchTouchEvent',{ type:'touchEnd', touchPoints:[] }); };
  const touchDrums = async (ids) => { const stage = await page.locator('.td-stage').boundingBox(), points = []; for (const id of ids) { const b = await page.locator(`[data-drum="${id}"]`).boundingBox(); points.push([(b.x + b.width / 2 - stage.x) / stage.width, (b.y + b.height / 2 - stage.y) / stage.height]); } await touch(points); };
  await touchDrums([0,1]); await page.clock.runFor(100);
  check((await page.locator('.td-score span').textContent()) === '0300', 'real simultaneous touchscreen drums score DOUBLE +300');
  await page.screenshot({ path:'output/playwright/toy-drum-production-double.png' });
  await touchDrums([2,3]); await page.clock.runFor(100);
  check((await page.locator('.td-score span').textContent()) === '0600', 'lower blue and green touch targets score a second DOUBLE');
  await page.locator('.td-pause').click(); const time = await page.locator('.td-time').textContent(); await page.clock.runFor(800); check((await page.locator('.td-time').textContent()) === time, 'production pause freezes active time'); await page.locator('.td-resume').click();
  await page.clock.runFor(20500); check((await page.locator('.td-mode').textContent()) === 'FEVER TIME','production reaches FEVER');
  check(await page.evaluate(() => __musicSources.some(s => Math.abs(s.playbackRate.value-1.18)<.01)), 'actual BGM node accelerates to 1.18x');
  await page.clock.runFor(5000); check((await page.locator('.td-cue strong').textContent()) === 'BIG DRUM!','production reaches BIG DRUM');
  await touch([[.38,.72],[.62,.72]]); await page.clock.runFor(120); await page.screenshot({ path:'output/playwright/toy-drum-production-finish.png' });
  await page.clock.runFor(6000); await page.locator('.td-result').waitFor();
  check((await page.locator('.td-finale').textContent()).includes('BAAAN'),'real two-pointer finish succeeds');
  check((await page.locator('.td-result h2').textContent()).includes('900'),'production result preserves measured score');
  check(await page.evaluate(() => __audioContexts.every(c => c.state === 'closed')),'production result closes all actual audio contexts');
  check(await page.evaluate(() => !performance.getEntriesByType('resource').some(e => /\.mp3(?:\?|$)/.test(e.name))), 'no standalone MP3 request or public music file');
  await page.locator('[data-result-action="retry"]').click(); await page.clock.runFor(300); check((await page.locator('.td-score span').textContent()) === '0000','production RETRY resets score');
  await page.locator('.game-back').click(); await page.locator('.lab-feed').waitFor(); check(errors.length === 0,'no uncaught production errors'); await cdp.send('Emulation.setTouchEmulationEnabled',{ enabled:false }); return { checks, errors };
}
