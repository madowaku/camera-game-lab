import test from 'node:test';
import assert from 'node:assert/strict';
import { palmPosition, wheelRoll, WheelSignal } from '../src/tiltTurbo/wheel.js';
import { COURSES, CARS, pickCourse, pickCar } from '../src/tiltTurbo/garage.js';
import { TiltTurboGame, roadCenter, ROUND_MS } from '../src/tiltTurbo/core.js';

const hand=(x,y)=>Array.from({length:21},()=>({x,y,z:0}));
function palms(angle,width=720,height=1280) {
  const dy=Math.tan(-angle*Math.PI/180)*.34*width/height;
  return [hand(.33,.5-dy/2),hand(.67,.5+dy/2)];
}
test('two hands act as a mirrored virtual wheel with aspect correction',()=>{
  for(const [w,h] of [[720,1280],[1280,720]]) {
    for(const angle of [-35,-20,-5,0,5,20,35]) {
      const p=palms(angle,w,h);
      assert.ok(Math.abs(wheelRoll(p,w,h)-angle)<1e-9);
      assert.ok(Math.abs(wheelRoll([...p].reverse(),w,h)-angle)<1e-9);
    }
  }
});
test('no invented input on missing, overlapping, incomplete or invalid hands',()=>{
  assert.equal(wheelRoll([]),null);
  assert.equal(wheelRoll([hand(.3,.5)]),null);
  assert.equal(wheelRoll([hand(.3,.5),hand(.36,.5)]),null);
  assert.equal(wheelRoll([hand(.3,.1),hand(.7,.9)]),null);
  assert.equal(wheelRoll([hand(.3,.5),hand(.7,.5)],0,100),null);
  const broken=hand(.2,.5);broken[9]={x:NaN,y:.5};
  assert.equal(palmPosition(broken),null);
  assert.equal(wheelRoll([broken,hand(.7,.5)]),null);
});
test('wheel calibration retains neutral after recognition loss',()=>{
  const w=new WheelSignal();
  for(let at=0;at<=750;at+=50)w.sample(10,at);
  assert.equal(w.neutral,10);
  assert.equal(w.sample(null,800).tracked,false);
  w.sample(28,850); // first returning frame is intentionally filtered into the dead zone
  const steering=w.sample(28,900);
  assert.equal(steering.mode,'hands');
  assert.equal(steering.hands,2);
  assert.ok(steering.steering>0);
  assert.equal(w.neutral,10);
});
test('three distinct courses and three cars have stable identifiers and route data',()=>{
  assert.equal(new Set(COURSES.map(x=>x.id)).size,3);
  assert.equal(new Set(CARS.map(x=>x.id)).size,3);
  for(const course of COURSES) {
    assert.equal(course.path[0][0],0);
    assert.equal(course.path.at(-1)[0],ROUND_MS);
    for(const traffic of course.traffic) {
      assert.ok(traffic.speedRatio>0&&traffic.speedRatio<1);
      assert.ok(traffic.at>0&&traffic.at<ROUND_MS);
      assert.ok(Math.abs(traffic.offset)<.8);
    }
  }
  assert.equal(pickCar('bad').id,'roadster');
  assert.equal(pickCourse('bad').id,'toy-town');
  assert.notEqual(roadCenter(4500,COURSES[1].path),roadCenter(4500,COURSES[2].path));
});
test('garage presets and traffic collisions are deterministic across duplicate playbacks',()=>{
  const run=()=>{const g=new TiltTurboGame({courseId:'seaside',carId:'kart'});g.start();
    while(!g.result)g.step(25,{steering:Math.sin(g.elapsed/450)*.5,tracked:true,roll:15});
    return g;};
  const a=run(),b=run();
  assert.deepEqual(a.result,b.result);
  assert.ok(a.result.overtakes+a.result.trafficHits>0);
  assert.equal(a.result.courseId,'seaside');
  assert.equal(a.result.carId,'kart');
  assert.ok(a.history.some(e=>['PASS!','CLOSE PASS!','TRAFFIC!'].includes(e.type)));
});
test('a successful clean pass scores exactly once and a deliberate contact can bonk',()=>{
  const rival=COURSES[0].traffic[0],course=COURSES[0];
  const passed=new TiltTurboGame();
  passed.start();passed.elapsed=rival.at-8;
  passed.x=roadCenter(rival.at,course.path)-.43+1.0;
  passed.step(16,{steering:.5,tracked:true});
  assert.equal(passed.overtakes,1);
  assert.equal(passed.trafficHits,0);
  passed.step(100,{tracked:true});
  assert.equal(passed.overtakes,1);
  const hit=new TiltTurboGame();hit.start();hit.elapsed=rival.at-8;
  hit.x=roadCenter(rival.at,course.path)+rival.offset+Math.sin(rival.seed)*.06;
  hit.step(16,{tracked:true,steering:hit.x/1.12});
  assert.equal(hit.trafficHits,1);
  assert.equal(hit.overtakes,0);
  assert.ok(hit.hits>0);
});
