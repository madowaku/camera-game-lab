import test from 'node:test';
import assert from 'node:assert/strict';
import { scoreCircle, cleanTrajectory, MaruGame, DwellRetry, RULES, spiritFor, updateRecords, TAU } from '../src/maruMagic/core.js';
import { projectTip } from '../src/maruMagic/input.js';
import { experiments, validateRegistry } from '../src/platform/experiments.js';
const circle = ({ n = 150, rx = 150, ry = rx, turns = 1, reverse = false, noise = 0, power = 1, cx = 300, cy = 300 } = {}) => Array.from({ length: n + 1 }, (_, i) => {
  const a = (reverse ? -1 : 1) * (i / n) ** power * TAU * turns, jitter = noise * Math.sin(i * 1.713);
  return { x: cx + (rx + jitter) * Math.cos(a), y: cy + (ry + jitter) * Math.sin(a) };
});

test('perfect circles score 99–100 in either direction and are translation/scale invariant', () => {
  for (const params of [{}, { reverse: true }, { cx: 180, cy: 240, rx: 65 }, { rx: 240, cx: 800, cy: -800 }]) { const r = scoreCircle(circle(params)); assert.ok(r.score >= 99, JSON.stringify(r)); assert.equal(r.valid, true); }
});
test('gentle imprecision earns a star; stretched ellipses score much lower', () => {
  const smooth = scoreCircle(circle({ noise: 4 })), ellipse = scoreCircle(circle({ rx: 175, ry: 105 }));
  assert.ok(smooth.score >= 80, smooth.score); assert.ok(ellipse.score < 75, ellipse.score); assert.ok(smooth.score > ellipse.score + 15);
});
test('open arcs cannot collect high scores despite perfect circle fitting', () => {
  for (const turns of [.25, .5, .75, .85]) { const r = scoreCircle(circle({ turns })); assert.ok(r.score <= 49); assert.equal(r.valid, false); }
});
test('lines, tiny circles and multiple loops are guarded', () => {
  const line = Array.from({ length: 90 }, (_, i) => ({ x: i * 3, y: i * 2 }));
  for (const points of [line, circle({ rx: 20 }), circle({ turns: 2 }), circle({ turns: 1.4 })]) assert.ok(scoreCircle(points).score <= 49);
  assert.equal(scoreCircle(line).reason, 'line'); assert.equal(scoreCircle(circle({ rx: 20 })).reason, 'small'); assert.equal(scoreCircle(circle({ turns: 2 })).reason, 'multiple');
});
test('backtracking and tangled lines do not look like excellent circles', () => {
  const back = [...circle({ turns: .8 }), ...circle({ turns: .8 }).reverse(), ...circle()];
  assert.ok(scoreCircle(back).score <= 49);
  const scribble = Array.from({ length: 220 }, (_, i) => ({ x: 300 + 130 * Math.sin(i * .43), y: 300 + 150 * Math.sin(i * .72) })); assert.ok(scoreCircle(scribble).score <= 49);
});
test('time, speed and source are absent from the scoring function', () => {
  const points = circle({ noise: 3 });
  assert.deepEqual(scoreCircle(points.map((p,i)=>({...p,t:i*10,source:'camera'}))), scoreCircle(points.map((p,i)=>({...p,t:i*90,source:'touch'}))));
});
test('spatial sampling makes pauses and variable input rates fair', () => {
  const dense = circle({ n: 600 }), sparse = circle({ n: 32 }), uneven = circle({ n: 150, power: 2 });
  assert.ok(Math.abs(scoreCircle(dense).score - scoreCircle(sparse).score) <= 1);
  assert.ok(Math.abs(scoreCircle(dense).score - scoreCircle(uneven).score) <= 1);
  assert.equal(scoreCircle(dense.flatMap(p => [p,p,p])).score, scoreCircle(dense).score);
});
test('isolated out-and-back detection spikes are removed for both inputs', () => {
  const points = circle(), contaminated = [...points.slice(0,60), { x: 900, y: -500 }, ...points.slice(60)];
  assert.equal(cleanTrajectory(contaminated).length, points.length); assert.equal(scoreCircle(contaminated).score, scoreCircle(points).score);
});
test('persistent geometric distortion is retained and cannot be smoothed into a high score', () => {
  const noisy = circle({ noise: 35 }); assert.ok(scoreCircle(noisy).score < 65); assert.ok(cleanTrajectory(noisy).length > noisy.length * .8);
});
test('invalid points are harmless; scoring never mutates input', () => {
  const p = circle(), before = structuredClone(p); scoreCircle(p); assert.deepEqual(p, before);
  for (const points of [null, [], [null, { x: NaN, y: 0 }], Array(20).fill({ x: 30, y: 30 })]) assert.equal(scoreCircle(points).score, 0);
});
test('tier boundaries match all four summoning bands', () => {
  assert.deepEqual([0,49,50,79,80,94,95,100].map(spiritFor), [0,0,1,1,2,2,3,3]);
});
test('camera waits for stillness and starts only after deliberate movement', () => {
  const g = new MaruGame(); g.sample({ x: 450,y:300 },0); g.sample({x:451,y:301},150); assert.equal(g.armed,false);
  g.sample({x:450,y:300},300); assert.equal(g.armed,true); assert.equal(g.phase,'ready'); g.sample({x:440,y:330},340); assert.equal(g.phase,'drawing');
});
test('motion during preparation resets the 0.3-second hold', () => {
  const g = new MaruGame(); g.sample({x:100,y:100},0); g.sample({x:170,y:170},250); g.sample({x:170,y:170},500); assert.equal(g.armed,false); g.sample({x:170,y:170},550); assert.equal(g.armed,true);
});
test('one touch circle closes automatically; simply returning along a line does not', () => {
  const g = new MaruGame(); circle().forEach((p,i)=>g.sample(p,i*20,'touch')); assert.equal(g.phase,'summoned'); assert.ok(g.result.score>=95); assert.equal(g.result.ending,'closed');
  const line = new MaruGame(); [...Array.from({length:50},(_,i)=>({x:100+i*5,y:100})), ...Array.from({length:50},(_,i)=>({x:350-i*5,y:100}))].forEach((p,i)=>line.sample(p,i*20,'touch')); assert.equal(line.phase,'drawing');
});
test('8-second timeout scores an unfinished stroke and allows immediate retry', () => {
  const g = new MaruGame(); circle({turns:.5}).forEach((p,i)=>g.sample(p,i*20,'touch')); g.tick(8000); assert.equal(g.phase,'summoned'); assert.equal(g.result.ending,'timeout'); assert.ok(g.result.score<=49); g.reset(); assert.equal(g.phase,'ready');
});
test('short detection gaps preserve the stroke and exclude lost time', () => {
  const g = new MaruGame(), p = circle(); g.sample(p[0],0,'touch'); for(let i=1;i<50;i++)g.sample(p[i],i*20,'touch');
  g.missing(1000); g.missing(1250); assert.equal(g.phase,'drawing'); g.sample(p[50],1280,'touch'); assert.equal(g.excludedMs,300);
  for(let i=51;i<p.length;i++)g.sample(p[i],i*20+280,'touch'); assert.equal(g.phase,'summoned'); assert.ok(g.result.score>=95);
});
test('long or spatially unsafe gaps cancel without scoring', () => {
  for(const largeJump of [false,true]) { const g=new MaruGame();g.sample({x:450,y:300},0,'touch');g.sample({x:448,y:320},20,'touch');g.missing(40); if(largeJump)g.sample({x:50,y:50},250);else g.missing(20+RULES.graceMs+1); assert.equal(g.phase,'ready');assert.equal(g.result,null);assert.equal(g.message,'tracking'); }
});
test('pause cancels incomplete geometry and cannot finish from a stale point', () => {
  const g=new MaruGame(); g.sample({x:450,y:300},0,'touch');g.pause(); g.sample({x:400,y:340},400,'touch');g.tick(9000);assert.equal(g.result,null);g.resume();assert.equal(g.phase,'ready');assert.equal(g.points.length,0);
});
test('records persist independently: faster bad shapes do not earn fastest time', () => {
  const r={...scoreCircle(circle()),elapsedMs:2000,ending:'closed'}, first=updateRecords({},r);
  assert.equal(first.best,100);assert.equal(first.fastestMs,2000);
  assert.deepEqual(updateRecords(first,{...r,score:40,valid:false,elapsedMs:200}),first);
  assert.equal(updateRecords(first,{...r,elapsedMs:1800}).fastestMs,1800);
  assert.equal(updateRecords(first,{...r,elapsedMs:1000,ending:'release'}).fastestMs,2000);
});
test('broken saved records cannot contaminate new bests',()=>{assert.deepEqual(updateRecords({best:NaN,fastestMs:-5},{score:60,valid:true,elapsedMs:500,ending:'closed'}),{best:60,fastestMs:null});});
test('fingertip projection mirrors once and crops without stretching a circle', () => {
  const frame=(x,y)=>({landmarks:[Array.from({length:21},()=>({x,y}))]});
  assert.deepEqual(projectTip(frame(.6,.5),640,480),{x:220,y:300});
  assert.deepEqual(projectTip(frame(.5,.5),480,640),{x:300,y:300});
  assert.equal(projectTip(frame(0,0),640,480),null); assert.equal(projectTip({},640,480),null);
});
test('EXP-062 is discoverable with canonical route and camera-free practice', () => { const entry=experiments.find(g=>g.id==='solo-maru-magic');assert.equal(entry.exp,'EXP-062');assert.ok(entry.demo);assert.ok(entry.untimed);assert.deepEqual(validateRegistry(experiments),[]); });

