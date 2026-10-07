export const clamp = (v, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, v));
export class MaestroGame {
  constructor() { this.state = 'READY'; this.intensity = .15; this.sections = { strings: false, brass: false, percussion: false }; this.tutorial = 0; this.events = []; this.elapsed = 0; this.gesture = 'READY'; }
  dispatch(type, at = 0) {
    if (type === 'START' && ['READY', 'CUT', 'BRAVO'].includes(this.state)) {
      this.state = 'INTRO'; this.introAt = at; this.sections.strings = true; this.tutorial = Math.max(1, this.tutorial);
    } else if (['STRINGS', 'BRASS', 'PERCUSSION'].includes(type) && ['INTRO', 'PLAY'].includes(this.state)) {
      if (type === 'STRINGS') { this.sections.strings = true; this.sections.brass = false; this.sections.percussion = false; }
      else this.sections[type.toLowerCase()] = true;
    } else if (type === 'CUT' && ['INTRO', 'PLAY'].includes(this.state)) {
      this.state = 'CUT'; if (this.tutorial === 2) this.tutorial = 3;
    } else if (type === 'FINALE' && this.state === 'PLAY' && this.intensity >= .75 && Object.values(this.sections).every(Boolean)) {
      this.state = 'FINALE'; this.finaleAt = at;
    } else if (type !== 'ACCENT' || !['INTRO', 'PLAY'].includes(this.state)) return false;
    this.gesture = type; this.events.push({ type, at });
    if (this.events.length > 128) this.events.shift(); // free play has no time limit
    return true;
  }
  update(at, intensity) {
    this.intensity = clamp(intensity);
    if (this.tutorial === 1 && this.intensity > .72) this.tutorial = 2;
    if (this.state === 'INTRO' && at - this.introAt >= 1000) this.state = 'PLAY';
    if (this.state === 'FINALE' && at - this.finaleAt >= 1700) this.state = 'BRAVO';
  }
  get playing() { return ['INTRO', 'PLAY'].includes(this.state); }
  get finaleReady() { return this.state === 'PLAY' && this.intensity >= .75 && Object.values(this.sections).every(Boolean); }
}
