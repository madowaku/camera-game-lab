// Render the actual Web Audio graph offline, then check the reduced-motion game.
async (page) => {
  const base = new URL(page.url()).origin, checks = [], errors = [];
  const check = (ok, name) => { if (!ok) throw Error(name); checks.push(name); };
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(base + '/?qa=note-party&run=' + Date.now() + '#/game/solo-note-eater');
  const sound = await page.evaluate(async () => {
    const { NoteEaterAudio } = await import('/src/noteEater/audio.js');
    const Context = window.AudioContext;
    const render = async (groove, bites, cancel = false) => {
      const offline = new OfflineAudioContext(2, 48000 * 5, 48000);
      let clock = 0;
      const wrapper = new Proxy(offline, { get(target, key) {
        if (key === 'state') return 'running';
        if (key === 'currentTime') return clock;
        if (key === 'resume' || key === 'close') return async () => {};
        const value = target[key]; return typeof value === 'function' ? value.bind(target) : value;
      } });
      window.AudioContext = function() { return wrapper; };
      const audio = new NoteEaterAudio(); await audio.enable();
      window.AudioContext = Context;
      if (groove !== null) {
        audio.getGroove = () => groove; audio.beat = 0; audio.nextBeat = .05;
        for (let i = 0; i < 16; i++) { clock = audio.nextBeat; audio.schedule(); }
      }
      for (const [i, midi] of bites.entries()) audio.note(midi, false, { at: .057 + i * .32, color: i % 5, groove: groove ?? 0 });
      if (cancel) { clock = 0; audio.stop(); }
      const buffer = await offline.startRendering(), data = buffer.getChannelData(0);
      let peak = 0, power = 0, brightness = 0, first = -1;
      for (let i = 0; i < data.length; i++) {
        if (!Number.isFinite(data[i])) throw Error('non-finite audio sample');
        peak = Math.max(peak, Math.abs(data[i])); power += data[i] ** 2;
        if (i) brightness += (data[i] - data[i - 1]) ** 2;
        if (first < 0 && Math.abs(data[i]) > .00001) first = i / 48000;
      }
      audio.dispose(); return { peak, rms: Math.sqrt(power / data.length), brightness, first };
    };
    try {
      const bite = await render(null, [60]);
      const low = await render(0, []), high = await render(85, []);
      const busy = await render(100, Array.from({ length: 13 }, (_, i) => [60, 62, 64, 67, 69][i % 5]));
      const stopped = await render(100, [60, 64, 69], true);
      return { bite, low, high, busy, stopped };
    } finally { window.AudioContext = Context; }
  });
  check(sound.bite.first >= .057 && sound.bite.first < .097, 'rendered bite begins within 40ms of its unquantized attack');
  check(sound.high.rms > sound.low.rms * 1.1, 'high groove adds audible energy to the actual backing graph');
  check(sound.high.brightness > sound.low.brightness * 2, 'claps, hats and arpeggios add high-frequency detail');
  check(sound.busy.peak > .05 && sound.busy.peak < .95, 'dense bites and all five layers have headroom without clipped samples');
  check(sound.stopped.peak === 0, 'stopping cancels every future bite, drum and echo in rendered audio');

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(base + '/?qa=note-party-reduced&run=' + Date.now() + '#/game/solo-note-eater');
  await page.waitForFunction(() => document.querySelector('.launch-demo')?.disabled === false);
  await page.evaluate(async () => {
    const { NoteEaterView } = await import('/src/noteEater/view.js');
    const render = NoteEaterView.prototype.render;
    NoteEaterView.prototype.render = function(...args) { window.__partyView = this; return render.apply(this, args); };
  });
  await page.clock.install({ time: new Date('2026-10-04T00:00:00Z') });
  await page.locator('.launch-demo').click(); await page.clock.runFor(150);
  check(await page.evaluate(() => __partyView.reducedMotion), 'reduced-motion preference reaches the real renderer');
  await page.locator('.ne-bite').click(); await page.clock.runFor(3300);
  for (let i = 0; i < 9; i++) {
    await page.evaluate(() => { const g = __partyView.game; const n = g.notes[0]; n.x = g.mouth.x; n.y = g.mouth.y; n.vx = n.vy = 0; });
    await page.locator('.ne-bite').click(); await page.clock.runFor(190);
  }
  check(await page.evaluate(() => __partyView.game.eaten === 9 && __partyView.game.notes.length === 12), 'reduced motion still supports full-density bites');
  check(await page.evaluate(() => __partyView.effects.length > 0 && __partyView.effects.length <= 8), 'celebration history stays bounded during rapid bites');
  check(await page.locator('.ne-canvas').evaluate(c => c.getContext('2d').getImageData(0, 0, c.width, c.height).data.some((v, i) => i % 4 === 3 && v > 0)), 'reduced-motion celebration paints a nonblank scene');
  await page.screenshot({ path: 'output/playwright/note-eater-party-reduced-390.png' });
  await page.goto(base + '/#/'); await page.emulateMedia({ reducedMotion: 'no-preference' });
  check(errors.length === 0, 'no audio or reduced-motion browser errors');
  return { checks, sound, errors };
}