const target = { left:30, right:160, top:450, bottom:550 };
test('a stable fingertip dwell retries after 700ms, never immediately', () => {
  const d=new DwellRetry();for(let t=0;t<700;t+=100)assert.equal(d.update({x:90,y:500},t,target),false);
  assert.ok(d.progress>.8);assert.equal(d.update({x:90,y:500},700,target),true);assert.equal(d.progress,0);
});
test('passing through, leaving the target or losing the finger resets dwell', () => {
  const d=new DwellRetry();d.update({x:90,y:500},0,target);d.update({x:91,y:500},100,target);d.update({x:300,y:500},200,target);assert.equal(d.progress,0);
  d.update({x:90,y:500},300,target);d.update(null,400,target);assert.equal(d.progress,0);
  d.update({x:90,y:500},500,target);assert.equal(d.update({x:90,y:500},1200,target),false);assert.equal(d.progress,0);
});
test('large movement inside the button rebases dwell; pause reset prevents stale clicks',()=>{
  const d=new DwellRetry();d.update({x:50,y:500},0,target);d.update({x:50,y:500},100,target);d.update({x:110,y:500},200,target);assert.equal(d.progress,0);d.reset();assert.equal(d.update({x:110,y:500},800,target),false);
});
test('retry position cannot arm or start a circle until the finger leaves the button',()=>{
  const g=new MaruGame();g.waitOutside(target);
  for(let t=0;t<=1200;t+=100)g.sample({x:90,y:500},t,'camera');
  assert.equal(g.armed,false);assert.equal(g.anchor,null);assert.equal(g.phase,'ready');assert.deepEqual(g.points,[]);
  g.sample({x:450,y:300},1300,'camera');assert.equal(g.startExclusion,null);assert.equal(g.armed,false);
  g.sample({x:450,y:300},1500,'camera');assert.equal(g.armed,false);g.sample({x:450,y:300},1600,'camera');assert.equal(g.armed,true);
  g.sample({x:440,y:330},1650,'camera');assert.equal(g.phase,'drawing');assert.deepEqual(g.points[0],{x:450,y:300});
});
test('lost input during repositioning retains the need to leave the retry button',()=>{
  const g=new MaruGame();g.waitOutside(target);g.sample({x:90,y:500},0,'camera');g.missing(700);assert.ok(g.startExclusion);g.sample({x:90,y:500},800,'camera');g.sample({x:90,y:500},1200,'camera');assert.equal(g.armed,false);
});
