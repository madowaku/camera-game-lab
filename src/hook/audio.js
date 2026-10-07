import cast from './assets/cast.ogg';
import splash from './assets/splash.ogg';
export class HookAudio {
  constructor() { this.enabled = true; this.buffers = {}; this.generation = 0; }
  arm() {
    try {
      const C = globalThis.AudioContext || globalThis.webkitAudioContext;
      if (!C || !this.enabled) return;
      this.context ??= new C(); void this.context.resume().catch(() => {});
    } catch { return; }
    if (this.hookLoading) return;
    this.hookLoading = true; const token = this.generation, context = this.context;
    for (const [key, url] of Object.entries({ cast, splash })) void fetch(url).then(r => r.arrayBuffer()).then(b => context.decodeAudioData(b))
      .then(buffer => { if (token === this.generation) this.buffers[key] = buffer; }).catch(() => {});
  }
  tone(from, to, duration, volume = .055, type = 'sine', delay = 0) {
    const c = this.context; if (!this.enabled || c?.state !== 'running') return;
    const o = c.createOscillator(), gain = c.createGain(), filter = c.createBiquadFilter(), at = c.currentTime + delay;
    o.type = type; o.frequency.setValueAtTime(from, at); o.frequency.exponentialRampToValueAtTime(to, at + duration);
    filter.type = 'lowpass'; filter.frequency.value = 10000;
    gain.gain.setValueAtTime(.0001, at); gain.gain.exponentialRampToValueAtTime(volume, at + .012); gain.gain.exponentialRampToValueAtTime(.0001, at + duration);
    o.connect(filter); filter.connect(gain); gain.connect(c.destination); o.start(at); o.stop(at + duration + .02);
    o.onended = () => { o.disconnect(); filter.disconnect(); gain.disconnect(); };
  }
  sample(key, volume = .2) {
    const c = this.context, buffer = this.buffers[key]; if (!this.enabled || c?.state !== 'running' || !buffer) return;
    const s = c.createBufferSource(), gain = c.createGain(); s.buffer = buffer; gain.gain.value = volume;
    s.connect(gain); gain.connect(c.destination); s.start(); s.onended = () => { s.disconnect(); gain.disconnect(); };
  }
  pause(paused) { if (this.context) void (paused ? this.context.suspend() : this.context.resume()).catch(() => {}); }
  play(e) {
    if (e.type === 'CAST') this.sample('cast', .48);
    if (e.type === 'SPLASH') { this.sample('splash', .35); this.tone(330, 110, .15); }
    if (e.type === 'NIBBLE') this.tone(580, 480, .08, .025);
    if (e.type === 'BITE') { this.sample('splash', .5); this.tone(700, 1200, .13, .09, 'triangle'); }
    if (e.type === 'HOOK') [440, 660, 880].forEach((f, i) => this.tone(f, f, .15, .065, 'triangle', i * .055));
    if (e.type === 'DASH') { this.sample('cast', .25); this.tone(120, 80, .2, .045, 'triangle'); }
    if (e.type === 'LANDING') { this.sample('splash', .65); this.tone(120, 580, .65, .09); }
    if (e.type === 'CATCH' || e.type === 'FEVER') [523, 659, 784, 1047].forEach((f, i) => this.tone(f, f, .25, .06, 'triangle', i * .08));
    if (e.type === 'MISS') this.tone(260, 65, .35, .07, 'triangle');
    if (e.type === 'RELEASE') this.tone(350, 750, .45, .05);
  }
  stop() { ++this.generation; const c = this.context; this.context = null; this.hookLoading = false; this.buffers = {}; if (c && c.state !== 'closed') void c.close().catch(() => {}); }
}
