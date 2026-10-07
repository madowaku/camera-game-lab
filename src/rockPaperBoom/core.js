// Pure round rules. Seconds for simulation; milliseconds for camera samples.
export const SIGNS = Object.freeze(['ROCK', 'SCISSORS', 'PAPER']);
export const ICONS = Object.freeze({ ROCK: '✊', SCISSORS: '✌️', PAPER: '🖐', UNKNOWN: '？' });
export const TIMING = Object.freeze({ beat: .65, shoot: 1.6, freeze: .5, boom: 2.2, result: .8, retry: .9 });
export const impactTime = result => result?.sign === 'PAPER' ? .85 : .65;
const beats = { ROCK: 'SCISSORS', SCISSORS: 'PAPER', PAPER: 'ROCK' };
const finish = { ROCK: ['METEOR FIST', 'CRUSH!!'], SCISSORS: ['DIMENSION CUT', 'SLASH!!'], PAPER: ['GIANT PALM', 'SMASH!!'] };
const draw = { ROCK: ['FIST COLLISION', 'DOUBLE K.O.'], SCISSORS: ['BLADE STORM', 'TOO SHARP!!'], PAPER: ['PALM COLLISION', 'MAXIMUM HIGH FIVE!!'] };
export function judge(p1, p2) {
  if (!SIGNS.includes(p1) || !SIGNS.includes(p2)) return null;
  const winner = p1 === p2 ? 0 : beats[p1] === p2 ? 1 : 2;
  const sign = winner === 2 ? p2 : p1, [move, shout] = (winner ? finish : draw)[sign];
  return Object.freeze({ p1, p2, winner, sign, move, shout });
}
// Never trust stale, sparse or discontinuous inference, even at a low render FPS.
export class SignWindow {
  constructor() { this.reset(); }
  reset() { this.frames = []; }
  push(sign, confidence, at) {
    if (!Number.isFinite(at) || at <= (this.frames.at(-1)?.at ?? -Infinity)) return;
    this.frames.push({ sign: SIGNS.includes(sign) && confidence >= .65 ? sign : 'UNKNOWN', confidence, at });
    this.frames = this.frames.filter(f => at - f.at <= 300).slice(-40);
  }
  sample(now) {
    const frames = this.frames.filter(f => now - f.at >= 0 && now - f.at <= 300), last = frames.at(-1);
    if (frames.length < 4 || !last || now - last.at > 120 || last.at - frames[0].at < 220) return null;
    if (frames.some((f, i) => i > 0 && f.at - frames[i - 1].at > 150)) return null;
    const counts = SIGNS.map(sign => ({ sign, count: frames.filter(f => f.sign === sign).length }));
    const best = counts.sort((a, b) => b.count - a.count)[0];
    if (last.sign !== best.sign || best.count / frames.length < .75) return null;
    return { sign: best.sign, confidence: frames.filter(f => f.sign === best.sign).reduce((sum, f) => sum + f.confidence, 0) / best.count };
  }
}
export class RockPaperBoomGame {
  constructor() { this.reset(); }
  reset(source = 'camera') {
    this.source = source; this.phase = 'ready'; this.age = 0; this.clock = 0; this.paused = false;
    this.windows = [new SignWindow(), new SignWindow()]; this.current = [null, null];
    this.result = null; this.events = []; this.count = 3; this.retries = 0; this.rounds = 0; this.impactEmitted = false;
  }
  emit(type, data = {}) { this.events.push({ type, time: this.clock, ...data }); }
  takeEvents() { return this.events.splice(0); }
  clearInput() { this.windows.forEach(w => w.reset()); this.current = [null, null]; }
  input(hands, at) {
    if (this.paused) return;
    hands.forEach((h, i) => this.windows[i].push(h?.sign, h?.confidence ?? 0, at));
    this.current = this.windows.map(w => w.sample(at));
  }
  get ready() { return this.current.every(Boolean); }
  start() {
    if (!['ready', 'again'].includes(this.phase) || this.paused) return false;
    // Replay can start before hands settle, but never locks a remembered sign.
    if (this.phase === 'ready' && !this.ready) return false;
    this.result = null; this.phase = 'countdown'; this.age = 0; this.count = 3;
    this.emit('COUNT', { count: 3 }); return true;
  }
  pause() { this.paused = true; this.clearInput(); }
  resume() {
    if (!this.paused) return;
    this.paused = false; this.clearInput();
    // A half-finished count cannot resume into an unexpected SHOOT.
    if (['countdown', 'shoot', 'retry'].includes(this.phase)) { this.phase = 'ready'; this.age = 0; }
  }
  step(dt, now) {
    if (!Number.isFinite(dt) || dt <= 0 || this.paused) return;
    this.clock += dt; this.age += dt;
    this.current = this.windows.map(w => w.sample(now));
    if (this.phase === 'countdown') {
      const count = Math.max(1, 3 - Math.floor((this.age + 1e-8) / TIMING.beat));
      if (count !== this.count) { this.count = count; this.emit('COUNT', { count }); }
      if (this.age >= TIMING.beat * 3 - 1e-8) {
        this.phase = 'shoot'; this.age = 0; this.clearInput(); this.emit('SHOOT');
      }
    } else if (this.phase === 'shoot') {
      if (this.age >= .35 && this.ready) {
        this.result = Object.freeze({ ...judge(...this.current.map(h => h.sign)), source: this.source, round: ++this.rounds });
        this.phase = 'freeze'; this.age = 0; this.emit('LOCK', { result: this.result });
      } else if (this.age >= TIMING.shoot) {
        this.phase = 'retry'; this.age = 0; this.retries++; this.emit('RETRY');
      }
    } else if (this.phase === 'retry' && this.age >= TIMING.retry) {
      this.phase = 'ready'; this.age = 0; this.clearInput();
    } else if (this.phase === 'freeze' && this.age >= TIMING.freeze) {
      this.phase = 'boom'; this.age = 0; this.impactEmitted = false; this.emit('BOOM', { result: this.result });
    } else if (this.phase === 'boom') {
      if (!this.impactEmitted && this.age >= impactTime(this.result)) {
        this.impactEmitted = true; this.emit('IMPACT', { result: this.result });
      }
      if (this.age >= TIMING.boom) { this.phase = 'result'; this.age = 0; this.emit('ROUND_END', { result: this.result }); }
    } else if (this.phase === 'result' && this.age >= TIMING.result) {
      this.phase = 'again'; this.age = 0;
    }
  }
}
