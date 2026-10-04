import test from 'node:test';
import assert from 'node:assert/strict';
import { HumanClockGame, EASY_TIMES, NORMAL_TIMES, clockAngles, angleError, signedAngle, evaluateHands, makeDeck, formatTime } from '../src/humanClock/core.js';
import { assignHands, ClockTracker, demoSample, projectPoint, clockCenter, vectorAngle, videoRect } from '../src/humanClock/tracking.js';
import { experiments } from '../src/platform/experiments.js';
import { resolveRoute } from '../src/platform/navigation.js';
import { resultPayload } from '../src/platform/share.js';
const play = difficulty => {const g=new HumanClockGame({random:()=>.999});g.reset(difficulty);g.start();return g;};
const step = (g,seconds,matched=true) => {for(let i=0;i<Math.round(seconds*100);i++)g.step(.01,matched);};
const poseFixture = () => {
  const p=Array.from({length:33},()=>({x:.5,y:.8,visibility:1,presence:1}));
  p[0]={x:.5,y:.28,visibility:1};p[11]={x:.7,y:.55,visibility:1};p[12]={x:.3,y:.55,visibility:1};
  p[15]={x:.7,y:.3,visibility:1};p[16]={x:.3,y:.7,visibility:1};return p;
};
const handFixture = (wrist,tip={x:wrist.x,y:wrist.y-.08}) => {
  const p=Array.from({length:21},()=>({...wrist}));
  for(let i=5;i<=8;i++){const t=(i-5)/3;p[i]={x:wrist.x+(tip.x-wrist.x)*t,y:wrist.y+(tip.y-wrist.y)*t};}
  return p;
};
test('real analog hour interpolation, twelve wrap and one-minute math',()=>{
  assert.deepEqual(clockAngles(3,40),{hour:20,minute:150});assert.deepEqual(clockAngles(6,30),{hour:105,minute:90});
  assert.deepEqual(clockAngles(12,0),{hour:270,minute:270});assert.deepEqual(clockAngles(4,37),{hour:48.5,minute:132});
  assert.equal(angleError(359,1),2);assert.equal(signedAngle(1,359),-2);
});
test('both raw and smoothed directions must match within the inclusive 12 degrees',()=>{
  const hands=demoSample(32,138).hands;assert.equal(evaluateHands(hands,{hour:3,minute:40}).matched,true);
  hands.hour.rawAngle=32.01;assert.equal(evaluateHands(hands,{hour:3,minute:40}).matched,false);
  hands.hour.rawAngle=20;hands.minute.present=false;assert.equal(evaluateHands(hands,{hour:3,minute:40}).matched,false);
});
test('400ms continuous hold, reset on mismatch, one point and settling lockout',()=>{
  const g=play();step(g,.39);assert.equal(g.score,0);g.step(.01,false);assert.equal(g.hold,0);
  step(g,.4);assert.equal(g.score,1);assert.equal(g.completed.length,1);step(g,.4);assert.equal(g.score,1);
  step(g,.16);step(g,.4);assert.equal(g.score,2);
});
test('pause and a delayed frame cannot preserve a partial hold or award a point',()=>{
  const g=play();step(g,.35);g.paused=true;const at=g.elapsed;step(g,1);assert.equal(g.elapsed,at);
  g.clearHold();g.paused=false;step(g,.35);g.step(.5,true);assert.equal(g.hold,0);assert.equal(g.score,0);
});
test('30 active seconds is a strict deadline, result measures actual completed clocks',()=>{
  const g=play();step(g,.4);step(g,29.2,false);step(g,.4,true);assert.equal(g.phase,'result');assert.equal(g.result.score,1);
  assert.equal(g.result.completed.length,1);assert.ok(Math.abs(g.result.fastest-.4)<1e-8);assert.equal(g.result.duration,30);
  const empty=play();step(empty,30,false);assert.equal(empty.result.fastest,null);assert.equal(empty.result.score,0);
});
test('fifth completion starts five-second rush, shortened transitions, skip breaks combo',()=>{
  const g=play('normal');for(let i=0;i<5;i++){step(g,.4);if(i<4)step(g,.56,false);}
  assert.equal(g.score,5);assert.equal(g.bestCombo,5);assert.equal(g.rush,true);assert.equal(g.settle,.22);assert.equal(g.showNumbers,false);
  step(g,.23,false);g.skip();assert.equal(g.combo,0);assert.equal(g.skipped,1);assert.equal(g.rush,false);assert.equal(g.bestCombo,5);
});
test('question decks contain 12–20 five-minute times without immediate repeats',()=>{
  for(const [difficulty,times] of [['easy',EASY_TIMES],['normal',NORMAL_TIMES]]){
    assert.ok(times.length>=12&&times.length<=20);assert.equal(new Set(times.map(formatTime)).size,times.length);assert.ok(times.every(t=>t.minute%5===0));
    const deck=makeDeck(difficulty,()=>.999,times[0]);assert.notEqual(formatTime(deck[0]),formatTime(times[0]));
  }
});
test('contain projection matches mirrored camera and preserves true pixel angles',()=>{
  assert.deepEqual(videoRect(16/9),{x:0,y:277.5,width:720,height:405});
  assert.deepEqual(projectPoint({x:0,y:0},16/9),{x:720,y:277.5});
  const center=projectPoint({x:.5,y:.5},16/9),tip=projectPoint({x:.4,y:.4},16/9);assert.ok(Math.abs(vectorAngle(center,tip)-330.642246)<.00001);
});
test('anatomical hand ownership survives crossing and result reordering',()=>{
  const pose=poseFixture(),left=handFixture(pose[15]),right=handFixture(pose[16]);
  const result={landmarks:[right,left]};const [hour,minute]=assignHands(result,pose,.75);
  assert.ok(Math.abs(hour.x-216)<1e-8);assert.ok(Math.abs(minute.x-504)<1e-8);
  [pose[15],pose[16]]=[pose[16],pose[15]];const [crossHour,crossMinute]=assignHands(result,pose,.75);
  assert.ok(Math.abs(crossHour.x-504)<1e-8);assert.ok(Math.abs(crossMinute.x-216)<1e-8);
});
test('ambiguous ownership, curled and end-on fingertips do not score',()=>{
  const pose=poseFixture();pose[15]=pose[16]={x:.5,y:.5,visibility:1};
  assert.deepEqual(assignHands({landmarks:[handFixture(pose[15]),handFixture(pose[16])]},pose,.75),[null,null]);
  pose[11].visibility=.1;assert.equal(clockCenter(pose,.75),null);
  const p=poseFixture();const hand=handFixture(p[15]);hand[8]={...hand[5]};
  const tracker=new ClockTracker();const sample=tracker.update({pose:{landmarks:[p]},hand:{landmarks:[hand,handFixture(p[16])]}},0,.75);
  assert.equal(sample.hands.hour,null);assert.equal(sample.ready,false);
});
test('direction uses the index knuckle to tip, independent of wrist or clock-center position',()=>{
  const p=poseFixture(),left=handFixture(p[15],{x:p[15].x-.08,y:p[15].y}),right=handFixture(p[16]);
  const result={pose:{landmarks:[p]},hand:{landmarks:[right,left]}};
  const a=new ClockTracker().update(result,0,.75);assert.equal(a.hands.hour.rawAngle,0);assert.equal(a.hands.minute.rawAngle,270);
  // Translation changes where the hand appears, never what time it points to.
  for(const point of left){point.x-=.15;point.y+=.2;}p[15].x-=.15;p[15].y+=.2;
  const b=new ClockTracker().update(result,50,.75);assert.equal(b.hands.hour.rawAngle,0);assert.notEqual(a.hands.hour.y,b.hands.hour.y);
  assert.ok(angleError(vectorAngle(b.center,b.hands.hour),b.hands.hour.rawAngle)>12);
});
test('tracking loss and inference gaps remove continuity and recover from new observations',()=>{
  const p=poseFixture(),result={pose:{landmarks:[p]},hand:{landmarks:[handFixture(p[15]),handFixture(p[16])]}};
  const tracker=new ClockTracker();assert.equal(tracker.update(result,0,.75).continuous,false);assert.equal(tracker.update(result,50,.75).continuous,true);
  assert.equal(tracker.update(result,250,.75).continuous,false);assert.equal(tracker.update({pose:{landmarks:[p]},hand:{landmarks:[]}},300,.75).ready,false);
  assert.equal(tracker.update(result,350,.75).continuous,false);assert.equal(tracker.update(result,400,.75).continuous,true);
});
test('HUMAN CLOCK has canonical routing, aliases and practice-aware sharing',()=>{
  const game=experiments.find(g=>g.id==='solo-human-clock');assert.equal(game.exp,'EXP-050');assert.equal(resolveRoute('#human-clock').experiment.id,game.id);
  assert.match(game.resultShare({source:'demo',score:7,bestCombo:5,difficulty:'easy'},'en'),/Camera-free practice.*7 clocks/);
  const g=play();step(g,.4);step(g,29.6,false);g.result.source='demo';
  assert.match(resultPayload(game,g.result,'ja').text,/カメラなし.*1個の時計/);
});
