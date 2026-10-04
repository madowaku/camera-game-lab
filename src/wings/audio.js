export class FlightAudio {
  constructor() { this.enabled = true; this.context = null; this.engine = null; }
  enable() {
    try { const Audio = window.AudioContext ?? window.webkitAudioContext; this.context ??= Audio ? new Audio() : null; void this.context?.resume().catch(() => {}); } catch { /* Silent play is supported. */ }
  }
  setEnabled(value) { this.enabled = value; if (!value) this.stopEngine(); else this.enable(); }
  tone(frequency, duration, type = "sine", volume = .10, to = frequency) {
    if (!this.enabled || !this.context || this.context.state !== "running") return;
    const c = this.context, o = c.createOscillator(), g = c.createGain(), at = c.currentTime;
    o.type = type; o.frequency.setValueAtTime(frequency, at); o.frequency.exponentialRampToValueAtTime(to, at + duration);
    g.gain.setValueAtTime(.001, at); g.gain.linearRampToValueAtTime(volume, at + .015); g.gain.exponentialRampToValueAtTime(.001, at + duration);
    o.connect(g); g.connect(c.destination); o.start(at); o.stop(at + duration + .02); o.onended = () => { o.disconnect(); g.disconnect(); };
  }
  effect(type) {
    if (type === "WINGS_ON") { this.tone(150, .12, "square", .07, 720); this.tone(920, .25, "triangle", .08); }
    if (type === "GOOD" || type === "TUTORIAL_PASS") this.tone(780, .16, "triangle", .11, 1240);
    if (type === "PERFECT") { this.tone(1175, .18, "sine", .12, 1568); this.tone(1760, .22, "sine", .07); }
    if (type === "MISS") this.tone(260, .2, "sawtooth", .055, 60);
    if (type === "BOOST") this.tone(80, .5, "sawtooth", .06, 600);
    if (type === "FINISH") this.tone(784, .6, "triangle", .09, 392);
  }
  update(game) {
    const c = this.context;
    if (!this.enabled || !c || c.state !== "running" || game.paused || !["tutorial", "playing"].includes(game.phase)) { this.stopEngine(); return; }
    if (!this.engine) {
      const o = c.createOscillator(), g = c.createGain(); o.type = "triangle"; g.gain.value = .018;
      o.connect(g); g.connect(c.destination); o.start(); this.engine = { o, g };
    }
    this.engine.o.frequency.setTargetAtTime(65 + game.combo * 3 + (game.boosted ? 35 : 0), c.currentTime, .15);
  }
  stopEngine() { if (this.engine) { this.engine.o.stop(); this.engine.o.disconnect(); this.engine.g.disconnect(); this.engine = null; } }
  dispose() { this.stopEngine(); const c = this.context; this.context = null; if (c && c.state !== "closed") void c.close().catch(() => {}); }
}
