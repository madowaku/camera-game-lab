import { grooveStage, NOTE_EATER_BPM } from "../games/noteEater.js";
import { composeNoteEaterSong, SONG_CHORDS } from "./songDirector.js";

const OUTPUT_LEVEL = .68;

export class NoteEaterAudio {
  constructor() { this.enabled = true; this.context = null; this.voices = new Set(); this.playback = 0; this.stopped = false; }
  enable() {
    const Context = globalThis.AudioContext ?? globalThis.webkitAudioContext;
    if (!Context) return;
    if (!this.context || this.context.state === "closed") {
      this.context = new Context({ latencyHint: "interactive" });
      const c = this.context;
      this.mix = c.createGain(); this.compressor = c.createDynamicsCompressor(); this.master = c.createGain();
      this.compressor.threshold.value = -12; this.compressor.knee.value = 10; this.compressor.ratio.value = 4;
      this.compressor.attack.value = .003; this.compressor.release.value = .16;
      this.mix.connect(this.compressor); this.compressor.connect(this.master); this.master.connect(c.destination);
      this.master.gain.value = this.enabled && !this.stopped ? OUTPUT_LEVEL : 0;
      this.noiseBuffer = c.createBuffer(1, c.sampleRate, c.sampleRate);
      const noise = this.noiseBuffer.getChannelData(0);
      for (let i = 0; i < noise.length; i++) noise[i] = Math.random() * 2 - 1;
    }
    return this.context.resume().catch(() => {});
  }
  setEnabled(enabled) {
    this.enabled = enabled;
    if (enabled) this.enable();
    if (this.master && this.context?.state !== "closed") this.master.gain.setTargetAtTime(enabled && !this.stopped ? OUTPUT_LEVEL : 0, this.context.currentTime, .015);
  }
  wake() {
    if (!this.stopped) return;
    this.stopped = false;
    if (this.master && this.context?.state !== "closed") this.master.gain.setTargetAtTime(this.enabled ? OUTPUT_LEVEL : 0, this.context.currentTime, .008);
  }
  track(source, nodes, start, end) {
    this.voices.add(source);
    source.onended = () => { this.voices.delete(source); source.disconnect(); for (const node of nodes) node.disconnect(); };
    source.start(start); source.stop(end);
  }
  tone(midi, { at, volume = .24, duration = .65, type = "sine", pan = 0, attack = .004 } = {}) {
    const c = this.context;
    if (!this.enabled || !c || c.state !== "running") return;
    const start = at ?? c.currentTime, frequency = 440 * 2 ** ((midi - 69) / 12);
    const voice = c.createGain(), osc = c.createOscillator(); osc.type = type; osc.frequency.value = frequency;
    voice.gain.setValueAtTime(0, start); voice.gain.linearRampToValueAtTime(volume, start + attack);
    voice.gain.exponentialRampToValueAtTime(.0001, start + duration);
    const panner = c.createStereoPanner?.();
    osc.connect(voice);
    if (panner) { panner.pan.value = pan; voice.connect(panner); panner.connect(this.mix ?? this.master); }
    else voice.connect(this.mix ?? this.master);
    this.track(osc, panner ? [voice, panner] : [voice], start, start + duration + .01);
  }
  note(midi, quiet = false, { at, color = 0, groove = 0, echo = true } = {}) {
    this.wake();
    const start = at ?? this.context?.currentTime, pan = (color - 2) * .09;
    // Bite feedback is scheduled at currentTime, never at a quantized beat.
    if (quiet) { this.tone(midi, { at: start, volume: .018, duration: .24, pan }); return; }
    // A woody attack and bell overtones make each of the five pitches sing.
    this.tone(midi, { at: start, volume: .22, duration: .46, type: "triangle", pan });
    this.tone(midi, { at: start, volume: .1, duration: .85, pan });
    this.tone(midi + 12, { at: start, volume: .045, duration: .48, pan: -pan });
    this.tone(midi + 24, { at: start, volume: .014 + groove / 100 * .012, duration: .22, pan });
    // Short stereo echoes are voices too, so stop/pause cancels their tails.
    if (echo && start !== undefined) {
      this.tone(midi, { at: start + .105, volume: .027, duration: .38, pan: -.45 });
      this.tone(midi + 12, { at: start + .175, volume: .017, duration: .42, pan: .45 });
    }
  }
  kick(at) {
    const c = this.context; if (!this.enabled || !c || c.state !== "running") return;
    const osc = c.createOscillator(), gain = c.createGain(); osc.frequency.setValueAtTime(125, at); osc.frequency.exponentialRampToValueAtTime(48, at + .12);
    gain.gain.setValueAtTime(.17, at); gain.gain.exponentialRampToValueAtTime(.0001, at + .16);
    osc.connect(gain); gain.connect(this.mix ?? this.master); this.track(osc, [gain], at, at + .18);
  }
  percussion(kind, at, volume) {
    const c = this.context; if (!this.enabled || !c || c.state !== "running" || !this.noiseBuffer) return;
    const source = c.createBufferSource(), filter = c.createBiquadFilter(), gain = c.createGain();
    const clap = kind === "clap", duration = clap ? .16 : kind === "shaker" ? .09 : .045;
    source.buffer = this.noiseBuffer;
    filter.type = clap ? "bandpass" : "highpass"; filter.frequency.value = clap ? 1700 : 6500; filter.Q.value = clap ? .7 : .5;
    gain.gain.setValueAtTime(0, at); gain.gain.linearRampToValueAtTime(volume, at + .003);
    if (clap) for (const offset of [.016, .032]) {
      gain.gain.linearRampToValueAtTime(volume * .18, at + offset - .002);
      gain.gain.linearRampToValueAtTime(volume, at + offset);
    }
    gain.gain.exponentialRampToValueAtTime(.0001, at + duration);
    source.connect(filter); filter.connect(gain); gain.connect(this.mix ?? this.master);
    this.track(source, [filter, gain], at, at + duration + .01);
  }
  startBacking(getGroove) {
    this.stopBacking(); this.wake(); this.getGroove = getGroove;
    this.beat = 0; this.nextBeat = (this.context?.currentTime ?? 0) + .035;
    this.scheduler = setInterval(() => this.schedule(), 25); this.schedule();
  }
  schedule() {
    const c = this.context; if (!c || c.state !== "running") return;
    if (this.nextBeat < c.currentTime - .1) this.nextBeat = c.currentTime + .02;
    const step = 60 / NOTE_EATER_BPM / 2, stage = grooveStage(this.getGroove());
    while (this.nextBeat < c.currentTime + .1) {
      const at = this.nextBeat, beat = this.beat++;
      if (beat % 2 === 0) this.kick(at);
      if (beat % 2) this.percussion("shaker", at, stage ? .045 : .024);
      // Four-bar progression replaces the previously static two-chord loop.
      // Even low-groove sessions get a gentle harmonic foundation.
      const chord = SONG_CHORDS[Math.floor(beat / 8) % SONG_CHORDS.length];
      if (beat % 8 === 0) {
        const voices = stage >= 3 ? chord.tones : [chord.tones[0], chord.tones[2]];
        for (const midi of voices) this.tone(midi, {
          at, volume: stage >= 3 ? .028 : .018, duration: 1.8,
          type: "sine", attack: .045, pan: (midi - 64) * .045,
        });
      }
      if (stage >= 1 && [0, 3, 4, 6].includes(beat % 8))
        this.tone(chord.bass, { at, volume: .115, duration: .34, type: "triangle" });
      if (stage >= 2) {
        this.percussion("hat", at, beat % 2 ? .048 : .022);
        if (beat % 8 === 2 || beat % 8 === 6) this.percussion("clap", at, .095);
      }
      if (stage >= 4) {
        const midi = chord.tones[(beat + Math.floor(beat / 8)) % 4] + 12;
        this.tone(midi, { at, volume: beat % 2 ? .028 : .041, duration: .28, pan: beat % 2 ? -.35 : .35 });
        if (beat % 32 === 31) for (const offset of [0, .065, .13]) this.percussion("clap", at + offset, .035);
      }
      this.nextBeat += step;
    }
  }
  stopBacking() { clearInterval(this.scheduler); this.scheduler = null; }
  // Original note-only replay remains available for comparisons and old callers.
  // Song mode adds live-recorded timing, harmony, responsive fills and a cadence.
  playSong(melody, onDone = () => {}, { style = "dream" } = {}) {
    this.stop();
    this.enabled = true;
    const ready = this.enable();
    if (!Array.isArray(melody) || !melody.length || !this.context) { onDone(); return; }
    const song = composeNoteEaterSong(melody, { style });
    const token = ++this.playback;
    void Promise.resolve(ready).then(() => {
      const c = this.context;
      if (token !== this.playback || !c) return;
      if (c.state !== "running") { onDone(); return; }
      this.wake();
      const start = c.currentTime + .09;
      // Keep all player pitches in their exact order for the existing replay QA.
      // Input timestamps are only gently aligned to a musical grid.
      song.lead.forEach(n => {
        this.note(n.midi, false, { at: start + n.at, color: n.type, echo: true });
        if (song.style === "festival")
          this.tone(n.midi - 12, { at: start + n.at, duration: .42, volume: .025, type: "triangle" });
        if (song.style === "pop")
          this.tone(n.midi + 12, { at: start + n.at, duration: .18, volume: .023, type: "square" });
      });
      let next = 0;
      const schedule = () => {
        if (token !== this.playback || c.state !== "running") return;
        while (next < song.accompaniment.length &&
               start + song.accompaniment[next].at < c.currentTime + .24) {
          const event = song.accompaniment[next++];
          const at = Math.max(c.currentTime + .002, start + event.at);
          if (event.kind === "drum") {
            if (event.instrument === "kick") this.kick(at);
            else this.percussion(event.instrument, at, event.volume);
          } else {
            const kind = event.instrument;
            this.tone(event.midi, {
              at, volume: event.volume, duration: event.duration,
              type: kind === "brass" ? "sawtooth" : kind === "bass" || kind === "pluck" ? "triangle" : "sine",
              attack: kind === "pad" ? .07 : .005, pan: event.pan,
            });
          }
        }
      };
      this.songScheduler = setInterval(schedule, 25);
      schedule();
      this.playTimer = setTimeout(() => {
        if (token === this.playback) {
          clearInterval(this.songScheduler); this.songScheduler = null;
          onDone();
        }
      }, song.duration * 1000);
    });
  }
  playMelody(melody, onDone = () => {}) {
    this.stop(); this.enabled = true; const ready = this.enable();
    if (!melody.length || !this.context) { onDone(); return; }
    const token = ++this.playback;
    void Promise.resolve(ready).then(() => {
      if (token !== this.playback || !this.context) return;
      if (this.context.state !== "running") { onDone(); return; }
      this.wake();
      const step = Math.min(.38, 9 / melody.length), start = this.context.currentTime + .06;
      // Schedule the captured sequence in its original order, including repeats.
      melody.forEach((note, i) => this.note(note.midi, false, { at: start + i * step, color: note.type ?? 2, echo: step >= .14 }));
      this.playTimer = setTimeout(() => { if (token === this.playback) onDone(); }, (melody.length * step + 1) * 1000);
    });
  }
  stop() {
    ++this.playback; clearTimeout(this.playTimer); clearInterval(this.songScheduler); this.songScheduler = null; this.stopBacking();
    this.stopped = true;
    if (this.master && this.context?.state !== "closed") {
      this.master.gain.cancelScheduledValues(this.context.currentTime); this.master.gain.setValueAtTime(0, this.context.currentTime);
    }
    for (const osc of this.voices) { try { osc.stop(); } catch { /* Already ended. */ } }
    this.voices.clear();
  }
  dispose() {
    this.stop(); const c = this.context; this.context = null; this.noiseBuffer = null; this.mix = null; this.master = null; this.compressor = null;
    if (c && c.state !== "closed") void c.close().catch(() => {});
  }
}
