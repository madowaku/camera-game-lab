export class DuoAudio {
  unlock() {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      this.context ??= new AudioContext();
      void this.context.resume().catch(() => {});
    } catch { /* Feedback is optional when browser audio is unavailable. */ }
  }
  play(type) {
    const ctx = this.context;
    if (!ctx || ctx.state !== "running") return;
    const notes = { countdown: [520, 0.1], shot: [900, 0.07], hit: [150, 0.12], warning: [220, 0.18], win: [780, 0.3], lose: [120, 0.3] };
    const [frequency, duration] = notes[type] ?? notes.hit;
    const oscillator = ctx.createOscillator(), gain = ctx.createGain();
    oscillator.type = type === "shot" ? "square" : "triangle";
    oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(frequency * (type === "win" ? 1.6 : 0.6), ctx.currentTime + duration);
    gain.gain.setValueAtTime(0.035, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    oscillator.connect(gain); gain.connect(ctx.destination);
    oscillator.start(); oscillator.stop(ctx.currentTime + duration);
  }
}
