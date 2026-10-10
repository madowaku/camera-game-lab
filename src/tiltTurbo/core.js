import { clamp } from './input.js';
import { COURSES, CARS, pickCourse, pickCar } from './garage.js';
export const ROUND_MS = 20000;
export const ROAD_HALF = .83;
export const COURSE = Object.freeze([
  [0, 0], [2200, 0], [4100, -.70], [6100, .70], [8300, -.76], [10500, .76], [12800, -.84],
  [14700, .15], [15600, -.90], [16600, .90], [17600, -.90], [18500, 0], [20000, 0],
]);
export function roadCenter(at, path = COURSE) {
  for (let i = 1; i < path.length; i++) {
    if (at <= path[i][0]) {
      const [t0, x0] = path[i-1], [t1, x1] = path[i];
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
  constructor({ courseId = COURSES[0].id, carId = CARS[0].id } = {}) {
    this.course = pickCourse(courseId); this.car = pickCar(carId); this.reset();
  }
  reset() {
    this.elapsed = 0; this.x = 0; this.velocity = 0; this.steering = 0; this.distance = 0; this.speed = 0;
    this.hits = 0; this.near = 0; this.overtakes = 0; this.trafficHits = 0; this.driftMs = 0; this.cleanMs = 0; this.maxTilt = 0; this.faceLosses = 0; this.lostMs = 0;
    this.lost = false; this.paused = false; this.result = null; this.started = false; this.cooldown = 0; this.events = []; this.history = []; this.resolved = new Set(); this.announced = new Set(); this.flash = null; this.lastSkrrt = -Infinity;
  }
  start() { this.started = true; this.emit('GO!'); }
  emit(type, data = {}) { const event = { type, at: this.elapsed, data }; this.events.push(event); this.history.push(event); this.flash = event; }
  takeEvents() { return this.events.splice(0); }
  move(dt, steering, tracked = true) {
    this.steering = tracked ? clamp(steering, -1, 1) : 0;
    const target = this.steering * 1.12 * this.car.steeringGain, blend = 1 - Math.exp(-dt / (tracked ? this.car.responseMs : 450));
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
      this.result = { elapsed: ROUND_MS, score: distanceScore + cleanBonus + this.near*100 + driftBonus + this.overtakes*150, hits: this.hits, near: this.near, overtakes:this.overtakes, trafficHits:this.trafficHits, courseId:this.course.id, carId:this.car.id,
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
    const edge = this.x - roadCenter(this.elapsed, this.course.path);
    if (Math.abs(edge) > this.course.roadHalf-.20 && this.cooldown === 0) {
      this.bonk(); this.x = clamp(roadCenter(this.elapsed, this.course.path) + Math.sign(edge)*(this.course.roadHalf-.30), -1.12, 1.12); this.velocity = -Math.sign(edge)*.8;
    }
    for (const [i, obstacle] of this.course.cones.entries()) {
      if (this.resolved.has('cone-'+i) || previous >= obstacle.at || this.elapsed < obstacle.at) continue;
      this.resolved.add('cone-'+i);
      const p = (obstacle.at-previous)/dt, x = previousX+(this.x-previousX)*p, separation = Math.abs(x - roadCenter(obstacle.at, this.course.path) - obstacle.offset);
      if (separation < .23) { if (!this.cooldown) this.bonk(); }
      else if (separation < .45) { this.near++; this.emit('NICE!', { score: 100 }); }
    }
    // Moving traffic advances along the road, but less quickly than the
    // player. When the relative world separation reaches zero, a pass or
    // collision is resolved once at a deterministic time crossing.
    for (const [i, rival] of this.course.traffic.entries()) {
      const key = 'traffic-'+i;
      if(this.resolved.has(key) || previous >= rival.at || this.elapsed < rival.at) continue;
      this.resolved.add(key);
      const p = (rival.at-previous)/dt;
      const playerX = previousX+(this.x-previousX)*p;
      const rivalX = roadCenter(rival.at,this.course.path)+rival.offset+Math.sin(rival.seed)*.06;
      const gap = Math.abs(playerX-rivalX);
      if(gap<.29) {
        if(!this.cooldown) { this.trafficHits++; this.bonk(); this.emit('TRAFFIC!'); }
      } else {
        this.overtakes++;
        this.emit(gap<.52?'CLOSE PASS!':'PASS!',{score:150});
        if(gap<.52) this.near++;
      }
    }
    this.speed += ((this.cooldown ? 32 : 65 + Math.min(this.elapsed/1000, 12)*2)-this.speed)*(1-Math.exp(-dt/250));
    this.distance += this.speed*dt/1000;
    if (!this.cooldown) this.cleanMs += dt;
    if (Math.abs(this.steering) > .48 && Math.abs(edge) < this.course.roadHalf && !this.cooldown) {
      this.driftMs += dt;
      if (this.elapsed - (this.lastSkrrt ?? -Infinity) > 1400) { this.lastSkrrt = this.elapsed; this.emit('SKRRRT!'); }
    }
    for (const [at, label] of [[15000,'LEFT!'],[16100,'RIGHT!'],[17100,'LEFT!'],[18500,'JUMP!']]) {
      if (previous < at && this.elapsed >= at) this.emit(label);
    }
  }
  bonk() { this.hits++; this.cooldown = this.car.cooldownMs; this.speed *= .55; this.emit('BONK!'); }
}
