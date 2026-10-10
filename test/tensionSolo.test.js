import test from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG, geometry, reflection, netResponse, project } from '../src/tension/rules.js';
import { SOLO, LAYOUTS, logicalX, screenX, mirrorNet, createBrickLayout, brickRect, createSoloMatch, stepSoloMatch, resizeSoloMatch, changeSoloHand, updateSoloNet } from '../src/tension/soloRules.js';

const net = (y=.28,d=.12,tilt=0,x=.18) => ({ ...geometry({x:x-Math.sin(tilt)*d/2,y:y-Math.cos(tilt)*d/2},{x:x+Math.sin(tilt)*d/2,y:y+Math.cos(tilt)*d/2}),active:true,opacity:1,seenAt:0 });
const match = options => { const m=createSoloMatch(options);m.serve=0;return m; };
const near = (a,b) => assert.ok(Math.abs(a-b)<1e-8,`${a} ~= ${b}`);

test('right/left boundary mappings are inverses and mirrored inputs yield identical simulation',()=>{
  for(const side of ['right','left'])for(const x of [0,.18,.5,.86,1])near(logicalX(screenX(x,side),side),x);
  const left=net(.28,.12,.35),screenRight=mirrorNet(left,'right'),right=mirrorNet(screenRight,'right');
  const a=match(),b=match();Object.assign(a.ball,{x:.22,y:.28,vx:-.45,vy:0});Object.assign(b.ball,a.ball);
  stepSoloMatch(a,left,.5);stepSoloMatch(b,right,.5);
  for(const key of ['x','y','vx','vy'])near(a.ball[key],b.ball[key]);near(a.elapsed,b.elapsed);assert.equal(a.hits,b.hits);
  const lv=reflection(left,0,left.center),rv=reflection(screenRight,1,screenRight.center);near(lv.vx,-rv.vx);near(lv.vy,rv.vy);
});
test('mirrored fingertip endpoints stay aligned with the existing camera object-cover projection',()=>{
  for(const [w,h] of [[844,390],[390,844],[1440,900]]){
    const a=project({x:.23,y:.4},1280,720,w,h),b=project({x:.24,y:.55},1280,720,w,h);
    const input={...geometry(a,b),active:true};
    for(const side of ['right','left']){const logical=mirrorNet(input,side);near(screenX(logical.thumb.x,side),a.x);near(screenX(logical.index.x,side),b.x);near(logical.thumb.y,a.y);near(logical.index.y,b.y);}
  }
});
test('wide and narrow SOLO catches use DUEL response and closing a catch speeds the release',()=>{
  const wide=net(.28,.2),narrow=net(.28,.04),w=netResponse(wide),n=netResponse(narrow);
  assert.ok(w.hold>n.hold&&w.stretch>n.stretch&&w.speed<n.speed);
  const m=match();Object.assign(m.ball,{x:.2,y:.28,vx:-.34,vy:0});
  assert.equal(stepSoloMatch(m,wide,.0042).filter(e=>e.type==='hit').length,1);
  const captured=structuredClone(m);stepSoloMatch(m,narrow,.08);stepSoloMatch(captured,wide,.08);
  assert.equal(m.capture,null);assert.ok(captured.capture);near(Math.hypot(m.ball.vx,m.ball.vy),n.speed);
});
test('brick impact destroys once and awards 100 points once',()=>{
  const m=match(),b=m.bricks[0],r=brickRect(b,m.height);Object.assign(m.ball,{x:r.x-.03,y:r.y+r.height/2,vx:.64,vy:0});
  const e=stepSoloMatch(m,net(),.1);assert.equal(e.filter(e=>e.type==='brick'&&e.id===b.id).length,1);assert.equal(b.alive,false);assert.equal(m.score,100);
  stepSoloMatch(m,net(),.02);assert.equal(m.score,100);assert.ok(m.ball.vx<0);
});
test('swept collisions prevent tunneling through a thin brick even at diagnostic high speed',()=>{
  const m=match();m.bricks=[{id:0,x:.7,y:.4,width:.001,height:.15,alive:true},{id:1,x:.9,y:.1,width:.03,height:.1,alive:true}];
  Object.assign(m.ball,{x:.6,y:.26,vx:90,vy:0});stepSoloMatch(m,net(),1/240);
  assert.equal(m.bricks[0].alive,false);assert.equal(m.score,100);assert.ok(m.ball.vx<0);
});
test('brick horizontal and vertical faces reflect on the contacted axis',()=>{
  const m=match(),r=brickRect(m.bricks[0],m.height);Object.assign(m.ball,{x:r.x+r.width/2,y:r.y-.025,vx:.01,vy:.64});stepSoloMatch(m,net(),.04);assert.ok(m.ball.vy<0&&m.ball.vx>0);assert.equal(m.score,100);
});
test('top, bottom and solid rear wall reflect; player edge stays open',()=>{
  for(const [ball,key,sign]of [[{x:.4,y:.015,vx:0,vy:-.4},'vy',1],[{x:.4,y:.547,vx:0,vy:.4},'vy',-1],[{x:.985,y:.28,vx:.4,vy:0},'vx',-1]]){
    const m=match();Object.assign(m.ball,ball);assert.ok(stepSoloMatch(m,net(),.02).some(e=>e.type==='wall'));assert.ok(m.ball[key]*sign>0);
  }
});
test('only a fully escaped ball misses, subtracts one life, then telegraphs a new serve',()=>{
  const m=match();Object.assign(m.ball,{x:0,y:.12,vx:-.3,vy:0});assert.equal(stepSoloMatch(m,net(),.01).filter(e=>e.type==='miss').length,0);
  assert.equal(stepSoloMatch(m,net(),.1).filter(e=>e.type==='miss').length,1);assert.equal(m.lives,2);assert.ok(m.serve>0);assert.equal(m.ball.vx,0);
});
test('third miss ends GAME OVER without another serve',()=>{
  const m=match();for(let i=0;i<3;i++){m.serve=0;Object.assign(m.ball,{x:-.02,y:.12,vx:-.3,vy:0});const events=stepSoloMatch(m,net(),.01);assert.equal(events.filter(e=>e.type==='miss').length,1);}
  assert.equal(m.phase,'result');assert.equal(m.reason,'game-over');assert.equal(m.lives,0);assert.equal(m.serve,0);
  const saved=structuredClone(m);assert.deepEqual(stepSoloMatch(m,net(),1),[]);assert.deepEqual(m,saved);
});
test('exactly 30 active seconds ends TIME UP, never serves afterward',()=>{
  const m=match();m.elapsed=29.99;const events=stepSoloMatch(m,net(),1);assert.equal(m.elapsed,SOLO.duration);assert.equal(m.reason,'time-up');assert.equal(events.filter(e=>e.type==='end').length,1);assert.equal(m.serve,0);assert.equal(m.ball.vx,0);
});
test('destroying the final brick ends CLEAR immediately',()=>{
  const m=match();m.bricks.forEach((b,i)=>b.alive=i===0);m.score=500;const r=brickRect(m.bricks[0],m.height);Object.assign(m.ball,{x:r.x-.02,y:r.y+.02,vx:.64,vy:0});stepSoloMatch(m,net(),.1);
  assert.equal(m.reason,'clear');assert.equal(m.score,600);assert.equal(m.serve,0);assert.equal(m.ball.vx,0);
});
test('manual pause, expired tracking and net outside play area freeze all physics, time and lives',()=>{
  for(const missing of [null,{...net(),active:false},net(.28,.12,0,.7)]){const m=match();Object.assign(m.ball,{x:-.02,vx:-.3});const saved=structuredClone(m);stepSoloMatch(m,missing,4);assert.deepEqual(m,saved);}
  const m=match();m.paused=true;const saved=structuredClone(m);stepSoloMatch(m,net(),4);assert.deepEqual(m,saved);
});
test('one-hand ownership survives reordered two-hand candidates and grace gaps',()=>{
  const first=updateSoloNet(null,[net(.28,.12,0,.2),net(.28,.12,0,.8)],0);
  const retained=updateSoloNet(first,[net(.29,.12,0,.8),net(.29,.12,0,.21)],100);assert.ok(retained.center.x<.3);
  assert.equal(updateSoloNet(retained,[],340).active,true);const expired=updateSoloNet(retained,[],351);assert.equal(expired.active,false);
  const recovered=updateSoloNet(expired,[net(.28,.12,0,.22)],500);assert.equal(recovered.active,true);near(recovered.center.x,.22);
});
test('hand change resets score, timer, lives and capture while retaining layout',()=>{
  const m=match({layoutId:'the-gap'});m.score=400;m.lives=1;m.elapsed=17;m.capture={};changeSoloHand(m,'left');assert.equal(m.handSide,'left');assert.equal(m.layoutId,'the-gap');assert.equal(m.lives,3);assert.equal(m.score,0);assert.equal(m.elapsed,0);assert.equal(m.capture,null);assert.ok(m.bricks.every(b=>b.alive));
});
test('rotation rescales ball and normalized bricks, releases old catch, retains run state',()=>{
  const m=match();m.score=200;m.lives=2;m.elapsed=8;m.capture={velocity:{vx:.4,vy:.03}};const by=m.ball.y/m.height;
  assert.equal(resizeSoloMatch(m,.75),true);near(m.ball.y/.75,by);assert.equal(m.capture,null);assert.equal(m.score,200);assert.equal(m.elapsed,8);assert.equal(m.lives,2);assert.equal(m.ball.vx,.4);
  for(const b of m.bricks){const r=brickRect(b,m.height);assert.ok(r.y>=0&&r.y+r.height<=m.height);}assert.equal(resizeSoloMatch(m,NaN),false);assert.equal(resizeSoloMatch(m,0),false);
});
test('all six bricks in every layout are reachable using ordinary net returns',()=>{
  for(const layoutId of LAYOUTS){const m=match({layoutId});for(const brick of m.bricks){if(!brick.alive)continue;const r=brickRect(brick,m.height),y=r.y+r.height/2,n=net(y,.06);
      m.serve=0;m.capture=null;m.locked=false;Object.assign(m.ball,{x:.21,y,vx:-.34,vy:0});
      for(let i=0;i<600&&brick.alive&&m.phase==='playing';i++)stepSoloMatch(m,n,1/240);
      assert.equal(brick.alive,false,`${layoutId}/${brick.id}`);
    }assert.equal(m.reason,'clear');assert.equal(m.score,600);assert.ok(m.elapsed<30);}
});
test('layout factory returns independent normalized collision data',()=>{
  for(const id of LAYOUTS){const a=createBrickLayout(id),b=createBrickLayout(id);assert.equal(a.length,6);a[0].alive=false;assert.equal(b[0].alive,true);}
});
