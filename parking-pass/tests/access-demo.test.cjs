const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// Exercise the controller without WebGL, including its graceful fallback path.
async function demo(reduced = false) {
  const elements = new Map();
  const observers = [];
  const frames = new Map();
  const listeners = {};
  let frameId = 0;
  let now = 1000;
  function element(name) {
    if (!elements.has(name)) {
      const attrs = {};
      const classes = new Set();
      elements.set(name, {
        textContent: '', hidden: name === 'replay', dataset: {}, style: {}, attrs,
        classList: { toggle: (key, enabled) => enabled ? classes.add(key) : classes.delete(key), contains: key => classes.has(key) },
        setAttribute: (key, value) => { attrs[key] = value; },
        removeAttribute: key => { delete attrs[key]; },
        addEventListener: (event, callback) => { listeners[`${name}:${event}`] = callback; },
        querySelector: selector => element(selector.match(/data-demo-([^\]]+)/)?.[1] || selector),
        querySelectorAll: () => [0, 1, 2, 3, 4].map(i => element(`chapter${i}`)),
        replaceChildren() {}, focus() {}
      });
    }
    return elements.get(name);
  }
  const document = { hidden: false, querySelector: () => element('section'), addEventListener: (event, fn) => { listeners[event] = fn; } };
  const motion = { matches: reduced, addEventListener: (event, fn) => { listeners.motion = fn; } };
  class Observer {
    constructor(callback) { this.callback = callback; observers.push(this); }
    observe() {}
    disconnect() {}
  }
  const context = {
    document, matchMedia: () => motion,
    window: { IntersectionObserver: Observer, addEventListener() {} },
    IntersectionObserver: Observer,
    ResizeObserver: class { observe() {} disconnect() {} },
    requestAnimationFrame: fn => { frames.set(++frameId, fn); return frameId; },
    cancelAnimationFrame: id => frames.delete(id)
  };
  const source = fs.readFileSync(path.join(__dirname, '../access-demo.js'), 'utf8');
  vm.runInNewContext(source, context, { importModuleDynamically: () => Promise.reject(new Error('No WebGL in unit tests')) });
  const flush = () => { const pending = [...frames.values()]; frames.clear(); pending.forEach(fn => fn(now)); };
  const run = seconds => { for (let i = 0; i < Math.round(seconds * 40); i++) { now += 25; flush(); } };
  return {
    element, listeners, motion, document, run,
    visible(value) { observers[1].callback([{ isIntersecting: value }]); },
    async start(ratio = 1) {
      observers[1].callback([{ isIntersecting: true }]);
      observers[2].callback([{ isIntersecting: true, intersectionRatio: ratio }]);
      await new Promise(resolve => setImmediate(resolve));
      flush();
    },
    click(name) { listeners[`${name}:click`](); flush(); }
  };
}

test('starts only when half the scene is visible, and supports a WebGL fallback', async () => {
  const d = await demo();
  await d.start(.4); d.run(1);
  assert.equal(d.element('progress').style.transform, 'scaleX(0)');
  await d.start();
  assert.equal(d.element('section').dataset.renderMode, 'simplified');
  d.run(3);
  assert.equal(d.element('section').dataset.demoState, 'Lectura de matrícula');
});

test('entry, stay, exit and every credit decrement complete in order', async () => {
  const d = await demo(); await d.start();
  d.run(4.7);
  assert.equal(d.element('section').dataset.demoState, 'Acceso autorizado');
  d.run(5.5);
  assert.equal(d.element('parking').textContent, 'Parking Serrano');
  assert.equal(d.element('duration').textContent, '01:25:00');
  assert.equal(d.element('clock').textContent, '13:07');
  d.run(3.6);
  assert.equal(d.element('validation-value').textContent, '4 CR');
  d.run(5.725);
  assert.equal(d.element('balance').textContent, '60');
  for (const balance of ['59', '58', '57', '56']) {
    d.run(.2); assert.equal(d.element('balance').textContent, balance);
  }
  d.run(2.8);
  assert.equal(d.element('replay').hidden, false);
  assert.equal(d.element('pause').hidden, true);
  assert.equal(d.element('section').classList.contains('show-toast'), false);
  d.click('replay');
  assert.equal(d.element('balance').textContent, '60');
  assert.equal(d.element('replay').hidden, true);
});

test('manual pause, offscreen and tab visibility retain progress without restarting', async () => {
  const d = await demo(); await d.start(); d.run(3);
  const progress = d.element('progress').style.transform;
  d.click('pause'); d.run(10);
  assert.equal(d.element('progress').style.transform, progress);
  d.click('pause'); d.visible(false); d.run(10);
  assert.equal(d.element('progress').style.transform, progress);
  d.visible(true); d.document.hidden = true; d.listeners.visibilitychange(); d.run(10);
  assert.equal(d.element('progress').style.transform, progress);
  d.document.hidden = false; d.listeners.visibilitychange(); d.run(2);
  assert.equal(d.element('section').dataset.demoState, 'Acceso autorizado');
});

test('reduced motion presents four simple states and the correct final balance', async () => {
  const d = await demo(true); await d.start();
  assert.equal(d.element('section').dataset.demoState, 'Llegada');
  d.run(2.025); assert.equal(d.element('section').dataset.demoState, 'Acceso autorizado');
  d.run(2); assert.equal(d.element('section').dataset.demoState, 'Estancia finalizada');
  d.run(2); assert.equal(d.element('balance').textContent, '56');
  d.run(2); assert.equal(d.element('replay').hidden, false);
});
