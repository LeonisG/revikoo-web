import test from 'node:test';
import assert from 'node:assert/strict';
import { createEngine } from '../logic/engine.mjs';
import { createStorage, initialState, validateState } from '../logic/storage.mjs';
import { CATALOG } from '../logic/config.mjs';

function fixture({ debug = false } = {}) {
  const data = new Map();
  const backend = { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value), removeItem: key => data.delete(key) };
  const warnings = [];
  const storage = createStorage({ backend, key: 'test', onWarning: message => warnings.push(message) });
  let time = 100000;
  return { engine: createEngine(storage, { debug, now: () => time }), storage, backend, data, warnings, advance(ms) { time += ms; }, reload() { return createEngine(storage, { debug, now: () => time }); } };
}

test('ideal loop: task → focus → purchase → equip → reload', () => {
  const f = fixture(), g = f.engine;
  assert.equal(g.state.coins, 20);
  g.addTask('Finish presentation', 'medium');
  const id = g.state.tasks[0].id;
  g.editTask(id, 'Finish the presentation', 'medium');
  g.completeTask(id); assert.equal(g.state.coins, 25);
  g.completeTask(id); assert.equal(g.state.coins, 25);
  g.startFocus(25); f.advance(25 * 60000); g.completeFocus();
  assert.equal(g.state.coins, 30);
  g.buyItem('monstera'); g.equipItem('monstera', 'floor-right');
  assert.equal(g.state.coins, 15);
  const restored = f.reload().state;
  assert.equal(restored.room.slots['floor-right'], 'monstera');
  assert.equal(restored.tasks[0].rewardClaimed, true);
  assert.equal(restored.focusHistory.length, 1);
  assert.deepEqual(restored, g.state);
});

test('all task sizes reward once, including after reload; completed tasks cannot be edited', () => {
  const f = fixture();
  for (const difficulty of ['small', 'medium', 'big']) f.engine.addTask(difficulty, difficulty);
  for (const task of f.engine.state.tasks) f.engine.completeTask(task.id);
  const g = f.reload();
  assert.equal(g.state.coins, 37);
  for (const task of g.state.tasks) { g.completeTask(task.id); assert.throws(() => g.editTask(task.id, 'changed', 'big')); }
  assert.equal(g.state.coins, 37);
});

test('book validation, completion and backwards progress cannot mint a second reward', () => {
  const f = fixture(), g = f.engine;
  assert.throws(() => g.addBook('Invalid', '', 0));
  assert.throws(() => g.addBook('Invalid', '', 100, 101));
  g.addBook('The Hobbit', 'J. R. R. Tolkien', 300, 50);
  const id = g.state.books[0].id;
  assert.throws(() => g.updateBook(id, 301));
  assert.throws(() => g.updateBook(id, 1.5));
  g.updateBook(id, 300); assert.equal(g.state.coins, 45);
  g.updateBook(id, 10); g.updateBook(id, 300); assert.equal(g.state.coins, 45);
  const restored = f.reload(); restored.updateBook(id, 300);
  assert.equal(restored.state.coins, 45);
  assert.equal(restored.state.books[0].completed, true);
  restored.deleteBook(id); assert.equal(restored.state.books.length, 0);
});

test('focus is deadline based, survives reload and background time, pays exactly once', () => {
  for (const [duration, reward] of [[25, 5], [45, 10], [60, 15], [90, 25]]) {
    const f = fixture(); f.engine.startFocus(duration);
    assert.equal(f.engine.completeFocus(), false);
    assert.throws(() => f.engine.startFocus(25));
    f.advance(duration * 60000 - 1);
    const g = f.reload(); assert.equal(g.completeFocus(), false);
    f.advance(1); g.completeFocus(); g.completeFocus();
    assert.equal(g.state.coins, 20 + reward);
    assert.equal(g.state.focusHistory.length, 1);
  }
});

