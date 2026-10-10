import test from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG, tension, geometry, closest, reflection, createMatch, stepMatch, assignHands, updateNets, project, resizeMatch, usableNet, netInOwnHalf } from '../src/tension/rules.js';
const net = (x, y=.28, distance=.105, angle=0) => ({ ...geometry({ x:x-Math.sin(angle)*distance/2, y:y-Math.cos(angle)*distance/2 }, { x:x+Math.sin(angle)*distance/2, y:y+Math.cos(angle)*distance/2 }), active:true });
test('tension boundaries include exact thresholds without pixel dependence', () => {
  assert.deepEqual([0,.069,.07,.129,.13,.179,.18,.3].map(tension),[0,0,1,1,2,2,3,3]);
});
test('segment distance handles middle, endpoints and zero length', () => {
  assert.equal(closest({x:.5,y:.2},{x:0,y:0},{x:1,y:0}).distance,.2);
  assert.equal(closest({x:2,y:0},{x:0,y:0},{x:1,y:0}).distance,1);
  assert.equal(closest({x:0,y:1},{x:0,y:0},{x:0,y:0}).distance,1);
});
test('arcade reflection sends the ball toward the opponent, changes with tilt, and is endpoint independent', () => {
  const n=net(.2), p=n.center;
  assert.ok(reflection(n,0,p).vx>0); assert.ok(reflection(n,1,p).vx<0);
  assert.equal(reflection(n,0,p).vy,0);
  const tilted=net(.2,.28,.105,.4);
  assert.ok(reflection(tilted,0,tilted.center).vy<0);
  const reversed=geometry(tilted.index,tilted.thumb);
  assert.ok(Math.abs(reflection(tilted,0,tilted.center).vy-reflection(reversed,0,reversed.center).vy)<1e-10);
});
test('tension speed is bounded and does not compound with incoming ball velocity', () => {
  const speeds=[.05,.1,.15,.2].map(d=>{const n=net(.2,.28,d), v=reflection(n,0,n.center);return Math.hypot(v.vx,v.vy);});
  assert.ok(speeds[0]<speeds[1] && speeds[1]<speeds[2]); assert.ok(speeds.every(v=>v<=CONFIG.maxSpeed));
});
test('high speed movement cannot tunnel through a net and only reflects once', () => {
  const m=createMatch(); m.ball={x:.24,y:.28,vx:-CONFIG.maxSpeed,vy:0};
  const events=stepMatch(m,[net(.2),null],.15);
  assert.equal(events.filter(e=>e.type==='hit').length,1); assert.equal(m.hits,1); assert.ok(m.ball.vx>0);
  stepMatch(m,[net(.2),null],.05); assert.equal(m.hits,1);
});
test('inactive nets do not collide', () => {
  const m=createMatch(); m.ball={x:.23,y:.28,vx:-.34,vy:0};
  assert.equal(stepMatch(m,[{...net(.2),active:false},null],.2).filter(e=>e.type==='hit').length,0);
});
for (const wall of ['top', 'bottom']) test(`${wall} wall reflects the puck, preserves speed and emits one impact without awarding points`, () => {
  const m = createMatch();
  m.ball = { x: .5, y: wall === 'top' ? CONFIG.radius + .001 : m.height - CONFIG.radius - .001, vx: .1, vy: wall === 'top' ? -.3 : .3 };
  const speed = Math.hypot(m.ball.vx, m.ball.vy);
  const events = stepMatch(m, [null, null], .02);
  assert.equal(events.filter(e => e.type === 'wall').length, 1);
  assert.equal(events[0].wall, wall);
  assert.equal(Math.sign(m.ball.vy), wall === 'top' ? 1 : -1);
  assert.ok(Math.abs(Math.hypot(m.ball.vx, m.ball.vy) - speed) < 1e-10);
  assert.deepEqual(m.score, [0, 0]);
});
test('center line checks both net endpoints and permits touching the line', () => {
  assert.equal(netInOwnHalf(net(.5), 0), true);
  assert.equal(netInOwnHalf(net(.5), 1), true);
  const straddling = net(.49, .28, .15, .5);
  assert.ok(straddling.center.x < .5);
  assert.equal(netInOwnHalf(straddling, 0), false);
  assert.equal(netInOwnHalf(net(.2), 1), false);
  assert.equal(netInOwnHalf(null, 0), false);
});
for (const player of [0, 1]) test(`P${player + 1} cannot hit in the opponent half; returning to their own half immediately restores collisions`, () => {
  const m = createMatch(), x = player ? .2 : .8, vx = player ? .34 : -.34;
  const nets = [null, null]; nets[player] = net(x);
  m.ball = { x: x - Math.sign(vx) * .03, y: .28, vx, vy: 0 };
  assert.equal(stepMatch(m, nets, .1).filter(e => e.type === 'hit').length, 0);
  assert.equal(m.hits, 0); assert.ok(m.remaining < 15);
  const home = player ? .8 : .2;
  nets[player] = net(home); m.ball = { x: home - Math.sign(vx) * .03, y: .28, vx, vy: 0 };
  assert.equal(stepMatch(m, nets, .1).filter(e => e.type === 'hit').length, 1);
});
for (const side of ['left','right']) test(`${side} exit awards opponent one point and serves toward conceding player`, () => {
  const m=createMatch(); m.ball={x:side==='left'?-.02:1.02,y:.28,vx:side==='left'?-.34:.34,vy:0};
  stepMatch(m,[null,null],.01);
  assert.deepEqual(m.score, side==='left'?[0,1]:[1,0]); assert.ok(m.serve>0);
  assert.equal(m.ball.x,.5); stepMatch(m,[null,null],.81);
  assert.equal(Math.sign(m.ball.vx),side==='left'?-1:1);
});
test('15-second match transitions exactly once and retries get fresh state', () => {
  const m=createMatch(); for(let i=0;i<150;i++) stepMatch(m,[null,null],.1);
  stepMatch(m,[null,null],.001); assert.equal(m.phase,'result'); assert.equal(m.remaining,0);
  const score=[...m.score]; assert.deepEqual(stepMatch(m,[null,null],1),[]); assert.deepEqual(m.score,score);
  assert.deepEqual(createMatch().score,[0,0]);
});
test('assignment retains players across detector permutations and brief center crossing', () => {
  const a={...net(.49),seenAt:100}, b={...net(.8),seenAt:100};
  const moved=net(.53), other=net(.82);
  const assigned=assignHands([a,b],[other,moved],110);
  assert.equal(assigned[0],moved); assert.equal(assigned[1],other);
  assert.deepEqual(assignHands([a,b],[other],110),[null,other]);
});
test('loss holds collision for 250ms then fades and disables it, reappearance reacquires', () => {
  let nets=updateNets([null,null],[net(.2),net(.8)],0);
  nets=updateNets(nets,[],240); assert.ok(nets.every(n=>n.active));
  nets=updateNets(nets,[],300); assert.ok(nets.every(n=>!n.active && n.opacity<1));
  nets=updateNets(nets,[],500); assert.ok(nets.every(n=>n.opacity===0));
  nets=updateNets(nets,[net(.2),net(.8)],501); assert.ok(nets.every(n=>n.active));
});
test('cover projection matches mirrored video with crop and uses isotropic world units', () => {
  const p=project({x:.25,y:.5},1280,720,800,450);
  assert.deepEqual(p,{x:.75,y:.28125});
  const center=project({x:.5,y:.5},640,480,800,450);
  assert.deepEqual(center,{x:.5,y:.28125});
  const a=project({x:.4,y:.5},1280,720,800,450), b=project({x:.5,y:.5},1280,720,800,450);
  assert.ok(Math.abs(Math.hypot(a.x-b.x,a.y-b.y)-.1)<1e-10);
});
test('five simulated rallies complete with finite speed and valid scores', () => {
  for(let round=0;round<5;round++) {
    const m=createMatch();
    for(let frame=0;frame<1801;frame++) {
      const nets=[net(.18,m.ball.y,.105,.05),net(.82,m.ball.y,.15,-.05)];
      stepMatch(m,nets,1/120);
      assert.ok(Math.hypot(m.ball.vx,m.ball.vy)<=CONFIG.maxSpeed+1e-8);
    }
    assert.equal(m.phase,'result'); assert.ok(m.hits>=6); assert.ok(m.score.every(Number.isInteger));
  }
});

