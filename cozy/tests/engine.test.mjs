import test from 'node:test';
import assert from 'node:assert/strict';
import { createEngine, ownedIds } from '../logic/engine.mjs';
import { createStorage, initialState, validateState, migrate } from '../logic/storage.mjs';
import { CATALOG } from '../logic/catalog.mjs';
import { GAME_CONFIG, ROOM_SIZES, QUESTS } from '../logic/config.mjs';
import { placementError, cellsOf, footprint, anchorOf, cellAt, paintOrder } from '../logic/grid.mjs';

function fixture({ debug = false } = {}) {
  const data = new Map();
  const backend = { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value), removeItem: key => data.delete(key) };
  const warnings = [];
  const storage = createStorage({ backend, key: 'test', onWarning: message => warnings.push(message) });
  let time = 100000;
  return { engine: createEngine(storage, { debug, now: () => time }), storage, backend, data, warnings,
    advance(ms) { time += ms; }, reload() { return createEngine(storage, { debug, now: () => time }); } };
}
/** A room already built, so placement tests do not repeat the setup each time. */
function built({ size = 'medium' } = {}) {
  const f = fixture({ debug: true });
  f.engine.startSetup();
  f.engine.chooseSize(size);
  f.engine.debug('rich');
  f.engine.completeSetup();
  return f;
}
const placedKey = (g, item) => Object.entries(g.state.room.placed).find(([, p]) => p.item === item)?.[0];

test('a new room is empty and has no money until the budget is granted', () => {
  const { engine: g } = fixture();
  assert.equal(g.state.coins, 0);
  assert.deepEqual(g.state.room.placed, {});
  assert.deepEqual(g.state.inventory, {});
  assert.equal(g.state.profile.setupCompleted, false);
  g.startSetup();
  assert.equal(g.state.coins, GAME_CONFIG.starterBudget);
  // The journal and the timer come with the room: the loop depends on them.
  assert.equal(g.state.inventory.journal, 1);
  assert.equal(g.state.inventory.timer, 1);
  assert.throws(() => g.startSetup(), /ya está empezada/);
});

test('room size is a real decision, and reversible while the budget is open', () => {
  const { engine: g } = fixture();
  g.startSetup();
  g.chooseSize('medium');
  assert.equal(g.state.coins, GAME_CONFIG.starterBudget - ROOM_SIZES.medium.price);
  g.chooseSize('small');
  assert.equal(g.state.coins, GAME_CONFIG.starterBudget, 'downgrading during setup refunds the difference');
  g.chooseSize('large');
  assert.equal(g.state.coins, GAME_CONFIG.starterBudget - ROOM_SIZES.large.price);
  assert.throws(() => g.chooseSize('enormous'), /no existe/);
});

test('shrinking the room returns whatever no longer fits, and loses nothing', () => {
  const f = built({ size: 'large' }), g = f.engine;
  g.buyItem('desk'); g.placeItem('desk', { gx: 4, gy: 4, rotation: 0 });
  g.buyItem('chair'); g.placeItem('chair', { gx: 0, gy: 0 });
  const result = g.chooseSize('small');
  assert.equal(result.displaced, 1);
  assert.equal(g.state.inventory.desk, 1, 'the displaced desk is back in the inventory');
  assert.ok(placedKey(g, 'chair'), 'what still fits stays put');
});

test('footprints collide, rugs do not, and nothing leaves the room', () => {
  const f = built({ size: 'small' }), g = f.engine;
  g.buyItem('desk'); g.placeItem('desk', { gx: 1, gy: 0, rotation: 0 });
  g.buyItem('chair');
  assert.throws(() => g.placeItem('chair', { gx: 2, gy: 0 }), /ocupado/, 'the desk is 2x1, so it also holds 2,0');
  assert.throws(() => g.placeItem('chair', { gx: 3, gy: 3, rotation: 0 }) && g.placeItem('chair', { gx: 9, gy: 9 }), /No cabe/);
  g.buyItem('rug-moss');
  g.placeItem('rug-moss', { gx: 1, gy: 0 });
  assert.ok(placedKey(g, 'rug-moss'), 'a rug lies flat and shares its cells with furniture');
});

