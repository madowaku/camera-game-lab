export class SoftServeAudio {
  constructor() { this.context = null; this.enabled = false; }
  enable() {
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (!Audio) return;
    this.context ??= new Audio(); this.enabled = true; void this.context.resume().catch(() => {});
  }
  play(type) {
    if (!this.enabled || !this.context || this.context.state !== "running") return;
    if (type === "clean") { [523,659,784,1047].forEach((note,i)=>this.tone(note, i * .105, .17, .055)); return; }
    const c = this.context, oscillator = c.createOscillator(), gain = c.createGain(), at = c.currentTime;
    const frequency = { swirl: 540, lick: 540, serve: 420, splat: 100, melted: 150, pour: 180 }[type] ?? 300;
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(frequency, at); oscillator.frequency.exponentialRampToValueAtTime(frequency * (type === "lick" ? .55 : type === "splat" ? .3 : 1.5), at + .14);
    gain.gain.setValueAtTime(.0001, at); gain.gain.exponentialRampToValueAtTime(type === "pour" ? .025 : .1, at + .012); gain.gain.exponentialRampToValueAtTime(.0001, at + .19);
    oscillator.connect(gain); gain.connect(c.destination); oscillator.start(at); oscillator.stop(at + .2);
    oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
  }
  tone(note, delay, duration, volume) {
    const c=this.context, oscillator=c.createOscillator(),gain=c.createGain(),at=c.currentTime+delay;
    oscillator.type="sine"; oscillator.frequency.value=note;
    gain.gain.setValueAtTime(.0001,at);gain.gain.exponentialRampToValueAtTime(volume,at+.012);gain.gain.exponentialRampToValueAtTime(.0001,at+duration);
    oscillator.connect(gain);gain.connect(c.destination);oscillator.start(at);oscillator.stop(at+duration+.01);
    oscillator.onended=()=>{oscillator.disconnect();gain.disconnect();};
  }
  stop() { this.enabled = false; if (this.context) { void this.context.close().catch(() => {}); this.context = null; } }
}
