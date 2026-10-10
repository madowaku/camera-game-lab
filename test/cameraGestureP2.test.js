import test from 'node:test';
import assert from 'node:assert/strict';
import { NozzleGuide, NOZZLE_GUIDE_SETTINGS } from '../src/softServe/nozzleGuide.js';
import { MaruVisualFeel, MARU_VISUAL_PRESETS } from '../src/maruMagic/visualFeel.js';
import { smoothVec2 } from '../src/inputFeel/index.js';
import { SoftServeGame } from '../src/games/softServe.js';
import { scoreCircle } from '../src/maruMagic/core.js';

const near = (a,b,epsilon=1e-9) => assert.ok(Math.abs(a-b) <= epsilon, `${a} != ${b}`);

test('P2 SOFT SERVE B: visual guide coaches horizontally and never rewrites raw input', () => {
  const guide = new NozzleGuide();
  const point = { x: .61, y: .72 }, untouched = { ...point };
  const v = guide.update(point);
  assert.deepEqual(point, untouched);
  assert.deepEqual(v.raw, untouched);
  assert.ok(v.assisted.x < point.x);
  assert.equal(v.assisted.y, point.y);
  assert.equal(v.aligned, true);
  assert.equal(v.displacement > 0, true);
  assert.equal(guide.update({ x: .5, y: .72 }).snapped, true);
  near(guide.visual.assisted.x, .5);
  assert.equal(guide.update({ x: .8, y: .72 }).state, 'FREE');
  assert.ok(NOZZLE_GUIDE_SETTINGS.radius < NOZZLE_GUIDE_SETTINGS.releaseRadius);
});

test('P2 SOFT SERVE B: alignment uses the original unclamped ready region', () => {
  const guide = new NozzleGuide();
  assert.equal(guide.update({ x: .37, y: .83 }).aligned, true);
  assert.equal(guide.update({ x: .37, y: .85 }).aligned, false);
  assert.equal(guide.update({ x: .66, y: .72 }).aligned, false);
  assert.equal(guide.update({ x: .5, y: .37 }).aligned, false);
  assert.equal(guide.update({ x: .5, y: .84 }).aligned, true);
  assert.equal(guide.update({ x: .5, y: .85 }).aligned, false);
});

test('P2 SOFT SERVE B: missing, pause and serve transition reset capture', () => {
  const guide = new NozzleGuide();
  guide.update({ x: .5, y: .72 });
  assert.equal(guide.state, 'SNAPPED');
  assert.equal(guide.update(null), null);
  assert.equal(guide.state, 'FREE');
  guide.update({ x: .5, y: .72 });
  assert.equal(guide.update({ x: .5, y: .72 }, { paused: true }), null);
  assert.equal(guide.update({ x: .5, y: .72 }, { phase: 'serve' }), null);
  assert.equal(guide.update({ x: NaN, y: .72 }), null);
  assert.equal(guide.visual, null);
});

test('P2 SOFT SERVE B: guide cannot affect real ready, movement, score or phase', () => {
  const a = new SoftServeGame(), b = new SoftServeGame(), guide = new NozzleGuide();
  a.reset('camera'); b.reset('camera');
  const trace = [];
  for (let i=0;i<125;i++) trace.push({ hand: { x: i<35 ? .66 : .5 + .05*Math.sin(i*.2), y: .72 } });
  trace.forEach(input => {
    a.step(20, input);
    guide.update(input.hand, { phase: b.phase, paused: b.paused });
    b.step(20, input);
    assert.deepEqual({ phase:b.phase, readyMs:b.readyMs, amount:b.amount, cone:b.cone, stability:b.stability, elapsedMs:b.elapsedMs },
      { phase:a.phase, readyMs:a.readyMs, amount:a.amount, cone:a.cone, stability:a.stability, elapsedMs:a.elapsedMs });
  });
  assert.equal(a.phase,'serve');
  assert.ok(b.amount>0);
});