test('rotation swaps the footprint', () => {
  const f = built(), g = f.engine;
  g.buyItem('desk'); g.placeItem('desk', { gx: 0, gy: 0, rotation: 90 });
  const key = placedKey(g, 'desk');
  assert.deepEqual(footprint(CATALOG.desk, 90), { w: 1, h: 2 });
  assert.deepEqual(cellsOf(g.state.room.placed[key], CATALOG.desk).sort(), ['0,0', '0,1']);
  g.buyItem('chair');
  assert.throws(() => g.placeItem('chair', { gx: 0, gy: 1 }), /ocupado/);
});

test('small things need something to stand on, one per surface', () => {
  const f = built(), g = f.engine;
  assert.throws(() => g.placeItem('journal', { gx: 2, gy: 2 }), /apoyarse/);
  g.buyItem('desk'); g.placeItem('desk', { gx: 1, gy: 1, rotation: 0 });
  g.placeItem('journal', { gx: 1, gy: 1 });
  assert.throws(() => g.placeItem('timer', { gx: 1, gy: 1 }), /ya tiene algo encima/);
  g.placeItem('timer', { gx: 2, gy: 1 });
  assert.equal(Object.keys(g.state.room.placed).length, 3);
});

test('putting a surface away brings down what was standing on it', () => {
  const f = built(), g = f.engine;
  g.buyItem('desk'); g.placeItem('desk', { gx: 1, gy: 1, rotation: 0 });
  g.placeItem('journal', { gx: 1, gy: 1 });
  g.storeItem(placedKey(g, 'desk'));
  assert.deepEqual(Object.keys(g.state.room.placed), []);
  assert.equal(g.state.inventory.desk, 1);
  assert.equal(g.state.inventory.journal, 1, 'the journal came down with the desk, not lost');
});

test('wall slots hold one piece each', () => {
  const f = built(), g = f.engine;
  g.buyItem('print-moon'); g.placeItem('print-moon', { wall: 'left', index: 1 });
  g.buyItem('print-sunset');
  assert.throws(() => g.placeItem('print-sunset', { wall: 'left', index: 1 }), /colgado/);
  g.placeItem('print-sunset', { wall: 'right', index: 1 });
  assert.equal(Object.keys(g.state.room.placed).length, 2);
});

test('moving counts as rearranging; selling returns most of the price', () => {
  const f = built(), g = f.engine;
  g.buyItem('chair');
  g.placeItem('chair', { gx: 0, gy: 0 });
  const key = placedKey(g, 'chair');
  g.moveItem(key, { gx: 2, gy: 2, rotation: 0 });
  assert.equal(g.state.stats.moves, 1);
  assert.equal(g.state.room.placed[key].gx, 2);
  g.storeItem(key);
  const before = g.state.coins;
  const sold = g.sellItem('chair');
  assert.equal(sold.refund, Math.floor(CATALOG.chair.price * GAME_CONFIG.resaleRate));
  assert.equal(g.state.coins, before + sold.refund);
  assert.equal(g.state.inventory.chair, undefined);
  assert.throws(() => g.sellItem('journal'), /se queda contigo/, 'starter tools cannot be sold');
});

test('quests only pay out once they are actually done', () => {
  const f = built(), g = f.engine;
  assert.throws(() => g.claimQuest('first-task'), /Todavía no/);
  g.addTask('Regar las plantas', 'small');
  g.completeTask(g.state.tasks[0].id);
  const payout = g.claimQuest('first-task');
  assert.equal(payout.reward, QUESTS.find(q => q.id === 'first-task').reward);
  assert.throws(() => g.claimQuest('first-task'), /Ya la has recogido/);
});

test('unlocks follow from play, and a finished collection hands over its gift', () => {
  const f = built(), g = f.engine;
  g.buyItem('bookshelf'); g.placeItem('bookshelf', { gx: 0, gy: 0, rotation: 0 });
  assert.ok(g.state.achievements.includes('first-shelf'));
  g.buyItem('floor-lamp'); g.placeItem('floor-lamp', { gx: 3, gy: 3 });
  assert.ok(g.state.achievements.includes('first-light'));
  // The amber set: owning every piece grants the set's reward exactly once.
  for (const id of ['candle', 'mushroom', 'vintage-lamp', 'lantern']) g.buyItem(id);
  assert.ok(g.state.achievements.includes('collector'));
  const gifts = g.state.inventory.candle;
  g.buyItem('vase');
  assert.equal(g.state.inventory.candle, gifts, 'the set gift is not handed out twice');
});

