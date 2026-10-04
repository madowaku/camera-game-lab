import punchUrl from './assets/punch.ogg';
import megaUrl from './assets/mega.ogg';
export class CounterCamAudio {
  constructor() { this.enabled = true; this.context = null; this.buffers = {}; this.generation = 0; }
  arm() {
    try {
      const C = window.AudioContext ?? window.webkitAudioContext;
      if (!this.enabled || !C) return;
      this.context ??= new C(); void this.context.resume().catch(() => {});
      const context = this.context, token = this.generation;
      if (!this.loading) {
        this.loading = true;
        for (const [name, url] of Object.entries({ punch: punchUrl, mega: megaUrl }))
          void fetch(url).then(r => r.arrayBuffer()).then(b => context.decodeAudioData(b)).then(buffer => {
            if (token === this.generation) this.buffers[name] = buffer;
          }).catch(() => {});
      }
    } catch { /* Audio is optional. */ }
  }
  tone(a, b, duration, volume, type = 'sine', delay = 0) {
    const c = this.context; if (!this.enabled || c?.state !== 'running') return;
    const o = c.createOscillator(), g = c.createGain(), at = c.currentTime + delay;
    o.type = type; o.frequency.setValueAtTime(a, at); o.frequency.exponentialRampToValueAtTime(b, at + duration);
    g.gain.setValueAtTime(.0001, at); g.gain.exponentialRampToValueAtTime(volume, at + .008); g.gain.exponentialRampToValueAtTime(.0001, at + duration);
    o.connect(g); g.connect(c.destination); o.start(at); o.stop(at + duration + .01); o.onended = () => { o.disconnect(); g.disconnect(); };
  }
  play(e) {
    const c = this.context; if (!this.enabled || c?.state !== 'running') return;
    const impact = ['PUNCH', 'COUNTER', 'PERFECT COUNTER', 'MEGA PUNCH'].includes(e.type);
    if (impact) {
      const buffer = this.buffers[e.type === 'MEGA PUNCH' ? 'mega' : 'punch'];
      if (buffer) {
        const s = c.createBufferSource(), g = c.createGain(); s.buffer = buffer;
        s.playbackRate.value = e.type === 'MEGA PUNCH' ? .65 : .8 + (e.data.strength ?? .5) * .4;
        g.gain.value = .12 + (e.data.strength ?? .5) * .25; s.connect(g); g.connect(c.destination); s.start();
        s.onended = () => { s.disconnect(); g.disconnect(); };
      }
      this.tone(95, 25, e.type === 'MEGA PUNCH' ? .5 : .16, .08 + (e.data.strength ?? .5) * .12, 'triangle');
    }
    if (e.type === 'WINDUP') { this.tone(520, 520, .08, .035, 'square'); this.tone(520, 520, .08, .035, 'square', .15); this.tone(80, 210, .7, .025, 'triangle'); }
    if (e.type === 'JUST DODGE') { this.tone(1000, 170, .13, .06); this.tone(880, 1320, .13, .04, 'sine', .08); }
    if (e.type === 'GUARD') this.tone(170, 90, .2, .08, 'triangle');
    if (e.type === 'HIT') this.tone(150, 35, .28, .09, 'sawtooth');
    if (e.type === 'SPECIAL READY' || e.type === 'KO') [440, 660, 880].forEach((f, i) => this.tone(f, f, .25, .045, 'square', i * .08));
  }
  stop() { ++this.generation; const c = this.context; this.context = null; this.buffers = {}; this.loading = false; if (c && c.state !== 'closed') void c.close().catch(() => {}); }
}
