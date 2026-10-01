import test from "node:test";
import assert from "node:assert/strict";
import { recordDuoRound, readDuoRounds, createDuoPlaytestReport } from "../src/duo/telemetry.js";

function installStorage(t, storage) {
  const previous = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: storage });
  t.after(() => {
    if (previous) Object.defineProperty(globalThis, "localStorage", previous);
    else delete globalThis.localStorage;
  });
}

function useStorage(t, stored = new Map()) {
  installStorage(t, {
    getItem: (key) => stored.get(key) ?? null,
    setItem: (key, value) => stored.set(key, value)
  });
  return stored;
}

test("playtest receipts retain the latest 50 rounds and preserve camera/fallback source", (t) => {
  useStorage(t);
  for (let index = 0; index < 55; index += 1) recordDuoRound({
    experiment: "EXP-020", index, source: index % 2 ? "camera" : "fallback",
    roundCompletion: index !== 54, successfulRecoveryCount: 2, lowestInferenceFps: 16
  });
  const rounds = readDuoRounds();
  assert.equal(rounds.length, 50);
  assert.equal(rounds[0].index, 5);
  assert.equal(rounds[49].roundCompletion, false);
  assert.equal(rounds[0].successfulRecoveryCount, 2);
  assert.equal(rounds[0].lowestInferenceFps, 16);
  assert.ok(rounds.some((round) => round.source === "fallback"));
  assert.ok(rounds.every((round) => typeof round.recordedAt === "string"));
});

test("export never infers a human GO verdict from five successful camera rounds", (t) => {
  useStorage(t);
  let last;
  for (let index = 0; index < 5; index += 1) last = recordDuoRound({ experiment: "EXP-020", source: "camera", roundCompletion: true, index });
  const report = createDuoPlaytestReport(last);
  assert.equal(report.rounds.length, 5);
  assert.equal(report.humanVerdict, "NOT_RECORDED");
  assert.equal(JSON.parse(JSON.stringify(report)).format, "tiny-bot-duel-playtest-v1");
});

test("unavailable storage still allows export of the visible round", (t) => {
  installStorage(t, {
    getItem: () => { throw new Error("Storage disabled"); },
    setItem: () => { throw new Error("Storage disabled"); }
  });
  const latest = recordDuoRound({ experiment: "EXP-020", source: "fallback", roundCompletion: true });
  assert.equal(readDuoRounds().length, 0);
  assert.deepEqual(createDuoPlaytestReport(latest).rounds, [latest]);
});

test("corrupt saved JSON cannot prevent starting a fresh playtest log", (t) => {
  useStorage(t, new Map([["camera-game-lab-duo-rounds", "{invalid JSON"]]));
  assert.deepEqual(readDuoRounds(), []);
  const latest = recordDuoRound({ experiment: "EXP-020", source: "camera", roundCompletion: true });
  assert.deepEqual(readDuoRounds(), [latest]);
  assert.deepEqual(createDuoPlaytestReport(latest).rounds, [latest]);
});
