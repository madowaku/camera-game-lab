import { PoseWallGame } from './core.js';
import { POSES, W, H, makePose, scorePose, framingHint, projectPose, clamp } from './poses.js';
import { PoseWallInput } from '../input/poseWallInput.js';
import { PoseWallRenderer } from './renderer.js';
import { PoseWallAudio } from './audio.js';
import { copy } from './messages.js';
import './poseWall.css';
export const createView = (root, locale) => new PoseWallView(root, locale);
export class PoseWallView {
  constructor(root, locale) {
    this.root = root; this.locale = locale; this.game = new PoseWallGame(); this.audio = new PoseWallAudio(); this.listeners = new Set(); this.phase = 'idle'; this.active = false; this.generation = 0;
    root.innerHTML = `<section class="pw-play"><div class="pw-toolbar"><span class="pw-source"></span><button class="pw-pause" type="button">Ⅱ</button></div>
      <div class="pw-stage" tabindex="0"><video playsinline muted hidden></video><canvas width="${W}" height="${H}" role="img"></canvas>
      <div class="pw-hud"><span class="pw-wall-number"></span><span class="pw-combo"></span></div><div class="pw-cue"><small></small><strong></strong></div>
      <div class="pw-verdict" hidden><strong></strong><span></span><small></small></div><div class="pw-hold" hidden></div>
      <div class="pw-overlay" hidden><h2></h2><p></p><button type="button" class="pw-resume" hidden></button><button type="button" class="pw-reconnect" hidden></button><button type="button" class="pw-demo" hidden></button></div>
      </div><div class="pw-wall-dots" aria-hidden="true">${POSES.map(() => '<i></i>').join('')}</div>
      <div class="pw-practice" hidden>${POSES.map((p, i) => `<button type="button" data-pose="${i}" aria-pressed="false"><span aria-hidden="true">${i + 1}</span>${p.name}</button>`).join('')}<button type="button" data-pose="-1" class="pw-rest"></button></div>
      <div class="pw-footer"><p></p><button class="pw-sfx" type="button" aria-pressed="true"></button></div><div class="pw-live-region" aria-live="polite" role="status"></div></section>`;
    this.$ = s => root.querySelector(s); this.canvas = this.$('canvas'); this.video = this.$('video'); this.renderer = new PoseWallRenderer(this.canvas);
    this.input = new PoseWallInput(this.video, {
      onPose: pose => {
        if (!this.active || this.source !== 'camera') return;
        this.pose = pose;
        if (pose) { this.lastCoreAt = performance.now(); this.recoverAt ??= this.lastCoreAt; } else this.recoverAt = null;
      },
      onStatus: (status, error) => {
        if (!this.active || this.source !== 'camera') return; this.status = status;
        if (status === 'ERROR') { this.phase = 'error'; this.error = error; this.game.paused = true; this.audio.stop(); }
        this.render(); this.notify();
      },
    });
  }
  subscribe(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  notify() { this.listeners.forEach(fn => fn(this.snapshot())); }
  snapshot() { return { phase: this.phase === 'running' ? 'playing' : this.phase, source: this.source, paused: this.manualPause || this.inputLost || this.game.paused, elapsed: this.game.elapsed, result: this.game.result }; }
  setLocale(locale) { this.locale = locale; this.uiKey = null; this.render(); }
  activate() {
    this.deactivate(); this.active = true; this.game.reset(); this.phase = 'waiting'; this.manualPause = this.inputLost = false; this.pose = null; this.selected = -1; this.status = this.error = null;
    this.lastCoreAt = -Infinity; this.recoverAt = null; this.readyElapsed = 0; this.feedback = null; this.uiKey = null;
    this.reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.abort = new AbortController(); const signal = this.abort.signal;
    this.root.addEventListener('click', this.click, { signal }); this.canvas.addEventListener('pointerdown', this.pointerDown, { signal });
    this.canvas.addEventListener('pointermove', this.pointerMove, { signal }); this.canvas.addEventListener('pointerup', this.pointerUp, { signal }); this.canvas.addEventListener('pointercancel', this.pointerUp, { signal });
    window.addEventListener('keydown', this.keyDown, { signal }); window.addEventListener('blur', this.blur, { signal }); document.addEventListener('visibilitychange', this.visibility, { signal });
    this.lastFrame = performance.now(); this.frameId = requestAnimationFrame(this.loop); this.render(); this.draw();
  }
  async startCamera() {
    const token = ++this.generation; this.source = 'camera'; this.phase = 'loading'; this.manualPause = this.inputLost = false; this.pose = null; this.game.reset(); this.audio.arm(); this.render(); this.notify();
    try {
      await this.input.start(); if (!this.active || token !== this.generation) return;
      this.phase = 'framing'; this.lastFrame = performance.now(); this.render(); this.notify();
    } catch (error) {
      if (!this.active || token !== this.generation || error?.name === 'AbortError') return;
      this.phase = 'error'; this.error = error; this.input.stop(); this.audio.stop(); this.render(); this.notify();
    }
  }
  startDemo() {
    ++this.generation; this.input.stop(); this.source = 'demo'; this.pose = makePose(); this.selected = -1; this.manualPause = this.inputLost = false; this.game.reset(); this.phase = 'countdown'; this.readyElapsed = 0; this.audio.arm(); this.lastFrame = performance.now(); this.render(); this.notify(); this.$('.pw-stage').focus({ preventScroll: true });
  }
  releaseInputs() {
    ++this.generation; this.input.stop(); this.audio.stop(); this.abort?.abort(); this.drag = null;
    if (this.frameId != null) cancelAnimationFrame(this.frameId); this.frameId = null;
  }
  deactivate() { this.active = false; this.releaseInputs(); this.phase = 'idle'; }
  choosePose(index) {
    if (this.source !== 'demo' || !['running', 'countdown'].includes(this.phase) || this.game.paused) return;
    this.selected = index; this.pose = makePose(POSES[index]?.angles); this.uiKey = null; this.render(); this.draw();
  }
  click = e => {
    if (e.target.closest('.pw-pause,.pw-resume')) this.togglePause();
    else if (e.target.closest('.pw-demo')) this.startDemo();
    else if (e.target.closest('.pw-reconnect')) void this.startCamera();
    else if (e.target.closest('.pw-sfx')) { this.audio.enabled = !this.audio.enabled; if (this.audio.enabled) this.audio.arm(); this.uiKey = null; this.render(); }
    else { const button = e.target.closest('[data-pose]'); if (button) this.choosePose(Number(button.dataset.pose)); }
  };
  keyDown = e => {
    if (!this.active || e.repeat || e.altKey || e.metaKey || e.ctrlKey || /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
    if (e.code === 'Space' && this.phase === 'running') { e.preventDefault(); this.togglePause(); return; }
    if (this.source === 'demo' && /^[0-5]$/.test(e.key)) { e.preventDefault(); this.choosePose(Number(e.key) - 1); }
  };
  pointerDown = e => {
    if (this.source !== 'demo' || this.phase !== 'running' || this.game.paused) return;
    const p = this.pointerPoint(e); let best = 26;
    this.pose.arms.forEach((arm, side) => ['elbow', 'wrist'].forEach(joint => { const distance = Math.hypot((p.x - arm[joint].x) * W, (p.y - arm[joint].y) * H); if (distance < best) { best = distance; this.drag = { side, joint, id: e.pointerId }; } }));
    if (this.drag) { e.preventDefault(); this.canvas.setPointerCapture(e.pointerId); this.selected = -2; this.uiKey = null; }
  };
  pointerPoint(e) { const rect = this.canvas.getBoundingClientRect(); return { x: clamp((e.clientX - rect.left) / rect.width, .025, .975), y: clamp((e.clientY - rect.top) / rect.height, .07, .96) }; }
  pointerMove = e => { if (!this.drag || e.pointerId !== this.drag.id || this.game.paused) return; e.preventDefault(); this.pose.arms[this.drag.side][this.drag.joint] = this.pointerPoint(e); this.draw(); };
  pointerUp = e => { if (this.drag?.id === e.pointerId) { this.drag = null; if (this.canvas.hasPointerCapture(e.pointerId)) this.canvas.releasePointerCapture(e.pointerId); } };
  resetAfterPause() {
    this.game.clearHold();
    // Give a fresh 300ms hold even when pausing immediately before contact.
    if (this.game.wallTime > .5 && this.game.wallTime < 2) this.game.elapsed = Math.max(this.game.wallIndex * 3 + .5, this.game.elapsed - .3);
    this.lastFrame = performance.now();
  }
  togglePause() {
    if (!['running', 'countdown'].includes(this.phase)) return;
    this.manualPause = !this.manualPause; this.game.paused = this.manualPause || this.inputLost;
    if (this.manualPause) { this.drag = null; void this.audio.context?.suspend().catch(() => {}); }
    else { this.resetAfterPause(); this.audio.arm(); }
    this.uiKey = null; this.render(); this.notify();
  }
  blur = () => { if (['running', 'countdown'].includes(this.phase) && !this.manualPause) this.togglePause(); };
  visibility = () => { if (document.hidden) this.blur(); };
  loop = now => {
    if (!this.active) return;
    const dt = Math.min(.1, Math.max(0, (now - this.lastFrame) / 1000)); this.lastFrame = now;
    if (this.phase === 'framing' && framingHint(this.pose) === 'ready') { this.phase = 'countdown'; this.readyElapsed = 0; this.notify(); }
    if (this.phase === 'countdown' && !this.manualPause) {
      if (this.source === 'camera' && framingHint(this.pose) !== 'ready') { this.phase = 'framing'; this.readyElapsed = 0; this.notify(); }
      else { this.readyElapsed += dt; if (this.readyElapsed >= .5) { this.game.start(); this.phase = 'running'; this.lastCoreAt = now; this.notify(); } }
    } else if (this.phase === 'running') {
      if (this.source === 'camera') {
        const lost = now - this.lastCoreAt > 350 || this.inputLost && (this.recoverAt == null || now - this.recoverAt < 200);
        if (lost !== this.inputLost) { this.inputLost = lost; this.game.paused = this.manualPause || lost; if (!lost) { this.resetAfterPause(); this.audio.arm(); } this.uiKey = null; this.notify(); }
      }
      this.score = scorePose(this.pose, this.game.target); this.game.step(dt, this.score.score);
      if (this.game.phase === 'result') { this.game.result.source = this.source; this.phase = 'result'; this.input.stop(); this.audio.stop(); this.notify(); }
    }
    for (const event of this.game.takeEvents()) { this.audio.play(event); if (event.type === 'judge') { this.feedback = event; this.$('.pw-live-region').textContent = `${event.rank} ${event.score}%`; } else this.feedback = null; }
    this.render(); this.draw(); if (this.active) this.frameId = requestAnimationFrame(this.loop);
  };
  draw() { this.renderer.draw(this.game, { pose: this.pose, video: this.video, source: this.source, reducedMotion: this.reducedMotion, ready: this.phase === 'running' && this.game.wallTime > 1.6 && this.game.wallTime < 2 }); }
  render() {
    const t = copy(this.locale), g = this.game, f = this.feedback;
    const key = [this.locale, this.source, this.phase, g.wallIndex, g.stage, this.manualPause, this.inputLost, this.selected, this.status, f?.rank, this.audio.enabled, framingHint(this.pose), this.pose?.arms.map(a => !!a.wrist && !!a.elbow).join()].join(':');
    if (this.uiKey === key) return; this.uiKey = key;
    this.$('.pw-play').dataset.source = this.source ?? '';
    this.$('.pw-source').textContent = this.source === 'demo' ? t.demo : t.camera;
    this.canvas.setAttribute('aria-label', t.canvas); this.$('.pw-pause').setAttribute('aria-label', t.pause); this.$('.pw-pause').disabled = !['running', 'countdown'].includes(this.phase);
    this.$('.pw-wall-number').textContent = `WALL ${g.wallIndex + 1} / 5`; this.$('.pw-combo').textContent = g.combo > 1 ? `🔥 ×${g.combo}` : '';
    this.$('.pw-cue small').textContent = g.wallIndex === 4 ? 'FINAL WALL' : 'MAKE THE SHAPE'; this.$('.pw-cue strong').textContent = g.target.name;
    this.$('.pw-cue').hidden = this.phase !== 'running' || g.wallTime >= 2;
    this.$('.pw-verdict').hidden = !f || this.phase !== 'running'; this.$('.pw-verdict').dataset.rank = f?.rank ?? '';
    this.$('.pw-verdict strong').textContent = f?.rank ?? ''; this.$('.pw-verdict span').textContent = f ? `${f.score}%` : '';
    this.$('.pw-verdict small').textContent = f?.rank === 'SQUEEZE' ? t.squeeze : f?.rank === 'CRASH' ? t.crash : f?.rank === 'PERFECT' ? g.perfectStreak >= 3 ? 'HOT STREAK! · SPOT!' : 'SPOT!' : 'SHUP!';
    this.$('.pw-hold').hidden = this.phase !== 'running' || g.stage !== 'approach'; this.$('.pw-hold').textContent = t.hold;
    this.root.querySelectorAll('.pw-wall-dots i').forEach((dot, i) => { dot.dataset.rank = g.walls[i]?.rank ?? ''; dot.classList.toggle('current', i === g.wallIndex); });
    this.$('.pw-practice').hidden = this.source !== 'demo'; this.root.querySelectorAll('[data-pose]').forEach(b => { b.disabled = !['running', 'countdown'].includes(this.phase) || g.paused; b.setAttribute('aria-pressed', String(Number(b.dataset.pose) === this.selected)); }); this.$('.pw-rest').textContent = `0 · ${t.rest}`;
    this.$('.pw-sfx').textContent = `${t.sfx} ${this.audio.enabled ? 'ON' : 'OFF'}`; this.$('.pw-sfx').setAttribute('aria-pressed', String(this.audio.enabled));
    const missing = this.source === 'camera' && this.pose ? this.pose.arms.map(a => !a.elbow || !a.wrist) : [];
    this.$('.pw-footer p').textContent = missing?.some(Boolean) ? missing.map((m, i) => m ? i ? t.rightHand : t.leftHand : '').filter(Boolean).join(' · ') : this.source === 'demo' ? t.demoHint : t.cameraHint;
    const overlay = this.$('.pw-overlay'), hint = framingHint(this.pose);
    overlay.hidden = !['loading', 'error', 'framing', 'countdown', 'waiting'].includes(this.phase) && !this.manualPause && !this.inputLost;
    if (overlay.hidden) return;
    overlay.querySelector('h2').textContent = this.manualPause ? t.paused : this.phase === 'error' ? t.error : this.phase === 'loading' ? t.loading : this.inputLost ? t.lost : this.phase === 'countdown' ? t.ready : t[hint === 'ready' ? 'frame' : hint];
    overlay.querySelector('p').textContent = this.phase === 'error' ? t.errorHint : this.phase === 'loading' ? this.status === 'REQUESTING_CAMERA' ? t.permission : t.model : this.inputLost ? t.lostHint : this.phase === 'countdown' || this.manualPause ? '' : t.frameHint;
    this.$('.pw-resume').hidden = !this.manualPause; this.$('.pw-resume').textContent = t.resume;
    this.$('.pw-reconnect').hidden = this.phase !== 'error'; this.$('.pw-reconnect').textContent = t.retryCamera;
    this.$('.pw-demo').hidden = this.source === 'demo' || !['error', 'framing'].includes(this.phase) && !this.inputLost; this.$('.pw-demo').textContent = t.practice;
  }
}
