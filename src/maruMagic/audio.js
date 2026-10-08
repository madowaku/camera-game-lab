import rustle from './assets/book-open.ogg';
import pop from './assets/coins.ogg';
export class MaruAudio {
  constructor() { this.enabled = true; this.buffers = {}; this.token = 0; this.nodes = new Set(); }
  arm() {
    if (!this.enabled) return;
    try { const C = globalThis.AudioContext ?? globalThis.webkitAudioContext; if (!C) return; this.context ??= new C(); void this.context.resume().catch(() => {}); } catch { return; }
    if (this.loading) return;
    this.loading = true; const token = this.token, c = this.context;
    for (const [key, url] of Object.entries({ rustle, pop })) void fetch(url).then(r => r.arrayBuffer()).then(b => c.decodeAudioData(b)).then(b => { if (token === this.token) this.buffers[key] = b; }).catch(() => {});
  }
  tone(f, to, duration, delay = 0, volume = .045, type = 'sine') {
    const c = this.context; if (!this.enabled || c?.state !== 'running') return;
    const o = c.createOscillator(), g = c.createGain(), at = c.currentTime + delay; o.type = type;
    o.frequency.setValueAtTime(f, at); o.frequency.exponentialRampToValueAtTime(to, at + duration);
    g.gain.setValueAtTime(.0001, at); g.gain.exponentialRampToValueAtTime(volume, at + .02); g.gain.exponentialRampToValueAtTime(.0001, at + duration);
    o.connect(g); g.connect(c.destination); this.nodes.add(o); o.start(at); o.stop(at + duration + .02);
    o.onended = () => { this.nodes.delete(o); o.disconnect(); g.disconnect(); };
  }
  sample(key, volume = .18) {
    const c = this.context; if (!this.enabled || c?.state !== 'running' || !this.buffers[key]) return;
    const s = c.createBufferSource(), g = c.createGain(); s.buffer = this.buffers[key]; g.gain.value = volume; s.connect(g); g.connect(c.destination); this.nodes.add(s); s.start();
    s.onended = () => { this.nodes.delete(s); s.disconnect(); g.disconnect(); };
  }
  start() { this.sample('rustle', .24); this.tone(260, 520, .18); }
  ready() { this.tone(660, 660, .13, 0, .035); this.tone(990, 990, .2, .09, .04); }
  summon(tier) {
    this.sample('pop', .22);
    if (tier === 0) { this.tone(190, 95, .22, 0, .08, 'triangle'); this.tone(110, 150, .20, .18, .06, 'triangle'); }
    else if (tier === 1) [392, 494, 587].forEach((f, i) => this.tone(f, f, .22, i * .09, .06, 'triangle'));
    else if (tier === 2) [523, 659, 784, 1047].forEach((f, i) => this.tone(f, f * 1.005, .45, i * .10));
    else { [523, 659, 784, 1047, 1319, 1568].forEach((f, i) => this.tone(f, f, .7, i * .1, .045, 'triangle')); [262, 330, 392].forEach(f => this.tone(f, f, 1.35, .65, .025)); }
  }
  silence() { for (const n of this.nodes) { try { n.stop(); } catch {} } this.nodes.clear(); }
  pause(paused) { if (paused) this.silence(); if (this.context) void (paused ? this.context.suspend() : this.context.resume()).catch(() => {}); }
  stop() { ++this.token; this.silence(); const c = this.context; this.context = null; this.buffers = {}; this.loading = false; if (c && c.state !== 'closed') void c.close().catch(() => {}); }
}
