import * as Tone from 'tone';
import { NOTES, musicStage } from './core.js';

// Own one context per activation. No context, synth or timer is made in a constructor.
export class MouthMusicAudio {
  constructor() { this.enabled = true; this.backing = true; this.mode = 'music'; this.generation = 0; this.nodes = []; }
  async enable() {
    if (this.toneContext) return this.resume();
    const token = ++this.generation;
    const context = new Tone.Context({ latencyHint: 'interactive', lookAhead: .06 });
    this.toneContext = context; Tone.setContext(context);
    // Called synchronously inside the PLAY click, before camera/model awaits.
    await Tone.start();
    if (token !== this.generation) return false;
    const add = node => { this.nodes.push(node); return node; };
    this.master = add(new Tone.Gain(this.enabled ? 1 : 0).toDestination());
    this.limiter = add(new Tone.Limiter(-3).connect(this.master));
    this.reverb = add(new Tone.Reverb({ decay: .8, preDelay: .008, wet: .13 }).connect(this.limiter));
    this.filter = add(new Tone.Filter(3600, 'lowpass').connect(this.reverb));
    this.lead = add(new Tone.PolySynth(Tone.Synth, { oscillator: { type: 'triangle' },
      envelope: { attack: .003, decay: .12, sustain: .18, release: .24 }, volume: -12 }).connect(this.filter));
    this.lead.maxPolyphony = 12;
    this.chord = add(new Tone.PolySynth(Tone.Synth, { oscillator: { type: 'sine' },
      envelope: { attack: .035, decay: .18, sustain: .2, release: .35 }, volume: -29 }).connect(this.filter));
    this.chord.maxPolyphony = 8;
    this.kick = add(new Tone.MembraneSynth({ pitchDecay: .025, octaves: 3, volume: -25,
      envelope: { attack: .001, decay: .16, sustain: 0, release: .06 } }).connect(this.limiter));
    this.bass = add(new Tone.Synth({ oscillator: { type: 'sine' }, volume: -23,
      envelope: { attack: .008, decay: .14, sustain: .1, release: .1 } }).connect(this.limiter));
    this.hat = add(new Tone.NoiseSynth({ noise: { type: 'white' }, volume: -36,
      envelope: { attack: .001, decay: .035, sustain: 0, release: .015 } }).connect(this.limiter));
    this.se = add(new Tone.Synth({ oscillator: { type: 'sine' }, volume: -16,
      envelope: { attack: .003, decay: .04, sustain: 0, release: .03 } }).connect(this.limiter));
    this.transport = context.transport; this.transport.bpm.value = 100; this.beat = 0;
    this.repeat = this.transport.scheduleRepeat(time => {
      const step = this.beat++ % 8, stage = musicStage(this.combo?.() ?? 0);
      if (!this.backing || this.replaying || this.mode !== 'music') return;
      if (step % 4 === 0) {
        this.kick.triggerAttackRelease('C2', '16n', time);
        this.chord.triggerAttackRelease(['C3', 'E3', 'G3'], '4n', time, .6);
      }
      if (stage >= 1 && step % 2 === 0) this.bass.triggerAttackRelease(step < 4 ? 'C2' : 'G2', '8n', time, .7);
      if (stage >= 2 && step % 2 === 1) this.hat.triggerAttackRelease('32n', time, .6);
      if (stage >= 3 && step === 6) this.chord.triggerAttackRelease(['E3', 'G3', 'A3'], '8n', time, .5);
      if (stage >= 4 && step % 2 === 1) this.lead.triggerAttackRelease(['C5', 'E5', 'G5', 'A5'][Math.floor(step / 2)], '16n', time, .2);
    }, '8n');
    await this.reverb.ready;
    return token === this.generation;
  }
  startBacking(combo) {
    if (!this.transport) return;
    this.combo = combo; this.paused = false; this.replaying = false;
    this.master.gain.rampTo(this.enabled ? 1 : 0, .01);
    if (this.transport.state !== 'started') this.transport.start(Tone.now());
  }
  note(types, stage = 0, at = Tone.immediate()) {
    if (!this.lead || this.paused || this.toneContext?.rawContext.state !== 'running') return null;
    const notes = [...new Set(types)].map(i => NOTES[i]);
    // The live bite bypasses the Transport lookAhead and is never beat-quantized.
    if (this.mode === 'se') {
      this.se.triggerAttackRelease('C5', .06, at, .8);
      this.lastDispatchAt = performance.now(); return this.lastDispatchAt;
    }
    this.lead.triggerAttackRelease(notes, .18, at, .8 / Math.sqrt(notes.length));
    if (stage >= 3) this.lead.triggerAttackRelease(notes.map(n => n.replace('4', '5')), .12, at, .18);
    this.lastDispatchAt = performance.now(); return this.lastDispatchAt;
  }
  setEnabled(value) { this.enabled = value; this.master?.gain.rampTo(value && !this.paused ? 1 : 0, .015); }
  setBacking(value) { this.backing = value; }
  setMode(value) { this.mode = value === 'se' ? 'se' : 'music'; this.lead?.releaseAll(); this.chord?.releaseAll(); }
  pause() {
    this.paused = true; this.master?.gain.rampTo(0, .008);
    this.transport?.pause(Tone.immediate()); this.lead?.releaseAll(); this.chord?.releaseAll();
  }
  async resume() {
    if (!this.toneContext) return false;
    Tone.setContext(this.toneContext); await Tone.start(); return this.toneContext?.rawContext.state === 'running';
  }
  metrics() {
    const raw = this.toneContext?.rawContext;
    return { state: raw?.state ?? 'closed', baseMs: Number.isFinite(raw?.baseLatency) ? raw.baseLatency * 1000 : null,
      outputMs: Number.isFinite(raw?.outputLatency) ? raw.outputLatency * 1000 : null, voices: this.lead?.activeVoices ?? 0 };
  }
  async play(melody, done) {
    if (!await this.enable()) return;
    this.paused = false; this.replaying = true; this.master.gain.rampTo(this.enabled ? 1 : 0, .01);
    this.transport.stop(); this.transport.seconds = 0;
    for (const item of melody) this.transport.schedule(time => this.note(item.types, item.stage, time), item.at / 1000);
    this.transport.schedule(time => {
      this.toneContext.setTimeout(() => { this.pause(); done?.(); }, Math.max(0, time - Tone.immediate()) + .5);
    }, (melody.at(-1)?.at ?? 0) / 1000 + .3);
    this.transport.start(Tone.now());
  }
  dispose() {
    ++this.generation;
    const context = this.toneContext;
    if (!context) return;
    this.pause(); this.transport?.cancel(0);
    for (const node of this.nodes) node.dispose(); this.nodes = [];
    this.toneContext = null; this.transport = null; this.lead = null; this.chord = null;
    this.master = null; this.reverb = null; this.combo = null;
    void context.close().then(() => context.dispose()).catch(() => context.dispose());
  }
}
