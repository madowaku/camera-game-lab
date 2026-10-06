import test from 'node:test';
import assert from 'node:assert/strict';
import { headRoll, steeringForRoll, TiltSignal } from '../src/tiltTurbo/input.js';
import { TiltTurboGame, roadCenter, ROUND_MS } from '../src/tiltTurbo/core.js';
import { speedFxAmount, speedSway } from '../src/tiltTurbo/visualFx.js';
const points = (roll, w=720, h=1280) => {const p=[];const slope=Math.tan(-roll*Math.PI/180)*w/h;p[33]=p[133]={x:.35,y:.5-.15*slope};p[263]=p[362]={x:.65,y:.5+.15*slope};return p;};
test('camera-pixel roll follows mirrored screen direction in portrait and landscape',()=>{
  for(const [w,h] of [[720,1280],[1280,720]])for(const r of [-25,-15,0,15,25])assert.ok(Math.abs(headRoll(points(r,w,h),w,h)-r)<.001);
  assert.equal(headRoll([]),null);const broken=points(10);broken[33]={x:NaN,y:.3};assert.equal(headRoll(broken),null);
});
test('neutral zone removes jitter and maximum input needs no more than 25 degrees',()=>{
  for(const n of [-5,-3,0,3,5])assert.equal(steeringForRoll(n),0);
  assert.ok(steeringForRoll(15)>steeringForRoll(6));assert.equal(steeringForRoll(25),1);assert.equal(steeringForRoll(-40),-1);
});
test('stable baseline compensates phone roll; reacquisition preserves calibration',()=>{
  const s=new TiltSignal();for(let at=0;at<=700;at+=50)s.sample(9,at);assert.equal(s.neutral,9);
  let m;for(let at=750;at<1300;at+=50)m=s.sample(-11,at);assert.ok(m.steering<-.7);
  assert.equal(s.sample(null,1350).tracked,false);assert.equal(s.neutral,9);
  for(let at=1500;at<2000;at+=50)m=s.sample(9,at);assert.equal(m.steering,0);
  s.reset();s.sample(0,0);s.sample(18,350);s.sample(0,700);assert.equal(s.neutral,null);
});
test('face loss keeps time running, eases toward center and counts loss episodes',()=>{
  const g=new TiltTurboGame();g.start();g.step(500,{tracked:true,steering:.5,roll:15});const x=g.x;
  g.step(500,{tracked:false,steering:1});assert.equal(g.elapsed,1000);assert.ok(g.x<x&&g.x>0);assert.equal(g.faceLosses,1);
  g.step(500,{tracked:false});assert.equal(g.faceLosses,1);g.step(20,{tracked:true});g.step(200,{tracked:false});assert.equal(g.faceLosses,2);
});
test('bonks slow the toy and recover without stopping a 20-second round',()=>{
  const g=new TiltTurboGame();g.start();for(let i=0;i<200;i++)g.step(100,{tracked:true,steering:1,roll:25});
  assert.equal(g.result.elapsed,ROUND_MS);assert.ok(g.result.hits>0);assert.ok(g.result.distance>0);assert.equal(g.result.maxTilt,25);
  assert.ok(g.history.some(e=>e.type==='JUMP!'));assert.equal(g.history.at(-1).type,'FINISH!');const score=g.result.score;g.step(1000);assert.equal(g.result.score,score);
});
test('a controlled near miss pays once; pause freezes score and clock',()=>{
  const g=new TiltTurboGame();g.start();g.elapsed=4190;g.x=roadCenter(4200);g.step(20,{steering:g.x/1.12,tracked:true});
  assert.equal(g.near,1);g.step(100,{steering:g.x/1.12});assert.equal(g.near,1);g.paused=true;const at=g.elapsed,distance=g.distance;g.step(2000);assert.equal(g.elapsed,at);assert.equal(g.distance,distance);
});
test('course following and timing stay consistent across frame sizes',()=>{
  const run=dt=>{const g=new TiltTurboGame();g.start();while(!g.result)g.step(dt,{steering:roadCenter(g.elapsed+100)/1.12,roll:14,tracked:true});return g;};
  const a=run(16),b=run(100);assert.equal(a.hits,0);assert.equal(b.hits,0);assert.equal(a.result.elapsed,20000);assert.ok(Math.abs(a.distance-b.distance)<8);assert.equal(a.history.filter(e=>e.type==='JUMP!').length,1);
});


test('speed visual feedback grows with speed and disappears for reduced motion', () => {
  assert.equal(speedFxAmount(20), 0);
  assert.ok(speedFxAmount(65) > 0 && speedFxAmount(65) < 1);
  assert.equal(speedFxAmount(100), 1);
  assert.equal(speedFxAmount(100, true), 0);
  assert.deepEqual(speedSway(1000, 0), { x: 0, y: 0 });
  const sway = speedSway(1000, 1);
  assert.ok(Math.abs(sway.x) <= 1.35);
  assert.ok(Math.abs(sway.y) <= .65);
});
