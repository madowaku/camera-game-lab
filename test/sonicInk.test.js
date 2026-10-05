import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { SonicInkGame, NOTES, noteAt, frequency, PLAY_SPEED, ROUND_MS, MAX_POINTS, sampleStroke } from '../src/sonicInk/core.js';
import { InkTracker } from '../src/sonicInk/tracking.js';
import { SonicInkAudio } from '../src/sonicInk/audio.js';
import { createGlowStroke } from '../src/visual3d/objects/glowStroke.js';
import { resolveRoute } from '../src/platform/navigation.js';
import { experiments } from '../src/platform/experiments.js';
import { trackForGame } from '../src/platform/music.js';

const line = (g, y=.5, at=0) => { for(let i=0;i<=25;i++) g.add({x:.2+i*.02,y,z:0},at+i*40); return g.end(); };
const circle = g => { for(let i=0;i<=64;i++){const a=i/64*Math.PI*2;g.add({x:.5+Math.cos(a)*.25,y:.5+Math.sin(a)*.2,z:0},i*33);}return g.end(); };
const advance = (g, ms) => { for(let i=0;i<ms;i+=50)g.tick(Math.min(50,ms-i)); };
const hand = (pinched=true, x=.5, palm=.15) => { const points=Array.from({length:21},()=>({x:.5,y:.5})); points[0]={x:.5,y:.7};points[9]={x:.5,y:.7-palm};points[8]={x,y:.4};points[4]={x:x+(pinched?.02:.20),y:.4};return {landmarks:[points]}; };
const update = (tracker, r, time) => tracker.update(r,time,540,960);

