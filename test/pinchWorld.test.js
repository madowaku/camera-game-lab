import test from "node:test";
import assert from "node:assert/strict";
import { PinchWorldGame, PINCH_STAGES, moveInWorld, socketAccepts } from "../src/games/pinchWorld.js";
const frame = (x, y, pinching = false, events = []) => ({ present: true, pinching, pinchPosition: { x, y }, events });
function playing() { const game = new PinchWorldGame(); game.start("demo"); game.step(400, frame(.5, .8)); game.step(800, frame(.5, .8)); assert.equal(game.phase, "playing"); return game; }
function grab(game) { game.step(16, frame(game.object.x, game.object.y)); game.step(16, frame(game.object.x, game.object.y, true, ["PINCH_START"])); }
function move(game, x, y) { for (let i = 0; i < 20; i++) game.step(20, frame(x, y, true, ["PINCH_MOVE"])); }
function place(game) { move(game, game.socket.x, game.socket.y); game.step(16, frame(game.socket.x, game.socket.y, false, ["PINCH_END"])); }
test("wait and countdown require an open, present hand", () => {
  const game = new PinchWorldGame(); game.start(); game.step(2000, { present: false }); assert.equal(game.phase, "wait");
  game.step(1000, frame(.5, .5, true)); assert.equal(game.phase, "wait");
  game.step(400, frame(.5, .5)); assert.equal(game.phase, "countdown");
  game.step(1000, {}); assert.equal(game.phase, "wait");
});
test("a fresh pinch grabs, held overlap cannot vacuum-grab, and duplicate edges cannot retrigger", () => {
  const game = playing(); game.step(16, frame(.8, .8, true, ["PINCH_START"])); assert.equal(game.failedPinches, 1);
  game.step(16, frame(game.object.x, game.object.y, true, ["PINCH_START"])); assert.equal(game.heldObjectId, null);
  grab(game); assert.equal(game.heldObjectId, "object-0");
  game.step(16, frame(game.object.x, game.object.y, true, ["PINCH_START"])); assert.equal(game.successfulGrabs, 1);
});
test("holding follows with light smoothing; release stops instantly without throw velocity", () => {
  const game = playing(); grab(game); const x = game.object.x;
  game.step(16, frame(.5, .5, true)); assert.ok(game.object.x > x && game.object.x < .5);
  game.step(16, frame(.5, .5, false, ["PINCH_END"])); const dropped = { ...game.object };
  game.step(1000, frame(.9, .9)); assert.deepEqual(game.object, dropped); assert.equal(game.accidentalReleases, 1);
});
test("sockets accept matching shape and overlap only", () => {
  const object = { shape: "circle", x: .5, y: .5, radius: .07 };
  assert.equal(socketAccepts(object, { shape: "circle", x: .54, y: .5, radius: .12 }), true);
  assert.equal(socketAccepts(object, { shape: "triangle", x: .5, y: .5, radius: .12 }), false);
  assert.equal(socketAccepts(object, { shape: "circle", x: .8, y: .5, radius: .12 }), false);
});
test("a held square collides with the wall even if the fingertips cross it", () => {
  const game = playing(); grab(game); place(game); assert.equal(game.stage.name, "CARRY"); grab(game);
  move(game, .8, .48); assert.ok(game.object.x <= .455 - game.object.radius); assert.equal(game.blocked, true);
  assert.equal(game.heldObjectId, "object-1");
  move(game, .25, .84); move(game, .8, .84); place(game);
  assert.equal(game.stage.name, "PLACE"); assert.equal(game.completed, 2);
});
test("swept collision blocks tunneling at large steps and permits sliding and return", () => {
  const walls = PINCH_STAGES[1].barriers;
  const blocked = moveInWorld({ x: .2, y: .4 }, { x: .9, y: .4 }, .067, walls);
  assert.ok(blocked.x < .389); assert.equal(blocked.blocked, true);
  const slide = moveInWorld(blocked, { x: .9, y: .9 }, .067, walls); assert.ok(slide.y > .72);
  assert.ok(moveInWorld(slide, { x: .9, y: .9 }, .067, walls).x > .8);
  assert.ok(moveInWorld(blocked, { x: .2, y: .4 }, .067, walls).x < .3);
});
test("brief tracking loss freezes object and elapsed time, then continues the hold", () => {
  const game = playing(); grab(game); const before = { ...game.object }, time = game.elapsedMs;
  game.step(250, { present: false }); assert.deepEqual(game.object, before); assert.equal(game.elapsedMs, time); assert.equal(game.heldObjectId, before.id);
  game.step(16, frame(.4, .4, true, ["PINCH_MOVE"])); assert.equal(game.heldObjectId, before.id); assert.equal(game.trackingDrops, 0);
});
test("long tracking loss gently drops and cannot place or regrab until a fresh neutral edge", () => {
  const game = playing(); grab(game); move(game, game.socket.x, game.socket.y); const before = { ...game.object };
  game.step(300, { present: false }); assert.equal(game.heldObjectId, null); assert.equal(game.completed, 0); assert.equal(game.trackingDrops, 1); assert.deepEqual(game.object, before);
  game.step(16, frame(before.x, before.y, true, ["PINCH_START"])); assert.equal(game.heldObjectId, null);
  grab(game); place(game); assert.equal(game.completed, 1);
});
test("three tasks clear once with correct counters, source and retry reset", () => {
  const game = playing(); grab(game); place(game); grab(game);
  move(game, .2, .84); move(game, .8, .84); place(game); grab(game); place(game);
  assert.equal(game.phase, "result"); assert.equal(game.result.score, 3); assert.equal(game.result.successfulGrabs, 3); assert.equal(game.result.clean, true); assert.equal(game.result.source, "demo");
  const result = game.result; game.step(1000, frame(.5, .5, true, ["PINCH_START"])); assert.equal(game.result, result);
  game.start("camera"); assert.equal(game.stageIndex, 0); assert.equal(game.result, null); assert.equal(game.elapsedMs, 0); assert.equal(game.successfulGrabs, 0);
});
test("manual pause preserves held object and elapsed time", () => {
  const game = playing(); grab(game); const before = { ...game.object }, time = game.elapsedMs;
  game.setPaused(true); game.step(2000, frame(.8, .8, true)); assert.deepEqual(game.object, before); assert.equal(game.elapsedMs, time);
  game.setPaused(false); game.step(16, frame(.3, .6, true)); assert.equal(game.paused, false); assert.equal(game.heldObjectId, before.id);
});
