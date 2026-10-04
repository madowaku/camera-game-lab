// Run in a fresh browser without virtual clocks: MediaRecorder needs real time.
async (page) => {
  const base=new URL(page.url()).origin;await page.goto(base+'/?qa=dont-laugh-export-'+Date.now()+'#/game/solo-dont-laugh');await page.waitForFunction(()=>document.querySelector('.launch-demo')?.disabled===false);
  await page.evaluate(async()=>{const registry=await(await fetch('/src/platform/experiments.js')).text(),path=registry.match(/import\("([^"]*dontLaugh\/view\.js[^"]*)"\)/)[1],{DontLaughView}=await import(path),render=DontLaughView.prototype.render;DontLaughView.prototype.render=function(...a){window.__dl=this;return render.apply(this,a);};});
  await page.locator('[data-dl-mode="creator"]').click();await page.locator('.launch-demo').click();await page.waitForFunction(()=>window.__dl?.phase==='playing');
  await page.waitForTimeout(1600);await page.keyboard.down('l');await page.waitForTimeout(550);await page.keyboard.up('l');await page.locator('.dl-save').waitFor();
  const downloaded=page.waitForEvent('download',{timeout:12000});await page.locator('.dl-save').click();const clip=await downloaded;await clip.saveAs('output/dont-laugh/replay.webm');if(await clip.failure())throw Error('Clip failed');
  const status=await page.locator('.dl-export-status').textContent();await page.locator('.game-back').click();return{download:clip.suggestedFilename(),status,silent:true,clock:'real time'};
}
