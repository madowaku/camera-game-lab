export const ROUND_SECONDS = 30;
export const BPM = 120;
export const DANCES = Object.freeze(["step", "jump", "crouch", "spin", "dash", "sparkle"]);
export const TITLES = Object.freeze([
  ["なかよしコンビ", "BEST BUDDIES"], ["自由すぎるふたり", "PERFECTLY CHAOTIC"],
  ["小さなレジェンド", "LITTLE LEGENDS"], ["奇跡のシンクロ", "SUPER SYNC"],
  ["最後だけ完璧", "A PERFECT FINISH"], ["今日も平和", "JUST HAPPY TOGETHER"],
]);
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const angleDelta = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));

export function danceFromMotion({ vx = 0, vy = 0, circle = false, opened = false } = {}) {
  if (circle) return "spin";
  if (opened) return "sparkle";
  if (Math.hypot(vx, vy) > 2.1) return "dash";
  if (vy < -.5 && Math.abs(vy) > Math.abs(vx) * .7) return "jump";
  if (vy > .5 && Math.abs(vy) > Math.abs(vx) * .7) return "crouch";
  if (Math.abs(vx) > .35) return "step";
  return "idle";
}

function circleMotion(path, now) {
  const points = path.filter(p => now - p.at < 1.25);
  if (points.length < 6) return false;
  const xs = points.map(p => p.x), ys = points.map(p => p.y);
  if (Math.max(...xs) - Math.min(...xs) < .09 || Math.max(...ys) - Math.min(...ys) < .09) return false;
  let turn = 0, lastAngle;
  for (let i = 1; i < points.length; i++) {
    const dx = points[i].x - points[i - 1].x, dy = points[i].y - points[i - 1].y;
    if (Math.hypot(dx, dy) < .009) continue;
    const a = Math.atan2(dy, dx);
    if (lastAngle != null) turn += angleDelta(a, lastAngle);
    lastAngle = a;
  }
  return Math.abs(turn) > 3.1;
}

function makePal(i, species) {
  return { slot: i, species, x: i ? .72 : .28, y: .72, input: null, seenAt: -100,
    visible: false, lostFor: 0, state: "waiting", dance: "idle", danceAt: -10,
    nextDanceAt: 0, pending: null, history: [], previousOpen: false, motion: {}, idleVariant: i, idleAt: 0, nextIdleAt: 3.5 + i * .5,
    // Personality belongs to the player slot, even when the species changes.
    lag: i ? .23 : .12, amplitude: i ? .82 : 1.08 };
}