test('the grid projection inverts exactly, and paint order is back to front', () => {
  for (const [gx, gy] of [[0, 0], [2, 3], [4, 4]]) {
    const spot = anchorOf({ gx, gy, rotation: 0 }, { w: 1, h: 1 });
    assert.deepEqual(cellAt(spot.x, spot.y, 5), { gx, gy });
  }
  const room = { cells: 5, placed: {
    a: { item: 'rug-moss', gx: 0, gy: 0, rotation: 0 },
    b: { item: 'desk', gx: 1, gy: 1, rotation: 0 },
    c: { item: 'journal', gx: 1, gy: 1, rotation: 0, on: true },
    d: { item: 'print-moon', wall: 'left', index: 0 },
  } };
  const order = paintOrder(room, CATALOG).map(o => o.item.id);
  assert.deepEqual(order.slice(0, 2), ['print-moon', 'rug-moss'], 'wall art then rug, under everything');
  assert.ok(order.indexOf('journal') > order.indexOf('desk'), 'what sits on the desk paints over it');
});

test('placement rules are pure: they never touch the room they are asked about', () => {
  const room = { cells: 4, placed: { a: { item: 'desk', gx: 0, gy: 0, rotation: 0 } } };
  const snapshot = JSON.stringify(room);
  assert.equal(placementError({ gx: 2, gy: 2, rotation: 0 }, CATALOG.chair, room, CATALOG), null);
  assert.match(placementError({ gx: 0, gy: 0, rotation: 0 }, CATALOG.chair, room, CATALOG), /ocupado/);
  assert.equal(JSON.stringify(room), snapshot);
});

test('a v1 save keeps its progress and lays the room out again', () => {
  const legacy = {
    version: 1, revision: 7, profile: { onboardingCompleted: true }, coins: 140,
    tasks: [{ id: 't1', title: 'Vieja tarea', difficulty: 'medium', completed: true, rewardClaimed: true }],
    books: [], focusHistory: [], activeFocus: null,
    inventory: ['monstera', 'vintage'], room: { slots: { 'floor-left': 'monstera' } }, ledger: ['task:t1'],
    preferences: { sound: true, ambient: 50, reduceMotion: false, lighting: 'night', weather: 'rain', lamp: true },
  };
  const next = migrate(legacy);
  assert.ok(next && validateState(next));
  assert.equal(next.coins, 140);
  assert.equal(next.tasks.length, 1);
  assert.equal(next.preferences.lighting, 'night');
  assert.equal(next.inventory.monstera, 1, 'items already paid for come back as units');
  assert.equal(next.inventory['vintage-lamp'], 1, 'renamed items are carried across');
  assert.deepEqual(next.room.placed, {}, 'the old ten-slot layout does not survive the grid');
  assert.equal(next.profile.setupCompleted, false, 'they choose a room size again');
});

test('saves survive a reload and reject nonsense', () => {
  const f = built(), g = f.engine;
  g.buyItem('desk'); g.placeItem('desk', { gx: 1, gy: 1, rotation: 90 });
  const after = f.reload();
  assert.equal(Object.keys(after.state.room.placed).length, 1);
  assert.equal(Object.values(after.state.room.placed)[0].rotation, 90);
  assert.equal(validateState({ ...initialState(), room: { size: 'nope', placed: {} } }), false);
  assert.equal(validateState({ ...initialState(), inventory: { 'not-a-thing': 1 } }), false);
  assert.equal(validateState({ ...initialState(), room: { size: 'small', placed: { x: { item: 'desk', gx: -1, gy: 0, rotation: 0 } } } }), false);
  assert.ok(validateState(initialState()));
});

test('the productivity loop still pays, and pays only once', () => {
  const f = fixture({ debug: true }), g = f.engine;
  g.startSetup();
  const start = g.state.coins;
  g.addTask('Escribir', 'big');
  const id = g.state.tasks[0].id;
  g.completeTask(id);
  assert.equal(g.state.coins, start + GAME_CONFIG.rewards.tasks.big);
  g.completeTask(id);
  assert.equal(g.state.coins, start + GAME_CONFIG.rewards.tasks.big, 'no second payout');
  g.startFocus(25); f.advance(25 * 1000 + 10); g.completeFocus();
  assert.equal(g.state.focusHistory.length, 1);
  g.addBook('Un libro', 'Alguien', 100, 100);
  assert.equal(g.state.books[0].completed, true);
  assert.equal(ownedIds(g.state).includes('journal'), true);
});
