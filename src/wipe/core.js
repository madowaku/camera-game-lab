export const W = 540, H = 960, COLS = 36, ROWS = 64, CELL = W / COLS;
export const clamp = (v, min = 0, max = 1) => Math.max(min, Math.min(max, v));
const valid = p => p && Number.isFinite(p.x) && Number.isFinite(p.y) && p.present !== false;
const circle = (x, y, r) => ({ x, y, r });
const random = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t ^= t + Math.imul(t ^ t >>> 7, 61 | t); return ((t ^ t >>> 14) >>> 0) / 4294967296; };

// The same grid owns appearance AND area. 100% requires every cell to be clear.
export class WipeGame {
  constructor({ mode = "solo", source = "demo", seed = 49 } = {}) { this.reset({ mode, source, seed }); }
  reset({ mode = this.mode, source = this.source, seed = this.seed } = {}) {
    this.mode = mode === "duo" ? "duo" : "solo"; this.source = source; this.seed = seed;
    this.phase = "waiting"; this.elapsed = 0; this.duration = this.mode === "duo" ? 45000 : 30000;
    this.paused = false; this.pauseReason = null; this.readyAge = 0; this.lostAge = 0; this.finishAge = 0;
    this.events = []; this.patches = []; this.contacts = new Map(); this.palms = []; this.result = null;
    this.cells = new Uint8Array(COLS * ROWS).fill(1); this.strength = new Uint8Array(COLS * ROWS).fill(1);
    this.types = new Uint8Array(COLS * ROWS); this.rng = random(seed); this.attacks = [0, 0]; this.strokes = [0, 0]; this.milestones = [0, 0]; this.revision = 0;
    for (let side = 0; side < this.players; side++) {
      const start = this.mode === "duo" ? side * W / 2 : 0, width = W / this.players;
      const px = x => start + width * x;
      for (const [x, y] of [[.2,.26],[.77,.34],[.64,.78],[.25,.85]]) this.addPatch("drop", side, [circle(px(x), H * y, width * .045)], 2);
      this.addPatch("foam", side, [circle(px(.24), H * .55, width * .11),circle(px(.4), H * .59, width * .1),circle(px(.28), H * .65, width * .075)], 1);
      const hx = px(.72), hy = H * .55, hr = width * .045;
      this.addPatch("hand", side, [circle(hx,hy,hr*1.5), ...[-1.2,-.4,.4,1.2].map((a,i) => circle(hx+a*hr,hy-hr*(2.4-Math.abs(i-1.5)*.3),hr*.45)),circle(hx-hr*1.8,hy-hr*.1,hr*.65)], 3);
      if (this.mode === "duo") this.addPatch("big", side, [circle(px(.5), H * .36, width * .17)], 2);
    }
  }
  get players() { return this.mode === "duo" ? 2 : 1; }
  sideFor(index) { return this.mode === "duo" && index % COLS >= COLS / 2 ? 1 : 0; }
  indices(shapes, side) {
    const out = [];
    for (let i = 0; i < this.cells.length; i++) {
      if (this.sideFor(i) !== side) continue;
      const x = (i % COLS + .5) * CELL, y = (Math.floor(i / COLS) + .5) * CELL;
      if (shapes.some(s => Math.hypot(x - s.x, y - s.y) <= s.r)) out.push(i);
    }
    return out;
  }
  addPatch(type, side, shapes, strength) {
    const indices = this.indices(shapes, side), code = { drop:1,foam:2,hand:3,big:4 }[type];
    for (const i of indices) { this.cells[i] = Math.max(this.cells[i], strength); this.strength[i] = Math.max(this.strength[i], strength); this.types[i] = code; }
    this.patches.push({ type, side, shapes, indices, cleared: false }); this.revision++;
    return indices;
  }
  clean(side = 0) {
    if (side >= this.players) return 0;
    let dirty = 0, area = 0;
    for (let i = 0; i < this.cells.length; i++) if (this.sideFor(i) === side) { dirty += this.cells[i] / this.strength[i]; area++; }
    return clamp(1 - dirty / area) * 100;
  }
  percent(side = 0) { const value = this.clean(side); return value === 100 ? 100 : Math.min(99, Math.floor(value)); }
  pause(reason = "user") { if (["result","finish"].includes(this.phase)) return; this.paused = true; this.pauseReason = reason; this.contacts.clear(); }
  resume() { this.paused = false; this.pauseReason = null; this.lostAge = 0; this.contacts.clear(); }
  ready(palms) { return Array.from({ length:this.players }, (_, side) => palms.some(p => valid(p) && (this.players === 1 || (p.x < .5 ? 0 : 1) === side))).every(Boolean); }
  step(dt, palms = []) {
    dt = clamp(dt, 0, 100); this.events = [];
    this.palms = palms.filter(valid);
    if (this.phase === "result") return;
    if (this.phase === "finish") { if (!this.paused) this.finishAge += dt; if (this.finishAge >= 1400) this.phase = "result"; return; }
    if (this.paused) {
      if (this.pauseReason === "tracking" && this.ready(this.palms)) { this.resume(); this.events.push({ type:"recovered", at:this.elapsed }); }
      else return;
    }
    if (this.phase === "waiting") {
      if (this.ready(this.palms)) { this.phase = "ready"; this.readyAge = 0; this.events.push({ type:"ready", at:0 }); }
      return;
    }
    if (this.phase === "ready") {
      if (!this.ready(this.palms)) { this.phase = "waiting"; return; }
      this.readyAge += dt;
      if (this.readyAge >= 600) { this.phase = "playing"; this.events.push({ type:"start", at:0 }); }
      return;
    }
    if (this.source === "camera" && !this.ready(this.palms)) {
      this.lostAge += dt;
      if (this.lostAge >= 350) { this.pause("tracking"); this.events.push({ type:"lost", at:this.elapsed }); return; }
    } else this.lostAge = 0;
    this.elapsed += dt;
    const ids = new Set(this.palms.map(p => p.id));
    for (const id of this.contacts.keys()) if (!ids.has(id)) this.contacts.delete(id);
    // Both sides wipe before scoring: equal completion in one frame is a draw.
    for (const p of this.palms) this.wipe(p);
    const complete = Array.from({ length:this.players },(_,i) => this.percent(i) === 100);
    if (complete.some(Boolean)) { this.finish("perfect", complete.every(Boolean) && this.players === 2 ? 0 : complete[0] ? 1 : 2); return; }
    for (const patch of this.patches) if (!patch.cleared && patch.indices.every(i => this.cells[i] === 0)) {
      patch.cleared = true; this.events.push({ type:"patch", kind:patch.type, side:patch.side, point:patch.shapes[0], at:this.elapsed });
      if (patch.type === "big") this.splash(patch.side);
    }
    for (let side = 0; side < this.players; side++) {
      const milestone = Math.floor(this.clean(side) / 10);
      if (milestone > this.milestones[side]) { this.milestones[side] = milestone; this.events.push({ type:"sparkle", side, at:this.elapsed }); }
    }
    if (this.elapsed >= this.duration) {
      const difference = this.clean(0) - this.clean(1);
      this.finish("time", this.players === 1 || Math.abs(difference) < 1e-8 ? 0 : difference > 0 ? 1 : 2);
    }
  }
  wipe(p) {
    const side = this.players === 1 ? 0 : p.x < .5 ? 0 : 1;
    const radius = clamp(p.radius ?? (this.players === 1 ? .135 : .095), this.players === 1 ? .10 : .065, this.players === 1 ? .19 : .13) * W;
    const x = clamp(p.x) * W, y = clamp(p.y) * H;
    let previous = this.contacts.get(p.id);
    if (previous?.side !== side) previous = null;
    // Missing observations never draw a bridge across the dirty glass.
    const distance = previous ? Math.hypot(x-previous.x,y-previous.y) : 0;
    const continuous = previous && distance < W * .42;
    const n = continuous ? Math.max(1, Math.ceil(distance / (radius * .35))) : 1;
    let contact = continuous ? previous.contact : new Set(), changed = 0;
    let travel = continuous ? previous.travel : 0;
    for (let step = 1; step <= n; step++) {
      const sx = continuous ? previous.x + (x-previous.x) * step/n : x, sy = continuous ? previous.y + (y-previous.y) * step/n : y;
      travel += continuous ? distance/n : 0;
      // A short scrub earns another pass; a stationary palm earns none.
      if (travel >= radius * .75) { contact = new Set(); travel = 0; }
      const next = new Set();
      const minX = clamp(Math.floor((sx-radius)/CELL),0,COLS-1), maxX = clamp(Math.floor((sx+radius)/CELL),0,COLS-1);
      const minY = clamp(Math.floor((sy-radius)/CELL),0,ROWS-1), maxY = clamp(Math.floor((sy+radius)/CELL),0,ROWS-1);
      for (let row=minY;row<=maxY;row++) for(let col=minX;col<=maxX;col++) {
        const i = row*COLS+col;
        if (this.sideFor(i)!==side || Math.hypot((col+.5)*CELL-sx,(row+.5)*CELL-sy)>radius) continue;
        next.add(i); if (!contact.has(i) && this.cells[i]>0) { this.cells[i]--; changed++; }
      }
      contact = next;
    }
    this.contacts.set(p.id,{ x,y,side,travel,contact });
    if (changed) { this.revision++; this.strokes[side]++; this.events.push({ type:"wipe", side, changed, point:{x,y}, radius, at:this.elapsed }); }
  }
  splash(from) {
    const side = 1-from, small = this.clean(side)>=90;
    const budget = Math.floor(COLS*ROWS/2 * (small ? .008 : .045));
    // Add only new visible dirt; cap the actual affected area at the endgame.
    const candidates = [];
    for(let i=0;i<this.cells.length;i++) if(this.sideFor(i)===side&&this.cells[i]===0)candidates.push(i);
    // A rival who has not wiped yet can still receive visible, tougher droplets.
    if(!candidates.length)for(let i=0;i<this.cells.length;i++)if(this.sideFor(i)===side&&this.types[i]===0)candidates.push(i);
    const anchor = candidates.length ? candidates[Math.floor(this.rng()*candidates.length)] : null;
    if(anchor===null)return;
    const ax=(anchor%COLS+.5)*CELL,ay=(Math.floor(anchor/COLS)+.5)*CELL;
    const count=small?2:3,shapes=Array.from({length:count},(_,j)=>{
      const i=j===0?anchor:candidates[Math.floor(this.rng()*candidates.length)];
      return circle((i%COLS+.5)*CELL,(Math.floor(i/COLS)+.5)*CELL,Math.sqrt(budget/count)*CELL*.6);
    });
    const distance=i=>Math.min(...shapes.map(s=>Math.hypot((i%COLS+.5)*CELL-s.x,(Math.floor(i/COLS)+.5)*CELL-s.y)));
    candidates.sort((a,b)=>distance(a)-distance(b));
    const indices=candidates.slice(0,budget);
    for(const i of indices){this.cells[i]=Math.max(this.cells[i],small?1:2);this.strength[i]=Math.max(this.strength[i],small?1:2);this.types[i]=1;}
    this.patches.push({type:"drop",side,shapes,indices,cleared:false});
    this.attacks[from]++; this.revision++;
    this.events.push({ type:"splash", from,side,small,point:{x:ax,y:ay}, at:this.elapsed });
  }
  finish(reason, winner) {
    if (this.phase !== "playing") return;
    this.phase = "finish"; this.finishAge = 0; this.contacts.clear();
    this.result = { mode:this.mode,source:this.source,reason,outcome:reason,winner,clean:Array.from({length:this.players},(_,i)=>this.percent(i)),elapsed:Math.round(this.elapsed)/1000,attacks:[...this.attacks],strokes:[...this.strokes] };
    this.events.push({type:reason === "perfect" ? "perfect" : "time",winner,at:this.elapsed});
  }
}
