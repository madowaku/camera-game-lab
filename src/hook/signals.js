const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export function extractPalm(result) {
  const points = result.landmarks?.[0];
  if (!points) return [];
  const palm = [0,5,9,13,17].map(i=>points[i]);
  if (palm.some(p=>!p || !Number.isFinite(p.x) || !Number.isFinite(p.y))) return [];
  return [{ x:1-palm.reduce((s,p)=>s+p.x,0)/5, y:palm.reduce((s,p)=>s+p.y,0)/5, slot:0, present:true }];
}
// Tracks one geometrically stable palm. Slot changes and recovery rebase motion.
export class HookSignal {
  constructor() { this.reset(); }
  reset() { this.slot = null; this.history = []; this.neutralX = .5; this.at = -Infinity; this.ready = false; this.pending = null; }
  lost() { this.history = []; this.pending = null; this.ready = false; }
  sample(hands, at, phase) {
    let h = hands.find(h => h.present && h.slot === this.slot);
    if (!h) h = hands.find(h => h.present);
    if (!h || !Number.isFinite(h.x) || !Number.isFinite(h.y)) { this.lost(); return null; }
    if (h.slot !== this.slot || at - this.at > 220 || !this.ready) {
      this.slot = h.slot; this.history = []; this.neutralX = h.x; this.ready = true;
    }
    this.at = at; this.hand = { ...h };
    this.history.push({ x: h.x, y: h.y, at }); this.history = this.history.filter(p => at - p.at <= 450);
    const first = this.history[0], age = (at - first.at) / 1000;
    const dx = h.x - first.x, dy = h.y - first.y;
    if (age >= .055 && phase === 'ready' && Math.hypot(dx, dy) >= .12) this.pending = 'cast';
    if (age >= .055 && phase === 'bite' && dy <= -.07) this.pending = 'hook';
    return { hand: this.hand, pull: clamp((h.x - this.neutralX) / .24, -1.5, 1.5) };
  }
  clearMotion() { this.history = []; this.pending = null; }
  consume() { const action = this.pending; this.pending = null; if (action) this.history = []; return action; }
}
