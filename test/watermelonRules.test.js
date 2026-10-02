import test from "node:test";
import assert from "node:assert/strict";
import {
  WATERMELON_RULES,
  createWatermelonTarget,
  detectDownwardSwing,
  gradeStrike
} from "../src/outcam/watermelonRules.js";

test("watermelon targets stay in the guideable lower-center field", () => {
  const low = createWatermelonTarget(() => 0);
  const high = createWatermelonTarget(() => 1);
  assert.deepEqual(low, { x: 0.2, y: 0.5, radius: WATERMELON_RULES.hitRadius });
  assert.equal(high.x, 0.8);
  assert.ok(Math.abs(high.y - 0.82) < 1e-9);
});

test("strike grading separates hit, close and miss", () => {
  const target = { x: 0.5, y: 0.6 };
  assert.equal(gradeStrike(target, { x: 0.5, y: 0.6 }).grade, "HIT");
  assert.equal(gradeStrike(target, { x: 0.5, y: 0.77 }).grade, "CLOSE");
  assert.equal(gradeStrike(target, { x: 0.5, y: 0.9 }).grade, "MISS");
});

test("only a fast downward hand movement counts as a swing", () => {
  assert.equal(detectDownwardSwing({ x: 0.5, y: 0.3 }, { x: 0.52, y: 0.4 }, 80), true);
  assert.equal(detectDownwardSwing({ x: 0.5, y: 0.4 }, { x: 0.5, y: 0.3 }, 80), false);
  assert.equal(detectDownwardSwing({ x: 0.5, y: 0.3 }, { x: 0.8, y: 0.4 }, 80), false);
  assert.equal(detectDownwardSwing({ x: 0.5, y: 0.3 }, { x: 0.5, y: 0.4 }, 300), false);
});
