import shutter from './assets/se/shutter.ogg';
import tick from './assets/se/tick.ogg';
export class DontLaughAudio {
  constructor() { this.enabled = true; this.context = null; this.buffers = {}; this.token = 0; }
  arm() {
    try {
      const C = window.AudioContext ?? window.webkitAudioContext; if (!C || !this.enabled) return;
      this.context ??= new C(); const c = this.context, token = this.token; void c.resume().catch(() => {});
      if (!this.loading) { this.loading = true; for (const [key, url] of Object.entries({ shutter, tick })) void fetch(url).then(r => r.arrayBuffer()).then(b => c.decodeAudioData(b)).then(b => { if (token === this.token) this.buffers[key] = b; }).catch(() => {}); }
    } catch { /* Audio is optional. */ }
  }
  sample(key) { const c = this.context; if (!this.enabled || c?.state !== 'running' || !this.buffers[key]) return; const n = c.createBufferSource(), g = c.createGain(); n.buffer = this.buffers[key]; g.gain.value = .3; n.connect(g); g.connect(c.destination); n.start(); n.onended = () => { n.disconnect(); g.disconnect(); }; }
  tone(a, b, duration = .18, delay = 0, type = 'triangle') {
    const c = this.context; if (!this.enabled || c?.state !== 'running') return;
    const at = c.currentTime + delay, o = c.createOscillator(), g = c.createGain(); o.type = type; o.frequency.setValueAtTime(a, at); o.frequency.exponentialRampToValueAtTime(b, at + duration);
    g.gain.setValueAtTime(.001, at); g.gain.exponentialRampToValueAtTime(.065, at + .015); g.gain.exponentialRampToValueAtTime(.001, at + duration); o.connect(g); g.connect(c.destination); o.start(at); o.stop(at + duration + .01); o.onended = () => { o.disconnect(); g.disconnect(); };
  }
  play(e) {
    if (e.type === 'laughed') { this.sample('shutter'); this.tone(330, 110, .3); }
    else if (e.type === 'survived') [392, 494, 587, 784].forEach((f, i) => this.tone(f, f, .28, i * .1));
    else if (e.type === 'tick') { this.sample('tick'); this.tone(500, 650, .06); }
    else if (e.attack === 'final') [196, 294, 392, 494].forEach(f => this.tone(f, f, .65));
    else if (e.attack === 'clones' || e.type === 'mouth') { this.tone(120, 780, .13); this.tone(730, 170, .2, .1); }
    else if (e.type === 'attack') this.tone(360, 190, .1);
  }
  stop() { ++this.token; if (this.context) void this.context.close().catch(() => {}); this.context = null; this.buffers = {}; this.loading = false; }
}
