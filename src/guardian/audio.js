export class GuardianAudio {
  constructor() { this.muted = false; }
  unlock() {
    try {
      const Context = window.AudioContext || window.webkitAudioContext;
      if (!Context) return;
      this.context ??= new Context(); void this.context.resume().catch(() => {});
    } catch { /* Visual feedback remains available. */ }
  }
  play(type) {
    const ctx = this.context;
    if (!ctx || ctx.state !== "running" || this.muted) return;
    const sounds = { awaken: [70, 120, 0.7], punch: [125, 38, 0.23], shot: [1400, 350, 0.23],
      shield: [800, 1300, 0.4], block: [1100, 1700, 0.23], damage: [130, 60, 0.17],
      impact: [200, 45, 0.16], ascend: [90, 1200, 1.5], victory: [600, 900, 0.55], shutter: [1100, 600, 0.07], countdown: [440, 430, 0.07] };
    const [from, to, duration] = sounds[type] ?? sounds.punch;
    const osc = ctx.createOscillator(), gain = ctx.createGain();
    osc.type = ["punch", "damage", "impact"].includes(type) ? "triangle" : "sine";
    osc.frequency.setValueAtTime(from, ctx.currentTime); osc.frequency.exponentialRampToValueAtTime(to, ctx.currentTime + duration);
    gain.gain.setValueAtTime(0.0001, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.11, ctx.currentTime + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
    osc.connect(gain); gain.connect(ctx.destination); osc.start(); osc.stop(ctx.currentTime + duration);
    osc.onended = () => { osc.disconnect(); gain.disconnect(); };
    if (["punch", "impact", "awaken", "victory"].includes(type)) {
      const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.3), ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
      const noise = ctx.createBufferSource(), filter = ctx.createBiquadFilter(), volume = ctx.createGain();
      noise.buffer = buffer; filter.type = "lowpass"; filter.frequency.value = type === "punch" ? 250 : 800;
      volume.gain.value = 0.1; noise.connect(filter); filter.connect(volume); volume.connect(ctx.destination);
      noise.start(); noise.onended = () => { noise.disconnect(); filter.disconnect(); volume.disconnect(); };
    }
  }
  suspend() { if (this.context?.state === "running") void this.context.suspend().catch(() => {}); }
}
