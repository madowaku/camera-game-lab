export const W = 720, H = 960, TOLERANCE = 12, HOLD_SECONDS = .4, ROUND_SECONDS = 30;
export const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
export const normalizeAngle = a => ((a % 360) + 360) % 360;
export const signedAngle = (from, to) => ((to - from + 540) % 360) - 180;
export const angleError = (a, b) => Math.abs(signedAngle(a, b));
export function clockAngles(hour, minute) {
  return { hour: normalizeAngle((hour % 12) * 30 + minute * .5 - 90), minute: normalizeAngle(minute * 6 - 90) };
}
export const formatTime = t => `${t.hour}:${String(t.minute).padStart(2, '0')}`;
const times = list => Object.freeze(list.map(([hour, minute]) => Object.freeze({ hour, minute })));
export const EASY_TIMES = times([[1,0],[6,30],[9,15],[3,0],[10,10],[12,30],[8,20],[2,50],[7,0],[4,45],[11,30],[5,15]]);
export const NORMAL_TIMES = times([[3,40],[7,25],[11,50],[1,0],[6,30],[9,15],[10,10],[8,40],[12,30],[2,50],[4,20],[5,35],[9,55],[11,5],[2,15],[7,45],[8,10],[12,5],[6,20],[4,50]]);
export function makeDeck(difficulty, random = Math.random, previous = null) {
  const deck = [...(difficulty === 'easy' ? EASY_TIMES : NORMAL_TIMES)];
  for (let i = deck.length - 1; i > 0; i--) { const j = Math.floor(clamp(random(), 0, .999999) * (i + 1)); [deck[i], deck[j]] = [deck[j], deck[i]]; }
  if (previous && formatTime(deck[0]) === formatTime(previous)) [deck[0], deck[1]] = [deck[1], deck[0]];
  return deck;
}
export function evaluateHands(hands, target) {
  const angles = clockAngles(target.hour, target.minute);
  const errors = ['hour', 'minute'].map(side => {
    const hand = hands?.[side];
    if (!hand?.present || !Number.isFinite(hand.angle)) return Infinity;
    // Smoothing must never make an out-of-range raw observation count as a hit.
    return Math.max(angleError(hand.angle, angles[side]), Number.isFinite(hand.rawAngle) ? angleError(hand.rawAngle, angles[side]) : 0);
  });
  return { errors, matched: errors.every(e => e <= TOLERANCE + 1e-8), closeness: errors.map(e => clamp(1 - e / 60, 0, 1)) };
}
export class HumanClockGame {
  constructor({ random = Math.random } = {}) { this.random = random; this.reset(); }
  reset(difficulty = 'easy') {
    this.difficulty = difficulty === 'normal' ? 'normal' : 'easy'; this.phase = 'idle'; this.paused = false; this.elapsed = 0; this.score = 0;
    this.combo = this.bestCombo = this.skipped = this.hold = this.rushUntil = this.settle = this.questionElapsed = 0;
    this.completed = []; this.events = []; this.result = null; this.deck = []; this.target = { hour: 1, minute: 0 };
  }
  start() { this.phase = 'playing'; this.next(); }
  next() {
    if (!this.deck.length) this.deck = makeDeck(this.difficulty, this.random, this.target);
    this.target = this.deck.shift(); this.hold = 0; this.questionElapsed = 0; this.events.push({ type: 'question' });
  }
  clearHold() { this.hold = 0; }
  get remaining() { return Math.max(0, ROUND_SECONDS - this.elapsed); }
  get rush() { return this.phase === 'playing' && this.elapsed < this.rushUntil; }
  get showNumbers() { return this.difficulty === 'easy' || this.score < 3; }
  get settling() { return this.settle > 0; }
  skip() {
    if (this.phase !== 'playing' || this.paused || this.settling) return;
    this.skipped++; this.combo = 0; this.rushUntil = 0; this.next(); this.events.push({ type: 'skip' });
  }
  step(dt, matched) {
    if (this.phase !== 'playing' || this.paused) return;
    if (!Number.isFinite(dt) || dt <= 0) return;
    if (dt > .15) { this.clearHold(); matched = false; }
    const delta = Math.min(dt, this.remaining);
    this.elapsed += delta; this.questionElapsed += delta;
    // End before judging: a hold completed after the deadline is never scored.
    if (this.elapsed >= ROUND_SECONDS - 1e-8) { this.finish(); return; }
    if (this.settling) { this.settle = Math.max(0, this.settle - delta); if (!this.settling) this.next(); return; }
    this.hold = matched ? this.hold + delta : 0;
    if (this.hold + 1e-8 < HOLD_SECONDS) return;
    this.score++; this.combo++; this.bestCombo = Math.max(this.bestCombo, this.combo);
    const completed = { ...this.target, seconds: this.questionElapsed };
    this.completed.push(completed); this.hold = 0;
    const rushStarted = this.combo % 5 === 0 && !this.rush;
    if (rushStarted) this.rushUntil = this.elapsed + 5;
    this.settle = this.rush ? .22 : .55;
    const label = this.combo === 1 ? 'TICK!' : this.combo === 2 ? 'TICK TOCK!' : this.combo === 3 ? 'ON TIME!' : 'PERFECT TIME!';
    this.events.push({ type: 'correct', label, rushStarted, time: completed, score: this.score });
  }
  finish() {
    this.phase = 'result'; this.clearHold();
    this.result = { outcome: 'TIME UP', score: this.score, bestCombo: this.bestCombo, skipped: this.skipped, difficulty: this.difficulty, completed: [...this.completed],
      fastest: this.completed.length ? Math.min(...this.completed.map(t => t.seconds)) : null, duration: ROUND_SECONDS };
    this.events.push({ type: 'finish' });
  }
  takeEvents() { return this.events.splice(0); }
}
