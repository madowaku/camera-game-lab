import test from "node:test";
import assert from "node:assert/strict";
import { composeNoteEaterSong, SONG_BAR, SONG_CHORDS, SONG_LENGTH, SONG_STYLES } from "../src/noteEater/songDirector.js";

const melody = [
  { midi: 60, type: 0, at: 550 },
  { midi: 64, type: 2, at: 820 },
  { midi: 67, type: 3, at: 1920 },
  { midi: 69, type: 4, at: 2800 },
  { midi: 67, type: 3, at: 8000 },
  { midi: 60, type: 0, at: 18300 },
  { midi: 62, type: 1, at: 27100 },
];

test("NOTE EATER song keeps every eaten pitch in the original order", () => {
  for (const style of SONG_STYLES) {
    const song = composeNoteEaterSong(melody, { style });
    assert.deepEqual(song.lead.map(n => n.midi), melody.map(n => n.midi));
    assert.deepEqual(song.lead.map(n => n.type), melody.map(n => n.type));
    assert.ok(song.lead.every((n, i) => !i || n.at > song.lead[i - 1].at));
    assert.ok(song.lead[0].at < 1);
    assert.ok(song.lead.at(-1).at > 26);
  }
});

test("NOTE EATER preserves free player rhythm rather than evenly spacing notes", () => {
  const song = composeNoteEaterSong(melody);
  const gaps = song.lead.slice(1).map((n, i) => n.at - song.lead[i].at);
  assert.ok(gaps[0] < .4, "rapid opening gesture stays rapid");
  assert.ok(gaps[3] > 4, "long rest is still a long rest");
  assert.ok(new Set(gaps.map(n => Math.round(n * 10))).size >= 4);
});

test("three arrangements are structurally and rhythmically different", () => {
  const versions = SONG_STYLES.map(style => composeNoteEaterSong(melody, { style }));
  assert.deepEqual(SONG_STYLES, ["dream", "pop", "festival"]);
  assert.equal(new Set(versions.map(song => JSON.stringify(song.accompaniment))).size, 3);
  assert.ok(versions.every(song => song.accompaniment.length > 70));
  assert.ok(versions.every(song => song.sections.length === 4 && song.duration > SONG_LENGTH));
  assert.ok(versions[0].accompaniment.some(e => e.instrument === "sparkle"));
  assert.ok(versions[1].accompaniment.some(e => e.instrument === "pluck"));
  assert.ok(versions[2].accompaniment.some(e => e.instrument === "brass"));
});

test("the four harmonic roots and final C resolution are composed on a beat grid", () => {
  assert.deepEqual(SONG_CHORDS.map(c => c.name), ["C6", "Am7", "Fmaj9", "Gsus"]);
  const song = composeNoteEaterSong(melody, { style: "festival" });
  const end = song.accompaniment.filter(e => e.kind === "tone" && e.at > SONG_BAR * 13 + 2.7 * (SONG_BAR / 4));
  assert.ok(end.some(e => e.midi === 48));
  assert.ok(end.some(e => e.midi === 60));
  assert.ok(end.some(e => e.midi === 64));
  assert.ok(song.accompaniment.every(e => e.at >= 0 && e.at < SONG_LENGTH));
});

test("phrase answers appear only after long gaps and never in the middle of a quick phrase", () => {
  const dense = [{ midi: 60, at: 2100 }, { midi: 64, at: 2420 }, { midi: 67, at: 2670 }];
  const denseSong = composeNoteEaterSong(dense);
  assert.equal(denseSong.accompaniment.filter(e => Math.abs(e.at - 2.62) < .02 && e.instrument === "sparkle").length, 0);
  const sparse = composeNoteEaterSong([{ midi: 60, at: 2200 }, { midi: 64, at: 11000 }]);
  assert.ok(sparse.accompaniment.some(e => e.instrument === "sparkle" && e.at > 2.7 && e.at < 3.5));
});

test("old receipts without timestamps, malformed notes and unknown styles remain safe", () => {
  const song = composeNoteEaterSong([{ midi: 60 }, null, { midi: NaN }, { midi: 67 }, { midi: 999 }], { style: "typo" });
  assert.equal(song.style, "dream");
  assert.deepEqual(song.lead.map(n => n.midi), [60, 67]);
  assert.ok(song.lead.every(n => Number.isFinite(n.at)));
  assert.deepEqual(composeNoteEaterSong([]).lead, []);
  assert.deepEqual(composeNoteEaterSong(melody), composeNoteEaterSong(melody), "repeatable arrangement");
});