test('height selects the ten specified pentatonic notes, with finite frequencies',()=>{
  assert.deepEqual(NOTES,['C4','D4','E4','G4','A4','C5','D5','E5','G5','A5']);
  assert.equal(noteAt(1),0);assert.equal(noteAt(0),9);
  assert.equal(frequency(4),440);
  const g=new SonicInkGame();g.add({x:.2,y:.499,z:0},0);g.add({x:.24,y:.501,z:0},150);assert.equal(g.current.points.at(-1).note,5,'boundary jitter holds previous pitch');
  g.add({x:.28,y:.53,z:0},300);assert.equal(g.current.points.at(-1).note,4);
  assert.ok(g.current.notes.every(n=>Math.abs(n.pan)<=1&&Number.isFinite(frequency(n.note))));
});
test('time starts on first ink, pauses completely, and ends at 15 seconds',()=>{
  const g=new SonicInkGame();advance(g,20000);assert.equal(g.phase,'ready');assert.equal(g.elapsed,0);
  line(g);advance(g,1000);g.pause();const cursor=g.cursor,elapsed=g.elapsed;advance(g,3000);assert.deepEqual(g.cursor,cursor);assert.equal(g.elapsed,elapsed);
  g.resume();advance(g,ROUND_MS-elapsed);assert.equal(g.phase,'review');assert.equal(g.remaining,0);assert.equal(g.strokes.length,1);assert.equal(g.add({x:.5,y:.5,z:0},20000),false);
});
test('slow frames still count their actual elapsed time',()=>{
  const g=new SonicInkGame();line(g);g.tick(800);assert.equal(g.elapsed,800);g.tick(ROUND_MS);assert.equal(g.phase,'review');
});
test('release previews a valid stroke; three strokes enter review without a score',()=>{
  const g=new SonicInkGame();line(g,.4);assert.equal(g.current,null);assert.equal(g.playback.strokes.length,1);
  line(g,.5,2000);line(g,.6,4000);assert.equal(g.phase,'review');assert.equal(g.strokes.length,3);assert.equal(g.playback.strokes.length,3);assert.equal(g.score,undefined);
});
test('play head and notes follow distance, independent of drawing duration',()=>{
  const fast=new SonicInkGame(),slow=new SonicInkGame();
  for(let i=0;i<=30;i++){const p={x:.2+i*.02,y:.75-i*.013,z:0};fast.add(p,i*20);slow.add(p,i*90);}
  fast.end();slow.end();fast.drain();slow.drain();advance(fast,300);advance(slow,300);
  assert.ok(Math.abs(fast.playback.distance-PLAY_SPEED*.3)<1e-8);
  for(const key of ['x','y','z','note','progress'])assert.equal(fast.cursor[key],slow.cursor[key]);
  const g=fast,s=g.strokes[0];g.play();g.drain();
  for(let i=0;i<10;i++){const before=g.playback?.distance??s.length;g.tick(50);const after=g.playback?.distance??s.length;for(const e of g.drain().filter(e=>e.type==='note')){assert.ok(e.distance>=before-.0001&&e.distance<=after+.0001);assert.equal(e.source,'playback');}}
  assert.ok(sampleStroke(s,s.length).x>.75);
});
test('closed spatial shapes loop while open shapes play only once',()=>{
  const loop=new SonicInkGame(),s=circle(loop);assert.equal(s.closed,true);assert.ok(loop.drain().some(e=>e.type==='loop'));advance(loop,4000);assert.ok(loop.playback.pass>=1);
  const open=new SonicInkGame();line(open);advance(open,2000);assert.equal(open.playback,null);
});
test('corners emit bounded spark notes; speed and depth are recorded for replay',()=>{
  const g=new SonicInkGame();g.add({x:.2,y:.7,z:-.3},0);g.add({x:.35,y:.7,z:-.3},100);g.add({x:.35,y:.58,z:.2},200);
  const spark=g.drain().find(e=>e.type==='note'&&e.spark);assert.ok(spark);assert.ok(spark.speed>0);assert.equal(spark.depth,.2);
  g.add({x:.45,y:.58,z:.2},240);assert.equal(g.sparkCount,1);
});
test('dots and unsafe jumps are discarded; undo/clear silence and preserve round timing',()=>{
  const g=new SonicInkGame();g.add({x:.5,y:.5,z:0},0);g.end();assert.equal(g.strokes.length,0);
  line(g);g.add({x:.3,y:.4,z:0},2000);g.add({x:.9,y:.9,z:0},2033);assert.equal(g.current,null);assert.equal(g.strokes.length,1);
  advance(g,500);const t=g.elapsed;g.undo();assert.equal(g.strokes.length,0);assert.equal(g.playback,null);assert.equal(g.elapsed,t);
  line(g);g.clear();assert.equal(g.strokes.length,0);assert.equal(g.playback,null);assert.equal(g.elapsed,t);
  assert.equal(g.add({x:NaN,y:.5,z:0},3000),false);
});
test('stroke memory is bounded even with dense input',()=>{
  const g=new SonicInkGame();for(let i=0;i<MAX_POINTS+5;i++)g.add({x:.5+Math.sin(i*.1)*.2,y:.5+Math.cos(i*.1)*.2,z:0},i*20);
  assert.ok(g.strokes.every(s=>s.points.length<=MAX_POINTS));assert.ok(g.strokes.length<=3);
});
test('three stable frames start a pinch immediately, with smoothed mirrored coordinates',()=>{
  const t=new InkTracker();update(t,{},-1000);assert.equal(update(t,hand(),0).drawing,false);assert.equal(update(t,hand(),40).drawing,false);const f=update(t,hand(true,.4),80);assert.equal(f.drawing,true);assert.ok(f.position.x>.5);
  update(t,hand(true,.4,.23),120);assert.ok(t.position.z>0);
});
test('short loss bridges; ambiguous or long gaps require opening before a new pinch',()=>{
  for(const gap of [120,300,600]){
    const t=new InkTracker();for(let i=0;i<3;i++)update(t,hand(),i*40);
    const missing=t.missing(80+gap);assert.equal(missing.end,gap>=500);
    const f=update(t,hand(),80+gap+1);assert.equal(f.drawing,gap<250);assert.equal(f.end,gap>=250&&gap<500);
    if(gap>=250){for(let i=0;i<3;i++)update(t,hand(false),100+gap+i*40);let fresh;for(let i=0;i<3;i++)fresh=update(t,hand(),240+gap+i*40);assert.equal(fresh.drawing,true);}
  }
});
test('bad landmarks and crop-excluded tips cannot create ink',()=>{
  const t=new InkTracker();assert.equal(update(t,{},0).present,false);assert.equal(update(t,hand(true,NaN),40).present,false);
  assert.equal(t.update(hand(true,.02),80,1280,720).present,false);assert.equal(update(t,hand(true,.5,.01),120).present,false);
});
test('Three tube is finite, has per-vertex colors, and disposes every geometry once',()=>{
  const stroke=createGlowStroke([new THREE.Vector3(0,0,0),new THREE.Vector3(.2,.5,-.2),new THREE.Vector3(.5,.6,0)],{colorAt:t=>t>.5?'#ffd784':'#ff8dbd',radiusAt:t=>.01+t*.02,segments:1000});
  assert.ok(stroke.curve.getLength()>0);const counts=new Map();stroke.group.traverse(o=>{if(o.geometry){assert.ok([...o.geometry.attributes.position.array].every(Number.isFinite));o.geometry.addEventListener('dispose',()=>counts.set(o.geometry,(counts.get(o.geometry)??0)+1));}});
  assert.ok(stroke.group.children[0].geometry.attributes.color.count>100);
  stroke.dispose();assert.ok([...counts.values()].every(n=>n===1));assert.equal(createGlowStroke([]),null);
});
test('new and AIR ATELIER deep links resolve to SONIC INK without unrelated BGM',()=>{
  const game=experiments.find(g=>g.id==='solo-sonic-ink');assert.equal(game.duration,15);assert.equal(game.audioStrategy,'procedural');assert.equal(trackForGame(game,'demo'),null);
  for(const path of [game.route,'#sonic-ink','#air-atelier','#/game/solo-air-atelier'])assert.equal(resolveRoute(path).experiment,game);
  assert.deepEqual(resolveRoute('#/feed/solo-air-atelier'),{view:'feed',id:game.id});
});

