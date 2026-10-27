import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { ITEMS } from '../logic/catalog.mjs';
import { SPRITES } from '../assets/sprites.mjs';
import { objectAsset, availableOrientations, roomAssets } from '../assets/manifest.mjs';

test('every purchasable and legacy item has a real, independently delivered WebP and retained PNG master', () => {
  const paths = new Set();
  for (const item of ITEMS) {
    const sprite = SPRITES[item.id];
    assert.ok(sprite?.src, item.id);
    assert.equal(paths.has(sprite.src), false, `${item.id} must be independent`); paths.add(sprite.src);
    for (const frame of [sprite, ...Object.values(sprite.states || {})]) {
      const url = new URL('../assets/' + frame.src, import.meta.url);
      const bytes = readFileSync(url);
      assert.equal(bytes.toString('ascii', 8, 12), 'WEBP');
      assert.equal(bytes.length, frame.bytes);
      assert.ok(bytes.length < 350_000, `${frame.src}: keep delivery small`);
      assert.ok(statSync(new URL('../' + frame.master, import.meta.url)).size > bytes.length);
      assert.match(frame.hitMask, /^[0-9a-f]{256}$/);
      assert.ok(/[1-9a-f]/.test(frame.hitMask) && frame.hitMask.includes('0'));
      assert.ok(frame.width > 0 && frame.pivot.y >= 0 && frame.pivot.y <= 1);
    }
    assert.deepEqual(availableOrientations(item.id), [0], 'only authored views are offered');
    assert.equal(objectAsset(item.id).type, 'image');
    assert.equal(objectAsset(item.id, 90).rotation, 0, 'never fake a missing view');
  }
});

test('each companion has three distinct authored postures and every room size has illustrated art', () => {
  for (const id of ['cat','dog','rabbit']) {
    const urls = ['idle','sleep','sit'].map(pose => objectAsset(id,0,pose).src);
    assert.equal(new Set(urls).size, 3, id);
  }
  for (const size of ['small','medium','large']) {
    assert.ok(statSync(new URL(roomAssets(size).shell)).size > 0);
  }
});
