export class ToyDrumAudio {
  constructor() { this.enabled = true; this.context = null; }
  arm() { try { const Ctor = window.AudioContext ?? window.webkitAudioContext; if (Ctor) this.context ??= new Ctor(); void this.context?.resume().catch(() => {}); } catch { /* Silent play works too. */ } }
  play(event) {
    if (!this.enabled || this.context?.state !== "running") return;
    const c = this.context;
    const tone = (hz, duration, volume, type = "sine", delay = 0) => {
      const at = c.currentTime + delay, o = c.createOscillator(), g = c.createGain(); o.type = type;
      o.frequency.setValueAtTime(hz, at); o.frequency.exponentialRampToValueAtTime(hz * .52, at + duration);
      g.gain.setValueAtTime(0, at); g.gain.linearRampToValueAtTime(volume, at + .005); g.gain.exponentialRampToValueAtTime(.0001, at + duration);
      o.connect(g); g.connect(c.destination); o.start(at); o.stop(at + duration + .02); o.onended = () => { o.disconnect(); g.disconnect(); };
    };
    if (event.type === "hit") { const hz = [260, 620, 155, 880, 110][event.drum]; tone(hz, .22, .13); tone(hz * 2.04, .12, .025, "triangle"); }
    if (event.type === "double") [660, 880].forEach((hz, i) => tone(hz, .2, .045, "sine", i * .035));
    if (event.type === "fever") [520, 660, 880].forEach((hz, i) => tone(hz, .15, .04, "triangle", i * .08));
    if (event.type === "finish") { tone(85, .65, .2); [520, 660, 880, 1040].forEach((hz, i) => tone(hz, .4, .055, "triangle", i * .07)); }
  }
  stop() { const c = this.context; this.context = null; if (c && c.state !== "closed") void c.close().catch(() => {}); }
}
