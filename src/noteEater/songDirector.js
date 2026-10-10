// Pure, deterministic 30-second arranger for NOTE EATER result playback.
// It never changes the notes or the order chosen by the player.
export const SONG_STYLES = Object.freeze(["dream", "pop", "festival"]);
export const SONG_BPM = 112;
export const SONG_BEAT = 60 / SONG_BPM;
export const SONG_BAR = SONG_BEAT * 4;
export const SONG_LENGTH = SONG_BAR * 14;

export const SONG_CHORDS = Object.freeze([
  { name: "C6", bass: 48, tones: [60, 64, 67, 69] },
  { name: "Am7", bass: 45, tones: [57, 60, 64, 67] },
  { name: "Fmaj9", bass: 41, tones: [57, 60, 64, 67] },
  { name: "Gsus", bass: 43, tones: [55, 62, 67, 69] },
]);

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const time = value => Math.round(value * 10000) / 10000;
const tone = (events, at, midi, instrument, volume, duration, pan = 0) => {
  if (at >= 0 && at < SONG_LENGTH) events.push({ kind: "tone", at: time(at), midi, instrument, volume, duration, pan });
};
const drum = (events, at, instrument, volume) => {
  if (at >= 0 && at < SONG_LENGTH) events.push({ kind: "drum", at: time(at), instrument, volume });
};

function readLead(melody) {
  const valid = (Array.isArray(melody) ? melody : []).filter(n => Number.isFinite(n?.midi) && n.midi >= 36 && n.midi <= 96);
  let previous = -0.05;
  return valid.map((note, i) => {
    // Old receipts did not necessarily include timestamps; keep those playable.
    const raw = Number.isFinite(note.at)
      ? clamp(note.at / 1000, 0, SONG_LENGTH - .55)
      : valid.length === 1 ? 12 : 1 + i * 26 / (valid.length - 1);
    const grid = SONG_BEAT / 4;
    const softened = raw + (Math.round(raw / grid) * grid - raw) * .22;
    const at = clamp(Math.max(previous + .035, softened), 0, SONG_LENGTH - .25);
    previous = at;
    return { kind: "lead", at: time(at), midi: note.midi, type: note.type ?? 2, sourceAt: note.at ?? null };
  });
}

function addHarmony(events, style, bar, chord, section) {
  const start = bar * SONG_BAR;
  if (style === "dream") {
    chord.tones.forEach((midi, i) => tone(events, start, midi, "pad", .024 + section * .004, SONG_BAR * 1.4, (i - 1.5) * .27));
    for (const beat of [0, 2]) tone(events, start + beat * SONG_BEAT, chord.bass, "bass", .056, SONG_BEAT * 1.7);
    if (section >= 1) for (let i = 0; i < 4; i++) {
      const midi = chord.tones[(i + bar) % 4] + 12;
      tone(events, start + (i + .5) * SONG_BEAT, midi, "sparkle", .022, SONG_BEAT * 1.4, i % 2 ? -.45 : .45);
    }
    if (bar < 12) for (const beat of [0, 2]) drum(events, start + beat * SONG_BEAT, "shaker", .014);
  } else if (style === "pop") {
    chord.tones.slice(0, 3).forEach((midi, i) => {
      for (const beat of [.5, 2.5]) tone(events, start + beat * SONG_BEAT, midi, "pluck", .038, SONG_BEAT * .7, (i - 1) * .35);
    });
    for (const beat of [0, 1.5, 2.5, 3.5]) tone(events, start + beat * SONG_BEAT, chord.bass + (beat === 3.5 ? 12 : 0), "bass", .09, SONG_BEAT * .65);
    for (let i = 0; i < 8; i++) drum(events, start + i * SONG_BEAT / 2, "hat", .018 + (i % 2) * .009);
    for (const beat of [0, 2]) drum(events, start + beat * SONG_BEAT, "kick", .09);
    for (const beat of [1, 3]) drum(events, start + beat * SONG_BEAT, "clap", .052);
    if (section >= 2) tone(events, start + 3.5 * SONG_BEAT, chord.tones[(bar + 1) % 4] + 12, "sparkle", .042, SONG_BEAT * .5);
  } else {
    const loud = section >= 2 ? .065 : .043;
    chord.tones.slice(0, 3).forEach((midi, i) => {
      for (const beat of [0, 2, 3.5]) tone(events, start + beat * SONG_BEAT, midi, "brass", loud, SONG_BEAT * (beat === 0 ? 1.4 : .65), (i - 1) * .35);
    });
    for (const beat of [0, 1.5, 2, 3.5]) tone(events, start + beat * SONG_BEAT, chord.bass, "bass", .10, SONG_BEAT * .85);
    for (const beat of [0, 2]) drum(events, start + beat * SONG_BEAT, "kick", .11);
    for (const beat of [1, 3]) drum(events, start + beat * SONG_BEAT, "clap", .066);
    for (let i = 0; i < 8; i++) drum(events, start + i * SONG_BEAT / 2, "hat", .015);
    if (section >= 2 && bar < 13) for (const beat of [3.25, 3.5, 3.75]) drum(events, start + beat * SONG_BEAT, "clap", .027);
  }
}

