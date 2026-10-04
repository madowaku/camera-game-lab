import test from "node:test";
import assert from "node:assert/strict";
import { WipeGame,W,H,COLS,ROWS,CELL } from "../src/wipe/core.js";
import { WipeTracker,palmFromLandmarks } from "../src/wipe/tracking.js";
import { selectWipeReplay } from "../src/wipe/creatorProfile.js";
import { experiments,validateRegistry } from "../src/platform/experiments.js";
import { trackForGame } from "../src/platform/music.js";
import { resultPayload } from "../src/platform/share.js";
const palm=(x,y,id=1)=>({x,y,id,present:true,radius:.135});
function sweep(g,side=0,passes=3){for(let pass=0;pass<passes;pass++)for(let y=0;y<=1.0001;y+=.06)for(let k=0;k<=20;k++){const x=(Math.round(y/.06)%2?k/20:1-k/20);g.wipe(palm(g.players===2?side*.5+x*.5:x,y,side+1));}}
test("EXP-049 SOLO and DUO have independent portrait routes and licensed lazy music",()=>{
  assert.deepEqual(validateRegistry(experiments),[]);
  for(const [mode,players,duration] of [["solo",1,30],["duo",2,45]]){
    const e=experiments.find(g=>g.id===`${mode}-wipe`);assert.ok(e);assert.equal(e.players,players);assert.equal(e.duration,duration);assert.equal(e.orientation,"portrait");assert.deepEqual(e.input,["HAND"]);assert.equal(e.requiresMicrophone,false);assert.equal(e.module,"wipe");assert.equal(trackForGame(e,"camera").url,"https://opentracks.com/bgm/detail/12218");
  }
});
test("a foggy start contains all four dirt kinds; one pass clears fog but resisting dirt needs scrubs",()=>{
  const g=new WipeGame();assert.equal(g.percent(),0);assert.deepEqual(new Set(g.patches.map(p=>p.type)),new Set(["drop","foam","hand"]));
  const hand=g.patches.find(p=>p.type==="hand"),s=hand.shapes[0],id=hand.indices[0];
  g.wipe(palm(s.x/W,s.y/H));assert.equal(g.cells[id],2);
  for(let i=0;i<120;i++)g.wipe(palm(s.x/W,s.y/H));assert.equal(g.cells[id],2,"holding still cannot scrub");
  g.wipe(palm((s.x-120)/W,s.y/H));g.wipe(palm(s.x/W,s.y/H));assert.ok(g.cells[id]<2,"moving back and forth scrubs resisting dirt");
  g.wipe(palm((s.x-120)/W,s.y/H));g.wipe(palm(s.x/W,s.y/H));assert.equal(g.cells[id],0);
});
test("swept sponge movement fills gaps, stays within a DUO lane and reconnect does not wipe a bridge",()=>{
  const g=new WipeGame({mode:"duo"});g.wipe(palm(.1,.2));g.wipe(palm(.48,.2));
  assert.equal(g.cells[Math.floor(.2*ROWS)*COLS+Math.floor(.3*COLS)],0);
  assert.equal(g.percent(1),0);
  const h=new WipeGame();h.wipe(palm(.1,.2,1));h.wipe(palm(.8,.2,2));
  assert.equal(h.cells[Math.floor(.2*ROWS)*COLS+Math.floor(.45*COLS)],1);
});
test("99% never rounds up; sweeping the full surface reaches actual 100%",()=>{
  const g=new WipeGame();g.cells.fill(0);g.cells[0]=1;assert.equal(g.percent(),99);
  const h=new WipeGame();sweep(h);assert.equal(h.cells.reduce((a,b)=>a+b,0),0);assert.equal(h.percent(),100);
});
test("DUO BIG BUBBLE triggers one actual dirt addition; 90% endgame protection caps new area",()=>{
  const g=new WipeGame({mode:"duo"});g.phase="playing";
  for(let i=0;i<g.cells.length;i++)if(g.sideFor(i)===1&&i%4)g.cells[i]=0;
  const before=g.clean(1),bubble=g.patches.find(p=>p.type==="big"&&p.side===0);bubble.indices.forEach(i=>g.cells[i]=0);
  g.step(16,[]);assert.equal(g.attacks[0],1);assert.ok(g.clean(1)<before);g.step(16,[]);assert.equal(g.attacks[0],1);
  const h=new WipeGame({mode:"duo"});for(let i=0;i<h.cells.length;i++)if(h.sideFor(i)===1)h.cells[i]=0;h.cells[COLS-1]=1;
  const endBefore=h.clean(1);h.splash(0);assert.ok(h.events.at(-1).small);assert.ok(endBefore-h.clean(1)<=1);assert.equal(Math.max(...h.cells.filter((_,i)=>h.sideFor(i)===1)),1);
  const untouched=new WipeGame({mode:"duo"});untouched.splash(0);assert.equal(untouched.attacks[0],1);assert.equal(untouched.percent(1),0);assert.ok(untouched.events.some(e=>e.type==="splash"));assert.ok(untouched.patches.at(-1).indices.length>0);
});
test("tracking loss and pause freeze time; recovery drops the old contact history",()=>{
  const g=new WipeGame({source:"camera"});g.phase="playing";g.step(100,[palm(.2,.2)]);const at=g.elapsed;
  for(let i=0;i<4;i++)g.step(100,[]);assert.equal(g.pauseReason,"tracking");const frozen=g.elapsed;
  for(let i=0;i<5;i++)g.step(100,[]);assert.equal(g.elapsed,frozen);assert.ok(frozen>=at);
  g.step(16,[palm(.8,.8,2)]);assert.equal(g.paused,false);assert.equal(g.cells[Math.floor(.5*ROWS)*COLS+Math.floor(.5*COLS)],1);
  g.pause();const paused=g.elapsed;g.step(100,[palm(.5,.5)]);assert.equal(g.elapsed,paused);
});
test("perfect occurs once, simultaneous DUO completion is a draw, timeout reports measured dirt",()=>{
  const g=new WipeGame();g.phase="playing";sweep(g);g.step(16,[]);assert.equal(g.phase,"finish");assert.equal(g.result.reason,"perfect");assert.equal(g.result.clean[0],100);g.step(16,[]);assert.equal(g.events.length,0);
  const d=new WipeGame({mode:"duo"});d.phase="playing";sweep(d,0);sweep(d,1);d.step(16,[]);assert.equal(d.result.winner,0);
  const t=new WipeGame();t.phase="playing";t.elapsed=t.duration-50;t.step(50,[]);assert.equal(t.result.reason,"time");assert.deepEqual(t.result.clean,[0]);
  t.reset({mode:"duo"});assert.equal(t.duration,45000);assert.equal(t.percent(0),0);assert.equal(t.percent(1),0);assert.equal(t.result,null);
});
test("readiness depends on screen position rather than handedness; SOLO accepts either palm",()=>{
  const g=new WipeGame({mode:"duo",source:"camera"});assert.equal(g.ready([palm(.1,.5),palm(.2,.5)]),false);assert.equal(g.ready([palm(.1,.5),palm(.7,.5)]),true);
  g.step(16,[palm(.1,.5)]);assert.equal(g.phase,"waiting");g.step(16,[palm(.1,.5),palm(.8,.5)]);assert.equal(g.phase,"ready");
});
const landmarks=(x=.5,y=.5)=>Array.from({length:21},(_,i)=>({x:x+(i===5?-.03:i===17?.03:0),y,z:0}));
test("palm average, mirror and camera cover agree; fingertips do not influence input",()=>{
  const l=landmarks(.45);const before=palmFromLandmarks(l,720,1280);for(const i of [4,8,12,16,20])l[i]={x:10,y:10};assert.deepEqual(palmFromLandmarks(l,720,1280),before);assert.ok(Math.abs(before.x-.55)<1e-10);
  assert.equal(palmFromLandmarks([],720,1280),null);assert.equal(palmFromLandmarks(landmarks(.01),1280,720),null);
});
test("tracker preserves identity on order reversal, rejects stale hands and marks reacquisition",()=>{
  const t=new WipeTracker();t.update({landmarks:[landmarks(.3),landmarks(.7)]},0,720,1280);const ids=t.sample(0).map(p=>p.id);
  t.update({landmarks:[landmarks(.7),landmarks(.3)]},50,720,1280);assert.deepEqual(t.sample(50).map(p=>p.id),ids.reverse());assert.deepEqual(t.sample(231),[]);
  t.update({landmarks:[landmarks(.5)]},500,720,1280);assert.equal(t.sample(500)[0].continuous,false);assert.ok(!ids.includes(t.sample(500)[0].id));
});
test("7-second CREATOR replay retains the opaque beginning, the whole reveal, and the finish",()=>{
  const frames=Array.from({length:252},(_,i)=>({at:i*125,blob:{id:i}}));const r=selectWipeReplay({frames,events:[],faceMode:"HIDE"},{elapsed:30,source:"camera"});
  assert.equal(r.duration,7000);assert.equal(r.frames[0].blob.id,0);assert.ok(r.frames[39].blob.id>=239);assert.equal(r.frames.at(-1).blob.id,251);assert.ok(r.frames.at(-1).at<6000);assert.equal(r.faceMode,"HIDE");
});
test("result sharing includes measured clean area, duration and practice provenance",()=>{
  const game=experiments.find(e=>e.id==="solo-wipe"),g=new WipeGame();g.phase="playing";g.elapsed=24000;sweep(g);g.step(16,[]);
  const payload=resultPayload(game,g.result,"ja","https://example.test/");assert.match(payload.text,/100% CLEAN/);assert.match(payload.text,/24\.0秒/);assert.match(payload.text,/練習/);assert.match(payload.url,/#\/game\/solo-wipe$/);
});
