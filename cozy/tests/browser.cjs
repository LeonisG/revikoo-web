/* Optional browser QA for the room builder. No production dependency.
 * Set PLAYWRIGHT_MODULE to a local Playwright module if it is not installed.
 *   node tests/browser.cjs
 */
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
  const shots = path.join(os.tmpdir(), 'cozy-qa'); fs.mkdirSync(shots, { recursive: true });
  const stored = () => page.evaluate(() => JSON.parse(localStorage.getItem('cozy-room:debug:v2')));
  const close = async () => { await page.getByRole('button', { name: 'Cerrar y volver a la habitación' }).click(); await page.locator('#world-panel').waitFor({ state: 'hidden' }); };
  const open = async name => { await page.locator(`.room-nav [data-open="${name}"]`).click(); await page.locator('#world-panel').waitFor({ state: 'visible' }); };

  /** Click the centre of a grid cell, resolved through the app's own projection. */
  const clickCell = async (gx, gy) => {
    const point = await page.evaluate(async ([gx, gy]) => {
      const { anchorOf } = await import('./logic/grid.mjs');
      const spot = anchorOf({ gx, gy, rotation: 0 }, { w: 1, h: 1 });
      const box = document.querySelector('#room-stage').getBoundingClientRect();
      return { x: box.left + box.width * spot.x / 100, y: box.top + box.height * spot.y / 100 };
    }, [gx, gy]);
    await page.mouse.move(point.x, point.y);
    await page.mouse.click(point.x, point.y);
  };
  const pick = async id => page.locator(`[data-pick="${id}"]`).click();

  try {
    await page.goto(`${base}/revikoo-web/cozy/?debug=true`);
    await page.locator('#room-shell').evaluate(img => img.decode());

    // ── Build your first room ────────────────────────────────────────────────
    await page.locator('#setup').waitFor({ state: 'visible' });
    assert.equal(await page.locator('#coins').textContent(), '420', 'the starter budget is granted up front');
    assert.equal(await page.locator('.placed').count(), 0, 'a new room starts empty');
    await page.screenshot({ path: path.join(shots, 'setup-size.png'), fullPage: true });
    await page.locator('[data-size=medium]').click();
    assert.equal((await stored()).coins, 300, 'a bigger room costs budget that cannot go into furniture');
    await page.locator('[data-size=small]').click();
    assert.equal((await stored()).coins, 420, 'the size choice is reversible during setup');
    await page.locator('[data-size=medium]').click();
    await page.locator('#setup-next').click();
    await page.locator('[data-buy=desk]').click();
    await page.locator('[data-buy=chair]').click();
    assert.equal((await stored()).coins, 30);
    await page.screenshot({ path: path.join(shots, 'setup-basics.png'), fullPage: true });
    await page.locator('#setup-next').click();
    await page.locator('#setup').waitFor({ state: 'hidden' });
    assert.equal((await stored()).profile.setupCompleted, true);

    // ── Edit mode and grid placement ─────────────────────────────────────────
    await page.locator('#edit-bar').waitFor({ state: 'visible' });
    assert.equal(await page.locator('.cell').count(), 25, 'a medium room is a 5x5 grid');
    await pick('desk');
    await clickCell(1, 0);
    assert.equal(Object.keys((await stored()).room.placed).length, 1);
    assert.equal(await page.locator('.placed[data-item=desk]').count(), 1);

    // A 2x1 desk also holds the cell beside it.
    await pick('chair');
    await clickCell(2, 0);
    assert.match(await page.locator('#edit-hint').textContent(), /ocupado/);
    await clickCell(2, 2);
    assert.equal(Object.keys((await stored()).room.placed).length, 2);

    // Something small needs a surface, and only one thing fits on it.
    await pick('journal');
    await clickCell(3, 3);
    assert.match(await page.locator('#edit-hint').textContent(), /apoyarse/);
    await clickCell(1, 0);
    await pick('timer');
    await clickCell(1, 0);
    assert.match(await page.locator('#edit-hint').textContent(), /encima/);
    await clickCell(2, 0);
    assert.equal(Object.keys((await stored()).room.placed).length, 4);
    await page.screenshot({ path: path.join(shots, 'edit-mode.png'), fullPage: true });

    // Pick a placed piece back up, turn it, move it.
    await page.locator('.placed[data-item=chair]').click();
    await page.locator('#held-bar').waitFor({ state: 'visible' });
    await page.locator('[data-held=rotate]').click();
    await clickCell(3, 3);
    const chair = Object.values((await stored()).room.placed).find(p => p.item === 'chair');
    assert.deepEqual([chair.gx, chair.gy, chair.rotation], [3, 3, 90]);
    assert.equal((await stored()).stats.moves, 1);

    // Putting a surface away brings down whatever was standing on it.
    await page.locator('.placed[data-item=desk]').click();
    await page.locator('[data-held=store]').click();
    assert.equal((await stored()).inventory.desk, 1);
    assert.equal((await stored()).inventory.journal, 1);
    await pick('desk'); await clickCell(1, 0);
    await pick('journal'); await clickCell(1, 0);

    await page.locator('#edit-done').click();
    await page.locator('#edit-bar').waitFor({ state: 'hidden' });
    assert.equal(await page.locator('.cell').count(), 0, 'the grid only exists while editing');
    await page.screenshot({ path: path.join(shots, 'room.png'), fullPage: true });

    // The layout survives a reload.
    await page.reload();
    assert.equal(await page.locator('.placed').count(), 4);

    // ── The loop pays, and the shop spends ───────────────────────────────────
    await open('tasks');
    await page.locator('#task-form [name=title]').fill('Finish presentation');
    await page.locator('#task-form [name=difficulty]').selectOption('big');
    await page.locator('#task-form button').click();
    await page.locator('[data-action=complete-task]').click();
    assert.equal((await stored()).coins, 40);
    await close();
    await open('focus');
    await page.clock.install();
    await page.locator('[data-action=start-focus]').click();
    await page.clock.runFor(1000);
    assert.equal(await page.locator('#focus-active').isVisible(), true);
    assert.equal(await page.locator('#focus-cancel').isVisible(), true, 'a running session can always be ended');
    await page.clock.fastForward(26000);
    assert.equal((await stored()).coins, 45);
    assert.equal((await stored()).focusHistory.length, 1);

    await open('shop');
    await page.locator('[data-filter=Plantas]').click();
    await page.locator('[data-action=buy][data-id=monstera]').click();
    assert.equal((await stored()).inventory.monstera, 1);
    assert.equal((await stored()).coins, 25);
    await page.screenshot({ path: path.join(shots, 'shop.png'), fullPage: true });
    // Selling returns most of the price, so experimenting stays cheap.
    await page.locator('[data-action=sell][data-id=monstera]').click();
    await page.locator('#confirm-yes').click();
    assert.equal((await stored()).coins, 25 + Math.floor(20 * 0.75));
    assert.equal((await stored()).inventory.monstera, undefined);
    await close();

    // ── Progress is offered, never demanded ──────────────────────────────────
    await open('quests');
    await page.locator('[data-action=claim][data-id=first-task]').click();
    assert.ok((await stored()).quests.includes('first-task'));
    assert.equal(await page.locator('[data-action=claim][data-id=first-task]').count(), 0);
    await page.screenshot({ path: path.join(shots, 'progress.png'), fullPage: true });
    await close();

    // ── Settings, atmosphere and persistence ─────────────────────────────────
    await page.locator('.header-actions [data-open=settings]').click();
    await page.locator('#world-panel').waitFor({ state: 'visible' });
    await page.locator('#lighting-setting').selectOption('night');
    await page.locator('#weather-setting').selectOption('rain');
    await close();
    assert.equal(await page.locator('#app').getAttribute('data-light'), 'night');
    assert.equal(await page.locator('#app').getAttribute('data-weather'), 'rain');
    await page.screenshot({ path: path.join(shots, 'night-rain.png'), fullPage: true });
    await page.reload();
    assert.equal(await page.locator('#app').getAttribute('data-light'), 'night');
    assert.equal(await page.evaluate(() => window.__cozyAudioContexts.length), 0, 'no audio before the user opts in');

    // ── Text stays text ──────────────────────────────────────────────────────
    await open('tasks');
    await page.locator('#task-form input').fill('<img src=x onerror=alert(1)>');
    await page.locator('#task-form button').click();
    assert.equal(await page.locator('.task-title').first().textContent(), '<img src=x onerror=alert(1)>');
    assert.equal(await page.locator('.task-title img').count(), 0);
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#world-panel').isVisible(), false);

    // ── Every target viewport, no horizontal overflow ────────────────────────
    for (const [width, height] of [[1920, 1080], [1366, 768], [768, 1024], [390, 844], [360, 740]]) {
      await page.setViewportSize({ width, height });
      assert.ok(await page.locator('#room-stage').evaluate(el => Math.abs(el.clientWidth / el.clientHeight - 14 / 9) < .01), `Scene proportions at ${width}`);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `Room overflow at ${width}`);
      await page.screenshot({ path: path.join(shots, `room-${width}.png`), fullPage: true });
      if (width !== 360) continue;
      await page.locator('#edit-toggle').click();
      await page.locator('#edit-bar').waitFor({ state: 'visible' });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'Edit mode overflow at 360');
      await page.screenshot({ path: path.join(shots, 'edit-mobile.png'), fullPage: true });
      await page.locator('#edit-done').click();
      for (const panel of ['tasks', 'books', 'focus', 'shop', 'quests']) {
        await open(panel);
        assert.equal(await page.locator('#world-panel').evaluate(el => el.scrollWidth <= el.clientWidth + 1), true, `${panel} overflow at 360`);
        await close();
      }
    }
    await page.setViewportSize({ width: 1440, height: 900 });

    // ── Debug tools stay out of the normal experience ────────────────────────
    await page.locator('#debug-badge button').click();
    await page.locator('#world-panel').waitFor({ state: 'visible' });
    await page.locator('[data-debug=clear]').click();
    assert.deepEqual((await stored()).room.placed, {}, 'clearing returns everything to the inventory');
    await close();
    await page.goto(`${base}/cozy/`);
    assert.equal(await page.locator('#debug-badge').isVisible(), false);
    assert.equal(await page.locator('#setup').isVisible(), true, 'the normal save starts its own empty room');

    assert.deepEqual(errors, [], 'Browser errors');
    assert.deepEqual(badResponses, [], 'Failed resources');
    assert.deepEqual(external, [], 'Unexpected external requests');
    const response = await fetch(`${base}/`);
    assert.equal(response.status, 200);
    assert.match(await response.text(), /<title>Revikoo<\/title>/);
    console.log(`PASS: setup, grid placement, surfaces, rotate, move, store, reload, rewards, shop, sell, quests, settings, mobile, subpath routing, no external requests, Revikoo homepage. Screenshots: ${shots}`);
  } finally { await browser.close(); server.close(); }
})().catch(error => { console.error(error); server.close(); process.exitCode = 1; });
