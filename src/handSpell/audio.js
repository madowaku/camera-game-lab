import lock from './assets/sfx/lock.ogg';
import release from './assets/sfx/release.ogg';
import impact from './assets/sfx/impact.ogg';
import { AirSlashAudio } from '../airSlash/audio.js';
// Shared audio owner already handles resumed contexts, pause, mute and teardown.
export class HandSpellAudio extends AirSlashAudio {
  arm() {
    super.arm(); if (!this.context || this.spellLoading) return; this.spellLoading = true;
    const token = this.generation, c = this.context;
    for (const [key, url] of Object.entries({ lock, release, impact })) void fetch(url).then(r => r.arrayBuffer()).then(b => c.decodeAudioData(b)).then(b => { if (token === this.generation) this.buffers[key] = b; }).catch(() => {});
  }
  play(e, outcome) {
    if (e.type === 'lock') { this.sample('lock', .22, 1 + e.count * .11); [220, 330, 440].slice(0, Math.min(3, e.count)).forEach((f, i) => this.tone(f, i * .03, .17)); }
    if (['charge', 'tutorial-charge'].includes(e.type)) { this.sample('release', .25, .55); [130, 196, 261, 392, 523, 784].forEach((f, i) => this.tone(f, i * .105, .25)); }
    if (['cast', 'tutorial-cast'].includes(e.type)) {
      if (['DRAGON_FLAME', 'THUNDER_GOD', 'ABSOLUTE_ZERO'].includes(outcome)) { this.boom(); this.sample('impact', .45, .65); [130, 261, 523].forEach(f => this.tone(f, 0, .55)); }
      else if (outcome === 'CHICK_SWARM') [1600, 2100, 1650].forEach((f, i) => this.tone(f, i * .12, .09));
      else { this.tone(240, 0, .16); this.tone(90, .17, .35); }
    }
    if (e.type === 'mini') [523, 784, 1047].forEach((f, i) => this.tone(f, i * .08, .2));
  }
  stop() { super.stop(); this.spellLoading = false; }
}