test('cancelled focus does not reward; normal mode cannot invoke debug', () => {
  const f = fixture(); f.engine.startFocus(25); f.advance(1000); f.engine.cancelFocus(); f.advance(9999999);
  f.engine.completeFocus(); assert.equal(f.engine.state.coins, 20); assert.equal(f.engine.state.focusHistory.length, 0);
  assert.throws(() => f.engine.debug('coins'));
  const d = fixture({ debug: true }); d.engine.startFocus(25); d.advance(25000); d.engine.completeFocus(); assert.equal(d.engine.state.coins, 25);
});

test('shop rejects insufficient funds, duplicate purchases and incompatible slots', () => {
  const { engine: g } = fixture();
  assert.throws(() => g.buyItem('print-moon')); assert.equal(g.state.coins, 20);
  g.buyItem('monstera'); assert.equal(g.state.coins, 5);
  assert.throws(() => g.buyItem('monstera')); assert.equal(g.state.coins, 5);
  assert.throws(() => g.equipItem('monstera', 'wall-left'));
  assert.throws(() => g.equipItem('candle', 'desk-left'));
  g.equipItem('monstera', 'floor-left'); g.equipItem('monstera', 'floor-right');
  assert.deepEqual(g.state.room.slots, { 'floor-right': 'monstera' });
  g.unequipItem('monstera'); assert.deepEqual(g.state.room.slots, {}); assert.deepEqual(g.state.inventory, ['monstera']);
});

test('replacing a slot keeps previous item in inventory and every catalog item equips', () => {
  const { engine: g } = fixture({ debug: true }); g.debug('unlock');
  for (const item of CATALOG) g.equipItem(item.id, item.compatibleSlots[0]);
  assert.equal(g.state.inventory.length, 16);
  g.equipItem('mushroom', 'desk-left'); g.equipItem('vintage', 'desk-left');
  assert.equal(g.state.room.slots['desk-left'], 'vintage'); assert.ok(g.state.inventory.includes('mushroom'));
});

test('stale tabs cannot overwrite newer progress', () => {
  const f = fixture(), second = f.reload();
  f.engine.addTask('One', 'small');
  assert.throws(() => second.addTask('Two', 'big'), /otra pestaña/);
  assert.equal(second.state.tasks.length, 1);
  second.addTask('Two', 'big'); f.engine.sync(); assert.equal(f.engine.state.tasks.length, 2);
});

test('a failed save rolls back the economy transaction', () => {
  const f = fixture(); f.engine.addTask('One', 'small');
  f.backend.setItem = () => { throw new Error('QuotaExceeded'); };
  assert.throws(() => f.engine.buyItem('candle'), /No se ha podido guardar/);
  assert.equal(f.engine.state.coins, 20); assert.deepEqual(f.engine.state.inventory, []);
});

test('corrupt data is backed up; future versions are protected', () => {
  const f = fixture(); f.data.set('test', '{invalid'); f.storage.load();
  assert.ok([...f.data.keys()].some(k => k.startsWith('test:recovery:'))); assert.ok(f.warnings.length);
  const future = { ...initialState(), version: 99 }; f.data.set('test', JSON.stringify(future)); f.storage.load();
  assert.throws(() => f.storage.save(initialState(), 0), /protegido/);
  assert.equal(JSON.parse(f.data.get('test')).version, 99);
});

test('reset restores onboarding, settings and progress; invalid state fails validation', () => {
  const { engine: g } = fixture(); g.preference('lighting', 'night'); g.onboard(); g.buyItem('candle'); g.reset();
  const expected = initialState(); expected.revision = 4; assert.deepEqual(g.state, expected);
  assert.equal(validateState(g.state), true); assert.equal(validateState({ ...g.state, coins: -1 }), false);
  assert.equal(validateState({ ...g.state, books: [{ id: '1', title: 'x', author: '', totalPages: 0, currentPage: 0 }] }), false);
});