test('rotation preserves relative ball position, speed, points and remaining time', () => {
  const match = createMatch();
  match.ball.y = match.height * .7;
  match.score = [2, 1]; match.remaining = 8.5;
  const velocity = { vx: match.ball.vx, vy: match.ball.vy };
  assert.equal(resizeMatch(match, .75), true);
  assert.ok(Math.abs(match.ball.y / match.height - .7) < 1e-10);
  assert.deepEqual({ vx: match.ball.vx, vy: match.ball.vy }, velocity);
  assert.deepEqual(match.score, [2, 1]); assert.equal(match.remaining, 8.5);
  assert.equal(resizeMatch(match, NaN), false);
  assert.equal(resizeMatch(match, 0), false);
  assert.equal(resizeMatch(match, .75), false);
});

test('cropped, missing and invalid fingertips cannot start or advance a round', () => {
  assert.equal(usableNet(net(.2), 9 / 16), true);
  assert.equal(usableNet(net(.2, -.05), 9 / 16), false);
  assert.equal(usableNet(net(1.1), 9 / 16), false);
  assert.equal(usableNet(net(.2, .7), 9 / 16), false);
  assert.equal(usableNet(net(.2, .28, .001), 9 / 16), false);
  assert.equal(usableNet(net(NaN), 9 / 16), false);
  assert.equal(usableNet(null, 9 / 16), false);
});

test('a player returning after a long pause keeps the last assigned slot', () => {
  const previous = [{ ...net(.6), seenAt: 0 }, { ...net(.85), seenAt: 0 }];
  const returning = net(.61), other = net(.84);
  assert.deepEqual(assignHands(previous, [returning], 5000), [returning, null]);
  assert.deepEqual(assignHands(previous, [other, returning], 5000), [returning, other]);
  const updated = updateNets(previous, [other, returning], 5000);
  assert.equal(updated[0].center.x, returning.center.x);
});
