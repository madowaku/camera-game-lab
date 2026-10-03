import { grooveStage } from "../games/noteEater.js";

export class NoteEaterAudio {
  constructor() { this.enabled = true; this.context = null; this.voices = new Set(); this.playback = 0; }
  enable() {
    const Context = globalThis.AudioContext ?? globalThis.webkitAudioContext;
    if (!Context) return;
    if (!this.context || this.context.state === "closed") {
      this.context = new Context({ latencyHint: "interactive" });
      this.master = this.context.createGain(); this.master.gain.value = .65; this.master.connect(this.context.destination);
    }
    return this.context.resume().catch(() => {});
  }
  setEnabled(enabled) {
    this.enabled = enabled;
    if (enabled) this.enable();
    if (this.master && this.context?.state !== "closed") this.master.gain.setTargetAtTime(enabled ? .65 : 0, this.context.currentTime, .015);
  }
  tone(midi, { at, volume = .24, duration = .65, type = "sine" } = {}) {
    const c = this.context;
    if (!this.enabled || !c || c.state !== "running") return;
    const start = at ?? c.currentTime, frequency = 440 * 2 ** ((midi - 69) / 12);
    const voice = c.createGain(), osc = c.createOscillator(); osc.type = type; osc.frequency.value = frequency;
    voice.gain.setValueAtTime(0, start); voice.gain.linearRampToValueAtTime(volume, start + .004);
    voice.gain.exponentialRampToValueAtTime(.0001, start + duration);
    osc.connect(voice); voice.connect(this.master); this.voices.add(osc);
    osc.onended = () => { this.voices.delete(osc); osc.disconnect(); voice.disconnect(); };
    osc.start(start); osc.stop(start + duration + .01);
  }
  note(midi, quiet = false) {
    // Bite feedback is scheduled at currentTime, never at a quantized beat.
    this.tone(midi, { volume: quiet ? .025 : .3, duration: quiet ? .32 : .62 });
    if (!quiet) this.tone(midi + 12, { volume: .06, duration: .19 });
  }
  kick(at) {
    const c = this.context; if (!this.enabled || !c || c.state !== "running") return;
    const osc = c.createOscillator(), gain = c.createGain(); osc.frequency.setValueAtTime(125, at); osc.frequency.exponentialRampToValueAtTime(48, at + .12);
    gain.gain.setValueAtTime(.17, at); gain.gain.exponentialRampToValueAtTime(.0001, at + .16);
    osc.connect(gain); gain.connect(this.master); this.voices.add(osc);
    osc.onended = () => { this.voices.delete(osc); osc.disconnect(); gain.disconnect(); }; osc.start(at); osc.stop(at + .18);
  }
  startBacking(getGroove) {
    this.stopBacking(); this.getGroove = getGroove;
    this.beat = 0; this.nextBeat = (this.context?.currentTime ?? 0) + .035;
    this.scheduler = setInterval(() => this.schedule(), 25); this.schedule();
  }
  schedule() {
    const c = this.context; if (!c || c.state !== "running") return;
    if (this.nextBeat < c.currentTime - .1) this.nextBeat = c.currentTime + .02;
    const step = 60 / 104 / 2, stage = grooveStage(this.getGroove());
    while (this.nextBeat < c.currentTime + .1) {
      const at = this.nextBeat, beat = this.beat++;
      if (beat % 2 === 0) this.kick(at);
      if (stage >= 1 && beat % 4 === 0) this.tone(beat % 8 ? 43 : 48, { at, volume: .12, duration: .32, type: "triangle" });
      if (stage >= 2) this.tone(100, { at, volume: beat % 2 ? .023 : .012, duration: .035, type: "square" });
      if (stage >= 3 && beat % 8 === 0) for (const midi of [60, 64, 67]) this.tone(midi, { at, volume: .026, duration: 1.5, type: "triangle" });
      if (stage >= 4 && beat % 4 === 3) this.tone([79, 81, 76, 74][Math.floor(beat / 4) % 4], { at, volume: .04, duration: .27 });
      this.nextBeat += step;
    }
  }
  stopBacking() { clearInterval(this.scheduler); this.scheduler = null; }
  playMelody(melody, onDone = () => {}) {
    this.stop(); this.enabled = true; const ready = this.enable();
    if (!melody.length || !this.context) { onDone(); return; }
    const token = ++this.playback;
    void Promise.resolve(ready).then(() => {
      if (token !== this.playback || !this.context) return;
      if (this.context.state !== "running") { onDone(); return; }
      this.master.gain.setTargetAtTime(.65, this.context.currentTime, .015);
      const step = Math.min(.38, 9 / melody.length), start = this.context.currentTime + .06;
      // Schedule the captured sequence in its original order, including repeats.
      melody.forEach((note, i) => this.tone(note.midi, { at: start + i * step }));
      this.playTimer = setTimeout(() => { if (token === this.playback) onDone(); }, (melody.length * step + .8) * 1000);
    });
  }
  stop() {
    ++this.playback; clearTimeout(this.playTimer); this.stopBacking();
    for (const osc of this.voices) { try { osc.stop(); } catch { /* Already ended. */ } }
    this.voices.clear();
  }
  dispose() { this.stop(); const c = this.context; this.context = null; if (c && c.state !== "closed") void c.close().catch(() => {}); }
}
