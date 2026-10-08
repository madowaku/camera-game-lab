import { motionProfiles, motionSampleOf, motionCue } from './motionProfiles.js';
import { motionLabVariant, motionLabPreset } from './cameraMotionLab.js';

const activePhases = new Set(['playing', 'locked', 'clear', 'stage-clear']);
const artSelector = '.arcade-hero,.ss-hero,.ne-cover,.hp-cover,.bw-entry-hero,.pp-entry-art,.td-cover,.pw-cover,.wipe-cover,.hc-cover,.cc-cover,.tt-cover,.as-cover,.dl-cover,.hs-cover';

// Native CSS timelines share the game's render loop. No extra RAF or sensor work.
export class MotionDirector {
  constructor(host) {
    this.host = host; this.animations = new Set();
    this.onPreference = () => this.clear();
    this.onVisibility = () => { if (document.hidden) this.clear(); };
  }
  begin(game) {
    this.stop(); this.game = game; this.profile = motionProfiles[game.id];
    this.variant = motionLabVariant(game.id, typeof location === 'undefined' ? '' : location.search);
    this.labPreset = motionLabPreset(game.id);
    if (!this.profile || (this.profile.native && this.variant !== 'B')) { this.game = null; return; }
    if (this.variant === 'B') {
      this.host.dataset.motionLab = 'B';
      this.host.dataset.motionLabPreset = this.labPreset;
    }
    if (!this.reduced) {
      this.reduced = matchMedia('(prefers-reduced-motion: reduce)');
      this.reduced.addEventListener('change', this.onPreference);
      document.addEventListener('visibilitychange', this.onVisibility);
    }
    this.host.dataset.motion = this.profile.family;
    this.host.style.setProperty('--motion-color', game.accent);
    this.previous = null; this.started = false; this.lastBurst = -Infinity;
    this.seenSpecials = new Set();
  }
  update(instance, game, snapshot) {
    if (!this.game || game.id !== this.game.id) return;
    const sample = motionSampleOf(instance, game, snapshot), previous = this.previous;
    this.previous = sample;
    if (sample.paused || !activePhases.has(sample.phase) || document.hidden || this.reduced.matches) { this.clear(); return; }
    if (!this.layer?.isConnected) {
      const stage = this.host.querySelector(this.profile.stage);
      if (!stage) return;
      this.layer = document.createElement('div'); this.layer.className = 'motion-layer'; this.layer.setAttribute('aria-hidden', 'true');
      stage.append(this.layer);
    }
    if (!this.started) {
      this.started = true;
      // MARU's native Phaser scene already owns the entrance cue.
      if (game.module !== 'maruMagic') this.burst('start', '', { x: .5, y: .6 });
      return;
    }
    const cue = motionCue(previous, sample, this.profile);
    if (!cue) return;
    if (cue.kind === 'special') {
      if (this.seenSpecials.has(sample.special.key)) return;
      this.seenSpecials.add(sample.special.key);
    }
    // Sampling during a pause sets the baseline, so resume never replays hits.
    if (previous?.paused) return;
    if (performance.now() - this.lastBurst < (cue.kind === 'hit' ? 180 : 90)) return;
    let label = cue.kind === 'hit' && game.module !== 'dontLaugh' &&
      !(this.variant === 'B' && game.module === 'maruMagic') ? '' : cue.label;
    if (label) {
      // Emphasize a game-owned cue when it already says the same thing. A second
      // caption would collide with AIR SLASH's X-SLASH (and similar live cues).
      const native = [...this.host.querySelectorAll('[class$="-cue"] strong,[class$="-cue"],[class$="-live"],[class$="-callout"]')]
        .find(el => el.textContent.trim() === label);
      if (native) {
        const animation = native.animate([{ scale: .82 }, { scale: 1.1, offset: .4 }, { scale: 1 }], { duration: 450, easing: 'cubic-bezier(.16,1,.3,1)' });
        this.animations.add(animation); animation.addEventListener('finish', () => this.animations.delete(animation));
        label = '';
      }
    }
    this.burst(cue.kind, label, sample.point);
  }
  burst(kind, label, point) {
    if (!this.layer || this.reduced.matches || document.hidden) return;
    this.lastBurst = performance.now();
    while (this.layer.children.length >= 3) this.layer.firstElementChild.remove();
    const el = document.createElement('div');
    const enhanced = this.variant === 'B' && kind !== 'start';
    el.className = `motion-burst motion-burst--${kind}${enhanced ? ' motion-burst--lab' : ''}`;
    el.style.setProperty('--burst-x', `${Math.min(.8, Math.max(.2, point.x)) * 100}%`);
    el.style.setProperty('--burst-y', `${Math.min(.78, Math.max(.26, point.y)) * 100}%`);
    el.innerHTML = '<i class="motion-ring"></i><i class="motion-ring motion-ring--echo"></i>' +
      Array.from({ length: 8 }, (_, i) => `<i class="motion-ray" style="--ray:${i};--angle:${i * 45}deg"></i>`).join('');
    if (enhanced) {
      const glyph = document.createElement('i'); glyph.className = 'motion-lab-glyph';
      glyph.textContent = this.labPreset === 'sigil' ? '✦' : this.labPreset === 'rune' ? '✧' : '♫';
      el.append(glyph);
    }
    if (label) { const caption = document.createElement('b'); caption.className = 'motion-caption'; caption.textContent = label; el.append(caption); }
    el.addEventListener('animationend', event => { if (event.target === el) el.remove(); });
    this.layer.append(el);
  }
  clear() { this.layer?.replaceChildren(); for (const animation of this.animations) animation.cancel(); this.animations.clear(); }
  stop() {
    this.clear(); this.layer?.remove(); this.layer = null;
    this.game = null; this.previous = null; this.variant = null; this.labPreset = null;
    delete this.host.dataset.motionLab; delete this.host.dataset.motionLabPreset;
  }
  destroy() { this.stop(); this.reduced?.removeEventListener('change', this.onPreference); document.removeEventListener('visibilitychange', this.onVisibility); }
}

export function decorateMotion(root, game, mode) {
  const p = motionProfiles[game.id];
  root.dataset.motion = p.family; root.dataset.motionScene = mode;
  root.style.setProperty('--motion-color', game.accent);
  if (mode === 'entry') {
    const art = root.querySelector(artSelector);
    if (art && !art.querySelector('.motion-emblem')) {
      art.classList.add('motion-art');
      const emblem = document.createElement('div'); emblem.className = 'motion-emblem'; emblem.setAttribute('aria-hidden', 'true');
      emblem.innerHTML = '<i></i><i></i><i></i><span></span>'; art.append(emblem);
    }
  }
}
