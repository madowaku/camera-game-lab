export const NOTE_TYPES = Object.freeze([
  { shape: "circle", color: "#e96f51", midi: 60 },
  { shape: "diamond", color: "#54ad96", midi: 62 },
  { shape: "star", color: "#efbb3d", midi: 64 },
  { shape: "heart", color: "#d96787", midi: 67 },
  { shape: "sparkle", color: "#559fc5", midi: 69 },
]);
export const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
export const grooveStage = groove => Math.min(4, Math.floor(clamp(groove, 0, 100) / 20));
export const NOTE_EATER_BPM = 110;
export const NOTE_EATER_BASE_NOTES = 8;
export const NOTE_EATER_MAX_NOTES = 12;

export class NoteEaterGame {
  constructor({ random = Math.random } = {}) { this.random = random; this.reset(); }
  reset(source = "demo") {
    Object.assign(this, { source, phase: "tutorial", time: 0, elapsed: 0, countdown: 0, groove: 0, maxGroove: 0,
      eaten: 0, melody: [], notes: [], effects: [], events: [], armed: false, mouthState: "UNKNOWN", paused: false,
      nextId: 0, nextType: 0, lastEat: -Infinity, recentEats: [], result: null, tutorialNote: false, milestones: new Set(),
      mouth: { x: .5, y: .57, width: .075 }, aspect: 16 / 9, lastBiteEvent: null });
  }
  distance(a, b) { return Math.hypot(a.x - b.x, (a.y - b.y) * this.aspect); }
  get eatRadius() { return clamp(this.mouth.width * 2.25, .11, .27); }
  get magnetRadius() { return this.eatRadius * 1.65; }
  get noteTarget() { return Math.min(NOTE_EATER_MAX_NOTES, NOTE_EATER_BASE_NOTES + grooveStage(this.maxGroove)); }
  setPaused(paused) { this.paused = !!paused; if (paused) { this.armed = false; this.mouthState = "UNKNOWN"; } }
  highlight(type, data = {}) { this.events.push({ type, at: this.time, data }); }
  spawn(tutorial = false, openingIndex = -1) {
    // Each wave includes every pitch, so a busy field still offers a choice.
    const type = tutorial ? 2 : this.nextType++ % NOTE_TYPES.length;
    const side = this.nextId % 4, lane = .2 + this.random() * .6;
    const starts = [{ x: .025, y: lane }, { x: .975, y: lane }, { x: lane, y: .03 }, { x: lane, y: .97 }];
    const opening = [{ x: .22, y: .22 }, { x: .72, y: .18 },
      { x: clamp(this.mouth.x + .08, .12, .88), y: clamp(this.mouth.y - .025, .14, .84) },
      { x: .82, y: .43 }, { x: .18, y: .55 }, { x: .62, y: .67 }, { x: .32, y: .81 }, { x: .8, y: .78 }];
    const start = tutorial ? { x: this.mouth.x + .07, y: this.mouth.y - .08 } : opening[openingIndex] ?? starts[side];
    const target = { x: .15 + this.random() * .7, y: .25 + this.random() * .5 };
    const length = Math.hypot(target.x - start.x, (target.y - start.y) * this.aspect) || 1;
    const speed = .085 + this.random() * .035;
    const note = { id: ++this.nextId, type, x: start.x, y: start.y, vx: (target.x - start.x) / length * speed,
      vy: (target.y - start.y) / length * speed, age: 0, life: 9500 + this.random() * 2000,
      size: this.nextId % 7 === 0 ? 1.28 : 1, magnet: false, tutorial };
    this.notes.push(note); return note;
  }
  step(dt, sample) {
    this.effects = []; this.events = [];
    if (this.paused || this.phase === "result" || !Number.isFinite(dt) || dt < 0) return;
    this.time += dt;
    if (sample?.mouth && [sample.mouth.x, sample.mouth.y, sample.mouth.width].every(Number.isFinite)) this.mouth = { ...sample.mouth };
    const state = sample?.state ?? "UNKNOWN";
    this.mouthState = state;
    if (state === "UNKNOWN") this.armed = false;
    else if (state === "CLOSED") this.armed = true;
    if (this.phase === "tutorial") {
      if (!this.tutorialNote) { this.spawn(true); this.tutorialNote = true; }
      // The first choice follows gently so the first bite needs no precise aim.
      const n = this.notes[0];
      if (n) { const k = 1 - Math.exp(-dt / 180); n.x += (this.mouth.x + .04 - n.x) * k; n.y += (this.mouth.y - .04 - n.y) * k; }
    } else if (this.phase === "countdown") {
      this.countdown += dt;
      if (this.countdown >= 3000) { this.phase = "playing"; this.armed = state === "CLOSED"; for (let i = 0; i < this.noteTarget; i++) this.spawn(false, i); }
      return;
    } else {
      const activeDt = Math.min(dt, 30000 - this.elapsed);
      this.elapsed += activeDt;
      this.groove = Math.max(0, this.groove - activeDt / 1000 * 2.4);
      this.moveNotes(activeDt, state !== "UNKNOWN");
      while (this.notes.length < this.noteTarget) this.spawn();
    }
    if (state === "OPEN" && this.armed) {
      const candidate = this.notes.filter(n => this.distance(n, this.mouth) <= this.eatRadius)
        .sort((a, b) => this.distance(a, this.mouth) - this.distance(b, this.mouth))[0];
      if (candidate) this.eat(candidate);
    }
    if (this.phase === "playing" && this.elapsed >= 30000) this.finish();
  }
  moveNotes(dt, tracked) {
    const seconds = dt / 1000;
    this.notes = this.notes.filter(note => {
      note.age += dt;
      note.magnet = tracked && this.distance(note, this.mouth) < this.magnetRadius;
      if (note.magnet) {
        const pull = 1 - Math.exp(-seconds * .75);
        note.x += (this.mouth.x - note.x) * pull;
        note.y += (this.mouth.y - note.y) * pull;
      }
      note.x += note.vx * seconds; note.y += note.vy * seconds;
      if (note.age > note.life || (note.age > 1000 && (note.x < -.15 || note.x > 1.15 || note.y < -.15 || note.y > 1.15))) {
        this.effects.push({ type: "pass", note: { ...note }, at: this.time }); return false;
      }
      return true;
    });
  }
  eat(note) {
    this.armed = false; this.notes = this.notes.filter(n => n !== note);
    const effect = { type: "eat", note: { ...note }, mouth: { ...this.mouth }, at: this.time, groove: this.groove, stageUp: false };
    this.effects.push(effect);
    if (this.phase === "tutorial") { this.phase = "countdown"; this.countdown = 0; this.highlight("FIRST_EAT"); return; }
    this.eaten++; this.melody.push({ type: note.type, midi: NOTE_TYPES[note.type].midi, at: this.elapsed });
    this.lastBiteEvent = { at: this.time, data: { point: { x: note.x, y: note.y }, type: note.type } };
    const interval = this.elapsed - this.lastEat;
    const previousStage = grooveStage(this.maxGroove);
    this.groove = clamp(this.groove + (interval <= 1700 ? 16 : 10), 0, 100);
    this.maxGroove = Math.max(this.maxGroove, this.groove); this.lastEat = this.elapsed;
    effect.groove = this.groove; effect.stageUp = grooveStage(this.maxGroove) > previousStage;
    while (this.notes.length < this.noteTarget) this.spawn();
    this.recentEats.push(this.elapsed); this.recentEats = this.recentEats.filter(t => this.elapsed - t < 2600);
    if (this.eaten === 1) this.highlight("FIRST_EAT");
    if (this.recentEats.length >= 3) this.highlight("FAST_3_EATS", { priority: this.groove >= 80 ? 100 : 20 });
    for (const threshold of [50, 80]) if (this.groove >= threshold && !this.milestones.has(threshold)) {
      this.milestones.add(threshold); this.highlight(`GROOVE_${threshold}`);
    }
    if (note.size > 1.2) this.highlight("BIG_NOTE");
  }
  finish() {
    if (this.result) return;
    if (this.lastBiteEvent) this.events.push({ type: "FINAL_EAT", at: this.lastBiteEvent.at, data: { ...this.lastBiteEvent.data, eaten: this.eaten } });
    this.phase = "result";
    this.result = { experiment: "EXP-016", source: this.source, notesEaten: this.eaten, maxGroove: Math.round(this.maxGroove),
      uniqueNotes: new Set(this.melody.map(n => n.type)).size, melody: this.melody.map(n => ({ ...n })), durationMs: this.elapsed };
  }
}
