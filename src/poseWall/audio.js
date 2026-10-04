export class PoseWallAudio {
  constructor() { this.context = null; this.enabled = true; }
  arm() { try { const C = window.AudioContext ?? window.webkitAudioContext; if (C) this.context ??= new C(); void this.context?.resume().catch(() => {}); } catch { /* Silent play remains usable. */ } }
  play(e) {
    const c = this.context; if (!this.enabled || c?.state !== 'running') return;
    const tone = (a, b, duration, volume, delay = 0, type = 'sine') => {
      const at = c.currentTime + delay, o = c.createOscillator(), g = c.createGain(); o.type = type;
      o.frequency.setValueAtTime(a, at); o.frequency.exponentialRampToValueAtTime(b, at + duration);
      g.gain.setValueAtTime(.0001, at); g.gain.exponentialRampToValueAtTime(volume, at + .01); g.gain.exponentialRampToValueAtTime(.0001, at + duration);
      o.connect(g); g.connect(c.destination); o.start(at); o.stop(at + duration + .01); o.onended = () => { o.disconnect(); g.disconnect(); };
    };
    if (e.type === 'wall') { tone(420, 190, .16, .05); tone(150, 65, 1.5, .015, .5, 'triangle'); }
    if (e.rank === 'PERFECT') { tone(230, 1100, .12, .13); [660, 880, 1320].forEach((f, i) => tone(f, f, .2, .065, i * .045)); }
    if (e.rank === 'CLEAR') tone(270, 930, .16, .1);
    if (e.rank === 'SQUEEZE') { tone(150, 450, .18, .13); tone(430, 110, .22, .12, .15); }
    if (e.rank === 'CRASH') { tone(100, 28, .38, .18, 0, 'sawtooth'); tone(175, 40, .21, .075, .035, 'triangle'); }
  }
  stop() { const c = this.context; this.context = null; if (c && c.state !== 'closed') void c.close().catch(() => {}); }
}
