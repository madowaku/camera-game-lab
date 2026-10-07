// TECH-003: deliberately independent of the NOTE EATER game and its renderer.
export const ROUND_MS = 30000;
export const NOTES = Object.freeze(['C4', 'D4', 'E4', 'G4', 'A4']);
export const SHAPES = Object.freeze(['●', '▲', '◆', '★', '♥']);
export const clamp = (n, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, n));
export const musicStage = combo => combo >= 20 ? 4 : combo >= 15 ? 3 : combo >= 10 ? 2 : combo >= 5 ? 1 : 0;
export const sectionAt = elapsed => elapsed < 5000 ? 0 : elapsed < 15000 ? 1 : elapsed < 25000 ? 2 : 3;

export class MouthMusicGame {
  constructor(random = Math.random) {
    this.random = random; this.phase = 'countdown'; this.countdown = 0; this.elapsed = 0;
    this.notes = []; this.events = []; this.melody = []; this.combo = 0; this.maxCombo = 0;
    this.eaten = 0; this.chords = 0; this.triads = 0; this.nextSpawn = 0; this.id = 0; this.finaleGroups = 0;
    this.mouth = { x: .5, y: .58 }; this.armed = false; this.paused = false; this.aspect = 1.4;
  }
  disarm() { this.armed = false; }
  setPaused(paused) { if (paused !== this.paused) this.disarm(); this.paused = paused; }
  distance(a, b) { return Math.hypot(a.x - b.x, (a.y - b.y) * this.aspect); }
  spawn() {
    const section = sectionAt(this.elapsed);
    const count = section < 2 ? 1 : section === 2 ? 2 : ++this.finaleGroups % 2 ? 2 : 3;
    const side = Math.floor(this.random() * 4);
    const starts = [{ x: -.08, y: .3 }, { x: 1.08, y: .4 }, { x: .5, y: -.08 }, { x: this.id % 2 ? -.08 : 1.08, y: -.08 }];
    const base = Math.floor(this.random() * NOTES.length);
    for (let i = 0; i < count; i++) {
      const start = { ...starts[side] };
      start.y += i * .07;
      this.notes.push({ id: ++this.id, type: (base + i * 2) % NOTES.length, start, x: start.x, y: start.y,
        born: this.elapsed, travel: [1700, 1400, 1200, 950][section], offset: (i - (count - 1) / 2) * .045 });
    }
    this.nextSpawn = this.elapsed + [1300, 1000, 1150, 850][section];
  }
  step(dt, sample) {
    this.events = [];
    if (this.phase === 'result') return;
    const known = sample?.state === 'CLOSED' || sample?.state === 'OPEN';
    if (this.paused || !known || !sample?.mouth) { this.disarm(); return; }
    this.mouth = { x: clamp(sample.mouth.x, .08, .92), y: clamp(sample.mouth.y, .12, .9) };
    const bite = sample.state === 'OPEN' && this.armed;
    if (sample.state === 'CLOSED') this.armed = true;
    else this.armed = false;
    const delta = clamp(Number.isFinite(dt) ? dt : 0, 0, 100);
    if (this.phase === 'countdown') {
      this.countdown += delta;
      if (this.countdown >= 3000) { this.phase = 'playing'; this.disarm(); this.events.push({ type: 'start' }); }
      return;
    }
    this.elapsed = Math.min(ROUND_MS, this.elapsed + delta);
    if (this.elapsed >= ROUND_MS) { this.finish(); return; }
    if (this.elapsed >= this.nextSpawn) this.spawn();
    let expired = false;
    this.notes = this.notes.filter(n => {
      const age = this.elapsed - n.born, q = clamp(age / n.travel), ease = 1 - (1 - q) ** 2;
      n.x = n.start.x + (this.mouth.x + n.offset - n.start.x) * ease;
      n.y = n.start.y + (this.mouth.y - n.start.y) * ease;
      if (age > n.travel + 650) { expired = true; return false; }
      return true;
    });
    if (expired) this.combo = 0; // Silence, without a failure label or sound.
    if (bite) this.bite();
  }
  bite() {
    if (this.phase !== 'playing' || this.paused) return;
    const caught = this.notes.filter(n => this.distance(n, this.mouth) <= .145);
    if (!caught.length) return;
    this.notes = this.notes.filter(n => !caught.includes(n));
    const previousStage = musicStage(this.combo);
    this.combo++; this.maxCombo = Math.max(this.combo, this.maxCombo); this.eaten += caught.length;
    if (caught.length >= 2) this.chords++;
    if (caught.length >= 3) this.triads++;
    const types = [...new Set(caught.map(n => n.type))];
    const event = { type: 'bite', at: this.elapsed, types, count: caught.length, stage: musicStage(this.combo),
      grew: musicStage(this.combo) > previousStage, mouth: { ...this.mouth } };
    this.melody.push({ at: event.at, types, stage: event.stage }); this.events.push(event);
  }
  finish() {
    this.phase = 'result'; this.disarm(); this.notes = [];
    this.result = { scored: false, notesEaten: this.eaten, chords: this.chords, triads: this.triads,
      maxCombo: this.maxCombo, stage: musicStage(this.maxCombo), melody: this.melody.map(n => ({ ...n, types: [...n.types] })),
      summaryJa: `${this.eaten}音 · ${this.chords}和音`, summaryEn: `${this.eaten} notes · ${this.chords} chords` };
    this.events.push({ type: 'end' });
  }
}
