import { CounterCamGame } from './core.js';
import { BoxingMotion, boxingFraming } from './pose.js';
import { CounterCamInput } from '../input/counterCamInput.js';
import { CounterCamRenderer, W, H } from './renderer.js';
import { CounterCamAudio } from './audio.js';
import { copy } from './messages.js';
import { CreatorMode } from '../creator/CreatorMode.js';
import { counterCamCreatorProfile, selectCounterHighlight } from './creatorProfile.js';
import './counterCam.css';
export const createView = (root, locale) => new CounterCamView(root, locale);
export class CounterCamView {
  constructor(root, locale) {
    this.root = root; this.locale = locale; this.listeners = new Set(); this.generation = 0; this.active = false; this.phase = 'idle'; this.options = {}; this.keys = new Set();
    this.game = new CounterCamGame(); this.audio = new CounterCamAudio(); this.motion = new BoxingMotion();
    root.innerHTML = `<section class="cc-play"><div class="cc-toolbar"><span class="cc-source"></span><div><button class="cc-sfx" type="button" aria-pressed="true">SE ON</button><button class="cc-pause" type="button">Ⅱ</button></div></div>
      <div class="cc-stage" tabindex="0" role="group"><video muted playsinline hidden></video><canvas class="cc-canvas" width="${W}" height="${H}" role="img"></canvas><canvas class="cc-capture" hidden></canvas>
      <div class="cc-overlay" hidden role="status"><h2></h2><p></p><button class="cc-resume" type="button" hidden></button><button class="cc-reconnect" type="button" hidden></button><button class="cc-demo" type="button" hidden></button></div></div>
      <div class="cc-calibration"><span>① READY</span><span>② PUNCH</span><span>③ DODGE</span></div>
      <div class="cc-practice" hidden><button type="button" data-hold="ArrowLeft">←</button><button type="button" class="cc-punch">PUNCH</button><button type="button" data-hold="ArrowRight">→</button><button type="button" data-hold="KeyG">GUARD</button><button type="button" data-hold="KeyF" class="cc-charge">FINISH</button></div>
      <p class="cc-hint"></p><div class="cc-live" role="status" aria-live="polite"></div></section>`;
    this.$ = s => root.querySelector(s); this.video = this.$('video'); this.canvas = this.$('.cc-canvas'); this.capture = this.$('.cc-capture'); this.renderer = new CounterCamRenderer(this.canvas);
    this.input = new CounterCamInput(this.video, { onPose: pose => {
      if (!this.active || this.source !== 'camera') return;
      this.pose = pose;
      this.sample = this.motion.sample(pose, { specialReady: this.game.special >= 100 });
      if (this.sample.punch && !this.game.paused) this.pendingPunch = this.sample.punch;
    }, onStatus: (status, error) => {
      if (!this.active || this.source !== 'camera') return;
      this.status = status; if (status === 'ERROR') this.fail(error); else this.render();
    } });
  }
  get t() { return copy(this.locale); }
  configure(options = {}) { this.options = { creator: !!options.creator, faceMode: options.faceMode ?? 'ORIGINAL' }; }
  subscribe(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  notify() { this.listeners.forEach(fn => fn(this.snapshot())); }
  snapshot() { return { phase: this.phase === 'ending' ? 'playing' : this.phase === 'calibration' ? 'countdown' : this.phase,
    source: this.source, paused: this.game.paused, elapsed: this.game.elapsed, result: this.phase === 'result' ? { ...this.game.result, source: this.source, creator: this.creatorResult } : null }; }
  setLocale(locale) { this.locale = locale; this.render(); }
  activate() { this.active = true; this.phase = 'idle'; this.render(); }
  setup(source) {
    this.releaseInputs(); this.active = true; this.source = source; this.phase = 'loading'; this.game.reset(); this.motion.reset(); this.creatorResult = null;
    this.pose = null; this.sample = {}; this.pendingPunch = null; this.manualPause = this.inputLost = false; this.keys.clear(); this.calibration = 0; this.calibrationTime = 0; this.dodgeMask = 0; this.endingTime = 0;
    this.lastGoodAt = -Infinity; this.recoveryAt = null; this.reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (this.options.creator) this.creator = new CreatorMode(this.capture, { profile: counterCamCreatorProfile, faceMode: this.options.faceMode, reducedMotion: true });
    this.bind(); this.audio.arm(); this.render(); this.notify(); return this.generation;
  }
  async startCamera() {
    const token = this.setup('camera');
    try { await this.input.start(); if (!this.active || token !== this.generation) return; this.begin(); }
    catch (error) { if (token === this.generation && error.name !== 'AbortError') this.fail(error); }
  }
  startDemo() { this.setup('demo'); this.begin(); this.$('.cc-stage').focus({ preventScroll: true }); }
  begin() { this.phase = 'calibration'; this.lastFrame = performance.now(); this.render(); this.notify(); this.frameId = requestAnimationFrame(this.loop); }
  bind() {
    this.abort = new AbortController(); const signal = this.abort.signal;
    this.root.addEventListener('click', e => {
      if (e.target.closest('.cc-pause,.cc-resume')) this.togglePause();
      else if (e.target.closest('.cc-reconnect')) void this.startCamera();
      else if (e.target.closest('.cc-demo')) this.startDemo();
      else if (e.target.closest('.cc-punch')) this.practicePunch();
      else if (e.target.closest('.cc-sfx')) { this.audio.enabled = !this.audio.enabled; if (this.audio.enabled) this.audio.arm(); else void this.audio.context?.suspend().catch(() => {}); this.render(); }
    }, { signal });
    this.root.addEventListener('pointerdown', e => {
      const button = e.target.closest('[data-hold]'); if (!button || this.source !== 'demo' || this.game.paused) return;
      e.preventDefault(); this.$('.cc-stage').focus({ preventScroll: true }); button.setPointerCapture(e.pointerId); button.dataset.pointer = e.pointerId; this.keys.add(button.dataset.hold);
    }, { signal });
    const up = e => {
      const b = e.target.closest('[data-hold]'); if (!b || b.dataset.pointer !== String(e.pointerId)) return;
      this.keys.delete(b.dataset.hold); delete b.dataset.pointer; if (b.dataset.hold === 'KeyF' && e.type === 'pointerup') this.practicePunch();
    };
    this.root.addEventListener('pointerup', up, { signal }); this.root.addEventListener('pointercancel', up, { signal }); this.root.addEventListener('lostpointercapture', up, { signal });
    window.addEventListener('keydown', e => {
      if (!this.active || e.repeat || e.altKey || e.metaKey || e.ctrlKey || /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
      if (e.code === 'Escape') { this.togglePause(); return; }
      if (this.source !== 'demo' || this.game.paused || !['calibration', 'playing'].includes(this.phase)) return;
      const code = ({ KeyA: 'ArrowLeft', KeyD: 'ArrowRight' })[e.code] ?? e.code;
      if (['ArrowLeft', 'ArrowRight', 'KeyG', 'KeyF', 'Space'].includes(code)) { e.preventDefault(); if (code === 'Space') this.practicePunch(); else this.keys.add(code); }
    }, { signal });
    window.addEventListener('keyup', e => { const code = ({ KeyA: 'ArrowLeft', KeyD: 'ArrowRight' })[e.code] ?? e.code;
      const held = this.keys.delete(code); if (held && code === 'KeyF') this.practicePunch(); }, { signal });
    window.addEventListener('blur', this.background, { signal }); document.addEventListener('visibilitychange', this.visibility, { signal });
  }
  practicePunch() { if (this.source === 'demo' && !this.game.paused && ['calibration', 'playing'].includes(this.phase)) this.pendingPunch = { strength: .85 }; }
  background = () => { if (['calibration', 'playing'].includes(this.phase) && !this.manualPause) this.togglePause(); };
  visibility = () => { if (document.hidden) this.background(); };
  togglePause() {
    if (!['calibration', 'playing'].includes(this.phase)) return;
    this.manualPause = !this.manualPause; this.keys.clear(); this.pendingPunch = null; this.motion.clearVelocity();
    this.game.paused = this.manualPause || this.inputLost;
    if (!this.manualPause) { this.game.recoverInput(); this.audio.arm(); this.lastFrame = performance.now(); }
    else void this.audio.context?.suspend().catch(() => {});
    this.render(); this.notify();
  }
  getMotion(now) {
    if (this.source === 'demo') return { tracked: true, hands: true,
      head: (Number(this.keys.has('ArrowRight')) - Number(this.keys.has('ArrowLeft'))) * .65,
      guard: this.keys.has('KeyG'), charging: this.keys.has('KeyF'), punch: this.pendingPunch };
    return this.pose && now - this.pose.at < 250 ? { ...this.sample, punch: this.pendingPunch } : { tracked: false, hands: false, head: 0 };
  }
  calibrate(dt, input) {
    const framing = this.source === 'demo' ? 'ready' : boxingFraming(this.pose);
    if (framing !== 'ready') {
      this.calibrationTime = 0;
      if (framing === 'back') { this.calibration = 0; this.motion.reset(); this.dodgeMask = 0; }
      return;
    }
    if (this.calibration === 0) {
      this.calibrationTime += dt;
      if (this.calibrationTime >= 600) { if (this.source === 'camera') { this.motion.calibrate(this.pose); this.renderer.baseline = this.motion.baseline; } this.calibration = 1; this.calibrationTime = 0; }
    } else if (this.calibration === 1 && input.punch) { this.calibration = 2; this.audio.tone(660, 990, .12, .05); }
    else if (this.calibration === 2) {
      if (input.head < -.28) this.dodgeMask |= 1; if (input.head > .28) this.dodgeMask |= 2;
      if (this.dodgeMask === 3) { this.calibration = 3; this.calibrationTime = 0; }
    } else if (this.calibration === 3) {
      this.calibrationTime += dt;
      if (this.calibrationTime >= 500) { this.game.start(); this.phase = 'playing'; this.lastGoodAt = performance.now(); this.notify(); }
    }
  }
  loop = now => {
    if (!this.active) return;
    const dt = Math.min(100, Math.max(0, now - this.lastFrame)); this.lastFrame = now;
    const motion = this.getMotion(now); this.currentMotion = motion;
    if (this.phase === 'calibration' && !this.manualPause) this.calibrate(dt, motion);
    else if (this.phase === 'playing') {
      if (this.source === 'camera') {
        const good = motion.tracked && motion.hands && !['back', 'frame', 'hands'].includes(boxingFraming(this.pose));
        if (good) { this.lastGoodAt = now; this.recoveryAt ??= now; } else this.recoveryAt = null;
        const lost = boxingFraming(this.pose) === 'back' || now - this.lastGoodAt > 350 || this.inputLost && (this.recoveryAt === null || now - this.recoveryAt < 200);
        if (lost !== this.inputLost) {
          this.inputLost = lost; this.game.paused = lost || this.manualPause; this.pendingPunch = null; this.motion.clearVelocity();
          if (!lost) { this.game.recoverInput(); this.audio.arm(); } else void this.audio.context?.suspend().catch(() => {});
          this.notify();
        }
      }
      this.game.step(dt, { ...motion, guard: !!motion.hands && motion.guard, punch: motion.hands ? this.pendingPunch : null });
      if (this.game.result) { this.phase = 'ending'; this.endingTime = 0; }
    } else if (this.phase === 'ending') {
      this.endingTime += dt;
      if (this.endingTime >= 1000) {
        if (this.creator) { const capture = this.creator.snapshot(); this.creatorResult = { ...capture, ...selectCounterHighlight(capture.frames, this.game.history), stats: { ...this.game.result } }; }
        this.phase = 'result'; this.input.stop(); this.audio.stop(); this.frameId = null; this.render(); this.notify(); return;
      }
    }
    this.pendingPunch = null;
    for (const event of this.game.takeEvents()) { this.audio.play(event); if (!['WINDUP', 'PUNCH'].includes(event.type)) this.$('.cc-live').textContent = event.type; }
    this.render(); this.draw();
    if (this.creator && ['playing', 'ending'].includes(this.phase) && !this.game.paused)
      this.creator.compose(this.video, this.canvas, { time: this.game.elapsed + this.endingTime, source: 'demo' });
    if (this.active) this.frameId = requestAnimationFrame(this.loop);
  };
  draw() {
    // No stale camera face is used by HIDE; without a fresh pose it draws no
    // raw frame at all, including during tracking recovery and calibration.
    const freshPose = this.pose && performance.now() - this.pose.at < 250 ? this.pose : null;
    this.renderer.draw(this.game, { video: this.video, pose: freshPose, motion: this.currentMotion, source: this.source,
      faceMode: this.options.creator ? this.options.faceMode : 'ORIGINAL', reducedMotion: this.reducedMotion,
      phase: this.phase, calibration: this.calibration, endingTime: this.endingTime, hint: `${this.dodgeMask & 1 ? '✓' : '←'}  ${this.dodgeMask & 2 ? '✓' : '→'}` });
  }
  render() {
    const t = this.t; if (!this.$('.cc-hint')) return;
    this.$('.cc-source').textContent = `${this.source === 'demo' ? t.demo : t.camera}${this.options.creator ? ' · CREATOR' : ''}`;
    this.$('.cc-sfx').textContent = `${t.sfx} ${this.audio.enabled ? 'ON' : 'OFF'}`; this.$('.cc-sfx').setAttribute('aria-pressed', String(this.audio.enabled));
    this.$('.cc-pause').textContent = this.manualPause ? '▶' : 'Ⅱ'; this.$('.cc-pause').setAttribute('aria-label', this.manualPause ? t.resume : t.pause); this.$('.cc-pause').disabled = !['calibration', 'playing'].includes(this.phase);
    this.$('.cc-stage').setAttribute('aria-label', 'COUNTER CAM'); this.canvas.setAttribute('aria-label', `${this.game.lives} ♥ · COUNTER ${this.game.counters} · ${Math.ceil((30000 - this.game.elapsed) / 1000)} SEC`);
    this.$('.cc-practice').hidden = this.source !== 'demo';
    this.root.querySelectorAll('.cc-practice button').forEach(b => { b.disabled = this.game.paused || !['playing', 'calibration'].includes(this.phase); });
    this.$('[data-hold="ArrowLeft"]').setAttribute('aria-label', t.left); this.$('[data-hold="ArrowRight"]').setAttribute('aria-label', t.right);
    this.$('[data-hold="KeyG"]').setAttribute('aria-label', t.guard); this.$('[data-hold="KeyF"]').setAttribute('aria-label', t.mega);
    this.$('.cc-calibration').hidden = this.phase !== 'calibration'; this.root.querySelectorAll('.cc-calibration span').forEach((n, i) => { n.classList.toggle('done', i < this.calibration); n.classList.toggle('current', i === this.calibration); });
    const hint = this.source === 'demo' ? 'ready' : boxingFraming(this.pose);
    this.$('.cc-hint').textContent = this.phase === 'calibration' ? hint !== 'ready' ? t[hint] : [t.distance, t.punch, t.sway, t.ready][this.calibration] : this.source === 'demo' ? t.demoHint : t.cameraHint;
    const label = this.phase === 'error' ? t.error : this.phase === 'loading' ? t.loading : this.manualPause ? t.paused : this.inputLost ? hint === 'back' ? t.back : t.lost : '';
    this.$('.cc-overlay').hidden = !label; this.$('.cc-overlay h2').textContent = label;
    this.$('.cc-overlay p').textContent = this.phase === 'error' ? t.errorHint : this.phase === 'loading' ? this.status === 'REQUESTING_CAMERA' ? t.permission : t.model : this.inputLost ? t.lostHint : '';
    this.$('.cc-resume').hidden = !this.manualPause; this.$('.cc-resume').textContent = t.resume;
    this.$('.cc-reconnect').hidden = this.phase !== 'error'; this.$('.cc-reconnect').textContent = t.retryCamera;
    this.$('.cc-demo').hidden = this.source === 'demo' || !(this.phase === 'error' || this.inputLost); this.$('.cc-demo').textContent = t.practice;
  }
  fail(error) { if (!this.active) return; this.error = error; this.input.stop(); this.phase = 'error'; this.game.paused = true; this.audio.stop(); this.render(); this.notify(); }
  releaseInputs() {
    ++this.generation; if (this.frameId != null) cancelAnimationFrame(this.frameId); this.frameId = null; this.abort?.abort(); this.keys.clear(); this.pendingPunch = null; this.input?.stop(); this.audio.stop(); this.creator?.dispose(); this.creator = null; this.pose = null;
  }
  deactivate() { this.active = false; this.releaseInputs(); this.creatorResult = null; this.phase = 'idle'; }
}
