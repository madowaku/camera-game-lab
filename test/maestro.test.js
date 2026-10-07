import test from 'node:test';
import assert from 'node:assert/strict';
import { MaestroGame } from '../src/maestro/core.js';
import { GestureMapper, normalizePose } from '../src/maestro/GestureMapper.js';
const frame = (spread=1, y=0, centre=0) => ({ left: { x: centre-spread/2, y }, right: { x: centre+spread/2, y } });
const feed = (mapper, game, frames, start=0, dt=60) => {
  const events = [];
  frames.forEach((f,i) => { const at = start+i*dt; const emitted = mapper.update(f, at, game); game.update(at, mapper.input?.intensity ?? game.intensity); emitted.forEach(e => { if (game.dispatch(e, at)) events.push(e); }); }); return events;
};
test('free session flows through tutorial, CUT, resume, guarded finale and BRAVO', () => {
  const game = new MaestroGame(); assert.equal(game.dispatch('FINALE'), false);
  assert.ok(game.dispatch('START', 0)); game.update(1100,.9); assert.equal(game.state,'PLAY'); assert.equal(game.tutorial,2);
  game.dispatch('BRASS',1100); game.dispatch('PERCUSSION',1200); assert.equal(game.finaleReady,true);
  game.dispatch('CUT',1300); assert.equal(game.state,'CUT'); assert.equal(game.tutorial,3);
  game.dispatch('START',1500); game.update(2600,.85); game.dispatch('FINALE',2700); assert.equal(game.state,'FINALE');
  game.update(4500,.8); assert.equal(game.state,'BRAVO'); assert.ok(game.dispatch('START',4600));
  for (let i = 0; i < 500; i++) game.dispatch('ACCENT', 5000 + i * 500);
  assert.equal(game.events.length,128); assert.equal(game.events.at(-1).at,254500);
});
test('a held raised hand starts once, spread recruits the full orchestra', () => {
  const game = new MaestroGame(), mapper = new GestureMapper();
  const events = feed(mapper,game,Array(30).fill(frame(1,-.6)));
  assert.equal(events.filter(e => e === 'START').length,1); assert.equal(game.state,'PLAY');
  feed(mapper,game,Array(18).fill(frame(3.5,-.3)),1800);
  assert.ok(game.intensity > .8); assert.deepEqual(game.sections,{strings:true,brass:true,percussion:true});
});
test('still hands never CUT; moving both hands then freezing does, even after an accent', () => {
  const game = new MaestroGame(), mapper = new GestureMapper(); game.dispatch('START',0); game.update(1100,.5);
  let events = feed(mapper,game,Array(18).fill(frame(1.5,0)),1200); assert.ok(!events.includes('CUT'));
  const move = Array.from({length:12},(_,i) => frame(1.5,-i*.16));
  events = feed(mapper,game,move,2300); events.push(...feed(mapper,game,Array(14).fill(move.at(-1)),3020));
  assert.ok(events.includes('CUT'), JSON.stringify({ events, input: mapper.input, armed: mapper.cutArmed })); assert.equal(game.state,'CUT');
});
test('lost / stale pose resets motion history and recovery cannot cause CUT or FINALE', () => {
  const game = new MaestroGame(), mapper = new GestureMapper(); game.dispatch('START',0); game.update(1100,.9); game.dispatch('BRASS'); game.dispatch('PERCUSSION');
  feed(mapper,game,[frame(3.5,-1),frame(3.5,0)],1200);
  assert.deepEqual(mapper.update(null,1320,game),[]); assert.deepEqual(mapper.update(frame(3.5,1),1400,game),[]);
  const events = feed(mapper,game,Array(10).fill(frame(3.5,1)),1460); assert.ok(!events.includes('CUT') && !events.includes('FINALE'));
  assert.deepEqual(mapper.update(frame(3.5,-2),5000,game),[]);
});
test('a wide orchestra followed by a strong two-hand downstroke produces a single finale', () => {
  const game = new MaestroGame(), mapper = new GestureMapper(); game.dispatch('START',0); game.update(1100,.9); game.dispatch('BRASS'); game.dispatch('PERCUSSION');
  feed(mapper,game,Array(20).fill(frame(3.5,-1)),1200);
  const events = feed(mapper,game,[frame(3.5,-.6),frame(3.5,-.1),frame(3.5,.4),frame(3.5,.8)],2500);
  assert.equal(events.filter(e => e === 'FINALE').length,1); assert.equal(game.state,'FINALE');
});
test('section gestures select strings, brass and down percussion without a finger pose', () => {
  const game = new MaestroGame(), mapper = new GestureMapper(); game.dispatch('START'); game.update(1100,.2);
  feed(mapper,game,Array(12).fill(frame(1,0,1)),1200); assert.ok(game.sections.brass);
  feed(mapper,game,Array(15).fill(frame(1,0,-1)),2000); assert.deepEqual(game.sections,{strings:true,brass:false,percussion:false});
  feed(mapper,game,[frame(1,.1,-1),frame(1,.5,-1),frame(1,1,-1)],3000); assert.ok(game.sections.percussion);
});
test('shoulder-relative normalization tolerates body size and rejects occluded/cropped wrists', () => {
  const pose = Array.from({length:33},()=>({x:.5,y:.5,visibility:1}));
  pose[11] = {x:.4,y:.5,visibility:1}; pose[12] = {x:.6,y:.5,visibility:1}; pose[15] = {x:.2,y:.3,visibility:1}; pose[16] = {x:.8,y:.3,visibility:1};
  const input = normalizePose(pose,p=>p,2); assert.ok(input); assert.ok(Math.abs(input.left.x + 1.5) < 1e-9); assert.ok(Math.abs(input.left.y + 2) < 1e-9);
  pose[15].visibility = .1; assert.equal(normalizePose(pose,p=>p,2),null); pose[15].visibility = 1; pose[15].x = 1.5; assert.equal(normalizePose(pose,p=>p,2),null);
});
