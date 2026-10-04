import test from 'node:test';
import assert from 'node:assert/strict';
import { measureFace, faceInFrame, smileScore, SmileTracker } from '../src/dontLaugh/signals.js';
import { DontLaughGame, stageAt, SMILE_THRESHOLD, learnReactions, weaknessOf } from '../src/dontLaugh/core.js';
import { experiments, validateRegistry } from '../src/platform/experiments.js';
import { resolveRoute } from '../src/platform/navigation.js';
import { trackForGame } from '../src/platform/music.js';
const neutral = { cornerRise: 0, width: .42, open: .03, eye: .26, smile: .01, cheek: 0, squint: 0 };
function landmarks() {
  const p = Array.from({ length: 478 }, () => ({ x: .5, y: .5 }));
  for (const [i, x, y] of [[10,.5,.2],[152,.5,.8],[234,.3,.5],[454,.7,.5],[61,.4,.6],[291,.6,.6],[13,.5,.598],[14,.5,.602],[33,.36,.4],[133,.44,.4],[159,.4,.389],[145,.4,.411],[263,.64,.4],[362,.56,.4],[386,.6,.389],[374,.6,.411]]) p[i] = {x,y};
  return p;
}
test('neutral, speaking and blinking alone cannot end a round; smiling can', () => {
  assert.equal(smileScore(neutral, neutral), 0);
  for (const s of [{ ...neutral, open: .9 }, { ...neutral, eye: 0, squint: 1 }, { ...neutral, cheek: 1 }, { ...neutral, width: .7 }]) assert.ok(smileScore(s, neutral) < SMILE_THRESHOLD);
  assert.ok(smileScore({ ...neutral, cornerRise: .14, width: .54, eye: .16, open: .13 }, neutral) > SMILE_THRESHOLD);
  assert.ok(smileScore({ ...neutral, smile: .85, cheek: .55 }, neutral) > SMILE_THRESHOLD);
});
test('geometry corrects image aspect, scale and head roll and consumes unmodified landmarks', () => {
  const p = landmarks(), base = measureFace({ faceLandmarks: [p] }, 1); assert.ok(base);
  for (const aspect of [.5625, 1, 16/9]) {
    const q = p.map(v => ({ x: .5 + (v.x - .5) / aspect, y: v.y })), got = measureFace({faceLandmarks:[q]}, aspect);
    for (const key of ['cornerRise','width','open','eye']) assert.ok(Math.abs(got[key] - base[key]) < 1e-6, key);
  }
  const theta = .22, rotated = p.map(v => ({ x: .5 + (v.x-.5)*Math.cos(theta)-(v.y-.5)*Math.sin(theta), y: .5+(v.x-.5)*Math.sin(theta)+(v.y-.5)*Math.cos(theta) }));
  const got = measureFace({faceLandmarks:[rotated]},1); assert.ok(Math.abs(got.cornerRise-base.cornerRise)<1e-6); assert.ok(Math.abs(got.open-base.open)<1e-6);
});
test('missing, multiple, offscreen, tiny or degenerate faces cannot become valid samples', () => {
  assert.equal(measureFace(null), null); assert.equal(measureFace({ faceLandmarks: [landmarks(), landmarks()] }), null);
  const p=landmarks(); p[61].x=-1; assert.equal(measureFace({faceLandmarks:[p]}),null);
  const q=landmarks(); q[133]=q[33]; assert.equal(measureFace({faceLandmarks:[q]}),null);
  assert.equal(measureFace({faceLandmarks:[landmarks()]}, NaN), null);
});
test('camera framing agrees with the portrait cover crop and reserves room for HUD', () => {
  const s=measureFace({faceLandmarks:[landmarks()]},1);assert.equal(faceInFrame(s,1),true);assert.equal(faceInFrame(s,16/9),false);
  assert.equal(faceInFrame({...s,box:{x:.43,y:.25,w:.14,h:.4}},16/9),true);assert.equal(faceInFrame({...s,box:{x:.01,y:.25,w:.14,h:.4}},16/9),false);
  assert.equal(faceInFrame({...s,box:{x:.4,y:.05,w:.2,h:.5}},.5625),false);
});
test('800ms of relaxed samples calibrate; open mouths, smiles and gaps restart preparation', () => {
  const t = new SmileTracker();
  for(let at=0;at<=1000;at+=50) t.update({...neutral,smile:.7},at); assert.equal(t.neutral,null);
  for(let at=1100;at<=2000;at+=50) t.update({...neutral,open:.5},at); assert.equal(t.neutral,null);
  for(let at=2100;at<=2500;at+=50) t.update(neutral,at); t.update(neutral,2801); assert.equal(t.neutral,null);
  for(let at=2851;at<=3651;at+=50) t.update(neutral,at); assert.ok(t.neutral);
  assert.equal(t.update(null,3700).ready,false); assert.ok(t.neutral); t.reset(); assert.equal(t.neutral,null);
});
test('a 399ms smile or intermittent spikes do not lose; 400ms sustained smile does', () => {
  const g = new DontLaughGame(); g.start(); for(let i=0;i<3;i++) g.step(.1,90); g.step(.099,90); assert.equal(g.phase,'playing'); g.step(.001,90); assert.equal(g.result.reason,'laughed'); assert.ok(Math.abs(g.result.elapsed-.4)<1e-9);
  const h=new DontLaughGame(); h.start(); for(let i=0;i<20;i++){h.step(.1,90);h.step(.1,0);} assert.equal(h.phase,'playing'); assert.equal(h.hold,0);
});
test('pause and invalid or stale input freeze time and discard smile hold', () => {
  const g=new DontLaughGame(); g.start(); g.step(.1,90); g.step(.1,90); const at=g.elapsed;
  g.step(.1,90,false); assert.equal(g.elapsed,at); assert.equal(g.hold,0);
  g.paused=true; g.step(.1,90); assert.equal(g.elapsed,at); g.paused=false; g.step(.1,NaN); assert.equal(g.elapsed,at);
  g.step(.1,90); assert.equal(g.phase,'playing'); assert.equal(g.hold,.1);
});
test('exact 15-second deadline and last-second sustained smile have chronological outcomes', () => {
  const g=new DontLaughGame();g.start();for(let i=0;i<160;i++)g.step(.1,0);assert.equal(g.result.reason,'survived');assert.ok(Math.abs(g.elapsed-15)<1e-9);
  const h=new DontLaughGame();h.start();for(let i=0;i<147;i++)h.step(.1,0);for(let i=0;i<4;i++)h.step(.1,90);assert.equal(h.result.reason,'survived');
  const j=new DontLaughGame();j.start();for(let i=0;i<145;i++)j.step(.1,0);for(let i=0;i<4;i++)j.step(.1,90);assert.equal(j.result.reason,'laughed');assert.ok(Math.abs(j.elapsed-14.9)<1e-9);
});
test('stages escalate at 5, 10 and 12 seconds and attacks only fire once', () => {
  assert.deepEqual([0,4.99,5,9.99,10,11.99,12,14.99].map(stageAt),['LEVEL 1','LEVEL 1','LEVEL 2','LEVEL 2','LEVEL 3','LEVEL 3','FINAL ATTACK','FINAL ATTACK']);
  const g=new DontLaughGame();g.start();for(let i=0;i<160;i++)g.step(.1,0);assert.equal(g.takeEvents().filter(e=>e.type==='attack').length,12); assert.equal(g.takeEvents().length,0);
  g.reset();assert.equal(g.result,null);assert.equal(g.elapsed,0);assert.equal(g.reactions.length,0);
});
test('learning retains numeric reactions and favors a repeated observed weakness', () => {
  const memory=learnReactions({},[{group:'clones',start:5,peak:55},{group:'clones',start:4,peak:64},{group:'face',start:0,peak:3}]);assert.equal(weaknessOf(memory),'clones');
  const g=new DontLaughGame();g.reset(weaknessOf(memory));assert.equal(g.deck[8].type,'clones');assert.equal(g.deck[10].type,'clones');assert.equal(g.deck.at(-1).type,'final');
  assert.equal(weaknessOf({clones:{count:'bad',sum:NaN}}),null); assert.equal(weaknessOf(learnReactions(null,[])),null);
});
test('independent canonical route, aliases and licensed music integrate with the lab', () => {
  const game=experiments.find(g=>g.id==='solo-dont-laugh'); assert.deepEqual(validateRegistry(experiments),[]); assert.equal(resolveRoute('#dont-laugh').experiment,game);assert.equal(game.duration,15);assert.equal(game.requiresMicrophone,false);assert.equal(trackForGame(game,'camera').title,'おもちゃの一日');
  assert.match(game.resultShare({source:'demo',reason:'laughed',elapsed:11.8},'ja'),/練習.*11\.80/);
});
