import { AirSlashGame, W, H, ROUND_MS, SPEED, clamp } from './core.js';
import { AirSlashInput } from '../input/airSlashInput.js';
import { AirSlashRenderer } from './renderer.js';
import { AirSlashAudio } from './audio.js';
import { copy } from './messages.js';
import { CreatorMode } from '../creator/CreatorMode.js';
import { airSlashCreatorProfile, selectAirSlashReplay } from './creatorProfile.js';
import './airSlash.css';

export const createView = (root, locale, options) => new AirSlashView(root, locale, options);
export class AirSlashView {
  constructor(root, locale = 'ja', { onExit } = {}) {
    this.root = root; this.locale = locale; this.onExit = onExit; this.listeners = new Set(); this.options = {}; this.phase = 'idle'; this.source = 'camera'; this.generation = 0;
    this.game = new AirSlashGame(); this.audio = new AirSlashAudio(); this.pointers = new Map(); this.motions = new Map();
    try { this.audio.enabled = localStorage.getItem('camera-game-lab-air-slash-sfx') !== 'off'; } catch {}
    root.innerHTML = `<section class="as-play"><div class="as-toolbar"><span class="as-source"></span><div><button class="as-sound" type="button"></button><button class="as-pause" type="button"></button></div></div>
      <div class="as-stage" tabindex="0" role="group"><video muted playsinline hidden aria-hidden="true"></video><canvas class="as-canvas" width="540" height="960" role="img"></canvas><canvas class="as-capture" hidden></canvas>
      <div class="as-hud"><div><span>SCORE</span><strong class="as-score">0</strong><small class="as-combo"></small></div><div class="as-timer"><strong>15</strong><span>SEC</span></div></div>
      <div class="as-cue" aria-live="polite" role="status"><strong></strong><small></small></div><div class="as-blades"><span>LEFT BLADE</span><span>RIGHT BLADE</span></div>
      <div class="as-overlay" hidden><div><h2></h2><p role="status"></p><button class="as-resume as-primary" type="button" hidden></button><button class="as-camera-retry as-primary" type="button" hidden></button><button class="as-practice as-secondary" type="button" hidden></button><button class="as-exit as-text" type="button"></button></div></div>
      <progress class="as-progress" max="15000" value="15000"></progress></div><p class="as-hint"></p></section>`;
    this.$ = selector => root.querySelector(selector); this.canvas = this.$('.as-canvas'); this.video = this.$('video'); this.capture = this.$('.as-capture'); this.renderer = new AirSlashRenderer(this.canvas);
    this.input = new AirSlashInput(this.video, { onStatus: (status, error) => { if (!this.active || this.source !== 'camera') return; this.status = status; if (status === 'ERROR') this.fail(error); else this.render(); } });
    this.render();
  }
  configure(options = {}) { this.options = { ...options, faceMode: options.faceMode ?? 'ORIGINAL' }; }
  subscribe(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  notify() { const s = this.snapshot(); for (const fn of this.listeners) fn(s); }
  snapshot() { return { phase: this.phase, source: this.source, paused: this.game.paused, result: this.phase === 'result' ? { ...this.game.result, creator: this.creatorResult } : null }; }
  setLocale(locale) { this.locale = locale; this.render(); }
  activate() { this.active = true; this.phase = 'idle'; this.render(); }
  setup(source) {
    this.releaseInputs(); this.active = true; this.source = source; this.phase = 'loading'; this.status = 'LOADING_MODEL'; this.error = null; this.creatorResult = null;
    this.game = new AirSlashGame({ source, seed: Math.floor(Math.random() * 1e8) }); this.renderer.reset(); this.cue = ''; this.cueUntil = 0;
    this.reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (this.options.creator) {
      this.creator = new CreatorMode(this.capture, { profile: airSlashCreatorProfile, faceMode: this.options.faceMode, reducedMotion: this.reducedMotion });
      this.replayFrame = document.createElement('canvas'); this.replayFrame.width = W; this.replayFrame.height = H;
    }
    this.bind(); this.audio.arm(); this.render(); this.notify(); return this.generation;
  }
  async startCamera() { const token = this.setup('camera'); try { await this.input.start(); if (this.active && token === this.generation) this.begin(); } catch (e) { if (token === this.generation && this.active && e.name !== 'AbortError') this.fail(e); } }
  startDemo() { this.setup('demo'); this.begin(); this.$('.as-stage').focus({ preventScroll: true }); }
  begin() { this.phase = 'waiting'; this.lastTick = performance.now(); this.render(); this.notify(); this.frameId = requestAnimationFrame(this.tick); }
  bind() {
    this.abort = new AbortController(); const signal = this.abort.signal, stage = this.$('.as-stage');
    stage.addEventListener('pointerdown', this.pointerDown, { signal }); stage.addEventListener('pointermove', this.pointerMove, { signal });
    for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) stage.addEventListener(name, this.pointerUp, { signal });
    stage.addEventListener('keydown', this.key, { signal });
    this.root.addEventListener('click', e => {
      if (e.target.closest('.as-pause')) this.game.paused ? this.resume() : this.pause('user');
      if (e.target.closest('.as-resume')) this.resume();
      if (e.target.closest('.as-camera-retry')) void this.startCamera();
      if (e.target.closest('.as-practice')) this.startDemo();
      if (e.target.closest('.as-exit')) this.onExit?.();
      if (e.target.closest('.as-sound')) { this.audio.setEnabled(!this.audio.enabled); try { localStorage.setItem('camera-game-lab-air-slash-sfx', this.audio.enabled ? 'on' : 'off'); } catch {} this.render(); }
    }, { signal });
    window.addEventListener('blur', () => this.pause('hidden'), { signal });
    document.addEventListener('visibilitychange', () => { if (document.hidden) this.pause('hidden'); }, { signal });
    window.addEventListener('resize', () => { this.clearPointers(); this.game.blades.reset(); this.game.recent.clear(); }, { signal });
  }
  point(e) { const r = this.canvas.getBoundingClientRect(); return { x: clamp((e.clientX - r.left) / r.width * W, 0, W), y: clamp((e.clientY - r.top) / r.height * H, 0, H), at: performance.now() }; }
  pointerDown = e => {
    if (this.source !== 'demo' || this.game.paused || e.button > 0 || e.target.closest('button') || this.phase === 'result') return;
    e.preventDefault(); const stage = this.$('.as-stage'); stage.focus({ preventScroll: true }); stage.setPointerCapture(e.pointerId);
    const id = this.pointers.size ? 'left' : 'right'; if ([...this.pointers.values()].some(p => p.id === id)) return;
    this.pointers.set(e.pointerId, { ...this.point(e), id }); this.motions.delete(id);
  };
  pointerMove = e => { const p = this.pointers.get(e.pointerId); if (p && !this.game.paused) Object.assign(p, this.point(e)); };
  pointerUp = e => { this.pointers.delete(e.pointerId); };
  key = e => {
    const dirs = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1], a: [-1, 0], d: [1, 0], w: [0, -1], s: [0, 1] };
    if (e.code === 'Space') { e.preventDefault(); this.game.paused ? this.resume() : this.pause('user'); return; }
    const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (this.source !== 'demo' || this.game.paused || e.repeat || (!dirs[key] && key !== 'x')) return;
    e.preventDefault(); const center = { x: W / 2, y: H * .64 }, now = performance.now();
    const add = (id, dir) => this.motions.set(id, { at: now, a: { x: center.x - dir[0] * 205, y: center.y - dir[1] * 205 }, b: { x: center.x + dir[0] * 205, y: center.y + dir[1] * 205 } });
    if (key === 'x') { add('left', [1, -1]); add('right', [-1, -1]); }
    else add(key.startsWith('Arrow') ? 'right' : 'left', dirs[key]);
  };
  demoHands(now) {
    // Held pointers supply fresh position observations; activation still depends on actual movement.
    const hands = [...this.pointers.values()].map(p => ({ ...p, at: now }));
    for (const [id, m] of this.motions) {
      const age = now - m.at; if (age > 550) { this.motions.delete(id); continue; }
      const t = clamp((age - 210) / 160, 0, 1); hands.push({ id, x: m.a.x + (m.b.x - m.a.x) * t, y: m.a.y + (m.b.y - m.a.y) * t, at: now });
    }
    return hands;
  }
  clearPointers() { for (const id of this.pointers.keys()) { try { this.$('.as-stage').releasePointerCapture(id); } catch {} } this.pointers.clear(); this.motions.clear(); }
  pause(reason) { if (!this.active || ['idle', 'loading', 'error', 'result'].includes(this.phase)) return; this.game.pause(reason); this.audio.pause(); this.clearPointers(); this.render(); this.notify(); }
  resume() { if (document.hidden || this.game.pauseReason === 'tracking') return; this.game.resume(); this.audio.arm(); this.lastTick = performance.now(); this.render(); this.notify(); this.$('.as-stage').focus({ preventScroll: true }); }
  fail(error) { this.error = error; this.phase = 'error'; this.input.stop(); this.audio.pause(); if (this.frameId != null) cancelAnimationFrame(this.frameId); this.frameId = null; this.render(); this.notify(); }
  tick = now => {
    if (!this.active || ['idle', 'loading', 'error', 'result'].includes(this.phase)) return;
    const delta = now - this.lastTick; this.lastTick = now;
    if (delta > 700 && this.game.phase === 'playing') this.pause('hidden');
    const hands = this.source === 'demo' ? this.demoHands(now) : this.input.sample(now);
    this.game.step(delta, hands, now); this.phase = this.game.phase;
    const labels = { first: 'GOOD!', juicy: 'JUICY!', combo10: '10 COMBO!', xslash: 'X-SLASH!', bomb: 'BOOM!', storm: 'FRUIT STORM' };
    const cuePriority = { first: 0, juicy: 1, combo10: 2, storm: 3, xslash: 4, bomb: 5 }; let cueEvent = null;
    const highlights = { first: 'FIRST', combo10: 'COMBO10', xslash: 'XSLASH', bomb: 'BOMB', storm: 'STORM' };
    for (const event of this.game.events) {
      this.audio.play(event); this.renderer.event(event, this.reducedMotion);
      if (labels[event.type] && (!cueEvent || cuePriority[event.type] > cuePriority[cueEvent.type])) cueEvent = event;
      if (highlights[event.type]) this.creator?.highlight(highlights[event.type], event.at);
    }
    if (cueEvent) { this.cue = labels[cueEvent.type]; this.cueUntil = now + (cueEvent.type === 'storm' ? 1200 : 900); }
    this.renderer.draw(this.game, { video: this.video, source: this.source, faceMode: this.options.faceMode, hands, dt: delta, reducedMotion: this.reducedMotion, face: this.input.face });
    if (this.creator && !this.game.paused && this.phase === 'playing') {
      // Canvas already has the selected privacy mode; capture that exact composition.
      const c = this.replayFrame.getContext('2d'); c.drawImage(this.canvas, 0, 0); c.font = '900 34px Impact'; c.fillStyle = '#fffbe5'; c.strokeStyle = '#132428'; c.lineWidth = 5; c.textAlign = 'left'; c.strokeText(`AIR SLASH  ${this.game.score}`, 28, 60); c.fillText(`AIR SLASH  ${this.game.score}`, 28, 60);
      this.creator.compose({ srcObject: null }, this.replayFrame, { time: this.game.elapsed, source: 'demo' });
    }
    if (this.phase === 'result') {
      if (this.creator) this.creatorResult = selectAirSlashReplay(this.creator.snapshot(), this.game.result);
      this.game.result.inferenceFps = this.source === 'camera' ? Math.round(this.input.fps) : null;
      this.render(); this.notify(); this.releaseInputs(); return;
    }
    this.render(); const state = `${this.phase}:${this.game.paused}`; if (state !== this.lastState) { this.lastState = state; this.notify(); }
    if (this.active) this.frameId = requestAnimationFrame(this.tick);
  };
  render() {
    const t = copy(this.locale), g = this.game, now = performance.now();
    this.$('.as-source').textContent = this.source === 'demo' ? t.demo : `${t.camera} · ${this.options.faceMode ?? 'ORIGINAL'}`;
    this.$('.as-sound').textContent = this.audio.enabled ? t.soundOn : t.soundOff; this.$('.as-sound').setAttribute('aria-pressed', String(this.audio.enabled));
    this.$('.as-pause').textContent = g.paused ? '▶' : 'Ⅱ'; this.$('.as-pause').setAttribute('aria-label', g.paused ? t.resume : t.pause); this.$('.as-pause').disabled = ['idle', 'loading', 'error', 'result'].includes(this.phase);
    this.$('.as-score').textContent = g.score.toLocaleString('en-US'); this.$('.as-combo').textContent = g.combo > 1 ? `${g.combo} ${g.combo >= 5 ? 'COMBO!' : 'SLASH'}` : '';
    this.$('.as-timer strong').textContent = Math.ceil((ROUND_MS - g.elapsed) / 1000); this.$('progress').value = ROUND_MS - g.elapsed; this.$('progress').setAttribute('aria-label', this.locale === 'ja' ? '残り時間' : 'Time remaining');
    this.$('.as-hint').textContent = this.source === 'demo' ? t.demoHint : t.cameraHint; this.canvas.setAttribute('aria-label', `AIR SLASH · ${g.score} · ${g.sliced} FRUIT`);
    const blocked = ['loading', 'error'].includes(this.phase) || g.paused, overlay = this.$('.as-overlay'); overlay.hidden = !blocked;
    this.$('.as-resume').hidden = !g.paused || g.pauseReason === 'tracking'; this.$('.as-camera-retry').hidden = this.phase !== 'error'; this.$('.as-practice').hidden = this.phase !== 'error' && g.pauseReason !== 'tracking';
    for (const [s, label] of [['.as-resume', t.resume], ['.as-camera-retry', t.retryCamera], ['.as-practice', t.practice], ['.as-exit', t.exit]]) this.$(s).textContent = label;
    overlay.querySelector('h2').textContent = this.phase === 'loading' ? 'AIR SLASH' : this.phase === 'error' ? 'CAMERA?' : g.pauseReason === 'tracking' ? 'HANDS?' : 'PAUSE';
    overlay.querySelector('p').textContent = this.phase === 'loading' ? this.status === 'REQUESTING_CAMERA' ? t.requesting : t.loading : this.phase === 'error' ? ['NotAllowedError', 'NotFoundError', 'NotReadableError'].includes(this.error?.name) ? t.error : t.modelError : g.pauseReason === 'tracking' ? t.lost : t.paused;
    this.$('.as-cue').hidden = blocked || this.phase === 'result';
    this.$('.as-cue strong').textContent = this.phase === 'waiting' ? t.show : this.phase === 'ready' ? t.ready : now < this.cueUntil ? this.cue : g.combo >= 5 ? 'JUICY!' : '';
    this.$('.as-cue small').textContent = this.phase === 'playing' && now >= this.cueUntil && !g.sliced ? "SLASH FRUIT. DON'T SLASH BOMBS." : '';
    this.$('.as-blades').hidden = this.phase !== 'playing';
    ['left', 'right'].forEach((id, i) => {
      const h = g.blades.hands.get(id), speed = h && now - h.last.at < 130 && now >= h.armedAt ? h.speed : 0;
      this.$('.as-blades').children[i].textContent = `${id.toUpperCase()} BLADE${speed >= SPEED.power ? ' · POWER' : speed >= SPEED.slash ? ' · SLASH' : ''}`;
    });
  }
  releaseInputs() { this.generation++; this.input.stop(); this.audio.stop(); this.abort?.abort(); this.clearPointers(); if (this.frameId != null) cancelAnimationFrame(this.frameId); this.frameId = null; this.creator?.dispose(); this.creator = null; if (this.replayFrame) this.replayFrame.width = 0; this.replayFrame = null; }
  deactivate() { this.active = false; this.releaseInputs(); this.phase = 'idle'; this.creatorResult = null; }
}
