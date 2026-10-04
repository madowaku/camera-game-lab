import { gsap } from 'gsap';
import { HandSpellGame, W, H, SIGNS, GLYPHS, ROUND_MS } from './core.js';
import { HandSpellInput } from '../input/handSpellInput.js';
import { SignGate, ReleaseGate } from './tracking.js';
import { HandSpellRenderer } from './renderer.js';
import { HandSpellAudio } from './audio.js';
import { SpellReplay } from './replay.js';
import { discover } from './book.js';
import { copy } from './messages.js';
import './handSpell.css';

export const createView = (root, locale, options) => new HandSpellView(root, locale, options);
export class HandSpellView {
  constructor(root, locale = 'ja', { onExit } = {}) {
    this.root = root; this.locale = locale; this.onExit = onExit; this.options = {}; this.phase = 'idle'; this.source = 'camera'; this.listeners = new Set(); this.generation = 0; this.active = false;
    this.game = new HandSpellGame(); this.audio = new HandSpellAudio(); this.signGate = new SignGate(); this.releaseGate = new ReleaseGate(); this.tweens = new Set();
    try { this.audio.enabled = localStorage.getItem('camera-game-lab-hand-spell-sfx') !== 'off'; } catch {}
    root.innerHTML = `<section class="hs-play"><div class="hs-toolbar"><span class="hs-source"></span><div><button type="button" class="hs-sound"></button><button type="button" class="hs-pause">Ⅱ</button></div></div>
      <div class="hs-stage" tabindex="0" role="group" aria-label="HAND SPELL"><video muted playsinline hidden aria-hidden="true"></video><canvas class="hs-canvas" width="540" height="960" role="img" aria-label="HAND SPELL"></canvas><p class="hs-live sr-only" role="status" aria-live="polite"></p>
      <div class="hs-overlay" hidden><div><h2></h2><p role="status"></p><button type="button" class="hs-resume hs-primary" hidden></button><button type="button" class="hs-camera-retry hs-primary" hidden></button><button type="button" class="hs-practice hs-secondary" hidden></button><button type="button" class="hs-exit hs-text"></button></div></div></div>
      <div class="hs-controls"><div class="hs-sign-controls">${SIGNS.map((s, i) => `<button type="button" data-hs-sign="${s}" aria-label="${s}"><b>${GLYPHS[s]}</b><span>${i + 1} · ${s}</span></button>`).join('')}</div><button type="button" class="hs-release hs-primary">RELEASE!</button></div><button type="button" class="hs-skip hs-text" hidden></button><p class="hs-hint"></p></section>`;
    this.$ = s => root.querySelector(s); this.canvas = this.$('.hs-canvas'); this.video = this.$('video'); this.renderer = new HandSpellRenderer(this.canvas);
    this.input = new HandSpellInput(this.video, { onStatus: (status, error) => { if (!this.active || this.source !== 'camera') return; this.status = status; if (status === 'ERROR') this.fail(error); else this.render(); } });
    this.render();
  }
  configure(options = {}) { this.options = { ...options, spell: Number(options.spell) || 0, faceMode: options.faceMode ?? 'ORIGINAL' }; }
  subscribe(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  notify() { const s = this.snapshot(); this.listeners.forEach(fn => fn(s)); }
  snapshot() { return { phase: this.phase, source: this.source, paused: this.game.paused, musicSilent: this.game.phase === 'tutorial' || ['cast', 'reaction'].includes(this.game.scene) && this.game.outcome !== this.game.target.id, result: this.phase === 'result' ? this.game.result : null }; }
  setLocale(locale) { this.locale = locale; this.render(); }
  activate() { this.active = true; this.phase = 'idle'; this.render(); }
  setup(source) {
    this.releaseInputs(); this.active = true; this.source = source; this.phase = 'loading'; this.status = 'LOADING_MODEL'; this.error = null; this.lastState = null;
    let tutorial = true; try { tutorial = localStorage.getItem(`camera-game-lab-hand-spell-tutorial-${source}`) !== 'done'; } catch {}
    this.game = new HandSpellGame({ source, spell: this.options.spell, tutorial, creator: this.options.creator });
    this.signGate.reset(); this.releaseGate.reset(); this.primaryId = null; this.lock = ''; this.lockUntil = 0; this.lostAt = null; this.recoveryAt = null;
    this.renderer.fx = { glow: 0, punch: 0, lock: 0 };
    this.media = matchMedia('(prefers-reduced-motion: reduce)'); this.reducedMotion = this.media.matches;
    this.replay = this.options.creator ? new SpellReplay() : null;
    this.bind(); this.audio.arm(); this.render(); this.notify(); return this.generation;
  }
  async startCamera() { const token = this.setup('camera'); try { await this.input.start(); if (token === this.generation && this.active) this.begin(); } catch (e) { if (token === this.generation && this.active && e.name !== 'AbortError') this.fail(e); } }
  startDemo() { this.setup('demo'); this.begin(); this.$('.hs-stage').focus({ preventScroll: true }); }
  begin() { this.phase = this.game.phase; this.lastTick = performance.now(); this.render(); this.notify(); this.frameId = requestAnimationFrame(this.tick); }
  bind() {
    this.abort = new AbortController(); const signal = this.abort.signal;
    this.root.addEventListener('click', e => {
      const sign = e.target.closest('[data-hs-sign]'); if (sign && this.source === 'demo') this.game.input(sign.dataset.hsSign);
      if (e.target.closest('.hs-release')) this.game.release('tap');
      if (e.target.closest('.hs-skip')) this.game.skipTutorial();
      if (e.target.closest('.hs-pause')) this.game.paused ? this.resume() : this.pause('user');
      if (e.target.closest('.hs-resume')) this.resume();
      if (e.target.closest('.hs-camera-retry')) void this.startCamera();
      if (e.target.closest('.hs-practice')) this.startDemo();
      if (e.target.closest('.hs-exit')) this.onExit?.();
      if (e.target.closest('.hs-sound')) { this.audio.setEnabled(!this.audio.enabled); try { localStorage.setItem('camera-game-lab-hand-spell-sfx', this.audio.enabled ? 'on' : 'off'); } catch {} }
      this.render();
    }, { signal });
    this.$('.hs-stage').addEventListener('keydown', e => {
      if (e.repeat || e.target.closest('button')) return;
      if (e.code === 'Space') { e.preventDefault(); this.game.paused ? this.resume() : this.pause('user'); }
      if (this.source !== 'demo') return;
      if (/^[1-5]$/.test(e.key)) { e.preventDefault(); this.game.input(SIGNS[+e.key - 1]); }
      if (e.key.toLowerCase() === 'r') { e.preventDefault(); this.game.release('keyboard'); }
    }, { signal });
    window.addEventListener('blur', () => this.pause('hidden'), { signal });
    document.addEventListener('visibilitychange', () => { if (document.hidden) this.pause('hidden'); }, { signal });
    this.media.addEventListener('change', e => { this.reducedMotion = e.matches; if (e.matches) { this.stopTweens(); this.renderer.fx.lock = 0; this.renderer.fx.glow = 0; } }, { signal });
  }
  pause(reason) {
    if (!this.active || ['idle', 'loading', 'error', 'result'].includes(this.phase) || this.game.paused) return;
    this.game.pause(reason); this.audio.pause(); this.tweens.forEach(t => t.pause()); this.signGate.reset(this.primary?.sign ?? null); this.releaseGate.reset(); this.render(); this.notify();
  }
  resume() {
    if (document.hidden || this.game.pauseReason === 'tracking') return;
    this.game.resume(); this.audio.arm(); this.tweens.forEach(t => t.resume()); this.lastTick = performance.now(); this.signGate.reset(this.primary?.sign ?? null); this.releaseGate.reset(); this.render(); this.notify(); this.$('.hs-stage').focus({ preventScroll: true });
  }
  fail(error) { this.error = error; this.phase = 'error'; this.input.stop(); this.audio.pause(); this.stopTweens(); if (this.frameId != null) cancelAnimationFrame(this.frameId); this.frameId = null; this.render(); this.notify(); }
  animate(e) {
    if (this.reducedMotion) return;
    const fx = this.renderer.fx; let timeline;
    if (e.type === 'lock') timeline = gsap.timeline().fromTo(fx, { lock: 1 }, { lock: 0, duration: .45, ease: 'power3.out' });
    if (['charge', 'tutorial-charge'].includes(e.type)) timeline = gsap.timeline().to(fx, { glow: 1, duration: .65, ease: 'power3.in' }).to(fx, { glow: 0, duration: .2 });
    if (['cast', 'tutorial-cast'].includes(e.type)) timeline = gsap.timeline().fromTo(fx, { punch: 1 }, { punch: 0, duration: .65, ease: 'expo.out' });
    if (timeline) { this.tweens.add(timeline); timeline.eventCallback('onComplete', () => this.tweens.delete(timeline)); }
  }
  tracking(hands, now) {
    const g = this.game, needsHand = g.phase === 'tutorial' && !g.scene.includes('charge') && !g.scene.includes('cast') || g.phase === 'playing' && ['input', 'release'].includes(g.scene) && !g.released;
    if (!needsHand || this.source !== 'camera') return;
    const visible = hands.some(h => h.x >= 10 && h.x <= W - 10 && h.y >= 100 && h.y <= H - 30);
    if (!visible) { this.lostAt ??= now; this.recoveryAt = null; if (now - this.lostAt >= 650) this.pause('tracking'); return; }
    this.lostAt = null;
    if (g.paused && g.pauseReason === 'tracking') {
      this.recoveryAt ??= now;
      if (now - this.recoveryAt >= 350) { g.resume(); this.signGate.reset(hands[0]?.sign ?? null); this.releaseGate.reset(); this.lastTick = now; this.audio.arm(); this.tweens.forEach(t => t.resume()); this.notify(); }
    }
  }
  tick = now => {
    if (!this.active || ['idle', 'loading', 'error', 'result'].includes(this.phase)) return;
    const dt = now - this.lastTick; this.lastTick = now; if (dt > 700) this.pause('hidden');
    const hands = this.source === 'camera' ? this.input.sample(now).filter(h => Number.isFinite(h.x) && Number.isFinite(h.y) && h.x >= 10 && h.x <= W - 10 && h.y >= 100 && h.y <= H - 30) : [];
    this.primary = hands.find(h => h.id === this.primaryId) ?? hands[0] ?? null; this.primaryId = this.primary?.id ?? this.primaryId;
    this.tracking(hands, now);
    const g = this.game, accepting = ['tutorial', 'input', 'release'].includes(g.scene) && !g.released;
    if (!g.paused && this.source === 'camera') {
      const releaseEnabled = g.scene === 'tutorial-release' || ['input', 'release'].includes(g.scene) && g.signs.length > 0;
      if (this.releaseGate.feed(hands, now, releaseEnabled)) g.release();
      else if (accepting) {
        const bothPalms = releaseEnabled && hands.length === 2 && hands.every(h => h.sign === 'PALM');
        // Opening both palms is release preparation, rather than a fourth sign.
        // Allow a deliberate extra single PALM only after a longer hold.
        if (g.signs.length >= 3 && this.primary?.sign === 'PALM') this.palmPendingAt ??= now; else this.palmPendingAt = null;
        if (bothPalms || this.palmPendingAt != null && now - this.palmPendingAt < 500) this.signGate.feed(null, now);
        else { const sign = this.signGate.feed(this.primary, now); if (sign) g.input(sign); }
      }
    }
    g.step(dt);
    for (const e of g.drainEvents()) {
      this.audio.play(e, g.outcome); this.animate(e);
      if (e.type === 'lock') { this.lock = `${GLYPHS[e.sign]} ${e.sign} ✓`; this.lockUntil = now + 700; }
      if (e.type === 'tryAgain') { this.lock = 'COPY THIS'; this.lockUntil = now + 550; }
      if (['tutorialNext', 'input', 'tutorialDone'].includes(e.type)) { this.signGate.reset(this.primary?.sign ?? null); this.releaseGate.reset(); }
      if (e.type === 'tutorialDone') { try { localStorage.setItem(`camera-game-lab-hand-spell-tutorial-${this.source}`, 'done'); } catch {} }
    }
    this.phase = g.phase;
    const t = copy(this.locale), release = ['tutorial-release', 'release'].includes(g.scene) || g.signs.length >= 3 && g.scene === 'input';
    const coach = g.paused ? t[g.pauseReason === 'tracking' ? 'lost' : 'paused'] : g.released && ['input', 'release'].includes(g.scene) ? t.armed : release ? t.release : g.scene === 'memorize' ? t.memory : g.scene === 'tutorial' ? t.tutorial : g.scene === 'input' ? this.source === 'demo' ? t.demoHint : !this.primary ? t.lost : this.primary.reason === 'small' ? t.small : !this.primary.sign ? t.coach : this.signGate.blocked === this.primary.sign ? t.neutral : t.hold : '';
    this.renderer.draw(g, { video: this.video, source: this.source, faceMode: this.options.faceMode, face: this.input.face, hands, now, reducedMotion: this.reducedMotion, coach, lock: now < this.lockUntil ? this.lock : '', gateProgress: this.signGate.progress, tutorialLabel: `${g.tutorialStep + 1} / 3` });
    if (this.replay && g.phase !== 'tutorial' && !g.paused) this.replay.capture(this.canvas, g.elapsed, g.scene);
    if (this.phase === 'result') {
      const d = discover(g.outcome); Object.assign(g.result, { book: d.book, isNew: d.isNew, creator: this.options.creator ? this.replay.snapshot(this.options.faceMode, this.source) : null, inferenceFps: this.source === 'camera' ? Math.round(this.input.fps) : null });
      this.render(); this.notify(); this.releaseInputs(); return;
    }
    this.render(); const state = `${this.phase}:${g.scene}:${g.paused}`; if (state !== this.lastState) { this.lastState = state; this.notify(); }
    this.frameId = requestAnimationFrame(this.tick);
  };
  render() {
    const t = copy(this.locale), g = this.game, blocked = ['loading', 'error'].includes(this.phase) || g.paused;
    this.$('.hs-play').dataset.source = this.source;
    this.$('.hs-source').textContent = this.source === 'demo' ? t.demo : `${t.camera} · ${this.options.faceMode ?? 'ORIGINAL'}`;
    this.$('.hs-sound').textContent = `SE ${this.audio.enabled ? 'ON' : 'OFF'}`; this.$('.hs-sound').setAttribute('aria-pressed', String(this.audio.enabled));
    const pause = this.$('.hs-pause'); pause.disabled = ['idle', 'loading', 'error', 'result'].includes(this.phase); pause.textContent = g.paused ? '▶' : 'Ⅱ'; pause.setAttribute('aria-label', g.paused ? t.resume : t.pause);
    this.$('.hs-sign-controls').hidden = this.source !== 'demo';
    const canInput = ['tutorial', 'input', 'release'].includes(g.scene) && !g.released && !g.paused && !blocked && !['loading', 'idle', 'result'].includes(this.phase);
    this.root.querySelectorAll('[data-hs-sign]').forEach(b => b.disabled = !canInput);
    const canRelease = !g.released && !blocked && (g.scene === 'tutorial-release' || ['input', 'release'].includes(g.scene) && g.signs.length > 0);
    this.$('.hs-release').disabled = !canRelease; this.$('.hs-release').textContent = g.released ? 'SPELL ARMED ✓' : 'RELEASE!';
    this.$('.hs-skip').hidden = g.phase !== 'tutorial' || blocked; this.$('.hs-skip').textContent = t.skip;
    this.$('.hs-hint').textContent = this.source === 'demo' ? t.demoHint : t.cameraHint;
    const overlay = this.$('.hs-overlay'); overlay.hidden = !blocked; overlay.querySelector('h2').textContent = this.phase === 'loading' ? 'HAND SPELL' : this.phase === 'error' ? 'CAMERA?' : g.pauseReason === 'tracking' ? 'HANDS?' : 'PAUSE';
    overlay.querySelector('p').textContent = this.phase === 'loading' ? this.status === 'REQUESTING_CAMERA' ? t.requesting : t.loading : this.phase === 'error' ? ['NotAllowedError', 'NotFoundError', 'NotReadableError'].includes(this.error?.name) ? t.error : t.modelError : g.pauseReason === 'tracking' ? t.lost : t.paused;
    this.$('.hs-resume').hidden = !g.paused || g.pauseReason === 'tracking'; this.$('.hs-camera-retry').hidden = this.phase !== 'error'; this.$('.hs-practice').hidden = this.phase !== 'error' && g.pauseReason !== 'tracking';
    for (const [selector, key] of [['.hs-resume', 'resume'], ['.hs-camera-retry', 'retryCamera'], ['.hs-practice', 'practice'], ['.hs-exit', 'exit']]) this.$(selector).textContent = t[key];
    const label = blocked ? overlay.querySelector('p').textContent : `${g.scene.toUpperCase()} · ${g.signs.length} / 3${g.outcome ? ` · ${g.outcome}` : ''}`;
    if (label !== this.liveLabel) { this.liveLabel = label; this.$('.hs-live').textContent = label; }
    this.canvas.setAttribute('aria-label', `HAND SPELL · ${label}`);
  }
  stopTweens() { this.tweens.forEach(t => t.kill()); this.tweens.clear(); }
  releaseInputs() { this.generation++; this.input.stop(); this.audio.stop(); this.stopTweens(); this.abort?.abort(); if (this.frameId != null) cancelAnimationFrame(this.frameId); this.frameId = null; this.replay?.dispose(); this.replay = null; }
  deactivate() { this.active = false; this.releaseInputs(); this.phase = 'idle'; }
}
