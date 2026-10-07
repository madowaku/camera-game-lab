import test from 'node:test';
import assert from 'node:assert/strict';
import { createCameraInstrument } from '../src/camera/instrument/CameraInstrument.js';
import { projectCameraPoint, zoneDistance } from '../src/camera/instrument/InstrumentZone.js';

const viewport = { width: 360, height: 800 };
const make = () => { const instrument = createCameraInstrument(); instrument.addZone({ x: .5, y: .5, soundId: 'C4' }); return instrument; };
test('public API validates coordinates, caps five spots and unsubscribes', () => {
  const instrument = make(); assert.throws(() => instrument.addZone({ x: NaN, y: .5, soundId: 'D4' }));
  assert.throws(() => instrument.addZone({ x: .5, y: .5, radius: NaN }), /radius/);
  assert.throws(() => instrument.addZone({ x: .5, y: .5, cooldownMs: Infinity }), /cooldown/);
  assert.throws(() => createCameraInstrument({ maxZones: NaN }), /maxZones/);
  assert.throws(() => createCameraInstrument({ soundBank: 'missing' }), /sound bank/);
  for (let i = 0; i < 7; i++) instrument.addZone({ x: .1 * i, y: .5, soundId: 'D4' });
  assert.equal(instrument.zones.length, 5);
  let hits = 0; const unsubscribe = instrument.on('hit', () => hits++);
  assert.equal(instrument.hit(instrument.zones[0].id, 1000), true); unsubscribe();
  instrument.hit(instrument.zones[0].id, 1300); assert.equal(hits, 1);
  instrument.removeZone(instrument.zones[1].id); assert.equal(instrument.zones.length, 4);
});
test('one, three and five spot limits remain independent across portrait and landscape', () => {
  for (const maxZones of [1,3,5]) for (const viewport of [{ width: 360, height: 800 }, { width: 800, height: 360 }]) {
    const instrument = createCameraInstrument({ maxZones });
    for (let n = 0; n < 6; n++) instrument.addZone({ x: .5, y: .5 });
    assert.equal(instrument.zones.length, maxZones);
    // Stroke distance stays tied to the short edge, including landscape input.
    for (let n = 0; n < 9; n++) instrument.update({ x: .5, y: .5 + (-.14 + n * .02) * Math.min(viewport.width,viewport.height) / viewport.height }, n * 40, viewport);
    assert.equal(instrument.hits, 1);
  }
});
test('a purposeful downstroke sounds once and resting never repeats', () => {
  const instrument = make(); let at = 0;
  for (const y of [.36,.38,.41,.44,.47,.5,.51,.51,.51]) { instrument.update({ x: .5, y }, at += 40, viewport); }
  assert.equal(instrument.hits, 1);
  for (let i = 0; i < 50; i++) instrument.update({ x: .5, y: .51 }, at += 40, viewport);
  assert.equal(instrument.hits, 1);
  for (const y of [.46,.42,.38,.36,.36,.38,.41,.44,.47,.5]) instrument.update({ x: .5, y }, at += 40, viewport);
  assert.equal(instrument.hits, 2);
});
test('acquisition, hand loss, long inference gaps and recovery inside do not strike', () => {
  const instrument = make(); instrument.update({ x: .5, y: .5 }, 40, viewport);
  instrument.update({ x: .5, y: .51 }, 80, viewport); instrument.update(null, 120, viewport);
  instrument.update({ x: .5, y: .5 }, 160, viewport); instrument.update({ x: .5, y: .52 }, 200, viewport);
  instrument.update({ x: .5, y: .5 }, 1000, viewport); assert.equal(instrument.hits, 0);
});
test('boundary noise stays silent, but a slow deliberate press into the centre works', () => {
  const instrument = make(); let at = 0;
  for (let i = 0; i < 80; i++) instrument.update({ x: .585 + (i % 2 ? .004 : -.004), y: .5 }, at += 40, viewport);
  assert.equal(instrument.hits, 0);
  instrument.update(null, at += 40, viewport);
  for (let i = 0; i < 120; i++) instrument.update({ x: .5, y: .44 + i * .0005 }, at += 40, viewport);
  assert.equal(instrument.hits, 1);
});
test('overlapping spots choose one centre; explicit enter mode and direct tap cooldown work', () => {
  const instrument = make(); instrument.addZone({ x: .51, y: .5, soundId: 'E4' }); let at = 0;
  for (const y of [.36,.39,.43,.47,.5]) instrument.update({ x: .5, y }, at += 40, viewport);
  assert.equal(instrument.hits, 1); assert.ok(instrument.zones[0].lastHit > 0); assert.equal(instrument.zones[1].lastHit, -Infinity);
  const enter = createCameraInstrument(); enter.addZone({ x: .5, y: .5, soundId: 'C4', triggerMode: 'enter' });
  for (let i = 0; i < 30; i++) enter.update({ x: .3 + .007 * i, y: .5 }, i * 40, viewport);
  assert.equal(enter.hits, 1);
  assert.equal(enter.hit(enter.zones[0].id, 2000), true); assert.equal(enter.hit(enter.zones[0].id, 2050), false); assert.equal(enter.hit(enter.zones[0].id, 2120), true);
});
test('circle distance and mirrored cover crop map into the actual displayed video', () => {
  assert.equal(zoneDistance({ x: .5, y: .5 }, { x: .5, y: .59 }, { width: 100, height: 100 }), .08999999999999997);
  const distance = zoneDistance({ x: .5, y: .5 }, { x: .59, y: .5 }, { width: 360, height: 800 });
  assert.ok(Math.abs(distance - .09) < 1e-9);
  const point = projectCameraPoint({ x: .75, y: .5 }, 1280, 720, 360, 800, true);
  assert.ok(point.x < 0); assert.equal(point.y, .5); // cropped landmarks are not clamped to a fake hit
  assert.equal(projectCameraPoint({ x: .5, y: .5 }, 0, 0, 360, 800), null);
});
test('audio is dispatched before visuals and preset changes preserve the reusable API', () => {
  const order = [], instrument = createCameraInstrument({ audio: { play: () => order.push('audio') } });
  instrument.setPreset('toy-drum'); instrument.on('hit', () => order.push('fx'));
  instrument.hit(instrument.zones[0].id, 1000); assert.deepEqual(order, ['audio','fx']);
  assert.deepEqual(instrument.zones.map(z => z.soundId), ['kick','snare','hat','tom','clap']);
  assert.equal(instrument.soundBank, 'drums');
  assert.throws(() => instrument.setPreset('unknown'), /preset/);
  assert.equal(instrument.zones.length, 5); // an invalid preset leaves the current instrument intact
});
