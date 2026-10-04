import { DontLaughGame, stageAt, weaknessOf, learnReactions } from './core.js';
import { DontLaughInput } from '../input/dontLaughInput.js';
import { DontLaughRenderer, ReplayBuffer, copyCanvas, W, H } from './renderer.js';
import { DontLaughAudio } from './audio.js';
import { storage } from '../platform/storage.js';
import { copy } from './messages.js';
import './dontLaugh.css';
export const createView = (root, locale) => new DontLaughView(root, locale);
export class DontLaughView {
  constructor(root, locale) {
    this.root = root; this.locale = locale; this.listeners = new Set(); this.game = new DontLaughGame(); this.audio = new DontLaughAudio(); this.buffer = new ReplayBuffer(); this.options = { creator: false, faceMode: 'ORIGINAL' }; this.phase = 'idle'; this.generation = 0;
    root.innerHTML = `<section class="dl-play"><div class="dl-toolbar"><span class="dl-source"></span><button type="button" class="dl-pause">Ⅱ</button></div><div class="dl-stage" tabindex="0"><video playsinline muted hidden></video><canvas width="${W}" height="${H}" role="img" aria-label="DON’T LAUGH"></canvas><div class="dl-overlay" hidden><h2></h2><p></p><div class="dl-calibration" hidden><i></i></div><button type="button" class="dl-start dl-primary" hidden></button><button type="button" class="dl-reset dl-text" hidden></button><button type="button" class="dl-resume dl-primary" hidden></button><button type="button" class="dl-reconnect dl-primary" hidden></button><button type="button" class="dl-demo dl-secondary" hidden></button></div><div class="dl-caught" hidden><strong></strong><span></span></div></div><div class="dl-practice" hidden><button type="button" class="dl-smile dl-primary"></button></div><div class="dl-footer"><p></p><button type="button" class="dl-sfx" aria-pressed="true"></button></div><div class="dl-live" role="status" aria-live="polite"></div></section>`;
    this.$ = s => root.querySelector(s); this.canvas = this.$('canvas'); this.video = this.$('video'); this.renderer = new DontLaughRenderer(this.canvas);
    this.input = new DontLaughInput(this.video, { onFrame: (frame, at) => {
      if (!this.active || this.source !== 'camera' || !['framing', 'countdown', 'playing'].includes(this.phase)) return;
      this.frame = frame; this.lastInputAt = at;
      if (frame.visible && frame.ready) this.recoverSince ??= at; else this.recoverSince = null;
    }, onStatus: (status, error) => {
      if (!this.active || this.source !== 'camera') return; this.status = status;
      if (status === 'ERROR') { this.phase = 'error'; this.error = error; this.game.paused = true; this.audio.stop(); this.buffer.clear(); }
      this.render(); this.notify();
    } });
  }
  configure(options = {}) { this.options = { creator: !!options.creator, faceMode: ['ORIGINAL', 'EFFECT', 'HIDE'].includes(options.faceMode) ? options.faceMode : 'ORIGINAL' }; }
  subscribe(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  notify() { this.listeners.forEach(fn => fn(this.snapshot())); }
  snapshot() { return { phase: this.phase, source: this.source, paused: this.manualPause || this.inputLost || this.game.paused, elapsed: this.game.elapsed, result: this.phase === 'result' ? this.result : null }; }
  setLocale(locale) { this.locale = locale; this.render(); }
  activate() {
    this.deactivate(); this.active = true; this.phase = 'waiting'; this.source = null; this.frame = null; this.result = null; this.manualPause = this.inputLost = false; this.demoSmile = false;
    this.reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches; this.abort = new AbortController(); const signal = this.abort.signal;
    this.root.addEventListener('click', this.click, { signal }); this.$('.dl-smile').addEventListener('pointerdown', this.smileDown, { signal }); this.$('.dl-smile').addEventListener('pointerup', this.smileUp, { signal }); this.$('.dl-smile').addEventListener('pointercancel', this.smileUp, { signal }); this.$('.dl-smile').addEventListener('lostpointercapture', this.smileUp, { signal });
    window.addEventListener('keydown', this.keyDown, { signal }); window.addEventListener('keyup', this.keyUp, { signal }); window.addEventListener('blur', this.blur, { signal }); document.addEventListener('visibilitychange', this.visibility, { signal });
    this.lastFrame = performance.now(); this.frameId = requestAnimationFrame(this.loop); this.render(); this.draw();
  }
  resetRound(source) {
    this.source = source; this.frame = null; this.lastInputAt = -Infinity; this.recoverSince = null; this.manualPause = this.inputLost = false; this.game.reset(source === 'camera' ? weaknessOf(storage.read('dont-laugh-reactions-v1', {})) : null);
    this.buffer.clear(); this.renderer.clear(); this.countdown = 3; this.lastTick = 4; this.demoSmile = false; this.demoSmileAt = null; this.result = null; this.endingTime = 0; this.lastMouth = -Infinity; this.mouthOpen = false;
    this.lastFrame = performance.now(); this.finalTick = null; this.audio.arm();
  }
  async startCamera() {
    const token = ++this.generation; this.input.stop(); this.resetRound('camera'); this.phase = 'loading'; this.render(); this.notify();
    try { await this.input.start(); if (!this.active || token !== this.generation) return; this.phase = 'framing'; this.render(); this.notify(); }
    catch (error) { if (!this.active || token !== this.generation || error?.name === 'AbortError') return; this.error = error; this.phase = 'error'; this.input.stop(); this.audio.stop(); this.render(); this.notify(); }
  }
  startDemo() { ++this.generation; this.input.stop(); this.resetRound('demo'); this.phase = 'countdown'; this.render(); this.notify(); this.$('.dl-stage').focus({ preventScroll: true }); }
  frameValid(now) { const age = now - this.lastInputAt; return this.source === 'demo' || !!(this.frame?.visible && this.frame?.ready && age >= 0 && age <= 200); }
  beginCountdown() { if (this.phase !== 'framing' || !this.frameValid(performance.now())) return; this.phase = 'countdown'; this.countdown = 3; this.lastTick = 4; this.notify(); }
  click = e => {
    if (e.target.closest('.dl-pause,.dl-resume')) this.togglePause();
    else if (e.target.closest('.dl-start')) this.beginCountdown();
    else if (e.target.closest('.dl-reset')) { this.input.tracker.reset(); this.frame = null; this.recoverSince = null; this.game.clearHold(); }
    else if (e.target.closest('.dl-reconnect')) void this.startCamera();
    else if (e.target.closest('.dl-demo')) this.startDemo();
    else if (e.target.closest('.dl-sfx')) { this.audio.enabled = !this.audio.enabled; if (this.audio.enabled) this.audio.arm(); else void this.audio.context?.suspend().catch(() => {}); this.render(); }
  };
  smileDown = e => { if (this.source !== 'demo' || this.phase !== 'playing' || this.game.paused) return; e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); this.demoSmile = true; this.demoSmileAt = performance.now(); };
  smileUp = () => { this.demoSmile = false; };
  keyDown = e => {
    if (!this.active || e.repeat || e.altKey || e.ctrlKey || e.metaKey || /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
    if (e.code === 'Space' && ['playing', 'countdown'].includes(this.phase)) { e.preventDefault(); this.togglePause(); }
    else if (e.code === 'KeyL' && this.source === 'demo' && this.phase === 'playing' && !this.game.paused) { e.preventDefault(); this.demoSmile = true; this.demoSmileAt = performance.now(); }
  };
  keyUp = e => { if (e.code === 'KeyL') this.demoSmile = false; };
  togglePause() {
    if (!['playing', 'countdown'].includes(this.phase)) return;
    this.manualPause = !this.manualPause; this.game.paused = this.manualPause || this.inputLost; this.game.clearHold(); this.demoSmile = false; this.buffer.clear(); this.renderer.clear(); this.lastFrame = performance.now();
    if (this.manualPause) void this.audio.context?.suspend().catch(() => {}); else this.audio.arm(); this.render(); this.notify();
  }
  blur = () => { if (['playing', 'countdown'].includes(this.phase) && !this.manualPause) this.togglePause(); this.demoSmile = false; };
  visibility = () => { if (document.hidden) this.blur(); };
  finish() {
    this.draw(); const photo = copyCanvas(this.canvas); this.buffer.capture(this.canvas, this.game.elapsed, true); const frames = this.buffer.take();
    const key = `dont-laugh-best-v1-${this.source}`, old = Number(storage.read(key, 0)), best = Math.max(Number.isFinite(old) ? Math.min(15, Math.max(0, old)) : 0, this.game.elapsed); storage.write(key, best);
    if (this.source === 'camera') storage.write('dont-laugh-reactions-v1', learnReactions(storage.read('dont-laugh-reactions-v1', {}), this.game.reactions));
    this.result = { ...this.game.result, source: this.source, best, photo, replay: { frames, faceMode: this.options.faceMode }, creator: this.options.creator };
    this.input.stop(); this.frame = null; this.phase = 'ending'; this.$('.dl-live').textContent = this.result.reason === 'laughed' ? 'YOU LAUGHED. CAUGHT YOU.' : 'SURVIVED'; this.notify();
  }
  loop = now => {
    if (!this.active) return;
    const dt = Math.min(.1, Math.max(0, (now - this.lastFrame) / 1000)); this.lastFrame = now;
    if (['countdown', 'playing'].includes(this.phase)) {
      const valid = this.frameValid(now), lost = !valid || this.inputLost && (this.recoverSince == null || now - this.recoverSince < 250);
      if (this.source === 'camera' && lost !== this.inputLost) { this.inputLost = lost; this.game.clearHold(); this.buffer.clear(); this.renderer.clear(); if (lost) void this.audio.context?.suspend().catch(() => {}); else this.audio.arm(); this.notify(); }
      this.game.paused = this.manualPause || this.inputLost;
      if (this.phase === 'countdown' && !this.game.paused) {
        const tick = Math.ceil(this.countdown); if (tick !== this.lastTick) { this.audio.play({ type: 'tick' }); this.lastTick = tick; }
        this.countdown -= dt; if (this.countdown <= 0) { this.phase = 'playing'; this.game.start(); this.notify(); }
      } else if (this.phase === 'playing') {
        if (this.source === 'demo' && this.demoSmile) {
          const smiled = Math.min(dt, Math.max(0, (now - this.demoSmileAt) / 1000));
          if (dt > smiled) this.game.step(dt - smiled, 0, valid);
          this.game.step(smiled, 88, valid);
        } else this.game.step(dt, this.source === 'demo' ? 0 : this.frame?.score ?? 0, valid);
        if (!this.game.paused) {
          const mouth = (this.frame?.signal?.open ?? 0) > .19;
          if (mouth && !this.mouthOpen && this.game.elapsed - this.lastMouth > .5 && ['voice', 'final'].includes(this.game.attack?.type)) { this.audio.play({ type: 'mouth' }); this.lastMouth = this.game.elapsed; } this.mouthOpen = mouth;
          if (this.game.elapsed >= 12) { const tick = Math.ceil(15 - this.game.elapsed); if (tick !== this.finalTick) { this.audio.play({ type: 'tick' }); this.finalTick = tick; } }
          this.draw(); this.buffer.capture(this.canvas, this.game.elapsed);
        }
        for (const e of this.game.takeEvents()) this.audio.play(e);
        if (this.game.phase === 'result') this.finish();
      }
    } else if (this.phase === 'ending') { this.endingTime += dt; if (this.endingTime >= .65) { this.phase = 'result'; this.notify(); } }
    if (!['ending', 'result'].includes(this.phase)) this.draw(); this.render(); if (this.active) this.frameId = requestAnimationFrame(this.loop);
  };
  draw() { this.renderer.draw(this.game, { video: this.video, signal: this.frame?.signal, source: this.source, phase: this.phase, countdown: this.countdown, faceMode: this.options.creator ? this.options.faceMode : 'ORIGINAL', locale: this.locale, reducedMotion: this.reducedMotion }); }
  render() {
    const t = copy(this.locale), valid = this.frameValid(performance.now()), framing = this.phase === 'framing', overlay = this.$('.dl-overlay');
    this.$('.dl-source').textContent = `${this.source === 'demo' ? t.demo : t.camera}${this.options.creator ? ' · CREATOR' : ''}`;
    this.$('.dl-pause').disabled = !['playing', 'countdown'].includes(this.phase); this.$('.dl-pause').setAttribute('aria-label', t.pause);
    this.$('.dl-practice').hidden = this.source !== 'demo'; this.$('.dl-smile').textContent = t.smile; this.$('.dl-smile').disabled = this.phase !== 'playing' || this.game.paused;
    this.$('.dl-footer p').textContent = this.source === 'demo' ? t.demoHint : t.hint; this.$('.dl-sfx').textContent = `${t.sfx} ${this.audio.enabled ? 'ON' : 'OFF'}`; this.$('.dl-sfx').setAttribute('aria-pressed', String(this.audio.enabled));
    overlay.hidden = !['waiting', 'loading', 'framing', 'error'].includes(this.phase) && !this.manualPause && !this.inputLost;
    overlay.querySelector('h2').textContent = this.manualPause ? t.paused : this.inputLost ? t.lost : this.phase === 'error' ? t.error : this.phase === 'loading' ? t.loading : this.frame?.multiple ? t.multiple : valid ? t.ready : this.frame?.visible ? t.neutral : t.framing;
    overlay.querySelector('p').textContent = this.manualPause ? '' : this.inputLost ? t.lostHint : this.phase === 'error' ? t.errorHint : this.phase === 'loading' ? this.status === 'REQUESTING_CAMERA' ? t.permission : t.model : framing && this.game.weakness ? `WE FOUND YOUR WEAKNESS. ${t.weakness}` : '';
    this.$('.dl-calibration').hidden = !framing || valid || !this.frame?.visible; this.$('.dl-calibration i').style.width = `${Math.round((this.frame?.progress ?? 0) * 100)}%`;
    for (const [selector, show, label] of [['.dl-start', framing && valid, t.start], ['.dl-reset', framing && valid, t.recalibrate], ['.dl-resume', this.manualPause, t.resume], ['.dl-reconnect', this.phase === 'error', t.reconnect], ['.dl-demo', this.source !== 'demo' && (this.phase === 'error' || this.inputLost || framing), t.practice]]) { this.$(selector).hidden = !show; this.$(selector).textContent = label; }
    this.$('.dl-caught').hidden = this.phase !== 'ending'; this.$('.dl-caught strong').textContent = this.result?.reason === 'laughed' ? 'CAUGHT YOU.' : 'SURVIVED 😐✨'; this.$('.dl-caught span').textContent = `${this.game.elapsed.toFixed(2)} SEC`;
    this.canvas.setAttribute('aria-label', `DON’T LAUGH · ${stageAt(this.game.elapsed)} · ${(15 - this.game.elapsed).toFixed(1)} SEC`);
  }
  releaseInputs() { ++this.generation; if (this.frameId != null) cancelAnimationFrame(this.frameId); this.frameId = null; this.abort?.abort(); this.input.stop(); this.audio.stop(); this.buffer.clear(); this.renderer.clear(); this.frame = null; this.demoSmile = false; }
  deactivate() { this.active = false; this.releaseInputs(); this.result = null; this.phase = 'idle'; }
}
