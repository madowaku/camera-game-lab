// Small original procedural effects. The licensed song is owned by the shared
// MusicBed so the global BGM switch and round teardown continue to work.
export class HandyPalsAudio {
  constructor() { this.enabled = true; this.context = null; }
  arm() {
    try { const Ctor = window.AudioContext ?? window.webkitAudioContext; if (Ctor) this.context ??= new Ctor(); void this.context?.resume().catch(() => {}); } catch { /* Silent play remains available. */ }
  }
  play(type) {
    if (!this.enabled || this.context?.state !== "running") return;
    const patterns = { pop: [620, 930], jump: [450, 950], spin: [660, 880, 1100], highFive: [900, 1200, 1500], hug: [520, 650], pose: [660, 830, 990], photo: [1300, 250], sparkle: [880, 1320, 1760] };
    const notes = patterns[type]; if (!notes) return;
    notes.forEach((hz, i) => {
      const c = this.context, at = c.currentTime + i * .055, oscillator = c.createOscillator(), gain = c.createGain();
      oscillator.type = type === "photo" ? "square" : "sine"; oscillator.frequency.setValueAtTime(hz, at);
      oscillator.frequency.exponentialRampToValueAtTime(hz * (type === "jump" ? 1.4 : .8), at + .12);
      gain.gain.setValueAtTime(0, at); gain.gain.linearRampToValueAtTime(.035, at + .008); gain.gain.exponentialRampToValueAtTime(.0001, at + .14);
      oscillator.connect(gain); gain.connect(c.destination); oscillator.start(at); oscillator.stop(at + .15);
      oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
    });
  }
  stop() { const c = this.context; this.context = null; if (c && c.state !== "closed") void c.close().catch(() => {}); }
}