test('P2 MARU A: exact original 28 ms smoothing baseline', () => {
  const filter=new MaruVisualFeel('A');
  const points=[{x:20,y:30},{x:40,y:50},{x:70,y:90},{x:110,y:80}], times=[0,16,45,90];
  filter.reset(points[0],times[0]);
  let expected={...points[0]};
  for(let i=1;i<points.length;i++){
    const dt=Math.min(.15,Math.max(.001,(times[i]-times[i-1])/1000));
    expected=smoothVec2(expected,points[i],dt,.028);
    assert.deepEqual(filter.update(points[i],times[i]),expected);
  }
  assert.equal(MARU_VISUAL_PRESETS.A.tau,.028);
});

test('P2 MARU B: adaptive smoothing stays within 16 px of truth', () => {
  const filter=new MaruVisualFeel('B');
  filter.reset({x:300,y:300},0);
  let changed=0;
  for(let i=1;i<=100;i++){
    const raw={x:300+i*1.1 + ((i%2)*2-1)*3,y:300+Math.sin(i*.2)*35};
    const out=filter.update(raw,i*40);
    if(Math.abs(out.x-raw.x)+Math.abs(out.y-raw.y)>0.01) changed++;
    assert.ok(Math.hypot(out.x-raw.x,out.y-raw.y)<=16+1e-9);
    assert.ok(Number.isFinite(out.x)&&Number.isFinite(out.y));
  }
  assert.ok(changed>50);
  const reset=filter.reset({x:1,y:2},5000);
  assert.deepEqual(reset,{x:1,y:2});
  assert.deepEqual(filter.update({x:1,y:2},5001),{x:1,y:2});
});

test('P2 MARU B: invalid or backward timestamps never create new ink points', () => {
  const filter=new MaruVisualFeel('B');
  assert.equal(filter.update({x:NaN,y:300},0),null);
  assert.deepEqual(filter.update({x:100,y:200},100),{x:100,y:200});
  assert.deepEqual(filter.update({x:800,y:200},99),{x:100,y:200});
  assert.deepEqual(filter.update({x:800,y:200},100),{x:100,y:200});
  const fresh=filter.update({x:800,y:200},140);
  assert.ok(fresh.x>100);
  assert.ok(fresh.x>=784);
  filter.reset();
  assert.deepEqual(filter.update({x:10,y:10},150),{x:10,y:10});
});

test('P2 MARU B: variant cannot change circle score or stored truth trace', () => {
  const points=Array.from({length:121},(_,i)=>{
    const a=i/120*Math.PI*2;
    return { x:300+120*Math.cos(a), y:300+120*Math.sin(a) };
  });
  const baseline=scoreCircle(points), inputs=structuredClone(points);
  const filter=new MaruVisualFeel('B');
  filter.reset(points[0],0);
  const visual=[{...points[0]}];
  for(let i=1;i<points.length;i++) visual.push(filter.update(points[i],i*32));
  assert.deepEqual(points,inputs);
  assert.deepEqual(scoreCircle(points),baseline);
  assert.notDeepEqual(visual,points);
  assert.ok(baseline.score>=99);
});

test('P2 MARU A/B deterministic at irregular frame spacing with clean reset', () => {
  const samples=[0,16,32,67,91,120,195,232,258].map((at,i)=>({at,point:{x:200+15*i+Math.sin(i)*5,y:150+i*7}}));
  for(const variant of ['A','B']){
    function trace(){
      const filter=new MaruVisualFeel(variant);filter.reset(samples[0].point,samples[0].at);
      return samples.slice(1).map(sample=>filter.update(sample.point,sample.at));
    }
    assert.deepEqual(trace(),trace());
    const filter=new MaruVisualFeel(variant);
    assert.equal(filter.update(null,10),null);
    assert.throws(()=>new MaruVisualFeel('X'),RangeError);
  }
});
