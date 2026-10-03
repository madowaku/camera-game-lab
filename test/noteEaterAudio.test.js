import test from "node:test";
import assert from "node:assert/strict";
import { NoteEaterAudio } from "../src/noteEater/audio.js";
const flush = () => new Promise(resolve => setImmediate(resolve));

test("bite sound starts at current audio time and is never rounded to a beat", () => {
  const audio = new NoteEaterAudio(), starts = [];
  audio.context = { state: "running", currentTime: 1.137, createGain: () => ({ gain: { setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {}, disconnect() {} }),
    createOscillator: () => ({ frequency: {}, connect() {}, disconnect() {}, start: at => starts.push(at), stop() {} }) };
  audio.master = {}; audio.note(60); assert.deepEqual(starts, [1.137, 1.137]); audio.stop();
});
test("melody waits for audio resume, preserves order and cancellation cannot resurrect playback", async () => {
  let resume;
  const audio = new NoteEaterAudio(), played = [];
  audio.context = {state:"suspended",currentTime:2};audio.master={gain:{setTargetAtTime(){}}};
  audio.enable = () => new Promise(resolve => { resume = () => { audio.context.state = "running"; resolve(); }; });
  audio.tone = (midi, opts) => played.push([midi, opts.at]);
  const melody = [{midi:69},{midi:60},{midi:69},{midi:64}];audio.playMelody(melody);
  assert.equal(played.length,0);resume();await flush();assert.deepEqual(played.map(n=>n[0]),[69,60,69,64]);
  assert.ok(played.every((n,i)=>i===0||n[1]>played[i-1][1]));audio.stop();played.length=0;
  audio.playMelody(melody);audio.stop();resume();await flush();assert.equal(played.length,0);
});
