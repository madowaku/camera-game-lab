import { clamp } from './signals.js';
export const ROUND_SECONDS = 15, SMILE_HOLD = .4, SMILE_THRESHOLD = 64;
export const ATTACKS = Object.freeze([
  { at: .8, type: 'bird', group: 'face' }, { at: 2, type: 'brows', group: 'face' }, { at: 3.3, type: 'nose', group: 'face' }, { at: 4.3, type: 'title', group: 'words' },
  { at: 5, type: 'delay', group: 'motion' }, { at: 6.1, type: 'clones', group: 'clones' }, { at: 7.4, type: 'flip', group: 'motion' }, { at: 8.4, type: 'voice', group: 'sound' }, { at: 9.2, type: 'clones', group: 'clones' },
  { at: 10, type: 'taunt', group: 'words' }, { at: 11, type: 'clones', group: 'clones' }, { at: 12, type: 'final', group: 'final' },
]);
export const stageAt = t => t >= 12 ? 'FINAL ATTACK' : `LEVEL ${t >= 10 ? 3 : t >= 5 ? 2 : 1}`;
export const moodAt = score => score >= SMILE_THRESHOLD ? 'DANGER 😏' : score >= 34 ? 'STEADY… 🙂' : 'SAFE 😐';

export function weaknessOf(memory) {
  if (!memory || typeof memory !== 'object') return null;
  return ['face', 'motion', 'clones', 'sound', 'words'].filter(k => Number(memory[k]?.count) >= 2 && Number(memory[k]?.sum) / memory[k].count > 18)
    .sort((a, b) => memory[b].sum / memory[b].count - memory[a].sum / memory[a].count)[0] ?? null;
}
export function learnReactions(memory, reactions) {
  const next = {};
  for (const group of ['face', 'motion', 'clones', 'sound', 'words']) {
    const previous = memory?.[group], count = clamp(Number(previous?.count) || 0, 0, 50), sum = clamp(Number(previous?.sum) || 0, 0, 5000);
    const values = reactions.filter(r => r.group === group).map(r => clamp(r.peak - r.start, 0, 100));
    const decay = count + values.length > 50 ? .5 : 1;
    next[group] = { count: count * decay + values.length, sum: sum * decay + values.reduce((a, b) => a + b, 0) };
  }
  return next;
}
export class DontLaughGame {
  constructor() { this.reset(); }
  reset(weakness = null) {
    this.elapsed = 0; this.hold = 0; this.score = 0; this.phase = 'ready'; this.paused = false; this.result = null; this.attack = null; this.events = []; this.reactions = []; this.nextAttack = 0;
    this.weakness = weakness; this.deck = ATTACKS.map(a => ({ ...a }));
    // Repeat the best observed group within LEVEL 2/3, keeping stage timing intact.
    if (weakness) {
      const type = { face: 'nose', motion: 'delay', clones: 'clones', sound: 'voice', words: 'taunt' }[weakness];
      if (type) for (const i of [8, 10]) this.deck[i] = { ...this.deck[i], type, group: weakness };
    }
  }
  start() { this.phase = 'playing'; }
  clearHold() { this.hold = 0; }
  step(dt, score = 0, valid = true) {
    if (this.phase !== 'playing' || this.paused) { this.clearHold(); return; }
    if (!valid || !Number.isFinite(score)) { this.clearHold(); return; }
    dt = clamp(Number(dt) || 0, 0, .1); this.score = clamp(score, 0, 100);
    const untilEnd = ROUND_SECONDS - this.elapsed;
    const untilLaugh = this.score >= SMILE_THRESHOLD ? Math.max(0, SMILE_HOLD - this.hold) : Infinity;
    const advance = Math.min(dt, untilEnd, untilLaugh); this.elapsed += advance;
    this.hold = this.score >= SMILE_THRESHOLD ? this.hold + advance : 0;
    while (this.nextAttack < this.deck.length && this.elapsed >= this.deck[this.nextAttack].at) {
      this.attack = this.deck[this.nextAttack++]; this.events.push({ type: 'attack', attack: this.attack.type });
      this.reactions.push({ group: this.attack.group, start: this.score, peak: this.score });
    }
    const reaction = this.reactions.at(-1); if (reaction) reaction.peak = Math.max(reaction.peak, this.score);
    if (untilLaugh <= dt + 1e-9 && untilLaugh <= untilEnd + 1e-9) this.finish('laughed');
    else if (this.elapsed >= ROUND_SECONDS - 1e-9) this.finish('survived');
  }
  finish(reason) { this.phase = 'result'; this.result = { reason, elapsed: this.elapsed, score: Number(this.elapsed.toFixed(2)), reactions: this.reactions.map(r => ({ ...r })), difficulty: 'NORMAL' }; this.events.push({ type: reason }); }
  takeEvents() { return this.events.splice(0); }
}
