// Quiet procedural sound. No downloads, recording, microphone, or sample license.
export class HorrorAudio {
  start() {
    if (this.context) return;
    const Context = globalThis.AudioContext ?? globalThis.webkitAudioContext;
    if (!Context) return;
    try {
      this.context = new Context();
      this.master = this.context.createGain(); this.master.gain.value = this.muted ? 0 : 0.45;
      this.master.connect(this.context.destination);
      this.hum = this.voice(46, "sine"); this.pulse = this.voice(82, "triangle"); this.air = this.voice(128, "sine");
      void this.context.resume().catch(() => {});
    } catch { this.close(); }
  }
  voice(frequency, type) {
    const oscillator = this.context.createOscillator(), gain = this.context.createGain();
    oscillator.frequency.value = frequency; oscillator.type = type; gain.gain.value = 0;
    oscillator.connect(gain); gain.connect(this.master); oscillator.start(); return { oscillator, gain };
  }
  setMuted(value) { this.muted = value; if (this.context) this.master.gain.setTargetAtTime(value ? 0 : 0.45, this.context.currentTime, 0.03); }
  update(game) {
    if (!this.context) return;
    const now = this.context.currentTime, danger = game.danger ?? 0;
    const active = game.phase === "playing" && !game.paused;
    const beat = (game.elapsedMs / 1000 * (0.8 + danger * 1.8)) % 1;
    const pulse = Math.exp(-beat * 35) + (danger > 0.65 ? 0.6 * Math.exp(-Math.abs(beat - 0.2) * 45) : 0);
    this.hum.gain.gain.setTargetAtTime(active ? 0.018 + danger * 0.025 : 0, now, 0.08);
    this.pulse.gain.gain.setTargetAtTime(active ? pulse * (0.012 + danger * 0.10) : 0, now, 0.018);
    this.air.gain.gain.setTargetAtTime(active && game.rush ? 0.025 : 0, now, 0.12);
    this.air.oscillator.frequency.setTargetAtTime(game.rush ? 165 + danger * 40 : 128, now, 0.12);
  }
  finish(won) {
    if (!this.context) return;
    const now = this.context.currentTime;
    this.hum.gain.gain.setTargetAtTime(0, now, 0.05); this.air.gain.gain.setTargetAtTime(0, now, 0.05);
    this.pulse.oscillator.frequency.setValueAtTime(won ? 220 : 92, now);
    this.pulse.oscillator.frequency.exponentialRampToValueAtTime(won ? 440 : 42, now + 0.28);
    this.pulse.gain.gain.setValueAtTime(0.08, now); this.pulse.gain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);
  }
  close() {
    if (!this.context) return;
    for (const voice of [this.hum, this.pulse, this.air]) { voice?.oscillator.stop(); voice?.oscillator.disconnect(); voice?.gain.disconnect(); }
    void this.context.close().catch(() => {}); this.context = null;
  }
}
