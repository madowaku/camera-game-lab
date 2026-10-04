export const W = 540, H = 960, ROUND_MS = 15000;
export const SIGNS = Object.freeze(['FIST', 'PALM', 'ONE', 'TWO', 'THREE']);
export const GLYPHS = Object.freeze({ FIST: '✊', PALM: '✋', ONE: '☝', TWO: '✌', THREE: '🤟' });
export const SPELLS = Object.freeze([
  { id: 'DRAGON_FLAME', name: 'DRAGON FLAME', signs: ['ONE', 'TWO', 'THREE'], color: '#ffad48', icon: '🔥' },
  { id: 'THUNDER_GOD', name: 'THUNDER GOD', signs: ['FIST', 'ONE', 'PALM'], color: '#d5ff78', icon: '⚡' },
  { id: 'ABSOLUTE_ZERO', name: 'ABSOLUTE ZERO', signs: ['TWO', 'PALM', 'FIST'], color: '#99eaff', icon: '❄' },
]);
export const MISFIRES = Object.freeze([
  { id: 'TINY_FIRE', name: 'TINY FIRE', icon: '🕯', color: '#ffca8e' },
  { id: 'SELF_BLAST', name: 'SELF BLAST', icon: '🌀', color: '#b2a0ff' },
  { id: 'CHICK_SWARM', name: 'CHICK SWARM', icon: '🐤', color: '#ffee83' },
  { id: 'POTATO', name: 'POTATO.', icon: '🥔', color: '#eac78d' },
  { id: 'GIANT_HAND', name: 'GIANT HAND', icon: '🖐', color: '#ffbde9' },
  { id: 'FISH_STORM', name: 'FISH STORM', icon: '🐟', color: '#92e3da' },
  { id: 'SAD_SMOKE', name: 'SAD SMOKE', icon: '💨', color: '#b7b2ca' },
]);
export const ALL_SPELLS = Object.freeze([...SPELLS, ...MISFIRES]);
export const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

// Priority is intentional: extra, missing, repeated, reverse, one wrong, other.
export function judgeSpell(expected, actual, released = true) {
  if (!released) return 'SAD_SMOKE';
  if (actual.length > expected.length) return 'GIANT_HAND';
  if (actual.length < expected.length) return 'POTATO';
  if (actual.every((s, i) => s === expected[i])) return SPELLS.find(s => s.signs.every((v, i) => v === actual[i]))?.id ?? 'DRAGON_FLAME';
  if (new Set(actual).size === 1) return 'CHICK_SWARM';
  if (actual.every((s, i) => s === expected[expected.length - 1 - i])) return 'SELF_BLAST';
  if (actual.filter((s, i) => s !== expected[i]).length === 1) return 'TINY_FIRE';
  return 'FISH_STORM';
}

export class HandSpellGame {
  constructor({ source = 'demo', spell = 0, tutorial = false, creator = false } = {}) {
    this.source = source; this.target = SPELLS[spell] ?? SPELLS[0]; this.creator = creator;
    this.phase = tutorial ? 'tutorial' : 'playing'; this.scene = tutorial ? 'tutorial' : 'enemy';
    this.tutorialStep = 0; this.tutorialWait = 0; this.elapsed = 0; this.sceneAt = 0;
    this.signs = []; this.events = []; this.log = []; this.paused = false; this.pauseReason = null;
    this.released = false; this.outcome = null; this.chargeAt = null; this.result = null;
  }
  get tutorialSigns() { return [['TWO'], ['ONE', 'TWO'], ['ONE', 'TWO', 'THREE']][this.tutorialStep]; }
  emit(type, extra = {}) { const e = { type, time: this.elapsed, ...extra }; this.events.push(e); this.log.push(e); }
  enter(scene) { this.scene = scene; this.sceneAt = this.elapsed; this.emit(scene); }
  input(sign) {
    if (this.paused || !SIGNS.includes(sign)) return false;
    if (this.phase === 'tutorial') {
      if (this.scene !== 'tutorial' || this.tutorialWait) return false;
      if (sign !== this.tutorialSigns[this.signs.length]) { this.emit('tryAgain', { sign }); return false; }
      this.signs.push(sign); this.emit('lock', { sign, count: this.signs.length });
      if (this.signs.length === this.tutorialSigns.length) {
        if (this.tutorialStep < 2) { this.tutorialWait = 800; this.emit('mini', { count: this.signs.length }); }
        else this.enter('tutorial-release');
      }
      return true;
    }
    if (!['input', 'release'].includes(this.scene) || this.released || this.signs.length >= 5) return false;
    this.signs.push(sign); this.emit('lock', { sign, count: this.signs.length });
    if (this.signs.length === 3) this.emit('ready');
    return true;
  }
  release(source = 'gesture') {
    if (this.paused || this.released) return false;
    if (this.phase === 'tutorial' && this.scene === 'tutorial-release') {
      this.released = true; this.releaseSource = source; this.outcome = 'DRAGON_FLAME'; this.enter('tutorial-charge'); return true;
    }
    if (this.phase !== 'playing' || !['input', 'release'].includes(this.scene) || !this.signs.length) return false;
    this.released = true; this.releaseSource = source; this.emit('released');
    // CREATOR's common charge always begins at 9s; early thrusts are latched.
    return true;
  }
  skipTutorial() { if (this.phase !== 'tutorial') return; this.phase = 'playing'; this.signs = []; this.elapsed = 0; this.released = false; this.outcome = null; this.enter('enemy'); this.emit('tutorialDone'); }
  step(dt) {
    if (this.paused || this.phase === 'result') return;
    dt = clamp(Number(dt) || 0, 0, 100);
    if (this.phase === 'tutorial') {
      if (this.tutorialWait) { this.tutorialWait = Math.max(0, this.tutorialWait - dt); if (!this.tutorialWait) { this.tutorialStep++; this.signs = []; this.emit('tutorialNext'); } }
      if (['tutorial-charge', 'tutorial-cast'].includes(this.scene)) {
        this.elapsed += dt;
        if (this.scene === 'tutorial-charge' && this.elapsed - this.sceneAt >= 850) this.enter('tutorial-cast');
        else if (this.scene === 'tutorial-cast' && this.elapsed - this.sceneAt >= 2400) this.skipTutorial();
      }
      return;
    }
    this.elapsed = Math.min(ROUND_MS, this.elapsed + dt);
    if (this.elapsed >= 9000 && this.chargeAt == null) {
      this.outcome = judgeSpell(this.target.signs, this.signs, this.released); this.chargeAt = 9000; this.enter('charge');
    } else if (this.elapsed >= 12000 && this.scene !== 'reaction') this.enter('reaction');
    else if (this.elapsed >= 9850 && this.scene === 'charge') this.enter('cast');
    else if (this.elapsed >= 8000 && this.scene === 'input') this.enter('release');
    else if (this.elapsed >= 4000 && this.scene === 'memorize') this.enter('input');
    else if (this.elapsed >= 2000 && this.scene === 'enemy') this.enter('memorize');
    if (this.elapsed === ROUND_MS) {
      this.phase = 'result'; this.emit('finish');
      this.result = { source: this.source, score: this.outcome === this.target.id ? 1 : 0, perfect: this.outcome === this.target.id, spell: this.outcome, target: this.target.id, signs: [...this.signs], released: this.released, releaseSource: this.releaseSource ?? null, elapsed: this.elapsed, reason: 'complete' };
    }
  }
  pause(reason = 'user') { if (this.phase === 'result') return; this.paused = true; this.pauseReason = reason; }
  resume() { this.paused = false; this.pauseReason = null; }
  drainEvents() { return this.events.splice(0); }
}
