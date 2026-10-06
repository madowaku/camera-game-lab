import test from "node:test";
import assert from "node:assert/strict";
import { TwoSlotIdentity } from "../src/input/twoSlotIdentity.js";

test("detector order can reverse without swapping player slots", () => {
  const tracker = new TwoSlotIdentity({ labelPenalty: 1.5, continuousMs: 300 });
  let slots = tracker.update([
    { x: .2, y: .5, label: "Left" },
    { x: .8, y: .5, label: "Right" },
  ], 0);
  assert.equal(slots[0].label, "Left");
  slots = tracker.update([
    { x: .7, y: .5, label: "Right" },
    { x: .3, y: .5, label: "Left" },
  ], 100);
  assert.equal(slots[0].label, "Left");
  assert.equal(slots[0].x, .3);
  assert.equal(slots[1].x, .7);
});

test("a single labelled hand cannot impersonate the missing player", () => {
  const tracker = new TwoSlotIdentity({ labelPenalty: 1.5, continuousMs: 300 });
  tracker.update([
    { x: .2, y: .5, label: "Left" },
    { x: .8, y: .5, label: "Right" },
  ], 0);
  const slots = tracker.update([{ x: .3, y: .5, label: "Right" }], 100);
  assert.equal(slots[0].present, false);
  assert.equal(slots[1].present, true);
  assert.equal(slots[1].label, "Right");
});

test("third observations are ignored and rapid impossible jumps become uncertain", () => {
  const tracker = new TwoSlotIdentity({
    jumpWindowMs: 100,
    jumpDistance: .25,
    ambiguityMargin: .01,
  });
  tracker.update([{ x: .28, y: .5 }, { x: .72, y: .5 }], 0);
  const three = tracker.update([
    { x: .05, y: .9 },
    { x: .29, y: .5 },
    { x: .73, y: .5 },
  ], 40);
  assert.ok(three.every(slot => slot.present));
  const jumped = tracker.update([{ x: .62, y: .5 }, { x: .74, y: .5 }], 80);
  assert.equal(jumped[0].present, false);
  assert.equal(jumped[0].uncertain, true);
});

test("ambiguous overlap does not assign one observation to both slots", () => {
  const tracker = new TwoSlotIdentity({ ambiguityMargin: .12 });
  tracker.update([{ x: .45, y: .5 }, { x: .55, y: .5 }], 0);
  const slots = tracker.update([{ x: .5, y: .5 }, { x: .5, y: .5 }], 30);
  assert.equal(slots.filter(slot => slot.present).length, 0);
});
