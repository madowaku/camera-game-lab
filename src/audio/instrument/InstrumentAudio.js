import kick from '../../maestro/music/kick.ogg?inline';
import snare from '../../maestro/music/snare.ogg?inline';
import cymbal from '../../maestro/music/cymbal.ogg?inline';
import tom from '../../maestro/music/tom.ogg?inline';
import bell from '../../maestro/music/bell.ogg?inline';

export class InstrumentAudio {
  constructor() { this.enabled = true; this.nodes = new Set(); this.generation = 0; }
  async enable() {
    const generation = this.generation;
    const Ctor = window.AudioContext ?? window.webkitAudioContext;
    if (!Ctor) throw new Error('Audio unavailable');
    const context = this.context ??= new Ctor({ latencyHint: 'interactive' });
    this.master ??= context.createGain(); this.master.gain.value = this.enabled ? .65 : 0;
    if (!this.connected) { this.master.connect(context.destination); this.connected = true; }
    await context.resume();
    if (generation !== this.generation) return false;
    if (!this.buffers) {
      const items = await Promise.all(Object.entries({ kick, snare, cymbal, tom, bell }).map(async ([key, url]) => {
        const r = await fetch(url); if (!r.ok) throw Error('Sound load failed');
        return [key, await context.decodeAudioData(await r.arrayBuffer())];
      }));
      if (generation !== this.generation) return false;
      this.buffers = Object.fromEntries(items);
    }
    return true;
  }
  setEnabled(value) { this.enabled = value; if (this.context && this.master) this.master.gain.setTargetAtTime(value ? .65 : 0, this.context.currentTime, .01); }
  track(node, gain) {
    this.nodes.add(node); node.onended = () => { node.disconnect(); gain.disconnect(); this.nodes.delete(node); };
    // Bound live one-shots under extreme keyboard/touch input.
    if (this.nodes.size > 24) { const oldest = this.nodes.values().next().value; try { oldest.stop(); } catch {} }
  }
  sample(name, velocity = .6, at = this.context?.currentTime ?? 0, rate = 1) {
    if (!this.enabled || this.context?.state !== 'running' || !this.buffers?.[name]) return;
    const node = this.context.createBufferSource(), gain = this.context.createGain();
    node.buffer = this.buffers[name]; node.playbackRate.value = rate; gain.gain.value = .25 + velocity * .5;
    node.connect(gain); gain.connect(this.master); this.track(node, gain); node.start(at); return node;
  }
  play(soundId, velocity = .6) {
    if (!this.enabled || this.context?.state !== 'running') return;
    if (['kick', 'snare', 'tom', 'bell'].includes(soundId)) return this.sample(soundId, velocity);
    if (soundId === 'hat') return this.sample('cymbal', velocity * .3, undefined, 3);
    if (soundId === 'sparkle') { for (let i = 0; i < 3; i++) this.sample('bell', velocity * .4, this.context.currentTime + i * .065, 2 ** (i * 3 / 12)); return; }
    const notes = { C4: 261.626, D4: 293.665, E4: 329.628, G4: 391.995, A4: 440 };
    const context = this.context, at = context.currentTime, gain = context.createGain();
    gain.connect(this.master);
    if (soundId === 'clap') {
      const buffer = context.createBuffer(1, context.sampleRate * .16, context.sampleRate), values = buffer.getChannelData(0);
      for (let i = 0; i < values.length; i++) values[i] = (Math.random() * 2 - 1) * Math.exp(-i / (context.sampleRate * .035));
      const source = context.createBufferSource(); source.buffer = buffer; source.connect(gain); gain.gain.value = velocity * .25; this.track(source, gain); source.start(); return;
    }
    const oscillator = context.createOscillator(); oscillator.type = notes[soundId] ? 'triangle' : 'sine';
    oscillator.frequency.value = notes[soundId] ?? ({ pop: 620, boing: 180, bubble: 460 }[soundId] ?? 520);
    if (soundId === 'boing' || soundId === 'bubble') oscillator.frequency.exponentialRampToValueAtTime(soundId === 'boing' ? 640 : 190, at + .18);
    gain.gain.setValueAtTime(0, at); gain.gain.linearRampToValueAtTime(.15 + velocity * .2, at + .006); gain.gain.exponentialRampToValueAtTime(.001, at + .6);
    oscillator.connect(gain); this.track(oscillator, gain); oscillator.start(at); oscillator.stop(at + .65);
  }
  silence() { for (const node of this.nodes) { try { node.stop(); } catch {} } this.nodes.clear(); }
  async resume() { if (this.context) await this.context.resume(); }
  dispose() {
    ++this.generation; this.silence(); const context = this.context; this.context = null;
    this.master = null; this.buffers = null; this.connected = false;
    if (context && context.state !== 'closed') void context.close().catch(() => {});
  }
}
