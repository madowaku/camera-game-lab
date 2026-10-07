export const DURATION = 45;
export const SURFACE = .19;
export const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
export const FOODS = Object.freeze({
  flake: { points: 1, cost: .4, label: 'FOOD' },
  shrimp: { points: 3, cost: 1.5, label: 'SHRIMP' },
  pearl: { points: 10, cost: 4, label: 'PEARL' },
  gold: { points: 15, cost: 6, label: 'GOLDEN FOOD' },
  giant: { points: 20, cost: 8, label: 'GIANT PEARL' },
});
export function titleFor(r) {
  if (r.catHits >= 2) return ['猫の友達', 'CAT’S FRIEND'];
  if (r.treasures >= 3) return ['欲張り人面魚', 'GREEDY HUMAN FISH'];
  if (r.shrimp >= 6) return ['エビ絶対食う魚', 'SHRIMP OR NOTHING'];
  if (r.closeBreaths >= 2) return ['酸素管理士', 'OXYGEN MANAGER'];
  if (r.maxDepth >= 85) return ['深海人面魚', 'DEEP WATER HUMAN FISH'];
  if (r.surfaceTime > r.survival * .45) return ['水面の住人', 'SURFACE RESIDENT'];
  return ['駆け出し人面魚', 'NEW HUMAN FISH'];
}

