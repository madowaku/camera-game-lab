import test from "node:test";
import assert from "node:assert/strict";
import { MusicBed, trackForGame, musicAudible, musicCreditMarkup } from "../src/platform/music.js";
import { experiments } from "../src/platform/experiments.js";
import { snapshotOf } from "../src/platform/launcher.js";

const flush = () => new Promise(resolve => setImmediate(resolve));
function fixture() {
  const contexts = [], nodes = [];
  const contextFactory = () => {
    const context = { state: "suspended", currentTime: 0, destination: {},
      resume() { this.state = "running"; return Promise.resolve(); },
      close() { this.state = "closed"; return Promise.resolve(); },
      decodeAudioData: async () => ({ duration: 48 }),
      createGain: () => ({ gain: { setValueAtTime() {}, linearRampToValueAtTime() {} }, connect() {}, disconnect() {} }),
      createBufferSource: () => { const node = { connect() {}, disconnect() {}, start(_, offset) { this.offset = offset; this.active = true; }, stop() { this.active = false; } }; nodes.push(node); return node; },
    }; contexts.push(context); return context;
  };
  return { contexts, nodes, bed: new MusicBed({ contextFactory, fetchBytes: async () => new ArrayBuffer(8) }), track: { id: "test", volume: .2, load: async () => ({ default: "data:audio/mpeg;base64,test" }) } };
}
test("catalog and silent modes never create or load audio", () => {
  const f = fixture(); assert.equal(f.contexts.length, 0);
  f.bed.arm(null); assert.equal(f.contexts.length, 0);
  f.bed.setEnabled(false); f.bed.arm(f.track); assert.equal(f.contexts.length, 0);
  const voice = experiments.find(g => g.requiresMicrophone);
  assert.equal(trackForGame(voice, "camera"), null);
  assert.ok(trackForGame(voice, "demo"));
  assert.equal(trackForGame(experiments.find(g => g.id === "solo-hand-beat"), "camera"), null);
});
test("permission wait, pause, mute and loss of focus silence the one round owner", async () => {
  const f = fixture(); f.bed.arm(f.track); await flush();
  assert.equal(f.nodes.length, 0);
  f.bed.update({ phase: "playing" }); assert.equal(f.nodes.length, 1);
  f.contexts[0].currentTime = 5;
  f.bed.update({ phase: "playing", paused: true }); assert.equal(f.nodes[0].active, false);
  f.bed.update({ phase: "playing" }); assert.equal(f.nodes[1].offset, 5);
  f.bed.setEnabled(false); assert.equal(f.nodes[1].active, false);
  f.bed.setEnabled(true); assert.equal(f.nodes.filter(n => n.active).length, 1);
  f.bed.update({ phase: "playing" }, false); assert.equal(f.nodes.filter(n => n.active).length, 0);
  f.bed.stop(); assert.equal(f.contexts[0].state, "closed");
  f.bed.arm({ ...f.track, id: "other" }); await flush();
  assert.equal(f.bed.cache.size, 1); assert.ok(f.bed.cache.has("other"));
  f.bed.stop();
});
test("a delayed download cannot play after navigation or a replacement round", async () => {
  const f = fixture(); let finish;
  f.track.load = () => new Promise(resolve => { finish = resolve; });
  f.bed.arm(f.track); f.bed.update({ phase: "playing" }); f.bed.stop();
  finish({ default: "data:audio/mpeg;base64,test" }); await flush();
  assert.equal(f.nodes.length, 0); assert.equal(f.bed.buffer, null); assert.equal(f.bed.cache.size, 0);
  f.bed.arm({ ...f.track, id: "next", load: async () => ({ default: "next" }) });
  f.bed.update({ phase: "playing" }); await flush();
  assert.equal(f.nodes.filter(n => n.active).length, 1);
  f.bed.update({ phase: "result" }); assert.equal(f.nodes.filter(n => n.active).length, 0);
});
test("shared snapshots carry pause and input loss through explicit snapshot adapters", () => {
  assert.equal(snapshotOf({ snapshot: () => ({ phase: "playing" }), game: { paused: true } }, "pinch").paused, true);
  assert.equal(snapshotOf({ phase: "playing", inputLost: true }, "blaster").paused, true);
  for (const phase of ["idle", "error", "loading", "calibrating", "countdown", "result"]) assert.equal(musicAudible({ phase }), false);
});
test("every selected track has a direct OpenTracks credit, including practice-only voice music", () => {
  for (const game of experiments.filter(g => g.id !== "solo-hand-beat" && !["procedural", "silent", "stems", "instrument"].includes(g.audioStrategy))) {
    assert.match(musicCreditMarkup(game, "ja"), /https:\/\/opentracks.com\/bgm\/detail\/\d+/);
    assert.ok(trackForGame(game, "demo"));
  }
  assert.match(musicCreditMarkup(experiments.find(g => g.requiresMicrophone), "ja"), /練習のみ/);
});

test("instrument-owned soundtracks have no competing shared music bed", () => {
  for (const game of experiments.filter(g => ["stems", "instrument"].includes(g.audioStrategy))) {
    assert.equal(trackForGame(game, "camera"), null);
    assert.equal(trackForGame(game, "demo"), null);
  }
});
