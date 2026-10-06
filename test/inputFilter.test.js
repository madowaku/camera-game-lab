import test from "node:test";
import assert from "node:assert/strict";
import { BodyInput } from "../src/input/bodyInput.js";
import { OneEuroFilter, OneEuroFilter2D } from "../src/input/oneEuroFilter.js";

test("One Euro filter smooths ordinary motion and snaps after a stale gap", () => {
  const filter = new OneEuroFilter();
  assert.equal(filter.filter(.25, 0), .25);
  const moved = filter.filter(.75, 16);
  assert.ok(moved > .25 && moved < .75);
  assert.equal(filter.filter(.4, 1200), .4);
});

test("adaptive beta follows a fast change more closely than a fixed low-pass", () => {
  const fixed = new OneEuroFilter({ minCutoff: 1, beta: 0, dCutoff: 1 });
  const adaptive = new OneEuroFilter({ minCutoff: 1, beta: .2, dCutoff: 1 });
  fixed.filter(0, 0);
  adaptive.filter(0, 0);
  const a = fixed.filter(1, 16);
  const b = adaptive.filter(1, 16);
  assert.ok(b > a);
  assert.ok(b < 1);
});

test("2D filter resets both axes together", () => {
  const filter = new OneEuroFilter2D();
  filter.filter(.2, .8, 0);
  filter.filter(.9, .1, 16);
  filter.reset();
  assert.deepEqual(filter.filter(.4, .6, 32), { x: .4, y: .6 });
});

test("BodyInput prefers requestVideoFrameCallback and cancels the same scheduler", () => {
  let scheduled = null;
  let cancelled = null;
  const video = {
    requestVideoFrameCallback(callback) {
      scheduled = callback;
      return 17;
    },
    cancelVideoFrameCallback(id) {
      cancelled = id;
    }
  };
  const input = new BodyInput(video);
  input.running = true;
  input.scheduleFrame();
  assert.equal(typeof scheduled, "function");
  assert.equal(input.frameKind, "video");
  assert.equal(input.frameId, 17);
  input.stop();
  assert.equal(cancelled, 17);
  assert.equal(input.frameId, null);
});
