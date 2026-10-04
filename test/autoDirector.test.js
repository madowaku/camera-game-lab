import test from "node:test";
import assert from "node:assert/strict";
import { DirectorEventBus } from "../src/creator/DirectorEventBus.js";
import { DirectorRecorder } from "../src/creator/DirectorRecorder.js";
import { AutoDirector } from "../src/creator/AutoDirector.js";
import { softServeDirectorProfile as profile } from "../src/creator/profiles/softServeDirector.js";
import { SoftServeDirectorEvents } from "../src/softServe/directorEvents.js";
import { SoftServeGame } from "../src/games/softServe.js";
import { exportCapability } from "../src/creator/Export.js";
import { canShareVideo } from "../src/creator/Share.js";

const event = (type, timestamp, priority) => ({ type, timestamp, priority });
const frames = (start, end, size = 100) => Array.from({ length: Math.floor((end - start) / 100) + 1 }, (_, i) => ({ at: start + i * 100, blob: { size } }));
test("director bus forwards millisecond timestamps and rejects malformed events", () => {
  const bus = new DirectorEventBus(profile), received = [], off = bus.subscribe(e => received.push(e));
  assert.equal(bus.emit(event("FAKE", 10)), null); assert.equal(bus.emit(event("HERO", NaN)), null);
  const hero = bus.emit({ ...event("HERO", 15423), score: 123, metadata: { outcome: "clean" } });
  assert.equal(hero.timestamp, 15423); assert.equal(hero.priority, 100); assert.equal(received[0], hero);
  off(); bus.emit(event("GAME_END", 19000)); assert.equal(received.length, 1);
});
test("SOFT SERVE reports real attachment, first cream, combos, completion and only one final bite", () => {
  const game = new SoftServeGame(), events = [], tracker = new SoftServeDirectorEvents(e => events.push(e));
  let clock = 0;
  while (game.maxAmount < 6 && clock < 20000) {
    clock += 20;
    game.step(20, { hand: { x: .5 + Math.sin(clock / 230) * Math.max(.025, .105 - game.amount * .007) * .9, y: .72 } });
    tracker.observe(game, clock);
  }
  game.completeServe(); tracker.observe(game, clock);
  while (!game.result) { game.bite(); clock += 400; tracker.observe(game, clock); }
  tracker.observe(game, clock + 100);
  for (const type of ["FIRST_ACTION", "FIRST_SUCCESS", "COMBO", "BIG_SUCCESS", "HERO", "REACTION_WINDOW"]) assert.ok(events.some(e => e.type === type), type);
  assert.equal(events.filter(e => e.type === "HERO").length, 1);
  assert.equal(events.find(e => e.type === "HERO").timestamp, clock);
});
test("SOFT SERVE reports recoverable wobble and a collapse without inventing HERO", () => {
  const game = new SoftServeGame(), events = [], tracker = new SoftServeDirectorEvents(e => events.push(e));
  Object.assign(game, { phase: "serve", amount: 4, maxAmount: 4, stability: .4, lean: .3 });
  tracker.observe(game, 5000); tracker.observe(game, 5100);
  game.finish("splat"); tracker.observe(game, 5200);
  assert.equal(events.filter(e => e.type === "NEAR_MISS").length, 1);
  assert.ok(events.some(e => e.type === "FAIL")); assert.ok(!events.some(e => e.type === "HERO"));
});
test("rolling recorder retains twelve seconds and pins HERO minus five plus three even after expiry", async () => {
  const recorder = new DirectorRecorder(profile);
  for (const frame of frames(0, 20000)) recorder.append(frame);
  assert.equal(recorder.ring[0].at, 8000);
  recorder.mark(event("HERO", 20000), profile);
  for (const frame of frames(20100, 40000)) recorder.append(frame);
  const kept = await recorder.finish();
  assert.ok(kept.some(f => f.at === 15000)); assert.ok(kept.some(f => f.at === 20000)); assert.ok(kept.some(f => f.at === 23000));
  assert.equal(recorder.ring[0].at, 28000);
  recorder.dispose(); assert.equal(recorder.allFrames().length, 0);
});
test("recorder prioritizes HERO over later fallback and keeps an early falling-cream hook", () => {
  const recorder = new DirectorRecorder(profile);
  for (const frame of frames(0, 2000)) recorder.append(frame);
  recorder.mark(event("FIRST_SUCCESS", 1500), profile);
  for (const frame of frames(2100, 16000)) recorder.append(frame);
  recorder.mark(event("HERO", 16000), profile); recorder.mark(event("BIG_SUCCESS", 17000, 999), profile);
  assert.equal(recorder.windows.get("moment").event.type, "HERO");
  assert.ok(recorder.allFrames().some(f => f.at === 1500));
});
test("memory pressure lowers recording quality while retaining both ends of the reaction", () => {
  const recorder = new DirectorRecorder({ maxBytes: 7000 });
  recorder.mark(event("HERO", 1000), profile);
  for (const frame of frames(0, 4000, 400)) recorder.append(frame);
  assert.ok(recorder.bytes <= 7000); assert.equal(recorder.width, 270); assert.equal(recorder.fps, 8);
  assert.ok(recorder.allFrames().some(f => f.at === 0)); assert.ok(recorder.allFrames().some(f => f.at === 4000));
});
test("15 and 7 second plans include HERO and three seconds of reaction at real speed", () => {
  const director = new AutoDirector(profile), all = frames(0, 25000);
  const events = [event("GAME_START", 0), event("FIRST_SUCCESS", 2000), event("NEAR_MISS", 10000), event("BIG_SUCCESS", 17000, 999), event("HERO", 22000, 1), event("GAME_END", 25000)];
  for (const format of ["15", "7"]) {
    const plan = director.plan(all, events, format);
    assert.ok(plan.duration <= Number(format) * 1000); assert.equal(plan.heroTimestamp, 22000);
    assert.ok(plan.segments.some(s => s.kind === "HERO" && s.from <= 22000 && s.to > 22000));
    const reaction = plan.segments.find(s => s.kind === "REACTION");
    assert.equal(reaction.to, 25000); assert.equal(reaction.duration, reaction.to - reaction.from);
    assert.equal(plan.segments.at(-1).duration, 1500);
  }
  assert.equal(director.plan(all, events).segments[0].kind, "HOOK");
});
test("fallback ordering is BIG_SUCCESS then COMBO then NEAR_MISS and includes final failure reaction", () => {
  const director = new AutoDirector(profile), all = frames(0, 15000);
  const candidates = [event("NEAR_MISS", 4000), event("COMBO", 6000), event("BIG_SUCCESS", 9000)];
  for (const type of ["BIG_SUCCESS", "COMBO", "NEAR_MISS"]) {
    const plan = director.plan(all, candidates, "7"); assert.equal(plan.moment, type); assert.equal(plan.heroTimestamp, null);
    candidates.splice(candidates.findIndex(e => e.type === type), 1);
  }
  const plan = director.plan(all, [event("COMBO", 6000), event("FAIL", 12000)], "15");
  assert.equal(plan.segments.find(s => s.kind === "REACTION").to, 15000);
});
test("short early rounds stay within available source frames and still show a useful end card", () => {
  const director = new AutoDirector(profile);
  assert.equal(director.plan([], [], "15"), null);
  for (const format of ["15", "7"]) {
    const plan = director.plan(frames(0, 3600), [event("HERO", 600)], format);
    assert.ok(plan.duration <= Number(format) * 1000);
    assert.ok(plan.segments.filter(s => s.from !== undefined).every(s => s.from >= 0 && s.to <= 3600));
  }
});
test("future LOOP output requires an explicit repeatable moment and stays within two to four seconds", () => {
  const director = new AutoDirector(profile), all = frames(0, 10000);
  assert.equal(director.plan(all, [event("COMBO", 5000)], "loop"), null);
  const plan = director.plan(all, [{ ...event("COMBO", 5000), metadata: { loopable: true, loopDuration: 6000 } }], "loop");
  assert.equal(plan.duration, 4000); assert.equal(plan.segments.length, 1); assert.equal(plan.segments[0].kind, "LOOP");
});
test("native video capabilities choose a supported codec and handle unavailable or throwing file sharing", () => {
  assert.equal(exportCapability({}).available, false);
  const scope = { MediaRecorder: { isTypeSupported: type => type === "video/mp4" }, HTMLCanvasElement: { prototype: { captureStream() {} } } };
  assert.deepEqual(exportCapability(scope), { available: true, mimeType: "video/mp4" });
  assert.equal(canShareVideo({}, { canShare: () => { throw Error("blocked"); }, share() {} }), false);
  assert.equal(canShareVideo({}, { canShare: () => true, share() {} }), true);
});