function addResponses(events, lead, style) {
  // A response only plays in real gaps, so it cannot drown out a player's choice.
  const pentatonic = [60, 62, 64, 67, 69, 72, 74, 76, 79, 81];
  let responses = 0;
  for (let i = 0; i < lead.length && responses < 9; i++) {
    const a = lead[i], next = lead[i + 1]?.at ?? SONG_LENGTH;
    if (next - a.at < 1.15 || a.at > SONG_LENGTH - 2.5) continue;
    if (a.at < SONG_BEAT || a.at >= SONG_BAR * 12) continue;
    const at = a.at + .52;
    const close = pentatonic.reduce((best, n) => Math.abs(n - a.midi) < Math.abs(best - a.midi) ? n : best, 67);
    const answer = pentatonic[Math.max(0, pentatonic.indexOf(close) - 1)];
    tone(events, at, answer, style === "festival" ? "brass" : "sparkle", .024, SONG_BEAT * .75, -.5);
    if (next - a.at > 1.65) tone(events, at + SONG_BEAT / 2, close, "sparkle", .017, SONG_BEAT * 1.1, .5);
    responses++;
  }
}

export function composeNoteEaterSong(melody, { style = "dream" } = {}) {
  const selectedStyle = SONG_STYLES.includes(style) ? style : "dream";
  const lead = readLead(melody);
  const accompaniment = [];
  for (let bar = 0; bar < 14; bar++) {
    const section = bar < 4 ? 0 : bar < 8 ? 1 : bar < 12 ? 2 : 3;
    const chord = SONG_CHORDS[bar === 12 ? 3 : bar === 13 ? 0 : bar % 4];
    addHarmony(accompaniment, selectedStyle, bar, chord, section);
  }
  addResponses(accompaniment, lead, selectedStyle);
  // A deliberate final C-major resolution; the last beat is never just an abrupt stop.
  const finale = SONG_BAR * 13 + SONG_BEAT * 2.75;
  SONG_CHORDS[0].tones.forEach((midi, i) =>
    tone(accompaniment, finale, midi, selectedStyle === "festival" ? "brass" : "pad", .055, 1.6, (i - 1.5) * .25));
  tone(accompaniment, finale, 48, "bass", .12, 1.4);
  drum(accompaniment, finale, "kick", .12);
  if (selectedStyle !== "dream") drum(accompaniment, finale, "clap", .065);
  accompaniment.sort((a, b) => a.at - b.at);
  return {
    style: selectedStyle,
    bpm: SONG_BPM,
    duration: SONG_LENGTH + 1.3,
    lead,
    accompaniment,
    sections: ["intro", "groove", "climax", "finale"],
  };
}