// All rules use normalized tank coordinates. Rendering and recognition are separate.
export class HumanFishGame {
  constructor({ random = Math.random } = {}) { this.random = random; this.reset(); }
  reset() {
    this.elapsed = 0; this.oxygen = 100; this.score = 0; this.phase = 'ready'; this.low = false; this.paused = false;
    this.player = { x: .5, y: .43 }; this.items = []; this.events = []; this.id = 0;
    this.foods = 0; this.shrimp = 0; this.treasures = 0; this.breaths = 0;
    this.closeBreaths = 0; this.catHits = 0; this.maxDepth = 0; this.surfaceTime = 0;
    this.lastBreath = -10; this.lastBite = -10; this.stun = 0; this.cat = null;
    this.nextSpawn = 2.5; this.nextCat = 38; this.milestones = new Set(); this.result = null;
    [.28, .65].forEach(x => this.spawn('flake', x, .31));
    [.25, .72].forEach(x => this.spawn('shrimp', x, .53));
  }
  start() { this.phase = 'playing'; this.emit('START'); }
  emit(type, data = {}) { this.events.push({ type, at: this.elapsed, ...data }); }
  drainEvents() { const events = this.events; this.events = []; return events; }
  spawn(kind, x, y, bonus = false) {
    if (this.items.length >= 14) this.items.shift();
    const item = { id: ++this.id, kind, x, y, born: this.elapsed, bonus };
    this.items.push(item); return item;
  }
  get atSurface() { return this.player.y <= SURFACE; }
  step(dt, { target = null, bite = false } = {}) {
    if (this.phase !== 'playing' || this.paused || !Number.isFinite(dt) || dt <= 0) return;
    // Fixed substeps keep oxygen/failure and cat hits independent of frame rate.
    let remaining = Math.min(dt, .25), first = true;
    while (remaining > 1e-8 && this.phase === 'playing') {
      const part = Math.min(remaining, 1 / 120, DURATION - this.elapsed);
      this.advance(part, target, first && bite); first = false; remaining -= part;
    }
  }
  advance(dt, target, bite) {
    this.stun = Math.max(0, this.stun - dt);
    if (target && this.stun === 0 && [target.x, target.y].every(Number.isFinite)) {
      const x = clamp(target.x, .13, .87), y = clamp(target.y, .155, .9);
      this.player.x += clamp(x - this.player.x, -.85 * dt, .85 * dt);
      this.player.y += clamp(y - this.player.y, -.72 * dt, .72 * dt);
    }
    if (bite) this.bite();
    const depth = clamp((this.player.y - .155) / .745, 0, 1);
    this.maxDepth = Math.max(this.maxDepth, depth * 100);
    if (this.atSurface) this.surfaceTime += dt;
    const drain = (4.8 + depth * 2.8) * (this.elapsed >= 30 ? 1.16 : 1);
    if (this.oxygen <= drain * dt) {
      this.elapsed += this.oxygen / drain; this.oxygen = 0; this.finish(false); return;
    }
    this.oxygen -= drain * dt; this.elapsed = Math.min(DURATION, this.elapsed + dt);
    this.progress(); this.updateCat();
    if (this.oxygen <= 5 && !this.low) { this.low = true; this.emit('LOW'); }
    if (this.elapsed >= DURATION - 1e-8) { this.elapsed = DURATION; this.finish(true); }
  }
  bite() {
    if (this.phase !== 'playing' || this.paused || this.stun > 0) return;
    this.lastBite = this.elapsed;
    if (this.atSurface) {
      if (this.elapsed - this.lastBreath < 1 || this.oxygen > 95) return;
      const before = this.oxygen; this.oxygen = 100; this.lastBreath = this.elapsed;
      this.breaths++; if (before <= 10) this.closeBreaths++;
      this.low = false; this.emit('BREATH', { before, close: before <= 10, ...this.player });
      return;
    }
    const nearest = this.items.map(item => ({ item, d: Math.hypot((item.x - this.player.x) / .10, (item.y - this.player.y) / .065) }))
      .filter(({ d }) => d <= 1).sort((a, b) => a.d - b.d)[0]?.item;
    if (!nearest) { this.emit('EMPTY', { ...this.player }); return; }
    const food = FOODS[nearest.kind]; this.items = this.items.filter(i => i !== nearest);
    this.score += food.points; this.foods++; this.oxygen = Math.max(0, this.oxygen - food.cost);
    if (nearest.kind === 'shrimp') this.shrimp++;
    if (['pearl', 'gold', 'giant'].includes(nearest.kind)) this.treasures++;
    this.emit('EAT', { kind: nearest.kind, points: food.points, ...this.player });
    if (nearest.kind === 'giant' || nearest.kind === 'gold') {
      const x = clamp(nearest.x + (nearest.x > .5 ? -.22 : .22), .18, .82);
      this.spawn('shrimp', x, clamp(nearest.y - .07, .55, .86), true);
      this.emit('TEMPT', { label: 'BONUS SHRIMP!' });
    }
    if (this.oxygen === 0) this.finish(false);
  }
  progress() {
    for (const [time, kind, x, y] of [[20, 'pearl', .3, .82], [24, 'giant', .68, .86], [30, 'gold', .36, .88], [34, 'giant', .73, .83], [39, 'gold', .4, .86]]) {
      if (this.elapsed >= time - 1e-8 && !this.milestones.has(time)) {
        this.milestones.add(time); this.spawn(kind, x, y); this.emit('TREASURE', { kind, points: FOODS[kind].points });
      }
    }
    if (this.elapsed >= this.nextSpawn) {
      this.nextSpawn += this.elapsed >= 30 ? 1.6 : 3;
      const kind = this.id % 3 === 0 ? 'shrimp' : 'flake';
      this.spawn(kind, .2 + this.random() * .6, kind === 'flake' ? .28 + this.random() * .1 : .46 + this.random() * .15);
    }
    this.items = this.items.filter(i => this.elapsed - i.born < (i.kind === 'flake' ? 14 : 24));
  }
  updateCat() {
    if (!this.cat && this.elapsed >= this.nextCat) {
      this.cat = { x: clamp(this.player.x, .23, .77), at: this.elapsed, hit: false };
      this.nextCat += 2.7; this.emit('CAT_WARNING', { x: this.cat.x });
    }
    if (!this.cat) return;
    const age = this.elapsed - this.cat.at;
    if (age >= 1 && age < 1.7 && !this.cat.hit && this.player.y < .30 && Math.abs(this.player.x - this.cat.x) < .145) {
      this.cat.hit = true; this.catHits++; this.oxygen = Math.max(0, this.oxygen - 12);
      this.player.y = .42; this.stun = .4; this.emit('CAT_HIT', { x: this.cat.x });
      if (this.oxygen === 0) this.finish(false);
    }
    if (age >= 1.85) this.cat = null;
  }
  finish(survived) {
    if (this.result) return;
    this.phase = survived ? 'clear' : 'over';
    this.result = { survived, score: this.score, survival: Number(this.elapsed.toFixed(1)), foods: this.foods,
      breaths: this.breaths, maxDepth: Math.round(this.maxDepth), closeBreaths: this.closeBreaths,
      catHits: this.catHits, shrimp: this.shrimp, treasures: this.treasures, surfaceTime: this.surfaceTime };
    [this.result.titleJa, this.result.titleEn] = titleFor(this.result);
    this.emit(survived ? 'CLEAR' : 'DROWN');
  }
}
