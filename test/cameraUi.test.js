import test from 'node:test';
import assert from 'node:assert/strict';
import { DwellTarget, AirSwipe, projectHandCursor } from '../src/cameraUi/core.js';
import { DwellRetry } from '../src/maruMagic/core.js';

const rect = { left: 50, top: 50, right: 150, bottom: 150 };
test('shared dwell matches the original MARU MAGIC 700ms contract', () => {
  const selector = new DwellRetry();
  for (let at = 0; at < 700; at += 100) assert.equal(selector.update({ x: 90, y: 100 }, at, rect), false);
  assert.equal(selector.update({ x: 90, y: 100 }, 700, rect), true);
  assert.equal(selector.progress, 0);
});
test('fast menu dwell completes after 650ms, movement resets its timer', () => {
  const selector = new DwellTarget({ holdMs: 650, tolerancePx: 22 });
  selector.update({ x: 60, y: 60 }, 0, rect);
  selector.update({ x: 61, y: 62 }, 200, rect);
  selector.update({ x: 101, y: 120 }, 400, rect);
  assert.equal(selector.progress, 0);
  for (let at = 500; at <= 1000; at += 100) assert.equal(selector.update({ x: 101, y: 120 }, at, rect), false);
  assert.equal(selector.update({ x: 101, y: 120 }, 1049, rect), false);
  assert.equal(selector.update({ x: 101, y: 120 }, 1050, rect), true);
});
test('leaving the target, lost hand, stale frame, or invalid position cancels dwell', () => {
  for (const interruption of [
    [null, 100, rect], [{ x: 500, y: 500 }, 100, rect],
    [{ x: 90, y: 100 }, 100, null],
    [{ x: NaN, y: 100 }, 100, rect],
    [{ x: 90, y: 100 }, 300, rect]
  ]) {
    const selector = new DwellTarget();
    selector.update({ x: 90, y: 100 }, 0, rect);
    selector.update(...interruption);
    assert.equal(selector.progress, 0);
    assert.equal(selector.update({ x: 90, y: 100 }, 700, rect), false);
  }
});
test('fast upward left-lane flick advances one card', () => {
  const swipe = new AirSwipe();
  const opts = { width: 360, height: 800 };
  const values = [
    swipe.update({ x: 40, y: 650 }, 0, opts),
    swipe.update({ x: 41, y: 590 }, 100, opts),
    swipe.update({ x: 40, y: 515 }, 200, opts),
    swipe.update({ x: 40, y: 415 }, 300, opts)
  ];
  assert.deepEqual(values, [0,0,1,0]);
});
test('downward left-lane flick goes to previous card', () => {
  const swipe = new AirSwipe(), o = { width: 360, height: 800 };
  assert.equal(swipe.update({ x: 40, y: 260 }, 0, o), 0);
  assert.equal(swipe.update({ x: 40, y: 320 }, 100, o), 0);
  assert.equal(swipe.update({ x: 40, y: 390 }, 200, o), -1);
});
test('no air scroll over buttons, outside the lane or on passive jitter', () => {
  for (const opts of [{ width:360,height:800,blocked:true }, { width:360,height:800 }]) {
    const swipe = new AirSwipe(); let y=650;
    for (let at=0;at<=400;at+=100) {
      assert.equal(swipe.update({ x: opts.blocked ? 40 : 290, y }, at, opts), 0);
      y-=70;
    }
  }
  const swipe=new AirSwipe(), o={width:360,height:800};
  for(let t=0;t<1200;t+=50) assert.equal(swipe.update({x:40+(t%3),y:410+(t%4)},t,o),0);
});
test('large one-frame tracking jumps cannot flick-scroll', () => {
  const swipe=new AirSwipe(), o={width:360,height:800};
  swipe.update({x:20,y:750},0,o);
  assert.equal(swipe.update({x:20,y:100},50,o),0);
  assert.equal(swipe.update({x:20,y:90},100,o),0);
});
test('air swipe requires valid positive viewport dimensions', () => {
  const s=new AirSwipe();
  assert.equal(s.update({x:40,y:600},0,{width:0,height:800}),0);
  assert.equal(s.update(null,100,{width:360,height:800}),0);
});

test('menu cursor mirrors x once and rejects missing hand data', () => {
  const frame=(x,y)=>({landmarks:[Array.from({length:21},()=>({x,y}))]});
  assert.deepEqual(projectHandCursor(frame(.25,.75),360,800),{x:270,y:600});
  assert.equal(projectHandCursor(frame(-.1,.5),360,800),null);
  assert.equal(projectHandCursor({},360,800),null);
  assert.equal(projectHandCursor(frame(.5,.5),0,800),null);
});
