import test from "node:test";
import assert from "node:assert/strict";
import { CameraInputDebugStore } from "../src/input/debugStore.js";

test("debug store stays inert until enabled and clears on disable", () => {
  const store = new CameraInputDebugStore();
  store.metric("Hand", "x", 1, 0);
  assert.equal(store.snapshot().channels.length, 0);
  store.setEnabled(true);
  store.metric("Hand", "x", 1, 0);
  assert.equal(store.snapshot().channels[0].metrics.x, 1);
  store.setEnabled(false);
  assert.equal(store.snapshot().channels.length, 0);
});

test("inference fps and duration use only a rolling one-second window", () => {
  const store = new CameraInputDebugStore();
  store.setEnabled(true);
  store.inference("Hand", { at: 0, durationMs: 8, scheduler: "video-frame" });
  store.inference("Hand", { at: 50, durationMs: 9, scheduler: "video-frame" });
  store.inference("Hand", { at: 100, durationMs: 10, scheduler: "video-frame" });
  let channel = store.snapshot().channels[0];
  assert.equal(channel.inferenceFps, 20);
  assert.equal(channel.inferenceMs, 10);
  assert.equal(channel.scheduler, "video-frame");
  store.inference("Hand", { at: 1200, durationMs: 7 });
  channel = store.snapshot().channels[0];
  assert.equal(channel.inferenceFps, 0);
});

test("point trails normalize coordinates, expire old samples and ignore lost points", () => {
  const store = new CameraInputDebugStore({ trailMs: 100 });
  store.setEnabled(true);
  store.point("Drum", "raw-hand", { x: 50, y: 25, slot: 0, present: true }, { at: 0, width: 100, height: 100 });
  store.point("Drum", "raw-hand", { x: 75, y: 50, slot: 0, present: true }, { at: 50, width: 100, height: 100 });
  store.point("Drum", "raw-hand", { x: 10, y: 10, slot: 0, present: false }, { at: 80, width: 100, height: 100 });
  store.point("Drum", "raw-hand", { x: 100, y: 100, slot: 0, present: true }, { at: 160, width: 100, height: 100 });
  const trail = store.snapshot().channels[0].trails["raw-hand:0"];
  assert.deepEqual(trail.map(p => [p.x, p.y]), [[1, 1]]);
});

test("events are bounded and snapshots do not expose mutable store objects", () => {
  const store = new CameraInputDebugStore({ eventLimit: 2 });
  store.setEnabled(true);
  store.event("Grip", "A", { value: 1 }, 0);
  store.event("Grip", "B", { value: 2 }, 1);
  store.event("Grip", "C", { value: 3 }, 2);
  const first = store.snapshot();
  assert.deepEqual(first.channels[0].events.map(e => e.type), ["B", "C"]);
  first.channels[0].events[0].data.value = 99;
  assert.equal(store.snapshot().channels[0].events[0].data.value, 2);
});
