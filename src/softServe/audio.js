export class SoftServeAudio {
  constructor() { this.context = null; this.enabled = false; }
  enable() {
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (!Audio) return;
    this.context ??= new Audio(); this.enabled = true; void this.context.resume().catch(() => {});
  }
  play(type) {
    if (!this.enabled || !this.context || this.context.state !== "running") return;
    const c = this.context, oscillator = c.createOscillator(), gain = c.createGain(), at = c.currentTime;
    const frequency = { swirl: 540, lick: 760, serve: 420, clean: 880, splat: 100, melted: 150, pour: 180 }[type] ?? 300;
    oscillator.type = type === "splat" ? "sawtooth" : "sine";
    oscillator.frequency.setValueAtTime(frequency, at); oscillator.frequency.exponentialRampToValueAtTime(frequency * (type === "lick" ? .55 : type === "splat" ? .3 : 1.5), at + .14);
    gain.gain.setValueAtTime(.0001, at); gain.gain.exponentialRampToValueAtTime(type === "pour" ? .025 : .1, at + .012); gain.gain.exponentialRampToValueAtTime(.0001, at + .19);
    oscillator.connect(gain); gain.connect(c.destination); oscillator.start(at); oscillator.stop(at + .2);
    oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
  }
  stop() { this.enabled = false; if (this.context) { void this.context.close().catch(() => {}); this.context = null; } }
}
