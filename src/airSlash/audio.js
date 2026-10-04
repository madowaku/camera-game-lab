import slash from './assets/sfx/slash.ogg';
import split from './assets/sfx/split.ogg';
import bomb from './assets/sfx/bomb.ogg';
const samples = { slash, split, bomb };
export class AirSlashAudio {
  constructor() { this.enabled = true; this.buffers = {}; this.nodes = new Set(); this.generation = 0; this.lastSlash = -Infinity; }
  arm() {
    if (!this.enabled) return;
    try {
      const C = window.AudioContext ?? window.webkitAudioContext; if (!C) return; this.context ??= new C(); void this.context.resume().catch(() => {});
      if (this.loading) return; this.loading = true; const token = this.generation, c = this.context;
      for (const [key, url] of Object.entries(samples)) void fetch(url).then(r => r.arrayBuffer()).then(b => c.decodeAudioData(b)).then(b => { if (token === this.generation) this.buffers[key] = b; }).catch(() => {});
    } catch { /* A muted round remains playable. */ }
  }
  sample(key, volume = .2, rate = 1) {
    const c = this.context; if (!this.enabled || c?.state !== 'running' || !this.buffers[key]) return;
    const node = c.createBufferSource(), gain = c.createGain(); node.buffer = this.buffers[key]; node.playbackRate.value = rate; gain.gain.value = volume;
    node.connect(gain); gain.connect(c.destination); this.nodes.add(node); node.onended = () => { this.nodes.delete(node); node.disconnect(); gain.disconnect(); }; node.start();
  }
  tone(frequency, delay = 0, duration = .2) {
    const c = this.context; if (!this.enabled || c?.state !== 'running') return;
    const o = c.createOscillator(), g = c.createGain(), at = c.currentTime + delay; o.type = 'triangle'; o.frequency.setValueAtTime(frequency, at); g.gain.setValueAtTime(.035, at); g.gain.exponentialRampToValueAtTime(.001, at + duration); o.connect(g); g.connect(c.destination); this.nodes.add(o); o.onended = () => { this.nodes.delete(o); o.disconnect(); g.disconnect(); }; o.start(at); o.stop(at + duration);
  }
  boom() {
    const c = this.context; if (!this.enabled || c?.state !== 'running') return;
    const buffer = c.createBuffer(1, Math.ceil(c.sampleRate * .32), c.sampleRate), data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    const node = c.createBufferSource(), filter = c.createBiquadFilter(), gain = c.createGain(); node.buffer = buffer; filter.type = 'lowpass'; filter.frequency.value = 1100;
    gain.gain.setValueAtTime(.25, c.currentTime); gain.gain.exponentialRampToValueAtTime(.001, c.currentTime + .32); node.connect(filter); filter.connect(gain); gain.connect(c.destination); this.nodes.add(node);
    node.onended = () => { this.nodes.delete(node); node.disconnect(); filter.disconnect(); gain.disconnect(); }; node.start();
  }
  play(e) {
    if (e.type === 'trail' && e.stroke.active && e.at - this.lastSlash > 180) { this.lastSlash = e.at; this.sample('slash', .14, e.stroke.power ? 1.2 : 1); }
    if (e.type === 'slice') { this.sample('split', .24, .9 + Math.min(e.combo, 10) * .025); if (e.giant) this.sample('slash', .3, .7); }
    if (e.type === 'bomb') { this.sample('bomb', .4, .6); this.boom(); this.tone(65, 0, .4); }
    if (e.type === 'start') this.tone(660);
    if (['juicy', 'storm', 'finish'].includes(e.type)) [523, 659, 784, 1047].forEach((f, i) => this.tone(f, i * .08, .3));
  }
  pause() { for (const node of this.nodes) { try { node.stop(); } catch {} } this.nodes.clear(); }
  setEnabled(value) { this.enabled = value; if (value) this.arm(); else this.pause(); }
  stop() { this.generation++; this.pause(); const c = this.context; this.context = null; this.buffers = {}; this.loading = false; this.lastSlash = -Infinity; if (c && c.state !== 'closed') void c.close().catch(() => {}); }
}
