// Dev-server verification: menu layout, retained options and touch navigation.
// Run via playwright-cli run-code --filename scripts/qa/accessible-ui.js.
async (page) => {
  const base = new URL(page.url()).origin, checks = [], errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const check = (ok, label) => { if (!ok) throw Error(label); checks.push(label); };
  await page.goto(base + '/');
  const ids = await page.locator('.feed-card').evaluateAll(cards => cards.map(c => c.dataset.id));
  for (const size of [{ width: 360, height: 640 }, { width: 390, height: 844 }, { width: 1440, height: 900 }]) {
    await page.setViewportSize(size);
    await page.goto(base + '/#/');
    await page.locator('.feed-play').first().waitFor();
    const overflow = await page.locator('.feed-card').evaluateAll(cards => cards.filter(card => {
      const primary = card.querySelector('.feed-play'), footer = card.querySelector('.feed-foot');
      return primary.offsetTop + primary.offsetHeight > card.clientHeight || footer.offsetTop + footer.offsetHeight > card.clientHeight;
    }).map(c => c.dataset.id));
    check(!overflow.length, `FEED fits all ${ids.length} cards at ${size.width}x${size.height}: ${overflow.join(',')}`);
    check(await page.evaluate(() => document.querySelector('.camera-ui').getBoundingClientRect().top >= document.querySelector('.platform-header').getBoundingClientRect().bottom), 'Header and hand controls do not overlap');
    await page.screenshot({ path: `output/playwright/ui-feed-${size.width}.png` });
    for (const id of ids) {
      await page.goto(base + '/#/game/' + id);
      await page.waitForFunction(() => document.querySelector('.launch-camera')?.disabled === false);
      const layout = await page.locator('.launch-camera').evaluate(button => {
        const rect = button.getBoundingClientRect();
        return { top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right, height: rect.height, width: innerWidth, viewport: innerHeight, scroll: scrollY };
      });
      check(layout.scroll === 0 && layout.top >= 0 && layout.bottom <= layout.viewport && layout.left >= 0 && layout.right <= layout.width && layout.height >= 60,
        `Start fits ${id} at ${size.width}x${size.height}: ${JSON.stringify(layout)}`);
      check(await page.evaluate(() => {
        const game = document.querySelector('.platform-game'), title = document.querySelector('.launch-heading h1');
        return getComputedStyle(game).backgroundColor === 'rgb(16, 18, 15)' && getComputedStyle(title).color === 'rgb(244, 245, 233)';
      }), `Shared menu contrast survives cached games: ${id}`);
      if (['solo-maru-magic', 'solo-sonic-ink', 'solo-soft-serve'].includes(id)) {
        await page.locator('.launch-art img').waitFor();
        await page.waitForFunction(() => [...document.querySelectorAll('.launch-art img')].every(img => img.complete && img.naturalWidth > 0));
        await page.screenshot({ path: `output/playwright/ui-${id}-${size.width}.png` });
      }
    }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(base + '/#/game/solo-soft-serve');
  await page.waitForFunction(() => document.querySelector('.launch-camera')?.disabled === false);
  await page.locator('.launch-settings > summary').click();
  await page.locator('[data-creator-mode="creator"]').click();
  check(await page.locator('.creator-face-picker').isVisible(), 'SOFT SERVE creator face options survive the shared entrance');
  check(await page.locator('.launch-camera').isHidden(), 'SOFT SERVE creator keeps its face-selection launch contract');
  await page.locator('[data-creator-mode="play"]').click();
  check(await page.locator('.launch-camera').isVisible(), 'Ordinary SOFT SERVE play can be restored');
  await page.goto(base + '/#/game/solo-human-clock');
  await page.waitForFunction(() => document.querySelector('.launch-camera')?.disabled === false);
  await page.locator('.launch-settings > summary').click();
  await page.locator('input[name="hc-difficulty"][value="normal"]').check();
  check(await page.locator('input[name="hc-difficulty"][value="normal"]').isChecked(), 'Difficulty options survive');
  await page.goto(base + '/#/game/solo-maru-magic');
  await page.waitForFunction(() => document.querySelector('.launch-demo')?.disabled === false);
  await page.locator('.launch-demo').click();
  check(await page.locator('.camera-ui').isHidden(), 'Menu camera controls are hidden while playing');
  await page.locator('.game-back').click();
  await page.locator('.lab-feed').waitFor();
  await page.locator('.feed-card:not([inert]) [data-action="advance"]').click();
  await page.waitForFunction(() => document.querySelector('.feed-card:not([inert])')?.dataset.id !== 'solo-maru-magic');
  check(await page.locator('.feed-card:not([inert]) .feed-play').isVisible(), 'Touch next and back navigation remain available');
  await page.locator('.platform-locale').click();
  check(await page.locator('.camera-ui-toggle').textContent().then(t => t.includes('Hand control')), 'English hand-control labels');
  check(await page.locator('.feed-card:not([inert]) .feed-play').textContent().then(t => t.includes('PLAY')), 'English main action');
  await page.locator('.platform-locale').click();
  check(!errors.length, `No page errors: ${errors.join('; ')}`);
  return { count: checks.length, sizes: ['360x640', '390x844', '1440x900'], routes: ids.length, errors };
}
