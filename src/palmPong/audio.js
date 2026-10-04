export class PalmPongAudio {
  constructor() { this.enabled = true; this.context = null; this.nodes = new Set(); }
  arm() {
    try { const Ctor = window.AudioContext ?? window.webkitAudioContext; if (!Ctor) return; this.context ??= new Ctor(); void this.context.resume().catch(() => {}); } catch { /* Visual feedback remains available. */ }
  }
  play(event) {
    if (!this.enabled || this.context?.state !== "running") return;
    const notes = [261.63, 293.66, 329.63, 392, 440];
    if (event.type === "RETURN") this.tone(notes[(event.rally - 1) % notes.length] * (event.player === 2 ? 1.5 : 1), event.player === 2 ? "sine" : "triangle", .13, .12);
    if (event.type === "RALLY_MILESTONE") [1, 1.25, 1.5].forEach((n, i) => this.tone(523.25 * n, "sine", .18, .07, i * .06));
  }
  tone(frequency, type, length, volume, delay = 0) {
    const c = this.context, osc = c.createOscillator(), gain = c.createGain(), at = c.currentTime + delay;
    osc.type = type; osc.frequency.setValueAtTime(frequency, at); osc.frequency.exponentialRampToValueAtTime(frequency * .85, at + length);
    gain.gain.setValueAtTime(0, at); gain.gain.linearRampToValueAtTime(volume, at + .007); gain.gain.exponentialRampToValueAtTime(.001, at + length);
    osc.connect(gain); gain.connect(c.destination); this.nodes.add(osc);
    osc.onended = () => { this.nodes.delete(osc); osc.disconnect(); gain.disconnect(); }; osc.start(at); osc.stop(at + length + .01);
  }
  pause() { for (const n of this.nodes) { try { n.stop(); } catch {} } this.nodes.clear(); if (this.context?.state === "running") void this.context.suspend().catch(() => {}); }
  stop() { this.pause(); const c = this.context; this.context = null; if (c && c.state !== "closed") void c.close().catch(() => {}); }
}