test('audio lazily starts, bounds voices, carries pan/filter changes, and cleans up mute/exit',async()=>{
  const prior=globalThis.AudioContext,contexts=[];
  const param=()=>({value:0,setValueAtTime(n){this.value=n;},exponentialRampToValueAtTime(n){this.value=n;},cancelScheduledValues(){}});
  const node=()=>({gain:param(),frequency:param(),pan:param(),threshold:param(),ratio:param(),delayTime:param(),connect(){},disconnect(){this.disconnected=true;},start(){},stop(){}});
  globalThis.AudioContext=class{constructor(){contexts.push(this);this.state='suspended';this.currentTime=0;this.destination={};}resume(){this.state='running';return Promise.resolve();}close(){this.state='closed';return Promise.resolve();}createGain=node;createDynamicsCompressor=node;createAnalyser=node;createDelay=node;createBiquadFilter=node;createStereoPanner=node;createOscillator=node;};
  try{const a=new SonicInkAudio();assert.equal(contexts.length,0);a.arm();for(let i=0;i<25;i++)a.note({note:4,pan:.8,depth:.5,speed:1,spark:true});assert.equal(a.voices.size,10);const voice=[...a.voices][0];assert.equal(voice.pan.pan.value,.8);assert.ok(voice.filter.frequency.value>3500);a.setEnabled(false);assert.equal(a.voices.size,0);assert.equal(a.wet.gain.value,0);a.note({note:4});assert.equal(a.voices.size,0);a.setEnabled(true);a.note({note:4});assert.equal(a.voices.size,1);a.dispose();assert.equal(a.context,null);assert.equal(contexts[0].state,'closed');assert.equal(a.voices.size,0);}finally{globalThis.AudioContext=prior;}
});
