import { InstrumentAudio } from '../audio/instrument/InstrumentAudio.js';
import strings from './music/strings.ogg?inline';
import brass from './music/brass.ogg?inline';
import percussion from './music/percussion.ogg?inline';
import finale from './music/finale.ogg?inline';
import confirmation from './assets/confirmation.ogg?inline';
import applause from './assets/applause.ogg?inline';

export class OrchestraAudio extends InstrumentAudio {
  async enable() {
    if (!await super.enable()) return false;
    const generation = this.generation, context = this.context;
    const items = await Promise.all(Object.entries({ strings, brass, percussion, finale, confirmation, applause }).map(async ([key, url]) => {
      const response = await fetch(url); if (!response.ok) throw Error('Music load failed');
      return [key, await context.decodeAudioData(await response.arrayBuffer())];
    }));
    if (generation !== this.generation) return false;
    Object.assign(this.buffers, Object.fromEntries(items)); return true;
  }
  startLoops() {
    if (this.stems || !this.context) return;
    const at = this.context.currentTime + .015;
    this.stems = {};
    this.filter = this.context.createBiquadFilter(); this.filter.type = 'lowpass'; this.filter.frequency.value = 1600; this.filter.connect(this.master);
    for (const name of ['strings', 'brass', 'percussion']) {
      const source = this.context.createBufferSource(), gain = this.context.createGain();
      source.buffer = this.buffers[name]; source.loop = true; source.loopStart = 0; source.loopEnd = 32;
      gain.gain.value = 0; source.connect(gain); gain.connect(this.filter); source.start(at);
      this.stems[name] = { source, gain, startedAt: at };
    }
    this.startedAt = at;
  }
  update(game, lossGain = 1, paused = false) {
    if (!this.stems || !this.context) return;
    const now = this.context.currentTime, value = .25 + game.intensity * .65;
    const audible = game.playing && !paused;
    for (const [name, stem] of Object.entries(this.stems)) {
      const target = audible && game.sections[name] ? value * lossGain : 0;
      // A CUT should feel immediate; other changes are softened to avoid clicks.
      stem.gain.gain.setTargetAtTime(target, now, game.state === 'CUT' || paused ? .008 : .06);
    }
    this.filter.frequency.setTargetAtTime(900 + game.intensity * 10000, now, .07);
  }
  event(type) {
    if (type === 'START') { this.startLoops(); this.sample('confirmation', .2); }
    if (type === 'CUT') this.silence();
    if (type === 'FINALE') { this.silence(); this.sample('finale', .85); }
    if (type === 'ACCENT') {
      const now = this.context?.currentTime ?? 0, beat = .5;
      const at = this.startedAt + Math.ceil((now - this.startedAt) / beat) * beat;
      this.sample('cymbal', .25, Math.max(now, at));
    }
  }
  dispose() {
    if (this.stems) for (const stem of Object.values(this.stems)) { try { stem.source.stop(); stem.source.disconnect(); stem.gain.disconnect(); } catch {} }
    this.stems = null; this.filter?.disconnect(); this.filter = null; super.dispose();
  }
}
