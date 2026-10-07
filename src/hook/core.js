export const DURATION = 30;
export const FISH = Object.freeze([
  { id: 'AJI', ja: 'アジ', en: 'HORSE MACKEREL', min: 18, max: 36, rarity: 1, wait: .7, landing: 2.1, power: .75, color: 0x9bdbea },
  { id: 'TAI', ja: 'タイ', en: 'SEA BREAM', min: 42, max: 76, rarity: 1.5, wait: 1.2, landing: 4.1, power: 1, color: 0xff8e83 },
  { id: 'TUNA', ja: 'マグロ', en: 'TUNA', min: 110, max: 184, rarity: 2, wait: 1.7, landing: 6.4, power: 1.3, color: 0x53a9db },
  { id: 'BOOT', ja: '長靴', en: 'OLD BOOT', min: 25, max: 32, rarity: .4, wait: .9, landing: 1.2, power: .35, color: 0xf6c653 },
  { id: 'HUMAN', ja: '人面魚', en: 'HUMAN FISH', min: 48, max: 85, rarity: 3.5, wait: 1.9, landing: 4.7, power: 1.05, color: 0xb0dccd },
]);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// All clocks are active-play seconds. Rendering and recognition never own rules.
export class HookGame {
  constructor({ random = Math.random } = {}) { this.random = random; this.reset(); }
  reset() {
    this.phase = 'ready'; this.elapsed = 0; this.limit = DURATION; this.age = 0; this.paused = false;
    this.score = 0; this.catches = []; this.combo = 0; this.bestCombo = 0; this.misses = 0;
    this.casts = 0; this.hooks = 0; this.perfects = 0; this.feverUntil = 0; this.fevers = 0;
    this.events = []; this.result = null; this.fish = null; this.fishX = .5; this.direction = 1;
    this.tension = .5; this.landing = 0; this.fightAge = 0; this.goodTime = 0; this.dangerTime = 0;
    this.lastCatch = null; this.releasedHuman = false; this.fake = false;
  }
  get remaining() { return Math.max(0, this.limit - this.elapsed); }
  get fever() { return this.elapsed < this.feverUntil; }
  get good() { return this.tension >= .28 && this.tension <= .76; }
  emit(type, data = {}) { this.events.push({ type, at: this.elapsed, ...data }); }
  drainEvents() { const e = this.events; this.events = []; return e; }
  transition(phase) { this.phase = phase; this.age = 0; }
  pickFish() {
    if (!this.catches.length) return FISH[0];
    const r = this.random();
    const weights = this.fever ? [.26, .31, .28, .08, .07] : [.42, .29, .18, .09, .02];
    let sum = 0; return FISH[weights.findIndex((w, i) => { sum += w; return r < sum || i === 4; })];
  }
  cast() {
    if (this.paused || this.phase !== 'ready' || this.result) return false;
    this.fish = this.pickFish(); this.size = Math.round(this.fish.min + this.random() * (this.fish.max - this.fish.min));
    this.casts++; this.fake = this.catches.length > 0 && this.random() < .22; this.fakeDone = false;
    this.waitFor = this.fish.wait + this.random() * .35; this.fishX = .5; this.transition('cast'); this.emit('CAST'); return true;
  }
  hook() {
    if (this.paused || this.phase !== 'bite') return false;
    this.perfectHook = this.age <= .48; this.hooks++; if (this.perfectHook) this.perfects++;
    this.tension = .5; this.landing = 0; this.goodTime = 0; this.fightAge = 0; this.dangerTime = 0;
    this.direction = this.random() < .5 ? -1 : 1; this.behavior = 'warning'; this.behaviorAge = 0;
    this.transition('fight'); this.emit('HOOK', { perfect: this.perfectHook }); this.emit('WARNING', { direction: this.direction }); return true;
  }
  release() {
    if (this.paused || this.phase !== 'catch' || this.fish?.id !== 'HUMAN') return false;
    this.releasedHuman = true; this.emit('RELEASE'); this.transition('ready'); return true;
  }
  miss(reason) { this.misses++; this.combo = 0; this.reason = reason; this.transition('miss'); this.emit('MISS', { reason }); }
  land() {
    const sizePoints = Math.round(this.size * 10 * this.fish.rarity);
    const hookPoints = this.perfectHook ? 300 : 100;
    const tensionPoints = Math.round(this.goodTime * 60);
    const speedPoints = Math.round(Math.max(0, 1 - (this.fightAge - this.fish.landing) / this.fish.landing) * 100);
    this.lastCatch = { id: this.fish.id, size: this.size, sizePoints, hookPoints, tensionPoints, speedPoints,
      points: sizePoints + hookPoints + tensionPoints + speedPoints, perfect: this.perfectHook, fightTime: this.fightAge };
    this.catches.push(this.lastCatch); this.score += this.lastCatch.points; this.combo++; this.bestCombo = Math.max(this.combo, this.bestCombo);
    this.transition('landing'); this.emit('LANDING', { fish: this.lastCatch });
    if (this.combo % 3 === 0) { this.fevers++; this.limit += 5; this.feverUntil = this.elapsed + 8; this.emit('FEVER', { bonus: 5 }); }
  }
  finish() {
    this.transition('result'); this.result = { score: this.score, catches: this.catches.map(f => ({ ...f })), bestCombo: this.bestCombo,
      casts: this.casts, hooks: this.hooks, perfects: this.perfects, misses: this.misses, fevers: this.fevers,
      elapsed: this.elapsed, releasedHuman: this.releasedHuman,
      biggest: this.catches.reduce((a, b) => !a || b.size > a.size ? b : a, null) };
    this.emit('END', { result: this.result });
  }
  step(dt, { pull = 0, tracked = true } = {}) {
    if (this.paused || !tracked || this.result || !(dt > 0)) return;
    // Bound substeps so identical inputs produce the same behavior at low FPS.
    let left = Math.min(dt, .25);
    while (left > 1e-7 && !this.result) { const tick = Math.min(left, 1 / 120); left -= tick; this.tick(tick, clamp(pull, -1.5, 1.5)); }
  }
  tick(dt, pull) {
    if (this.remaining <= 1e-7) { this.finish(); return; }
    const tick = Math.min(dt, this.remaining); this.elapsed += tick; this.age += tick;
    if (this.phase === 'cast' && this.age >= .45) { this.transition('wait'); this.emit('SPLASH'); }
    else if (this.phase === 'wait') {
      this.fishX = .5 + Math.sin(this.age * 4) * .15;
      if (this.fake && !this.fakeDone && this.age > this.waitFor * .42) { this.fakeDone = true; this.emit('NIBBLE'); }
      if (this.age >= this.waitFor) { this.transition('bite'); this.emit('BITE'); }
    } else if (this.phase === 'bite' && this.age >= (!this.catches.length ? 1.8 : 1.35)) this.miss('hook');
    else if (this.phase === 'fight') this.fight(tick, pull);
    else if (this.phase === 'landing' && this.age >= 1.15) { this.transition('catch'); this.emit('CATCH', { fish: this.lastCatch }); }
    else if (this.phase === 'catch' && this.age >= (this.fish.id === 'HUMAN' ? 4 : 1.35)) this.transition('ready');
    else if (this.phase === 'miss' && this.age >= .8) this.transition('ready');
    if (this.remaining <= 1e-7 && !this.result) this.finish();
  }
  fight(dt, pull) {
    this.fightAge += dt; this.behaviorAge += dt;
    const duration = this.behavior === 'warning' ? .45 : this.behavior === 'dash' ? .8 + this.fish.power * .3 : .5;
    if (this.behaviorAge >= duration) {
      this.behaviorAge = 0;
      if (this.behavior === 'warning') { this.behavior = 'dash'; this.emit('DASH', { direction: this.direction }); }
      else if (this.behavior === 'dash') this.behavior = 'tired';
      else { this.behavior = 'warning'; this.direction *= -1; this.emit('WARNING', { direction: this.direction }); }
    }
    const dash = this.behavior === 'dash';
    const target = .5 + this.direction * (dash ? .29 : .12);
    this.fishX += (target - this.fishX) * Math.min(1, dt * (dash ? 7 : 3));
    const power = Math.abs(pull), correct = pull * this.direction < -.18;
    if (power >= .95) this.tension += dt * (.38 + this.fish.power * .06);
    else if (correct) this.tension += ((.52 + (dash ? .04 : -.02)) - this.tension) * dt * 3;
    else this.tension -= dt * (dash ? .23 * this.fish.power : .16) * (power > .2 ? 1.5 : 1);
    this.tension = clamp(this.tension, 0, 1);
    if (this.good && correct) { this.goodTime += dt; this.landing += dt / this.fish.landing * (this.behavior === 'tired' ? 1.1 : 1); }
    if (this.tension < .12 || this.tension > .9) this.dangerTime += dt; else this.dangerTime = 0;
    if (this.dangerTime >= (this.tension > .9 ? .65 : .85)) this.miss(this.tension > .9 ? 'break' : 'loose');
    else if (this.landing >= 1) { this.landing = 1; this.land(); }
  }
}
