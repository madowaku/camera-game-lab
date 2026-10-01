import test from "node:test";
import assert from "node:assert/strict";
import { TinyBotDuel } from "../src/games/tinyBotDuel.js";

const players = (x1 = 0, x2 = 0) => [x1, x2].map((faceX, index) => ({ id: index + 1, present: true, calibrated: true, faceX }));
const shot = (playerId) => ({ type: "MOUTH_OPEN_START", playerId });

test("normalized player offsets move each robot independently", () => {
  const game = new TinyBotDuel(); game.start();
  game.step(100, { players: players(-1, 1) });
  assert.ok(game.bots[0].x < 0.32);
  assert.ok(game.bots[1].x > 0.68);
});

test("held mouth state does not auto-fire and repeated edges respect the cooldown", () => {
  const game = new TinyBotDuel(); game.start();
  game.step(50, { players: players(), events: [shot(1), shot(1)] });
  for (let i = 0; i < 5; i += 1) game.step(50, { players: players().map((p) => ({ ...p, mouthOpen: true })) });
  assert.equal(game.bots[0].shots, 1);
  assert.equal(game.bots[1].shots, 0);
});

test("shots collide, cause knockback and lead to a readable ring-out result", () => {
  const feedback = [];
  const game = new TinyBotDuel({ onFeedback: (type) => feedback.push(type) }); game.start();
  for (let frame = 0; frame < 400 && game.running; frame += 1) {
    game.step(16, { players: players(), events: frame % 25 === 0 ? [shot(1)] : [] });
  }
  assert.ok(feedback.includes("hit"));
  assert.ok(game.bots[0].hits > 0);
  assert.equal(game.result.reason, "RING_OUT");
  assert.equal(game.result.winner, 1);
  assert.equal(game.result.roundCompletion, true);
});

test("one missing player freezes timer, bullets and both robots", () => {
  const game = new TinyBotDuel(); game.start();
  game.step(100, { players: players(), events: [shot(1)] });
  const previous = JSON.stringify({ elapsed: game.elapsedMs, bots: game.bots, bullets: game.bullets });
  for (let i = 0; i < 20; i += 1) game.step(100, { players: players(1, 1).map((p, index) => ({ ...p, present: index === 1 })), events: [shot(2)] });
  assert.equal(JSON.stringify({ elapsed: game.elapsedMs, bots: game.bots, bullets: game.bullets }), previous);
  game.step(100, { players: players() });
  assert.ok(game.elapsedMs > 100);
});

test("unconfirmed calibration cannot advance a competitive round", () => {
  const game = new TinyBotDuel(); game.start();
  game.step(100, { players: players().map((p) => ({ ...p, calibrated: false })) });
  assert.equal(game.elapsedMs, 0);
});

test("five synthetic 30-second rounds complete and rematches reset all game state", () => {
  const game = new TinyBotDuel();
  for (let round = 0; round < 5; round += 1) {
    game.start();
    assert.equal(game.result, null);
    assert.equal(game.bullets.length, 0);
    for (let frame = 0; frame < 300; frame += 1) game.step(100, { players: players() });
    assert.equal(game.result.reason, "TIME");
    assert.equal(game.result.winner, null);
    assert.ok(Math.abs(game.result.durationMs - 30_000) < 0.001);
    assert.equal(game.running, false);
  }
});

test("delayed render frames do not teleport players across the arena", () => {
  const game = new TinyBotDuel(); game.start();
  game.step(10_000, { players: players(1, -1) });
  assert.ok(game.bots[0].x < 0.35);
  assert.ok(game.elapsedMs <= 100.001);
});
