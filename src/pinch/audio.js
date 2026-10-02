export class PinchAudio {
  constructor() { this.voices = new Set(); this.muted = false; }
  start() {
    const Context = globalThis.AudioContext ?? globalThis.webkitAudioContext;
    if (!Context || this.context) return;
    try { this.context = new Context(); void this.context.resume().catch(() => {}); } catch { this.context = null; }
  }
  play(type, clear = false) {
    if (!this.context || this.muted) return;
    const frequencies = type === "place" ? (clear ? [440, 554, 660] : [440, 660]) : [type === "grab" ? 330 : type === "blocked" ? 110 : 220];
    frequencies.forEach((frequency, i) => {
      const oscillator = this.context.createOscillator(), gain = this.context.createGain(), at = this.context.currentTime + i * .06;
      oscillator.type = "sine"; oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0, at); gain.gain.linearRampToValueAtTime(.06, at + .012); gain.gain.exponentialRampToValueAtTime(.001, at + .18);
      oscillator.connect(gain); gain.connect(this.context.destination);
      const voice = { oscillator, gain }; this.voices.add(voice);
      oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); this.voices.delete(voice); };
      oscillator.start(at); oscillator.stop(at + .2);
    });
  }
  close() {
    for (const { oscillator, gain } of this.voices) { oscillator.onended = null; oscillator.stop(); oscillator.disconnect(); gain.disconnect(); }
    this.voices.clear(); if (this.context) void this.context.close().catch(() => {}); this.context = null;
  }
}
