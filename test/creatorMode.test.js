import test from "node:test";
import assert from "node:assert/strict";
import { cameraPoint } from "../src/creator/CameraLayout.js";
import { normalizeFaceMode, drawFaceMode } from "../src/creator/FaceMode.js";
import { HighlightEvents, replayFrames } from "../src/creator/HighlightEvent.js";
import { softServeCreatorProfile as profile } from "../src/softServe/creatorProfile.js";
import { faceFrame } from "../src/softServe/signals.js";
import { SoftServeAnimation } from "../src/softServe/animation.js";
import { Replay } from "../src/creator/Replay.js";

test("creator camera projection uses the same mirrored cover geometry as gameplay",()=>{
  assert.deepEqual(cameraPoint({x:.25,y:.5},720,1280,360,640),{x:.75,y:.5});
  assert.equal(cameraPoint({x:.5,y:.5},0,0,270,480),null);
});
test("HIDE never draws a camera fallback when a face is missing",()=>{
  let cameraDraws=0;
  const c={save(){},restore(){},translate(){},scale(){},drawImage(){cameraDraws++;}};
  const video={readyState:3,videoWidth:720,videoHeight:1280};
  drawFaceMode(c,video,"HIDE",null,{width:270,height:480});assert.equal(cameraDraws,0);
  drawFaceMode(c,video,"ORIGINAL",null,{width:270,height:480});assert.equal(cameraDraws,1);
  assert.equal(normalizeFaceMode("unexpected"),"ORIGINAL");assert.equal(normalizeFaceMode("EFFECT"),"EFFECT");
});
test("face decorations reject ambiguous and invalid faces without changing mouth thresholds",()=>{
  const face=Array.from({length:478},()=>({x:.5,y:.4}));face[33]={x:.4,y:.3};face[263]={x:.6,y:.3};
  const signal=faceFrame({faceLandmarks:[face]});assert.equal(signal.left,.4);assert.equal(signal.right,.6);
  assert.equal(faceFrame({faceLandmarks:[face,face]}),null);face[9].x=NaN;assert.equal(faceFrame({faceLandmarks:[face]}),null);
  assert.equal(faceFrame({faceLandmarks:[[{x:.5,y:.4}]]}),null);
});
test("highlight profiles deduplicate and bound event history, and a different EXP can supply its own labels",()=>{
  const h=new HighlightEvents(profile);assert.equal(h.highlight("unknown",0),null);
  assert.equal(h.highlight("perfect",0).label,"PERFECT SWIRL!");assert.equal(h.highlight("perfect",100),null);
  for(let i=1;i<20;i++)h.highlight("perfect",i*2000);assert.equal(h.events.length,8);
  assert.equal(h.latest(38000).type,"perfect");assert.equal(h.latest(40000),null);
  const alternate=new HighlightEvents({headshot:{kind:"perfect",label:"HEADSHOT",duration:500}}).highlight("headshot",0);
  assert.equal(alternate.label,"HEADSHOT");assert.equal(alternate.type,"headshot");assert.equal(alternate.kind,"perfect");
});
test("short replay selects real frames around highlights and preserves chronology",()=>{
  const frames=Array.from({length:100},(_,i)=>({at:i*125,blob:{id:i}}));
  const selected=replayFrames(frames,[{type:"perfect",at:1500},{type:"finish",at:9000}]);
  assert.ok(selected.length<frames.length);assert.ok(selected.some(f=>f.at===1500));assert.ok(selected.some(f=>f.at===9000));
  assert.ok(selected.every((f,i)=>!i||f.at>selected[i-1].at));assert.equal(replayFrames([],[]).length,0);
});
test("creator finish uses longer presentation time while PLAY still completes at 750ms",()=>{
  const a=new SoftServeAnimation({finishMs:1800});a.finish("clean");for(let i=0;i<17;i++)assert.equal(a.advance(100),false);assert.equal(a.advance(100),true);
  const play=new SoftServeAnimation();play.finish("clean");for(let i=0;i<7;i++)play.advance(100);assert.equal(play.advance(50),true);
});
test("out-of-order replay decoding and disposal cannot repaint an older or abandoned frame",async()=>{
  const oldDecode=globalThis.createImageBitmap,oldCancel=globalThis.cancelAnimationFrame,pending=[],drawn=[];
  let closed=0;
  globalThis.createImageBitmap=()=>new Promise(resolve=>pending.push(resolve));globalThis.cancelAnimationFrame=()=>{};
  try{
    const canvas={getContext:()=>({clearRect(){},drawImage(image){drawn.push(image.id);}})};
    const player=new Replay(canvas,{frames:[],events:[]});player.started=performance.now();player.index=0;
    const first=player.paint({},0,0);player.index=1;const second=player.paint({},0,1);
    pending[1]({id:"new",close(){closed++;}});await second;
    pending[0]({id:"old",close(){closed++;}});await first;assert.deepEqual(drawn,["new"]);
    const abandoned=player.paint({},0,1);player.dispose();pending[2]({id:"abandoned",close(){closed++;}});await abandoned;
    assert.deepEqual(drawn,["new"]);assert.equal(closed,3);assert.equal(canvas.width,0);
  }finally{
    if(oldDecode===undefined)delete globalThis.createImageBitmap;else globalThis.createImageBitmap=oldDecode;
    if(oldCancel===undefined)delete globalThis.cancelAnimationFrame;else globalThis.cancelAnimationFrame=oldCancel;
  }
});
