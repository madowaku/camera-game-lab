async page => {
  const checks=[], errors=[];page.on('pageerror',e=>errors.push(e.message));
  const check=(ok,label)=>{if(!ok)throw Error(label);checks.push(label);};
  await page.goto('http://localhost:5173/#/game/solo-sonic-ink');
  await page.evaluate(()=>localStorage.setItem('camera-game-lab-locale','ja'));await page.reload();
  await page.locator('.si-title-art').waitFor();await page.waitForFunction(()=>document.querySelector('.si-title-art')?.naturalWidth>0);
  check(await page.locator('.si-title-art').evaluate(el=>el.currentSrc.endsWith('/artwork/sonic-ink-title-v1.webp')),'generated title asset loads');
  for(const size of [{width:1440,height:1000},{width:390,height:844},{width:360,height:800}]){
    await page.setViewportSize(size);
    check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'no overflow '+size.width);
    const card=await page.locator('.si-title-card').boundingBox();check(Math.abs(card.width/card.height-9/16)<.01,'portrait title '+size.width);
    const heading=await page.locator('.si-title-heading').boundingBox(),buttons=await page.locator('.si-title-bottom').boundingBox();
    check(heading.y+heading.height<buttons.y&&heading.x>=card.x&&buttons.x>=card.x&&buttons.y+buttons.height<=card.y+card.height,'title and buttons fit '+size.width);
    check(await page.locator('.si-title-heading h1').evaluate(el=>el.scrollWidth<=el.clientWidth),'title lettering fits '+size.width);
    await page.screenshot({path:`output/playwright/sonic-ink-title-${size.width}.png`,fullPage:true});
  }
  await page.locator('.launch-howto').click();check((await page.locator('#sheet-title').textContent()).includes('遊び方'),'how-to remains interactive');
  await page.keyboard.press('Escape');
  await page.locator('.platform-locale').click();check((await page.locator('.si-title-tagline').textContent()).includes('Your doodle'),'English title copy');
  check((await page.locator('.launch-demo').textContent()).includes('TRY WITHOUT CAMERA'),'English practice control');
  await page.screenshot({path:'output/playwright/sonic-ink-title-english.png',fullPage:true});
  await page.locator('.launch-demo').click();await page.locator('.si-stage[data-phase=ready]').waitFor();check(await page.locator('.si-stage').isVisible(),'title launches the drawing game');
  const stage=await page.locator('.si-stage').boundingBox();await page.mouse.move(stage.x+stage.width*.25,stage.y+stage.height*.4);await page.mouse.down();await page.mouse.move(stage.x+stage.width*.7,stage.y+stage.height*.5,{steps:20});await page.mouse.up();
  check(await page.locator('[data-slot][data-filled=true]').count()===1,'drawing still works after title launch');
  await page.goto('http://localhost:5173/#/feed/solo-sonic-ink');
  const cover=page.locator('[data-id=solo-sonic-ink] .preview-asset');await cover.waitFor();await page.waitForFunction(()=>document.querySelector('[data-id=solo-sonic-ink] .preview-asset')?.naturalWidth>0);
  check(await cover.evaluate(el=>el.currentSrc.endsWith('/artwork/sonic-ink-title-v1.webp')),'feed uses generated cover');await page.screenshot({path:'output/playwright/sonic-ink-title-feed.png',fullPage:true});
  await page.goto('http://localhost:5173/#/explore');const explore=page.locator('[data-game=solo-sonic-ink] img');await explore.waitFor();
  check(await explore.evaluate(el=>el.complete&&el.naturalWidth>0),'explore cover loads');
  await page.goto('http://localhost:5173/#/game/solo-air-atelier');await page.locator('.si-title-art').waitFor();check(await page.locator('.si-title-art').isVisible(),'legacy link uses generated title');
  check(errors.length===0,'no uncaught page errors');return {checks,errors};
}
