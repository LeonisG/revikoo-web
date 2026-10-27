/* Optional browser QA. No production dependency. Set PLAYWRIGHT_MODULE to a local
 * Playwright module if it is not installed in your Node environment. */
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const root = path.resolve(__dirname, '../..');
const mime = { '.html': 'text/html', '.css': 'text/css', '.mjs': 'text/javascript', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp' };
const server = http.createServer((request, response) => {
  let pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname).replace(/^\/revikoo-web(?=\/)/, '');
  let filename = path.resolve(root, `.${pathname}`);
  if (!filename.startsWith(root + path.sep) && filename !== root) { response.writeHead(403).end(); return; }
  if (fs.existsSync(filename) && fs.statSync(filename).isDirectory()) filename = path.join(filename, 'index.html');
  if (!fs.existsSync(filename)) { response.writeHead(404).end(); return; }
  response.writeHead(200, { 'Content-Type': mime[path.extname(filename)] || 'text/plain' }); fs.createReadStream(filename).pipe(response);
});

(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_CHANNEL ? { channel: process.env.PLAYWRIGHT_CHANNEL } : {}) });
  const errors = [], badResponses = [], external = [];
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  const page = await context.newPage();
  await page.addInitScript(() => {
    window.__cozyAudioContexts = [];
    const Original = window.AudioContext;
    if (Original) window.AudioContext = class extends Original { constructor(...args) { super(...args); window.__cozyAudioContexts.push(this); } };
  });
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => { if (response.status() >= 400) badResponses.push(`${response.status()} ${response.url()}`); });
  page.on('request', request => { if (!request.url().startsWith(base) && !request.url().startsWith('data:')) external.push(request.url()); });
  const screenshotDir = path.join(os.tmpdir(), 'cozy-qa'); fs.mkdirSync(screenshotDir, { recursive: true });
  const stored = () => page.evaluate(() => JSON.parse(localStorage.getItem('cozy-room:debug:v1')));
  const close = async () => { await page.getByRole('button', { name: 'Cerrar y volver a la habitación' }).click(); await page.locator('#world-panel').waitFor({ state: 'hidden' }); };
  const open = async name => { await page.locator(`.room-nav [data-open="${name}"]`).click(); await page.locator('#world-panel').waitFor({ state: 'visible' }); };
  try {
    await page.goto(`${base}/revikoo-web/cozy/?debug=true`);
    await page.locator('#room-furniture').evaluate(img => img.decode());
    assert.equal(await page.locator('#coins').textContent(), '20');
    assert.equal(await page.evaluate(() => window.__cozyAudioContexts.length), 0, 'No audio context before user opt-in');
    await page.screenshot({ path: path.join(screenshotDir, 'room-desktop.png'), fullPage: true });
    await page.locator('#welcome-dismiss').click();
    assert.equal(await page.locator('#room-stage').getAttribute('data-view'), 'desk');
    await page.screenshot({ path: path.join(screenshotDir, 'desk.png'), fullPage: true });
    await page.locator('.journal-object').click();
    await page.locator('#world-panel').waitFor({ state: 'visible' });
    await page.locator('#task-form [name=title]').fill('Finish presentation');
    await page.locator('#task-form [name=difficulty]').selectOption('medium');
    await page.locator('#task-form button').click();
    await page.locator('[data-action=edit-task]').click();
    await page.locator('.edit-task-form input').fill('Finish the presentation');
    await page.locator('.edit-task-form .primary').click();
    await page.locator('[data-action=complete-task]').click();
    assert.equal((await stored()).coins, 25);
    assert.equal(await page.locator('[data-action=complete-task]').isDisabled(), true);
    await page.screenshot({ path: path.join(screenshotDir, 'journal.png'), fullPage: true });
    await close();
    await open('focus');
    await page.clock.install();
    await page.locator('[data-action=start-focus]').click();
    await page.clock.runFor(1000);
    assert.equal(await page.locator('#focus-active').isVisible(), true);
    await page.screenshot({ path: path.join(screenshotDir, 'focus.png'), fullPage: true });
    await page.reload();
    await page.clock.fastForward(26000);
    assert.equal((await stored()).coins, 30);
    assert.equal((await stored()).focusHistory.length, 1);
    await page.reload(); assert.equal((await stored()).coins, 30);
    await open('shop');
    await page.locator('[data-action=buy][data-id=monstera]').click();
    await page.locator('#slot-monstera').selectOption('floor-right');
    await page.locator('[data-action=equip][data-id=monstera]').click();
    assert.equal((await stored()).room.slots['floor-right'], 'monstera');
    assert.equal((await stored()).coins, 15);
    await page.screenshot({ path: path.join(screenshotDir, 'catalog.png'), fullPage: true });
    await page.locator('[data-filter=Pared]').click();
    await page.locator('[data-action=buy][data-id=print-moon]').click();
    assert.equal((await stored()).coins, 15);
    assert.match(await page.locator('#panel-feedback').textContent(), /faltan/);
    assert.equal(await page.locator('#panel-feedback').isVisible(), true);
    await close();
    await page.screenshot({ path: path.join(screenshotDir, 'decorated.png'), fullPage: true });
    await page.reload(); assert.equal(await page.locator('.decoration[data-item=monstera]').count(), 1);
    await open('books');
    await page.locator('#book-form [name=title]').fill('The Hobbit');
    await page.locator('#book-form [name=author]').fill('J. R. R. Tolkien');
    await page.locator('#book-form [name=total]').fill('300');
    await page.locator('#book-form [name=page]').fill('50');
    await page.locator('#book-form button').click();
    await page.locator('#book-progress-form input').fill('100');
    await page.locator('#book-progress-form button[type=submit], #book-progress-form button.secondary').first().click();
    assert.equal((await stored()).books[0].currentPage, 100);
    await page.locator('[data-action=finish-book]').click();
    assert.equal((await stored()).coins, 40);
    await page.locator('#book-progress-form input').fill('299');
    await page.locator('#book-progress-form .secondary').click();
    await page.locator('[data-action=finish-book]').click(); assert.equal((await stored()).coins, 40);
    await page.screenshot({ path: path.join(screenshotDir, 'library.png'), fullPage: true });
    await close();
    await open('focus'); await page.locator('[data-action=start-focus]').click(); await page.clock.runFor(1000);
    await page.locator('#focus-cancel').click(); await page.locator('#confirm-yes').click();
    assert.equal((await stored()).activeFocus, null); assert.equal((await stored()).coins, 40);
    await page.locator('.header-actions [data-open=settings]').click(); await page.locator('#world-panel').waitFor({ state: 'visible' });
    await page.locator('#lighting-setting').selectOption('night'); await page.locator('#weather-setting').selectOption('rain');
    await page.locator('#sound-setting').check();
    await page.waitForFunction(() => window.__cozyAudioContexts[0]?.state === 'running');
    assert.equal((await stored()).preferences.sound, true);
    await close();
    assert.equal(await page.locator('#app').getAttribute('data-light'), 'night');
    assert.equal(await page.locator('#app').getAttribute('data-weather'), 'rain');
    await page.screenshot({ path: path.join(screenshotDir, 'night-rain.png'), fullPage: true });
    await page.reload(); assert.equal(await page.locator('#app').getAttribute('data-light'), 'night');
    assert.equal(await page.evaluate(() => window.__cozyAudioContexts.length), 0, 'Saved sound preference does not bypass autoplay policy');
    await page.locator('#sound-button').click(); assert.equal((await stored()).preferences.sound, false);
    // Debug controls and the separate floor layer: a rug must render below desk legs.
    await page.locator('#debug-badge button').click(); await page.locator('#world-panel').waitFor({ state: 'visible' });
    await page.locator('[data-debug=unlock]').click(); await close();
    await open('shop'); await page.locator('[data-filter=Alfombras]').click();
    await page.locator('[data-action=equip][data-id=rug-cream]').click(); await close();
    assert.equal(await page.locator('#floor-rug .decoration[data-item=rug-cream]').count(), 1);
    assert.equal(await page.locator('#floor-rug > img').count(), 0);
    await page.screenshot({ path: path.join(screenshotDir, 'custom-rug.png'), fullPage: true });
    await page.reload(); assert.equal((await stored()).room.slots['floor-center'], 'rug-cream');
    await open('focus'); await page.locator('[data-action=start-focus]').click();
    await page.locator('#debug-badge button').click(); await page.locator('#world-panel').waitFor({ state: 'visible' });
    await page.locator('[data-debug=finish]').click(); assert.equal((await stored()).focusHistory.length, 2); await close();
    // Normal and debug saves are isolated, and no debug affordance leaks.
    await page.goto(`${base}/cozy/`); assert.equal(await page.locator('#coins').textContent(), '20');
    assert.equal(await page.locator('#debug-badge').isVisible(), false);
    // Text remains text, including after HTML rerenders.
    await open('tasks'); await page.locator('#task-form input').fill('<img src=x onerror=alert(1)>'); await page.locator('#task-form button').click();
    assert.equal(await page.locator('.task-title').textContent(), '<img src=x onerror=alert(1)>'); assert.equal(await page.locator('.task-title img').count(), 0);
    await close();
    // Escape and keyboard modal confinement.
    await open('tasks'); await page.keyboard.press('Tab'); assert.ok(await page.evaluate(() => document.querySelector('#world-panel').contains(document.activeElement)));
    await page.keyboard.press('Escape'); assert.equal(await page.locator('#world-panel').isVisible(), false);
    // All target viewports, including 360px, retain usable forms without horizontal overflow.
    for (const [width, height] of [[1920, 1080], [1366, 768], [768, 1024], [390, 844], [360, 740]]) {
      await page.setViewportSize({ width, height });
      assert.ok(await page.locator('#room-stage').evaluate(el => Math.abs(el.clientWidth / el.clientHeight - 14 / 9) < .01), `Scene coordinate proportions at ${width}`);
      await page.screenshot({ path: path.join(screenshotDir, `room-${width}.png`), fullPage: true });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `Room overflow at ${width}`);
      for (const panel of width === 360 ? ['tasks', 'books', 'focus', 'shop'] : ['tasks']) {
        await open(panel);
        assert.equal(await page.locator('#world-panel').evaluate(el => el.scrollWidth <= el.clientWidth + 1), true, `${panel} overflow at ${width}`);
        if (width === 360) await page.screenshot({ path: path.join(screenshotDir, `${panel}-mobile.png`), fullPage: true });
        await close();
      }
    }
    await page.setViewportSize({ width: 1440, height: 900 });
    // Reset is gated by explicit confirmation and cancellation does nothing.
    await page.locator('.header-actions [data-open=settings]').click(); await page.locator('#world-panel').waitFor({ state: 'visible' });
    await page.locator('[data-action=reset]').click(); await page.locator('#confirm-no').click();
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('cozy-room:v1')).tasks.length), 1);
    await page.locator('[data-action=reset]').click(); await page.locator('#confirm-yes').click();
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('cozy-room:v1')).tasks.length), 0);
    assert.deepEqual(errors, [], 'Browser errors'); assert.deepEqual(badResponses, [], 'Failed resources'); assert.deepEqual(external, [], 'Unexpected external requests');
    const response = await fetch(`${base}/`); assert.equal(response.status, 200); assert.match(await response.text(), /<title>Revikoo<\/title>/);
    console.log(`PASS: complete loop, reload, anti-double-reward, focus cancel, settings, reset, keyboard, mobile, subpath routing, no external requests, Revikoo homepage. Screenshots: ${screenshotDir}`);
  } finally { await browser.close(); server.close(); }
})().catch(error => { console.error(error); server.close(); process.exitCode = 1; });
