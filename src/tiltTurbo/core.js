import { clamp } from './input.js';
export const ROUND_MS = 20000;
export const ROAD_HALF = .83;
export const COURSE = Object.freeze([
  [0, 0], [2200, 0], [4100, -.70], [6100, .70], [8300, -.76], [10500, .76], [12800, -.84],
  [14700, .15], [15600, -.90], [16600, .90], [17600, -.90], [18500, 0], [20000, 0],
]);
export function roadCenter(at) {
  for (let i = 1; i < COURSE.length; i++) {
    if (at <= COURSE[i][0]) {
      const [t0, x0] = COURSE[i-1], [t1, x1] = COURSE[i];
      const p = clamp((at-t0)/(t1-t0), 0, 1), eased = p*p*(3-2*p);
      return x0 + (x1-x0)*eased;
    }
  }
  return 0;
}
export const OBSTACLES = Object.freeze([
  { at: 4200, offset: .31 }, { at: 6500, offset: -.35 }, { at: 8800, offset: .33 },
  { at: 11100, offset: -.34 }, { at: 13600, offset: .30 }, { at: 15900, offset: .34 }, { at: 17200, offset: -.35 },
]);
export class TiltTurboGame {
  constructor() { this.reset(); }
  reset() {
    this.elapsed = 0; this.x = 0; this.velocity = 0; this.steering = 0; this.distance = 0; this.speed = 0;
    this.hits = 0; this.near = 0; this.driftMs = 0; this.cleanMs = 0; this.maxTilt = 0; this.faceLosses = 0; this.lostMs = 0;
    this.lost = false; this.paused = false; this.result = null; this.started = false; this.cooldown = 0; this.events = []; this.history = []; this.resolved = new Set(); this.announced = new Set(); this.flash = null; this.lastSkrrt = -Infinity;
  }
  start() { this.started = true; this.emit('GO!'); }
  emit(type, data = {}) { const event = { type, at: this.elapsed, data }; this.events.push(event); this.history.push(event); this.flash = event; }
  takeEvents() { return this.events.splice(0); }
  move(dt, steering, tracked = true) {
    this.steering = tracked ? clamp(steering, -1, 1) : 0;
    const target = this.steering * 1.12, blend = 1 - Math.exp(-dt / (tracked ? 110 : 450));
    const previous = this.x; this.x += (target-this.x)*blend; this.velocity = dt ? (this.x-previous)/dt*1000 : 0;
  }
  preview(dt, steering) { this.move(dt, steering); }
  step(dt, { steering = 0, roll = 0, tracked = true } = {}) {
    if (!this.started || this.paused || this.result || !Number.isFinite(dt) || dt <= 0) return;
    // Bound substeps so collisions and the response are stable at low inference FPS.
    let remaining = Math.min(dt, ROUND_MS - this.elapsed);
    while (remaining > 0) { const slice = Math.min(remaining, 16); this.advance(slice, { steering, roll, tracked }); remaining -= slice; }
    if (this.elapsed >= ROUND_MS) {
      this.emit('FINISH!');
      const distanceScore = Math.floor(this.distance * 4), cleanBonus = Math.floor(this.cleanMs / 20), driftBonus = Math.floor(this.driftMs / 15);
      this.result = { elapsed: ROUND_MS, score: distanceScore + cleanBonus + this.near*100 + driftBonus, hits: this.hits, near: this.near,
        maxTilt: Math.round(this.maxTilt), distance: Math.round(this.distance), cleanBonus, driftBonus, driftMs: Math.round(this.driftMs), faceLosses: this.faceLosses, lostMs: Math.round(this.lostMs) };
    }
  }
  advance(dt, input) {
    const previous = this.elapsed, previousX = this.x;
    this.elapsed += dt; this.cooldown = Math.max(0, this.cooldown-dt);
    if (!input.tracked && !this.lost) { this.faceLosses++; this.emit('FACE LOST'); }
    this.lost = !input.tracked; if (this.lost) this.lostMs += dt;
    if (input.tracked) {
      const tilt = Math.abs(input.roll);
      if (Number.isFinite(tilt) && tilt > this.maxTilt) { this.maxTilt = Math.min(tilt, 45); if (tilt >= 15 && !this.announced.has('tilt')) { this.announced.add('tilt'); this.emit('MAX TILT'); } }
    }
    this.move(dt, input.steering, input.tracked);
    const edge = this.x - roadCenter(this.elapsed);
    if (Math.abs(edge) > ROAD_HALF-.20 && this.cooldown === 0) {
      this.bonk(); this.x = clamp(roadCenter(this.elapsed) + Math.sign(edge)*(ROAD_HALF-.30), -1.12, 1.12); this.velocity = -Math.sign(edge)*.8;
    }
    for (const [i, obstacle] of OBSTACLES.entries()) {
      if (this.resolved.has(i) || previous >= obstacle.at || this.elapsed < obstacle.at) continue;
      this.resolved.add(i);
      const p = (obstacle.at-previous)/dt, x = previousX+(this.x-previousX)*p, separation = Math.abs(x - roadCenter(obstacle.at) - obstacle.offset);
      if (separation < .23) { if (!this.cooldown) this.bonk(); }
      else if (separation < .45) { this.near++; this.emit('NICE!', { score: 100 }); }
    }
    this.speed += ((this.cooldown ? 32 : 65 + Math.min(this.elapsed/1000, 12)*2)-this.speed)*(1-Math.exp(-dt/250));
    this.distance += this.speed*dt/1000;
    if (!this.cooldown) this.cleanMs += dt;
    if (Math.abs(this.steering) > .48 && Math.abs(edge) < ROAD_HALF && !this.cooldown) {
      this.driftMs += dt;
      if (this.elapsed - (this.lastSkrrt ?? -Infinity) > 1400) { this.lastSkrrt = this.elapsed; this.emit('SKRRRT!'); }
    }
    for (const [at, label] of [[15000,'LEFT!'],[16100,'RIGHT!'],[17100,'LEFT!'],[18500,'JUMP!']]) {
      if (previous < at && this.elapsed >= at) this.emit(label);
    }
  }
  bonk() { this.hits++; this.cooldown = 650; this.speed *= .55; this.emit('BONK!'); }
}
