import test from 'node:test';
import assert from 'node:assert/strict';
import { DuelAudio } from '../src/tension/audio.js';

class FakeNode {
  constructor() { this.gain = { setValueAtTime() {}, exponentialRampToValueAtTime() {} }; this.frequency = this.gain; this.playbackRate = {}; }
  connect(node) { return node; }
  disconnect() {}
  start(...args) { this.started = args; }
  stop() { this.stopped = true; }
}
class FakeAudio {
  constructor() { this.state = 'suspended'; this.currentTime = 0; this.sources = []; this.destination = {}; }
  async resume() { this.state = 'running'; }
  async suspend() { this.state = 'suspended'; }
  async decodeAudioData() { return { duration: 16 }; }
  createGain() { return new FakeNode(); }
  createBufferSource() { const node = new FakeNode(); this.sources.push(node); return node; }
  createOscillator() { return this.createBufferSource(); }
}
const response = { ok: true, arrayBuffer: async () => new ArrayBuffer(0) };

test('browser fetch retains its Window receiver when used by the audio controller', async () => {
  const previous = globalThis.fetch; let requests = 0;
  globalThis.fetch = async function () { assert.equal(this, globalThis); requests++; return response; };
  try {
    const audio = new DuelAudio({ Audio: FakeAudio }); await audio.unlock();
    assert.equal(requests, 5); assert.equal(audio.buffers.size, 5);
  } finally { globalThis.fetch = previous; }
});

test('audio waits for a player gesture and loops only during active play', async () => {
  let requests = 0;
  const audio = new DuelAudio({ Audio: FakeAudio, fetchAudio: async () => { requests++; return response; } });
  audio.setMusic(true); assert.equal(requests, 0); assert.equal(audio.music, undefined);
  audio.setMusic(false); await audio.unlock();
  assert.equal(requests, 5); assert.equal(audio.music, undefined);
  audio.setMusic(true); const source = audio.music.source;
  assert.equal(source.loop, true); assert.deepEqual(source.started, [0, 0]);
  audio.setMusic(true); assert.equal(audio.music.source, source);
  audio.context.currentTime = 5; audio.setMusic(false);
  assert.equal(source.stopped, true); assert.equal(audio.offset, 5);
  audio.context.currentTime = 12; audio.setMusic(true);
  assert.deepEqual(audio.music.source.started, [0, 5]);
});

test('mute silences loop and effects, unmute resumes, retry starts a fresh loop', async () => {
  const audio = new DuelAudio({ Audio: FakeAudio, fetchAudio: async () => response });
  await audio.unlock(); audio.setMusic(true); audio.effect('hit', 2);
  const loop = audio.music.source, hit = [...audio.effects][0];
  audio.context.currentTime = 2; audio.setEnabled(false);
  assert.ok(loop.stopped && hit.stopped); assert.equal(audio.music, null);
  const count = audio.context.sources.length; audio.effect('wall');
  assert.equal(audio.context.sources.length, count);
  audio.setEnabled(true); assert.deepEqual(audio.music.source.started, [0, 2]);
  audio.reset(); assert.equal(audio.offset, 0); assert.equal(audio.music, null);
  audio.setMusic(true); assert.deepEqual(audio.music.source.started, [0, 0]);
});

test('late downloads cannot start music after leaving the game', async () => {
  let complete;
  const pending = new Promise(resolve => { complete = resolve; });
  const audio = new DuelAudio({ Audio: FakeAudio, fetchAudio: () => pending });
  const unlocked = audio.unlock(); audio.setMusic(true); audio.suspend();
  complete(response); await unlocked;
  assert.equal(audio.wanted, false); assert.ok(!audio.music); assert.equal(audio.context.sources.length, 0);
  await audio.unlock(); assert.ok(!audio.music);
});

test('missing audio files and unsupported audio keep play available', async () => {
  const unsupported = new DuelAudio({ Audio: null });
  await unsupported.unlock(); unsupported.setMusic(true); unsupported.effect('point'); unsupported.suspend();
  const audio = new DuelAudio({ Audio: FakeAudio, fetchAudio: async () => { throw new Error('offline'); } });
  await audio.unlock(); audio.setMusic(true); assert.ok(!audio.music);
  audio.effect('hit'); assert.equal(audio.context.sources.length, 1);
  assert.ok(audio.context.sources[0].started); audio.suspend(); assert.equal(audio.wanted, false);
});
