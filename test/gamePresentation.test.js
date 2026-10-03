import test from 'node:test';
import assert from 'node:assert/strict';
import { experiments } from '../src/platform/experiments.js';
import { resultModel } from '../src/platform/gamePresentation.js';
const game = id => experiments.find(g=>g.id===id);

test('failure, timeout and interrupted results never claim an escape, clear or victory',()=>{
  const blink=game('solo-blink-horror');
  assert.match(resultModel(blink,{outcome:'escaped',seconds:24,score:100,hides:5},'en').title,/OUT OF THE DARK/);
  for(const outcome of ['caught','timeout']) assert.doesNotMatch(resultModel(blink,{outcome,seconds:12},'en').title,/OUT OF THE DARK/);
  assert.notEqual(resultModel(blink,{outcome:'caught'},'en').title,resultModel(blink,{outcome:'timeout'},'en').title);
  assert.doesNotMatch(resultModel(game('outcam-the-camera-is-it'),{clear:false,completed:0},'en').title,/FIVE PATHS/);
  assert.equal(resultModel(game('outcam-the-camera-is-it'),{clear:false,completed:0},'en').hero,'0 / 5');
  assert.doesNotMatch(resultModel(game('guardian-spirit'),{victory:false,score:0},'en').title,/VICTORY/);
  assert.match(resultModel(game('voice-note-blaster'),{reason:'STOPPED',score:0},'en').title,/BREATHER/);
});
test('zero and missing measurements remain distinct and practice stays labeled',()=>{
  const r=resultModel(game('solo-finger-gun'),{score:0,hits:0,shots:0,accuracy:0,source:'demo'},'en');
  assert.equal(r.hero,'0');assert.equal(r.metrics[1].value,'0%');assert.match(r.source,/PRACTICE/);
  const s=resultModel(game('outcam-frame-smuggler'),{score:0,inspectionsCleared:0,caught:0,bestHideMs:null},'ja');
  assert.equal(s.metrics[0].value,'0 / 4');assert.equal(s.metrics[2].value,'—');
  assert.equal(resultModel(game('solo-daitai-hero'),{averageResponseTimeMs:null},'en').metrics[2].value,'—');
});
test('duel results use actual winner, hits and round time, including a simultaneous ring out',()=>{
  const g=game('duo-tiny-bot-duel');
  const win=resultModel(g,{winner:2,hits:[0,3],durationMs:12000,reason:'RING_OUT'},'en');
  assert.equal(win.hero,'P2');assert.equal(win.metrics[0].value,'0');assert.equal(win.metrics[1].value,'3');assert.equal(win.metrics[2].value,'12.0s');
  const draw=resultModel(g,{winner:null,reason:'RING_OUT'},'en');assert.equal(draw.hero,'DRAW');assert.equal(draw.unit,'RING OUT!');
});
