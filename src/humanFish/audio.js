import swish from './assets/swish.ogg';
import paw from './assets/paw.ogg';

export class FishAudio {
  constructor() { this.enabled = true; this.buffers = {}; this.generation = 0; }
  arm() {
    try {
      const C = globalThis.AudioContext || globalThis.webkitAudioContext;
      if (!C || !this.enabled) return;
      this.context ??= new C(); void this.context.resume().catch(() => {});
      if (this.loading) return;
      this.loading = true; const token = this.generation, context = this.context;
      for (const [key, url] of Object.entries({ swish, paw })) void fetch(url).then(r => r.arrayBuffer()).then(b => context.decodeAudioData(b))
        .then(buffer => { if (token === this.generation) this.buffers[key] = buffer; }).catch(() => {});
    } catch { /* Optional sound never blocks play. */ }
  }
  tone(from, to, duration, volume = .055, type = 'sine', delay = 0) {
    const c = this.context; if (!this.enabled || c?.state !== 'running') return;
    const o = c.createOscillator(), gain = c.createGain(), filter = c.createBiquadFilter(), at = c.currentTime + delay;
    o.type = type; o.frequency.setValueAtTime(from, at); o.frequency.exponentialRampToValueAtTime(to, at + duration);
    filter.type = 'lowpass'; filter.frequency.value = this.muffled ? 600 : 10000;
    gain.gain.setValueAtTime(.0001, at); gain.gain.exponentialRampToValueAtTime(volume, at + .012); gain.gain.exponentialRampToValueAtTime(.0001, at + duration);
    o.connect(filter); filter.connect(gain); gain.connect(c.destination); o.start(at); o.stop(at + duration + .02);
    o.onended = () => { o.disconnect(); filter.disconnect(); gain.disconnect(); };
  }
  sample(key, volume = .2) {
    const c = this.context, buffer = this.buffers[key]; if (!this.enabled || c?.state !== 'running' || !buffer) return;
    const s = c.createBufferSource(), gain = c.createGain(); s.buffer = buffer; gain.gain.value = volume;
    s.connect(gain); gain.connect(c.destination); s.start(); s.onended = () => { s.disconnect(); gain.disconnect(); };
  }
  play(e) {
    if (e.type === 'EAT') { this.tone(420, 900, .12); if (e.points >= 10) this.tone(1100, 1600, .22, .05, 'sine', .1); }
    if (e.type === 'BREATH') { this.muffled = false; this.sample('swish', .6); [320, 640, 960].forEach((f, i) => this.tone(f, f * 1.6, .3, .045, 'triangle', i * .055)); }
    if (e.type === 'CAT_HIT') { this.sample('paw', .5); this.tone(160, 60, .24, .1, 'triangle'); }
    if (e.type === 'CAT_WARNING') this.tone(600, 420, .16, .04, 'triangle');
    if (e.type === 'LOW') this.tone(140, 80, .5, .05, 'triangle');
    if (e.type === 'DROWN') this.tone(240, 65, .7, .04);
    if (e.type === 'CLEAR') [523, 659, 784, 1047].forEach((f, i) => this.tone(f, f, .28, .045, 'triangle', i * .12));
  }
  pause(paused) { if (this.context) void (paused ? this.context.suspend() : this.context.resume()).catch(() => {}); }
  stop() { ++this.generation; const c = this.context; this.context = null; this.loading = false; this.buffers = {}; if (c && c.state !== 'closed') void c.close().catch(() => {}); }
}
