import test from "node:test";
import assert from "node:assert/strict";
import { VoiceInput } from "../src/input/voiceInput.js";

const deferred = () => {
  let resolve;
  const promise = new Promise((done) => { resolve = done; });
  return { promise, resolve };
};
const stream = () => {
  const track = { stopped: false, stop() { this.stopped = true; }, addEventListener() {} };
  return { track, getTracks: () => [track], getAudioTracks: () => [track] };
};
function installMocks(t, { resume = Promise.resolve(), media = Promise.resolve(stream()) } = {}) {
  const contexts = []; const calls = [];
  class Context {
    constructor() { this.state = "running"; this.sampleRate = 48000; contexts.push(this); }
    resume() { return resume; }
    close() { this.state = "closed"; return Promise.resolve(); }
    createMediaStreamSource() { return { connect() {}, disconnect() {} }; }
    createAnalyser() { return { fftSize: 4096, getFloatTimeDomainData() {} }; }
  }
  const originals = new Map(["window", "navigator", "requestAnimationFrame", "cancelAnimationFrame"].map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  Object.defineProperty(globalThis, "window", { configurable: true, value: { AudioContext: Context } });
  Object.defineProperty(globalThis, "navigator", { configurable: true, value: { mediaDevices: { getUserMedia: (constraints) => { calls.push(constraints); return media; } } } });
  globalThis.requestAnimationFrame = () => 1; globalThis.cancelAnimationFrame = () => {};
  t.after(() => { for (const [key, descriptor] of originals) { if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key]; } });
  return { contexts, calls };
}

test("cancelling during AudioContext resume never requests microphone permission afterwards", async (t) => {
  const resume = deferred(); const mock = installMocks(t, { resume: resume.promise });
  const voice = new VoiceInput(); const pending = voice.start();
  voice.stop(); resume.resolve();
  await assert.rejects(pending, { name: "AbortError" });
  assert.equal(mock.calls.length, 0); assert.equal(mock.contexts[0].state, "closed");
});

test("a microphone stream granted after cancellation is stopped, without reviving the input", async (t) => {
  const media = deferred(); const mock = installMocks(t, { media: media.promise });
  const voice = new VoiceInput(); const pending = voice.start();
  await Promise.resolve(); assert.equal(mock.calls.length, 1);
  voice.stop(); const late = stream(); media.resolve(late);
  await assert.rejects(pending, { name: "AbortError" });
  assert.equal(late.track.stopped, true); assert.equal(voice.running, false); assert.equal(voice.context, null);
});

test("normal microphone teardown releases tracks and audio context and clears calibration", async (t) => {
  const mic = stream(); const mock = installMocks(t, { media: Promise.resolve(mic) });
  const voice = new VoiceInput(); await voice.start();
  assert.equal(voice.running, true); voice.tracker.reference = 220;
  voice.stop(); assert.equal(mic.track.stopped, true); assert.equal(mock.contexts[0].state, "closed");
  assert.equal(voice.tracker.reference, null); assert.equal(voice.frameId, null);
});

test("permission rejection leaves no audio context, stream or active sampler", async (t) => {
  const error = new DOMException("denied", "NotAllowedError");
  const mock = installMocks(t, { media: Promise.reject(error) });
  const voice = new VoiceInput(); await assert.rejects(voice.start(), { name: "NotAllowedError" });
  assert.equal(voice.running, false); assert.equal(voice.context, null); assert.equal(mock.contexts[0].state, "closed");
});
