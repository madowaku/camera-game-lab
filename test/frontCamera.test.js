import test from "node:test";
import assert from "node:assert/strict";
import { openFrontCamera } from "../src/input/frontCamera.js";

const constraints = { audio: false, video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } } };
const constraintError = (constraint) => Object.assign(new Error("Unsupported constraint"), { name: "OverconstrainedError", constraint });
function camera(facing, modes = []) {
  let stops = 0;
  const track = { getSettings: () => ({ facingMode: facing }), getCapabilities: () => ({ facingMode: modes }), stop: () => stops++ };
  return { stream: { getVideoTracks: () => [track], getTracks: () => [track] }, stops: () => stops };
}

test("phone camera selection requires the front camera while preserving landscape resolution", async () => {
  const front = camera("user");
  let requested;
  const stream = await openFrontCamera({ getUserMedia: async (value) => { requested = value; return front.stream; } }, constraints);
  assert.equal(stream, front.stream);
  assert.deepEqual(requested.video.facingMode, { exact: "user" });
  assert.deepEqual(requested.video.width, { ideal: 1280 });
  assert.deepEqual(requested.video.height, { ideal: 720 });
  assert.equal(requested.audio, false);
  assert.equal(constraints.video.facingMode, "user");
});

test("a browser returning a rear camera despite the exact request cannot enter the game", async () => {
  const rear = camera("environment");
  await assert.rejects(openFrontCamera({ getUserMedia: async () => rear.stream }, constraints), { name: "FrontCameraUnavailableError" });
  assert.equal(rear.stops(), 1);
});

test("a PC webcam without facing metadata remains usable after a facing-only constraint failure", async () => {
  const webcam = camera(undefined);
  const requests = [];
  const stream = await openFrontCamera({ getUserMedia: async (value) => {
    requests.push(value);
    if (requests.length === 1) throw constraintError("facingMode");
    return webcam.stream;
  } }, constraints);
  assert.equal(stream, webcam.stream);
  assert.deepEqual(requests[1].video.facingMode, { ideal: "user" });
  assert.deepEqual(requests[1].video.width, constraints.video.width);
  assert.equal(webcam.stops(), 0);
});

test("the PC compatibility retry never accepts an identified rear camera", async () => {
  const rear = camera("environment");
  let requests = 0;
  await assert.rejects(openFrontCamera({ getUserMedia: async () => {
    if (++requests === 1) throw constraintError("facingMode");
    return rear.stream;
  } }, constraints), { name: "FrontCameraUnavailableError" });
  assert.equal(requests, 2);
  assert.equal(rear.stops(), 1);
});

test("rear-only capabilities are rejected even if settings omit facingMode", async () => {
  const rear = camera(undefined, ["environment"]);
  await assert.rejects(openFrontCamera({ getUserMedia: async () => rear.stream }, constraints), { name: "FrontCameraUnavailableError" });
  assert.equal(rear.stops(), 1);
});

for (const error of [Object.assign(new Error("Permission denied"), { name: "NotAllowedError" }), constraintError("width")]) {
  test(`${error.name} (${error.constraint ?? "permission"}) does not retry camera permission or relax constraints`, async () => {
    let requests = 0;
    await assert.rejects(openFrontCamera({ getUserMedia: async () => { requests++; throw error; } }, constraints), (actual) => actual === error);
    assert.equal(requests, 1);
  });
}

test("a camera start cancelled while permission is pending releases the acquired stream", async () => {
  const front = camera("user");
  const cancelled = new DOMException("Cancelled", "AbortError");
  await assert.rejects(openFrontCamera({ getUserMedia: async () => front.stream }, constraints, () => { throw cancelled; }), (error) => error === cancelled);
  assert.equal(front.stops(), 1);
});

test("a cancelled start cannot acquire another camera through the compatibility retry", async () => {
  let requests = 0;
  await assert.rejects(openFrontCamera({ getUserMedia: async () => { requests++; throw constraintError("facingMode"); } }, constraints,
    () => { throw new DOMException("Cancelled", "AbortError"); }), { name: "AbortError" });
  assert.equal(requests, 1);
});

test("missing front-camera hardware reports a camera-selection error without retrying", async () => {
  let requests = 0;
  await assert.rejects(openFrontCamera({ getUserMedia: async () => { requests++; throw new DOMException("No camera", "NotFoundError"); } }, constraints), { name: "FrontCameraUnavailableError" });
  assert.equal(requests, 1);
});
