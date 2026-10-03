async (page) => {
  const base=new URL(page.url()).origin;
  await page.goto(base+'/?qa=creator-perf#/game/solo-soft-serve');
  await page.waitForFunction(()=>document.querySelector('.launch-demo')?.disabled===false);
  await page.evaluate(async()=>{
    const source=await(await fetch('/src/softServe/view.js')).text();
    const {CreatorMode}=await import(source.match(/from "([^"]*\/creator\/CreatorMode\.js[^"]*)"/)[1]),compose=CreatorMode.prototype.compose;
    window.__costs=[];
    CreatorMode.prototype.compose=function(...args){window.__creator=this;const start=performance.now();compose.apply(this,args);__costs.push(performance.now()-start);};
  });
  await page.locator('[data-creator-mode="creator"]').click();
  await page.locator('.launch-demo').click();
  await page.waitForTimeout(2400);
  const metrics=await page.evaluate(()=>{
    const c=__creator, sorted=[...__costs].sort((a,b)=>a-b);
    return {frames:__costs.length,meanMs:__costs.reduce((a,b)=>a+b,0)/__costs.length,p95Ms:sorted[Math.floor(sorted.length*.95)],maxMs:sorted.at(-1),storedFrames:c.frames.length,bytes:c.bytes,liveBuffers:c.live.length,
      minCaptureGap:c.frames.slice(1).reduce((m,f,i)=>Math.min(m,f.at-c.frames[i].at),Infinity),dpr:document.querySelector('.ss-stage canvas').width/document.querySelector('.ss-stage canvas').clientWidth};
  });
  if(metrics.minCaptureGap<125||metrics.liveBuffers>10||metrics.bytes>8*1024*1024||metrics.dpr>2.01)throw Error('Creator budget limit');
  await page.locator('.game-back').click();
  return {metrics,device:'desktop Chrome',source:'demo',physicalDevice:false};
}
