// Browser's real MediaRecorder clock exports a silent 7-second replay.
async (page) => {
  await page.clock.resume(); const base = new URL(page.url()).origin;
  await page.goto(base + '/?qa=counter-cam-export-' + Date.now() + '#/game/solo-counter-cam');
  await page.waitForFunction(()=>document.querySelector('.launch-demo')?.disabled===false);
  await page.locator('[data-creator-mode="creator"]').click();
  await page.clock.install(); await page.locator('.launch-demo').click(); await page.clock.runFor(700);
  await page.keyboard.press('Space'); await page.clock.runFor(50); await page.keyboard.down('ArrowLeft'); await page.clock.runFor(50); await page.keyboard.up('ArrowLeft');
  await page.keyboard.down('ArrowRight'); await page.clock.runFor(50); await page.keyboard.up('ArrowRight'); await page.clock.runFor(600);
  await page.keyboard.down('KeyG'); await page.clock.runFor(31000); await page.keyboard.up('KeyG'); await page.locator('.cc-result').waitFor();
  if (!(await page.locator('.cc-result h2').textContent()).includes('TIME UP')) throw Error('Missing full round result');
  await page.clock.resume(); const downloadPromise=page.waitForEvent('download',{timeout:20000}); await page.locator('.cc-clip-save').click();
  const download=await downloadPromise; const path='output/playwright/counter-cam-highlight.webm'; await download.saveAs(path);
  const status=await page.locator('.cc-export-status').textContent(); if(!status.includes('保存')) throw Error(status);
  await page.locator('.game-back').click(); await page.locator('.lab-feed').waitFor();
  return {path,suggestedFilename:download.suggestedFilename(),silent:true,clock:'real MediaRecorder',status};
}
