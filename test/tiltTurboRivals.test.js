import test from 'node:test';
import assert from 'node:assert/strict';
import { TiltTurboGame, roadCenter, ROUND_MS } from '../src/tiltTurbo/core.js';
import { COURSES, CARS } from '../src/tiltTurbo/garage.js';
import { rivalLane, rivalAhead, raceStandings, PASS_TURBO_MS } from '../src/tiltTurbo/rivals.js';

const hold = g => ({ tracked:true, steering:g.x/(1.12*g.car.steeringGain) });
function encounter() {
  const g=new TiltTurboGame();g.start();g.elapsed=2000;g.speed=90;g.x=.30;
  g.rivals[0].distance=g.distance+.20;
  return g;
}

test('each course starts behind persistent named rivals within the road',()=>{
  for(const course of COURSES){
    const g=new TiltTurboGame({courseId:course.id});
    assert.equal(g.position,course.traffic.length+1);
    assert.equal(new Set(g.rivals.map(r=>r.id)).size,g.rivals.length);
    for(const r of g.rivals){
      assert.ok(r.distance>0 && r.ja && r.en);
      for(let at=0;at<ROUND_MS;at+=300) assert.ok(Math.abs(rivalLane(r,at))+.20<course.roadHalf);
    }
  }
});

test('a pass changes distance-based rank and rewards a brief turbo',()=>{
  const g=encounter(),r=g.rivals[0];
  assert.ok(rivalAhead(r,g.distance)>0);
  g.step(16,hold(g));
  assert.equal(g.position,4);
  assert.equal(g.overtakes,1);
  assert.equal(g.turboMs,PASS_TURBO_MS);
  assert.ok(rivalAhead(r,g.distance)<0);
  assert.equal(g.history.find(e=>e.type==='PASS!').data.score,150);
  assert.equal(g.history.find(e=>e.type==='PASS!').data.rivalId,r.id);
});

test('encounters depend on distance instead of a scheduled time',()=>{
  const slow=new TiltTurboGame();slow.start();
  slow.step(6000,{tracked:true,steering:1,roll:25});
  assert.ok(slow.hits>0);
  assert.equal(slow.overtakes,0);
  assert.equal(slow.position,slow.racerCount);
  const fast=encounter();fast.step(16,hold(fast));
  assert.equal(fast.overtakes,1,'can pass before the old 5.3-second appointment');
});

test('a bonk costs ground, rivals can retake, and a re-pass cannot farm points',()=>{
  const g=encounter(),r=g.rivals[0];g.step(16,hold(g));
  g.bonk();g.step(200,hold(g));
  assert.equal(g.turboMs,0);
  assert.equal(g.position,5);
  assert.ok(g.history.some(e=>e.type==='RIVAL AHEAD!'));
  // Catch the same racer again in a clear lane.
  g.cooldown=0;g.speed=90;r.distance=g.distance+.20;
  g.step(16,hold(g));
  assert.equal(g.position,4);
  assert.equal(g.overtakes,1);
  assert.equal(g.turboMs,0);
  assert.equal(g.history.find(e=>e.type==='REPASS!').data.score,0);
  assert.equal(g.history.filter(e=>e.data.score===150).length,1);
});

test('overlapping contact slows immediately without repeated per-frame hits',()=>{
  const g=encounter(),r=g.rivals[0];
  r.distance=g.distance+5;g.x=rivalLane(r,g.elapsed);
  g.step(16,hold(g));
  assert.equal(g.trafficHits,1);assert.equal(g.overtakes,0);
  assert.ok(g.speed<50 && r.distance>g.distance);
  g.step(160,hold(g));assert.equal(g.trafficHits,1);
});

test('pause freezes rival distance and turbo; lost hands keep the race moving',()=>{
  const g=encounter();g.step(16,hold(g));g.paused=true;
  const before={elapsed:g.elapsed,distance:g.distance,turbo:g.turboMs,rivals:g.rivals.map(r=>r.distance)};
  g.step(500,{tracked:false});
  assert.deepEqual({elapsed:g.elapsed,distance:g.distance,turbo:g.turboMs,rivals:g.rivals.map(r=>r.distance)},before);
  g.paused=false;g.step(32,{tracked:false});
  assert.ok(g.distance>before.distance && g.rivals[0].distance>before.rivals[0]);
  assert.equal(g.faceLosses,1);
});

test('all garages finish with rank matching standings and retry resets the race',()=>{
  for(const course of COURSES)for(const car of CARS){
    const g=new TiltTurboGame({courseId:course.id,carId:car.id});g.start();
    while(!g.result)g.step(40,{tracked:true,steering:roadCenter(g.elapsed+100,course.path)/(1.12*car.steeringGain),roll:12});
    assert.equal(g.result.elapsed,ROUND_MS);
    assert.equal(g.result.position,g.result.standings.find(r=>r.player).position);
    assert.equal(g.result.standings.length,g.racerCount);
    assert.ok(g.result.position>=1 && g.result.position<=g.racerCount);
    const before=structuredClone(g.result);g.step(1000);assert.deepEqual(g.result,before);
    g.reset();assert.equal(g.position,g.racerCount);assert.equal(g.overtakes,0);assert.equal(g.turboMs,0);
    assert.ok(g.rivals.every(r=>!r.rewarded && !r.contact));
  }
});

test('tie policy matches the final standings and turbo expires on its own',()=>{
  const g=encounter();g.step(16,hold(g));
  g.rivals[0].distance=g.distance;
  assert.equal(raceStandings(g).find(r=>r.player).position,5);
  g.rivals.forEach(r=>r.distance+=1000);g.step(1000,{tracked:true});
  assert.equal(g.turboMs,0);
});

test('fine and coarse frame delivery preserve race outcome for identical steering',()=>{
  const run=dt=>{const g=new TiltTurboGame();g.start();while(!g.result)g.step(dt,{tracked:true,steering:0});return g;};
  const a=run(16),b=run(160);
  assert.equal(a.position,b.position);assert.equal(a.overtakes,b.overtakes);assert.equal(a.trafficHits,b.trafficHits);
  assert.ok(Math.abs(a.distance-b.distance)<.01);
});