export class HandyPalsGame {
  constructor({ random = Math.random, characters = ["bear", "bunny"] } = {}) {
    this.random = random; this.reset(characters);
  }
  reset(characters = ["bear", "bunny"]) {
    this.phase = "waiting"; this.elapsed = 0; this.clock = 0; this.paused = false; this.readyFor = 0;
    this.pals = characters.map((species, i) => makePal(i, species));
    this.events = []; this.cue = "hold"; this.interaction = null; this.interactionCooldown = 0;
    this.separated = true; this.lastDistance = null; this.hugArmed = true;
    this.moments = []; this.actions = new Set(); this.highFives = 0; this.hugs = 0;
    this.prompt1 = null; this.prompt2 = null; this.photoReady = false; this.result = null;
  }
  emit(type, detail = {}) {
    const event = { type, at: this.elapsed, ...detail }; this.events.push(event);
    if (["highFive", "hug", "jump", "spin", "photo"].includes(type)) this.moments.push(event);
  }
  takeEvents() { return this.events.splice(0); }
  setHands(hands) {
    for (let i = 0; i < 2; i++) {
      const pal = this.pals[i], hand = hands[i];
      if (!hand?.present || !Number.isFinite(hand.x) || !Number.isFinite(hand.y)) { pal.input = null; continue; }
      const p = { ...hand, x: clamp(hand.x, .06, .94), y: clamp(hand.y, .28, .9) };
      const old = pal.history.at(-1), dt = Math.max(.016, this.clock - (old?.at ?? this.clock));
      const continuous = old && this.clock - pal.seenAt < .3;
      const vx = continuous ? (p.x - old.x) / dt : 0, vy = continuous ? (p.y - old.y) / dt : 0;
      if (!continuous) pal.history = [];
      pal.history.push({ x: p.x, y: p.y, at: this.clock });
      pal.history = pal.history.filter(s => this.clock - s.at < 1.3).slice(-90);
      pal.motion = { vx, vy, circle: circleMotion(pal.history, this.clock), opened: continuous && p.open && !pal.previousOpen };
      pal.previousOpen = !!p.open; pal.input = p; pal.seenAt = this.clock;
    }
  }
  start() {
    if (this.phase !== "waiting") return;
    this.phase = "intro"; this.elapsed = 0; this.cue = "pop";
    for (const p of this.pals) { p.visible = true; p.state = "present"; if (p.input) { p.x = p.input.x; p.y = p.input.y; } }
    this.emit("pop");
  }
  interact(type, automatic = false) {
    this.interaction = { type, at: this.elapsed, duration: type === "hug" ? 1.25 : .85, automatic };
    this.interactionCooldown = this.elapsed + 1.4;
    if (type === "highFive") { if (!automatic) this.highFives++; if (this.prompt1?.status === "pending") this.prompt1.status = "yeah"; }
    if (type === "hug") this.hugs++;
    this.emit(type, { automatic });
  }
  react(pal, dance) {
    if (dance === "idle" || pal.pending || this.elapsed < pal.nextDanceAt) return;
    const delay = pal.slot ? .12 : 0;
    // Snap just the animation trigger to the next half-second beat. Position
    // feedback stays immediate, with the character's softer follow lag.
    pal.pending = { dance, at: Math.ceil((this.elapsed + delay) / .5) * .5 };
    pal.nextDanceAt = pal.pending.at + .65;
  }
  step(dt) {
    if (this.paused || this.phase === "result") return;
    dt = clamp(dt, 0, .1); this.clock += dt;
    for (const pal of this.pals) {
      const present = !!pal.input && this.clock - pal.seenAt < .35;
      pal.lostFor = present ? 0 : Math.max(0, this.clock - pal.seenAt);
      pal.state = present ? "present" : pal.lostFor < .7 ? "wobble" : "search";
      if (present) {
        const smooth = 1 - Math.exp(-dt / pal.lag);
        pal.x += (pal.input.x - pal.x) * smooth; pal.y += (pal.input.y - pal.y) * smooth;
      }
    }
    if (this.phase === "waiting") {
      this.readyFor = this.pals.every(p => p.state === "present") ? this.readyFor + dt : 0;
      if (this.readyFor >= .35) this.start();
      return;
    }
    const before = this.elapsed;
    this.elapsed = Math.min(ROUND_SECONDS, this.elapsed + dt);
    if (this.interaction && this.elapsed - this.interaction.at > this.interaction.duration) this.interaction = null;
    if (this.phase === "intro") {
      if (before < 1.25 && this.elapsed >= 1.25) { this.cue = "highFive"; this.interact("highFive", true); }
      if (this.elapsed >= 3) { this.phase = "playing"; this.cue = "free"; this.emit("music"); }
    }
    if (this.phase === "playing") {
      for (const pal of this.pals) {
        if (this.elapsed >= pal.nextIdleAt) {
          pal.idleVariant = Math.floor(this.random() * 4); pal.idleAt = this.elapsed; pal.nextIdleAt = this.elapsed + 3 + this.random() * 2;
        }
        if (pal.state === "present") this.react(pal, danceFromMotion(pal.motion));
        pal.motion.opened = false; pal.motion.circle = false;
        if (pal.pending && this.elapsed >= pal.pending.at) {
          pal.dance = pal.pending.dance; pal.danceAt = pal.pending.at; pal.pending = null;
          this.actions.add(pal.dance); this.emit(pal.dance, { slot: pal.slot });
          if (pal.dance === "spin" && this.prompt2?.status === "pending") this.prompt2.status = "yeah";
        }
        if (this.elapsed - pal.danceAt > 1.1) pal.dance = "idle";
      }
      const [a, b] = this.pals;
      const both = a.state === "present" && b.state === "present";
      const distance = Math.hypot((a.input?.x ?? a.x) - (b.input?.x ?? b.x), ((a.input?.y ?? a.y) - (b.input?.y ?? b.y)) / .8);
      if (both) {
        if (distance > .36) { this.separated = true; this.hugArmed = true; }
        if (this.elapsed >= this.interactionCooldown) {
          if (distance < .13 && this.hugArmed) { this.interact("hug"); this.hugArmed = false; this.separated = false; }
          else if (distance < .29 && this.separated) { this.interact("highFive"); this.separated = false; }
          else if (distance > .56 && this.lastDistance != null && this.lastDistance < .35) {
            this.pals.forEach(p => this.react(p, "jump"));
          }
        }
        this.lastDistance = distance;
      } else { this.lastDistance = null; }
      if (before < 10 && this.elapsed >= 10) { this.prompt1 = { status: "pending" }; this.cue = "highFive"; this.emit("prompt"); }
      if (this.elapsed >= 10 && this.elapsed < 13 && this.prompt1?.status === "pending" && both && distance < .33) {
        this.interact("highFive"); this.separated = false;
      }
      if (before < 13 && this.elapsed >= 13) { if (this.prompt1.status === "pending") this.prompt1.status = "almost"; this.cue = this.prompt1.status; }
      if (before < 14 && this.elapsed >= 14) this.cue = "free";
      if (before < 18 && this.elapsed >= 18) { this.prompt2 = { status: "pending" }; this.cue = "spin"; this.emit("prompt"); }
      if (before < 21 && this.elapsed >= 21) { if (this.prompt2.status === "pending") this.prompt2.status = "almost"; this.cue = this.prompt2.status; }
      if (before < 22 && this.elapsed >= 22) this.cue = "free";
      if (this.elapsed >= 25) { this.phase = "pose"; this.cue = "pose"; this.interaction = null; this.emit("pose"); }
      else if ((this.prompt1?.status === "yeah" && this.elapsed < 13) || (this.prompt2?.status === "yeah" && this.elapsed >= 18 && this.elapsed < 21)) this.cue = "yeah";
    }
    if (this.phase === "pose") {
      if (this.elapsed >= 28 && !this.photoReady) { this.photoReady = true; this.cue = "final"; this.emit("photo"); }
      if (this.elapsed >= ROUND_SECONDS) {
        this.phase = "result";
        const title = TITLES[Math.min(TITLES.length - 1, Math.floor(this.random() * TITLES.length))];
        this.result = { scored: false, outcome: "duo", titleJa: title[0], titleEn: title[1], summaryJa: title[0], summaryEn: title[1],
          seconds: ROUND_SECONDS, highFives: this.highFives, hugs: this.hugs, dances: [...this.actions],
          characters: this.pals.map(p => p.species), moments: [...this.moments], prompts: [this.prompt1.status, this.prompt2.status] };
      }
    }
  }
}
