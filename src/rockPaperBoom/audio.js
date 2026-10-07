import impact from './assets/impact.ogg';
import slash from './assets/slash.ogg';
export class BoomAudio {
  constructor() { this.enabled = true; this.nodes = new Set(); this.buffers = {}; this.token = 0; }
  arm() {
    if (!this.enabled) return;
    try {
      const C = globalThis.AudioContext ?? globalThis.webkitAudioContext;
      if (!C) return;
      this.context ??= new C(); void this.context.resume().catch(() => {});
      if (this.loading) return;
      this.loading = true; const token = this.token, c = this.context;
      for (const [key, url] of Object.entries({ impact, slash })) void fetch(url).then(r => r.arrayBuffer()).then(b => c.decodeAudioData(b))
        .then(buffer => { if (token === this.token) this.buffers[key] = buffer; }).catch(() => {});
    } catch { /* Optional audio. */ }
  }
  track(node, gain) {
    this.nodes.add(node); node.connect(gain); gain.connect(this.context.destination);
    node.onended = () => { this.nodes.delete(node); node.disconnect(); gain.disconnect(); };
  }
  tone(from, to, duration, volume = .09, delay = 0) {
    const c = this.context; if (!this.enabled || c?.state !== 'running') return;
    const o = c.createOscillator(), g = c.createGain(), at = c.currentTime + delay;
    o.type = 'triangle'; o.frequency.setValueAtTime(from, at); o.frequency.exponentialRampToValueAtTime(to, at + duration);
    g.gain.setValueAtTime(.0001, at); g.gain.exponentialRampToValueAtTime(volume, at + .012); g.gain.exponentialRampToValueAtTime(.0001, at + duration);
    this.track(o, g); o.start(at); o.stop(at + duration + .02);
  }
  sample(key, volume = .45) {
    const c = this.context; if (!this.enabled || c?.state !== 'running' || !this.buffers[key]) return;
    const node = c.createBufferSource(), gain = c.createGain(); node.buffer = this.buffers[key]; gain.gain.value = volume;
    this.track(node, gain); node.start();
  }
  play(e) {
    if (e.type === 'COUNT') this.tone(120, 48, .18, .16);
    if (e.type === 'SHOOT') this.tone(1000, 280, .1);
    if (e.type === 'LOCK') this.silence();
    if (e.type === 'BOOM') this.tone(90, 220, .35, .05);
    if (e.type === 'IMPACT') { this.sample(e.result.sign === 'SCISSORS' ? 'slash' : 'impact'); this.tone(100, 24, .8, .23); }
    if (e.type === 'ROUND_END') [523, 659, 784].forEach((f, i) => this.tone(f, f, .24, .065, i * .07));
    if (e.type === 'RETRY') this.tone(360, 190, .18, .045);
  }
  silence() { for (const node of this.nodes) { try { node.stop(); } catch {} } this.nodes.clear(); }
  pause(paused = true) { this.silence(); if (this.context) void (paused ? this.context.suspend() : this.context.resume()).catch(() => {}); }
  stop() { ++this.token; this.silence(); const c = this.context; this.context = null; this.loading = false; this.buffers = {}; if (c?.state !== 'closed') void c?.close().catch(() => {}); }
}
