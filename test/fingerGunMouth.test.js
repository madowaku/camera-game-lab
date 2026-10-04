import test from "node:test";
import assert from "node:assert/strict";
import { FingerGunInput } from "../src/input/fingerGunInput.js";
import { BodyInput } from "../src/input/bodyInput.js";
import { FaceInput } from "../src/input/faceInput.js";
import { experiments } from "../src/platform/experiments.js";

function fixture() {
  const video = { videoWidth: 100, videoHeight: 100, clientWidth: 100, clientHeight: 100 };
  const points = Array.from({ length: 21 }, () => ({ x: .5, y: .5 }));
  points[0] = { x: .5, y: .8 }; points[9] = { x: .5, y: .55 };
  [5, 6, 7, 8].forEach((i, n) => { points[i] = { x: .5, y: .55 - n * .1 }; });
  const shots = [], mouths = [];
  let target = { id: 1, x: .5, y: .055, radius: .09 }, timestamp = 0;
  const input = new FingerGunInput(video, {
    getTarget: () => target, onShot: shot => shots.push(shot), onMouth: mouth => mouths.push(mouth)
  });
  const feed = (open = false, count = 8, { hand = true, face = true } = {}) => {
    for (let i = 0; i < count; i++) {
      const lips = [];
      lips[61] = { x: .4, y: .6 }; lips[291] = { x: .6, y: .6 };
      lips[13] = { x: .5, y: .6 }; lips[14] = { x: .5, y: open ? .72 : .61 };
      input.processResult({ hand: hand ? { landmarks: [points] } : {}, face: { faceLandmarks: face ? [lips] : [] } }, timestamp);
      timestamp += 50;
    }
  };
  return { input, shots, mouths, feed, setTarget: value => { target = value; }, gap: () => { timestamp += 500; } };
}

test("ten closed-to-open mouth actions each fire once with finger aim", () => {
  const f = fixture(); f.feed(false, 20);
  assert.equal(f.input.mouthInput.currentMouth.ready, true);
  for (let i = 0; i < 10; i++) {
    f.feed(true); assert.equal(f.shots.length, i + 1);
    f.feed(true); assert.equal(f.shots.length, i + 1);
    f.feed(false);
  }
  assert.ok(f.shots.every(shot => Math.abs(shot.x - .5) < 1e-9 && Math.abs(shot.y - .055) < 1e-9));
});

test("an initially open mouth cannot calibrate or fire; brief lip motion does not fire", () => {
  const f = fixture(); f.feed(true, 40);
  assert.equal(f.input.mouthInput.currentMouth.ready, false); assert.equal(f.shots.length, 0);
  f.feed(false, 20); f.feed(true, 1); f.feed(false, 8);
  assert.equal(f.input.mouthInput.currentMouth.ready, true); assert.equal(f.shots.length, 0);
});

test("off-target mouth shots keep the current aim so the game can count misses", () => {
  const f = fixture(); f.setTarget({ id: 1, x: .8, y: .8, radius: .09 });
  f.feed(false, 20); assert.equal(f.input.currentAim.onTarget, false);
  f.feed(true); assert.equal(f.shots.length, 1); assert.equal(f.shots[0].x, .5);
});

test("aim alone cannot fire during thirty seconds of closed-mouth input", () => {
  const f = fixture(); f.feed(false, 600);
  assert.equal(f.shots.length, 0); assert.equal(f.input.currentAim.onTarget, true);
});

for (const loss of ["hand", "face", "gap", "target"]) {
  test(`${loss} loss cannot fire on return with a held-open mouth`, () => {
    const f = fixture(); f.feed(false, 20);
    if (loss === "gap") f.gap();
    else if (loss === "target") { f.setTarget(null); f.feed(true); f.setTarget({ id: 2, x: .5, y: .055, radius: .09 }); }
    else f.feed(true, 8, { [loss]: false });
    f.feed(true, 20); assert.equal(f.shots.length, 0);
    f.feed(false); f.feed(true); assert.equal(f.shots.length, 1);
  });
}

test("a new target cannot repeat a shot while the mouth stays open", () => {
  const f = fixture(); f.feed(false, 20); f.feed(true); assert.equal(f.shots.length, 1);
  f.setTarget({ id: 2, x: .5, y: .055, radius: .09 }); f.feed(true, 20);
  assert.equal(f.shots.length, 1);
  f.feed(false); f.feed(true); assert.equal(f.shots.length, 2);
});

test("the combined recognizer sends the same frame and timestamp to both models and closes both", async t => {
  const calls = [], closed = [];
  t.mock.method(BodyInput.prototype, "createRecognizer", async () => ({
    recognizeForVideo: (...args) => { calls.push(args); return "hand"; }, close: () => closed.push("hand")
  }));
  t.mock.method(FaceInput.prototype, "createRecognizer", async () => ({
    detectForVideo: (...args) => { calls.push(args); return "face"; }, close: () => closed.push("face")
  }));
  const f = fixture(), recognizer = await f.input.createRecognizer({}, "GPU");
  assert.deepEqual(recognizer.recognizeForVideo(f.input.video, 123), { hand: "hand", face: "face" });
  assert.deepEqual(calls, [[f.input.video, 123], [f.input.video, 123]]);
  recognizer.close(); assert.deepEqual(closed, ["hand", "face"]);
});

test("failure to initialize the face model closes the already-created hand model", async t => {
  let closed = 0;
  t.mock.method(BodyInput.prototype, "createRecognizer", async () => ({ close: () => closed++ }));
  t.mock.method(FaceInput.prototype, "createRecognizer", async () => { throw new Error("face initialization failed"); });
  await assert.rejects(fixture().input.createRecognizer({}, "GPU"), /face initialization failed/);
  assert.equal(closed, 1);
});

test("throttled frames do not erase a valid aim and mouth calibration", () => {
  const f = fixture(); f.feed(false, 20); const aim = { ...f.input.currentAim };
  f.input.processResult(null, 1001);
  assert.deepEqual(f.input.currentAim, aim); assert.equal(f.input.mouthInput.currentMouth.ready, true);
});

test("finger gun discovery advertises hand and mouth input without a microphone", () => {
  const game = experiments.find(g => g.id === "solo-finger-gun");
  assert.deepEqual(game.input, ["HAND", "MOUTH"]); assert.equal(game.requiresMicrophone, false);
});
