import test from "node:test";
import assert from "node:assert/strict";
import { NoteEaterAudio } from "../src/noteEater/audio.js";
const flush = () => new Promise(resolve => setImmediate(resolve));

function audioFixture() {
  const starts = [], sources = [], levels = [];
  const param = () => ({ value: 0, setValueAtTime(value) { this.value = value; }, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {}, setTargetAtTime() {}, cancelScheduledValues() {} });
  const node = extra => ({ connect() {}, disconnect() {}, ...extra });
  const source = kind => {
    const s = node({ frequency: param(), kind, stops: [], start(at) { starts.push({ kind, at, source: this }); }, stop(at) { this.stops.push(at); } });
    sources.push(s); return s;
  };
  const audio = new NoteEaterAudio();
  audio.context = { state: "running", currentTime: 1.137, resume: async () => {}, createGain: () => node({ gain: param() }),
    createOscillator: () => source("tone"), createBufferSource: () => source("noise"),
    createBiquadFilter: () => node({ frequency: param(), Q: param() }), createStereoPanner: () => node({ pan: param() }),
    close: async () => { audio.contextClosed = true; } };
  audio.master = node({ gain: { ...param(), setValueAtTime(value) { levels.push(value); } } });
  audio.noiseBuffer = {};
  return { audio, starts, sources, levels };
}

test("all four bite attack layers start immediately, with short stereo echoes scheduled separately", () => {
  const { audio, starts } = audioFixture(); audio.note(60);
  assert.deepEqual(starts.slice(0, 4).map(s => s.at), Array(4).fill(1.137));
  assert.deepEqual(starts.slice(4).map(s => s.at), [1.137 + .105, 1.137 + .175]);
  assert.deepEqual(starts.slice(0, 4).map(s => Math.round(s.source.frequency.value)), [262, 262, 523, 1047]);
  audio.stop();
});

test("denser percussion uses noise and all future voices, including echoes, cancel on pause/dispose", () => {
  const { audio, starts, sources, levels } = audioFixture();
  audio.note(69); audio.getGroove = () => 85; audio.beat = 2; audio.nextBeat = audio.context.currentTime; audio.schedule();
  assert.ok(starts.filter(s => s.kind === "noise").length >= 2);
  assert.equal(audio.voices.size, starts.length);
  audio.stop(); assert.equal(audio.voices.size, 0); assert.equal(levels.at(-1), 0);
  assert.ok(sources.every(s => s.stops.length === 2));
  const count = starts.length; audio.setEnabled(false); audio.note(64); assert.equal(starts.length, count);
  audio.setEnabled(true); audio.note(64); assert.ok(starts.length > count);
  audio.dispose(); assert.equal(audio.context, null); assert.equal(audio.noiseBuffer, null); assert.ok(audio.contextClosed);
});

test("passed notes stay quiet and use only one voice", () => {
  const { audio, starts } = audioFixture(); audio.note(67, true); assert.equal(starts.length, 1); audio.stop();
});

test("melody waits for audio resume, preserves lead order and cancellation cannot resurrect playback", async () => {
  let resume;
  const { audio } = audioFixture(), played = [];
  audio.context.state = "suspended"; audio.context.currentTime = 2;
  audio.enable = () => new Promise(resolve => { resume = () => { audio.context.state = "running"; resolve(); }; });
  audio.note = (midi, quiet, opts) => played.push([midi, opts.at]);
  const melody = [{ midi: 69 }, { midi: 60 }, { midi: 69 }, { midi: 64 }]; audio.playMelody(melody);
  assert.equal(played.length, 0); resume(); await flush(); assert.deepEqual(played.map(n => n[0]), [69, 60, 69, 64]);
  assert.ok(played.every((n, i) => i === 0 || n[1] > played[i - 1][1])); audio.stop(); played.length = 0;
  audio.playMelody(melody); audio.stop(); resume(); await flush(); assert.equal(played.length, 0);
});
