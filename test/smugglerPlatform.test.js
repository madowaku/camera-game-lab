import test from 'node:test';
import assert from 'node:assert/strict';
import { experiments } from '../src/platform/experiments.js';
import { resolveRoute } from '../src/platform/navigation.js';
import { createLauncher } from '../src/platform/launcher.js';

test('FRAME SMUGGLER has a dedicated lazy module, two players and canonical aliases', () => {
  const game = experiments.find(entry => entry.id === 'outcam-frame-smuggler');
  assert.equal(game.module, 'smuggler'); assert.equal(game.players, 2); assert.equal(game.duration, 30);
  assert.equal(game.requiresMicrophone, false); assert.equal(game.demo, true);
  for (const route of ['#smuggler', '#frame-smuggler', game.route]) assert.equal(resolveRoute(route).experiment, game);
});

test('module replay callback only reaches the shell while that module is current and enabled', async t => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'document');
  Object.defineProperty(globalThis, 'document', { configurable: true, value: { createElement: () => ({ hidden: true, querySelector: () => null }) } });
  t.after(() => { if (original) Object.defineProperty(globalThis, 'document', original); else delete globalThis.document; });
  const replays = [], launcher = createLauncher({ append() {} }, { onState() {}, onReplay: game => replays.push(game.id) });
  const game = { id: 'smuggler', module: 'smuggler', load: async () => (host, locale, options) => ({
    options, activate() {}, deactivate() {}, releaseInputs() {}, setLocale() {}, startCamera() {}, subscribe() {},
  }) };
  const entry = await launcher.prepare(game, 'en');
  entry.instance.options.onReplay(); assert.equal(replays.length, 0);
  launcher.begin(); entry.instance.options.onReplay(); assert.deepEqual(replays, ['smuggler']);
  launcher.stop(); entry.instance.options.onReplay(); assert.equal(replays.length, 1);
});
