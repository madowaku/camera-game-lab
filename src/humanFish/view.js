import { HumanFishGame, DURATION } from './core.js';
import { FishSignal } from './signals.js';
import { NoteEaterInput } from '../input/noteEaterInput.js';
import { PhaserRuntime } from '../game-runtime/phaser/PhaserRuntime.js';
import { CameraInputBridge } from '../game-runtime/phaser/input/CameraInputBridge.js';
import { GameEventBus } from '../game-runtime/phaser/events/GameEventBus.js';
import { HumanFishScene } from './scene.js';
import { FishAudio } from './audio.js';
import { FishRecorder } from './creator.js';
import './humanFish.css';

export const createView = (root, locale) => new HumanFishView(root, locale);
export class HumanFishView {
  constructor(root, locale) {
    this.root = root; this.locale = locale; this.listeners = new Set(); this.keys = new Set(); this.generation = 0; this.phase = 'idle';
    this.game = new HumanFishGame(); this.signal = new FishSignal(); this.audio = new FishAudio();
    this.gameEvents = new GameEventBus(); this.inputBridge = new CameraInputBridge({ staleMs: 200 }); this.options = { faceMode: 'EFFECT' };
    root.innerHTML = `<section class="hf-play"><div class="hf-play-toolbar"><span class="hf-source"></span><div><button type="button" class="hf-photo">PHOTO</button><button type="button" class="hf-se" aria-pressed="true">SE ON</button><button type="button" class="hf-pause">Ⅱ</button></div></div>
      <div class="hf-stage" role="group" tabindex="0"><video muted playsinline hidden></video><div class="hf-phaser-host"></div>
      <div class="hf-hud"><div><span>LIFE</span><strong class="hf-time">45.0</strong></div>
      <div class="hf-o2"><div><strong class="hf-o2-value">O₂ 100%</strong><span class="hf-depth">DEPTH 37%</span></div><div class="hf-o2-track"><i></i></div></div>
      <div><span>COLLECTED</span><strong class="hf-score">0</strong></div></div>
      <div class="hf-overlay" hidden role="status"><h2></h2><p></p><button type="button" class="hf-resume" hidden></button><button type="button" class="hf-camera-retry" hidden></button><button type="button" class="hf-fallback" hidden></button></div>
      <div class="hf-tracking" hidden role="status"></div><div class="hf-depth-label">DEEPER = TEMPTING</div></div>
      <div class="hf-practice" hidden><p></p><button type="button" class="hf-bite">パクッ / ぷはっ</button></div><p class="hf-hint hf-action"></p><p class="hf-live" role="status" aria-live="polite"></p></section>`;
    this.$ = s => root.querySelector(s); this.video = this.$('video'); this.capture = document.createElement('canvas'); this.capture.width = 540; this.capture.height = 960;
    this.input = new NoteEaterInput(this.video, { onFrame: packet => {
      if (!this.active || this.source !== 'camera') return;
      this.packet = packet; this.motion = this.signal.sample(packet, packet.at); this.pendingBite ||= this.motion.bite;
      this.inputBridge.publish({ timestamp: packet.at, face: { visible: this.motion.tracked, x: this.motion.target?.x, y: this.motion.target?.y, mouthOpen: this.motion.open ? 1 : 0 } });
    }, onStatus: (status, error) => { if (!this.active || this.source !== 'camera') return; this.status = status; if (status === 'ERROR') { this.signal.lost(); this.pendingBite = false; this.fail(error); } else this.render(); } });
    root.addEventListener('click', e => {
      if (e.target.closest('.hf-pause')) this.pause();
      if (e.target.closest('.hf-resume')) this.pause(false);
      if (e.target.closest('.hf-se')) { this.audio.enabled = !this.audio.enabled; if (this.audio.enabled) this.audio.arm(); else this.audio.stop(); this.render(); }
      if (e.target.closest('.hf-camera-retry')) void this.startCamera();
      if (e.target.closest('.hf-fallback')) this.startDemo();
      if (e.target.closest('.hf-bite') && this.source === 'demo' && !this.isPaused) this.pendingBite = true;
      if (e.target.closest('.hf-photo')) { this.photoRequested = true; this.$('.hf-live').textContent = this.ja ? '今日の人面魚を撮影します。' : 'Taking today’s human fish photo.'; }
    });
    const stage = this.$('.hf-stage');
    stage.addEventListener('pointerdown', e => { if (this.source !== 'demo' || e.target.closest('button')) return; stage.focus({ preventScroll: true }); stage.setPointerCapture(e.pointerId); this.pointer(e); });
    stage.addEventListener('pointermove', e => { if (this.source === 'demo' && stage.hasPointerCapture(e.pointerId)) this.pointer(e); });
  }
  get ja() { return this.locale === 'ja'; }
  get isPaused() { return !!(this.manualPause || this.backgroundPause || this.inputLost || this.phase === 'error'); }
  configure(options = {}) { this.options = { creator: !!options.creator, faceMode: options.faceMode || 'EFFECT' }; }
  subscribe(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  notify() { for (const fn of this.listeners) fn(this.snapshot()); }
  snapshot() { return { phase: this.phase === 'ending' ? 'playing' : this.phase, source: this.source, paused: this.isPaused, musicSilent: this.phase === 'ending', musicFilterHz: this.game.oxygen <= 5 ? 600 : 18000, elapsed: this.game.elapsed,
    result: this.phase === 'result' ? { ...this.game.result, source: this.source, photo: this.photo, creator: this.creatorResult } : null }; }
  setLocale(locale) { this.locale = locale; this.render(); }
  activate() {
    this.active = true; this.phase = 'idle'; this.abort?.abort(); this.abort = new AbortController();
    window.addEventListener('keydown', e => {
      if (/INPUT|TEXTAREA|SELECT/.test(e.target.tagName) || !this.active) return;
      if (e.code === 'KeyP' && !e.repeat) { e.preventDefault(); this.pause(); return; }
      if (e.target.closest('button,a')) return;
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(e.code) && this.source === 'demo') {
        e.preventDefault(); this.keys.add(e.code); if (e.code === 'Space' && !e.repeat && !this.isPaused) this.pendingBite = true;
      }
    }, { signal: this.abort.signal });
    window.addEventListener('keyup', e => this.keys.delete(e.code), { signal: this.abort.signal });
    window.addEventListener('blur', () => { this.keys.clear(); if (['playing', 'calibration', 'countdown'].includes(this.phase)) this.pause(true); }, { signal: this.abort.signal });
    document.addEventListener('visibilitychange', () => { this.backgroundPause = document.hidden; this.keys.clear(); this.pendingBite = false; this.audio.pause(this.isPaused); this.render(); }, { signal: this.abort.signal });
    this.media = matchMedia('(prefers-reduced-motion: reduce)'); this.reducedMotion = this.media.matches;
    this.media.addEventListener('change', e => { this.reducedMotion = e.matches; }, { signal: this.abort.signal }); this.render();
  }
  setup(source) {
    this.releaseInputs(); this.active = true; this.source = source; this.phase = 'loading'; this.game.reset(); this.signal.reset(); this.inputBridge.reset();
    this.keys.clear(); this.manualPause = false; this.backgroundPause = document.hidden; this.inputLost = false; this.lostFor = 0;
    this.motion = null; this.packet = null; this.pendingBite = false; this.open = false; this.ending = 0; this.countdown = 2.4;
    this.demoTarget = { x: .5, y: .43 }; this.notice = null; this.photo = null; this.photoRequested = false; this.creatorResult = null;
    this.capture.width = 540; this.capture.height = 960; this.audio.arm();
    if (this.options.creator) this.recorder = new FishRecorder(this.options.faceMode);
    if (!this.runtime) { this.scene = new HumanFishScene(this, { inputBridge: this.inputBridge, gameEvents: this.gameEvents, reducedMotion: this.reducedMotion }); this.runtime = new PhaserRuntime(this.$('.hf-phaser-host'), this.scene, { width: 480, height: 854 }); }
    else this.runtime.restart();
    this.runtime.game.loop.wake(); this.render(); window.scrollTo(0, 0);
  }
  startDemo() { if (!this.abort || this.abort.signal.aborted) this.activate(); this.setup('demo'); this.phase = 'countdown'; this.render(); }
  async startCamera() {
    if (!this.abort || this.abort.signal.aborted) this.activate(); this.setup('camera'); const token = this.generation;
    try { await this.input.start(); if (token !== this.generation || !this.active) return; this.phase = 'calibration'; this.render(); }
    catch (e) { if (token === this.generation && e.name !== 'AbortError') this.fail(e); }
  }
  fail(error) { this.error = error; this.phase = 'error'; this.inputLost = true; this.audio.pause(true); this.render(); }
  pointer(e) {
    const rect = this.$('.hf-stage').getBoundingClientRect();
    this.demoTarget = { x: (e.clientX - rect.left) / rect.width, y: (e.clientY - rect.top) / rect.height };
  }
  pause(value = !this.manualPause) { if (!['playing', 'countdown', 'calibration'].includes(this.phase)) return; this.manualPause = value; this.pendingBite = false; this.keys.clear(); this.audio.pause(this.isPaused); this.render(); }
  loop(time, dt) {
    if (!this.active || this.phase === 'result' || this.phase === 'idle' || this.phase === 'loading') return;
    const fresh = this.source === 'demo' || (this.motion?.tracked && time - (this.packet?.at ?? -Infinity) <= 200);
    if (this.source === 'camera' && ['playing', 'calibration', 'countdown'].includes(this.phase)) {
      if (!fresh) { this.signal.lost(); this.pendingBite = false; this.open = false; this.lostFor += dt; }
      else this.lostFor = 0;
      this.inputLost = this.lostFor >= .5;
    }
    if (this.isPaused) { this.audio.pause(true); this.render(); return; }
    this.audio.pause(false);
    if (this.phase === 'calibration' && this.motion?.ready && fresh) { this.phase = 'countdown'; this.render(); }
    if (this.phase === 'countdown') {
      if (fresh) this.countdown -= dt;
      if (this.countdown <= 0) { this.phase = 'playing'; this.pendingBite = false; this.signal.lost(); this.game.start(); this.$('.hf-stage').focus({ preventScroll: true }); this.render(); }
    } else if (this.phase === 'playing') {
      if (this.source === 'demo') {
        const dx = Number(this.keys.has('ArrowRight') || this.keys.has('KeyD')) - Number(this.keys.has('ArrowLeft') || this.keys.has('KeyA'));
        const dy = Number(this.keys.has('ArrowDown') || this.keys.has('KeyS')) - Number(this.keys.has('ArrowUp') || this.keys.has('KeyW'));
        if (dx || dy) this.demoTarget = { x: this.game.player.x + dx * .8 * dt, y: this.game.player.y + dy * .7 * dt };
      }
      const target = fresh ? this.source === 'demo' ? this.demoTarget : this.motion?.target : null;
      this.open = fresh && !!this.motion?.open;
      this.game.step(dt, { target, bite: fresh && this.pendingBite }); this.pendingBite = false;
      this.audio.muffled = this.game.oxygen <= 5;
      if (this.game.result) { this.phase = 'ending'; this.keys.clear(); this.pendingBite = false; }
    } else if (this.phase === 'ending') {
      this.ending += dt;
      if (this.ending >= 1.8 && !this.finishing) { this.finishing = true; void this.finish(); }
    }
    for (const e of this.game.drainEvents()) this.handleEvent(e);
    this.updateHud();
    if (time - (this.lastRender || 0) > 100) { this.lastRender = time; this.render(); }
  }
  handleEvent(e) {
    this.audio.play(e); this.recorder?.event(e);
    if (e.type === 'START') this.gameEvents.emit('GAME_START');
    if (e.type === 'EAT') { this.gameEvents.emit('HIT', e); this.gameEvents.emit('SCORE', { ...e, score: this.game.score }); }
    if (['BREATH', 'CAT_HIT', 'DROWN', 'CLEAR'].includes(e.type)) this.gameEvents.emit('HIGHLIGHT', { ...e, kind: e.type });
    const labels = {
      BREATH: 'PUHAAAA!!', CAT_WARNING: this.ja ? '猫の手が来る！ 横によけて！' : 'PAW INCOMING! MOVE SIDEWAYS!',
      CAT_HIT: this.ja ? 'お前！！' : 'HEY, YOU!!', TEMPT: 'BONUS SHRIMP!',
      TREASURE: `${e.kind === 'giant' ? 'GIANT PEARL' : e.kind === 'gold' ? 'GOLDEN FOOD' : 'PEARL'} +${e.points}`,
      LOW: this.ja ? '水面へ！ 口を開けろ！' : 'SURFACE! OPEN YOUR MOUTH!',
      DROWN: this.ja ? 'ぷかー……' : 'FLOATING AWAY…', CLEAR: this.ja ? '生き延びた。' : 'STILL ALIVE.',
      EAT: `+${e.points}`, EMPTY: this.ja ? 'もう少し近づいてパクッ' : 'GET CLOSER, THEN BITE',
    };
    if (labels[e.type]) this.notice = { text: labels[e.type], at: e.at, duration: e.type === 'EAT' ? .65 : e.type === 'EMPTY' ? .8 : 1.65 };
  }
  updateHud() {
    const g = this.game, oxygen = Math.ceil(g.oxygen), surface = g.atSurface;
    this.$('.hf-time').textContent = Math.max(0, DURATION - g.elapsed).toFixed(1);
    this.$('.hf-score').textContent = g.score; this.$('.hf-o2-value').textContent = `O₂ ${oxygen}%`;
    this.$('.hf-o2-track i').style.width = `${g.oxygen}%`; this.$('.hf-o2').dataset.danger = oxygen <= 20;
    this.$('.hf-depth').textContent = `${this.ja ? '水深' : 'DEPTH'} ${Math.round(Math.max(0, (g.player.y - .155) / .745) * 100)}%`;
    this.$('.hf-action').textContent = surface ? this.ja ? '水面：口を開けて、ぷはっ！' : 'SURFACE: OPEN YOUR MOUTH TO BREATHE' : this.ja ? '水中：エサに近づいて、パクッ' : 'UNDERWATER: GET CLOSE, THEN BITE';
  }
  afterRender() {
    if (!this.active || !this.runtime || !this.sceneReady || !['playing', 'ending'].includes(this.phase) || this.isPaused) return;
    const clock = this.game.elapsed + this.ending;
    if (!this.photoRequested && !this.photoPending && clock - (this.lastCapture ?? -100) < .125) return;
    this.lastCapture = clock;
    const c = this.capture.getContext('2d'), g = this.game; c.drawImage(this.runtime.canvas, 0, 0, 540, 960);
    c.fillStyle = '#063c44bb'; c.fillRect(15, 18, 510, 75); c.fillStyle = '#fff6d9'; c.font = 'bold 23px sans-serif'; c.textAlign = 'left';
    c.fillText(`O₂ ${Math.ceil(g.oxygen)}%`, 34, 48); c.textAlign = 'right'; c.fillText(`${Math.max(0, DURATION - g.elapsed).toFixed(1)} SEC · ${g.score} PT`, 507, 48);
    c.textAlign = 'center'; c.font = 'bold 14px sans-serif'; c.fillText('HUMAN FISH / EXP-059', 270, 78);
    this.recorder?.capture(this.capture, clock);
    if (this.photoRequested || (!this.photoPending && clock - (this.lastPhotoAt ?? -100) > 2)) {
      const requested = this.photoRequested; this.photoRequested = false; this.lastPhotoAt = clock; this.photoPending = true; const token = this.generation;
      this.capture.toBlob(blob => {
        this.photoPending = false; if (!blob || token !== this.generation || !this.active) return;
        this.photo = blob;
        if (requested) { const url = URL.createObjectURL(blob), a = document.createElement('a'); a.href = url; a.download = 'todays-human-fish.png'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); this.$('.hf-live').textContent = this.ja ? '今日の人面魚を保存しました。' : 'Today’s human fish was saved.'; }
      }, 'image/png');
    }
  }
  async finish() {
    const token = this.generation;
    if (this.recorder) this.creatorResult = await this.recorder.finish(this.game.result, this.source);
    if (token !== this.generation || !this.active) return;
    this.finishing = false; this.runtime.sleep(); this.input.stop(); this.audio.stop();
    this.gameEvents.emit('GAME_END', { result: this.game.result }); this.phase = 'result'; this.render();
  }
  render() {
    this.$('.hf-source').textContent = this.source === 'demo' ? this.ja ? 'カメラなしの練習' : 'CAMERA-FREE PRACTICE' : 'HUMAN FISH / LIVE';
    this.$('.hf-practice').hidden = this.source !== 'demo'; this.$('.hf-practice p').textContent = this.ja ? '水槽をタップ・ドラッグして泳ぐ。矢印 / WASDでも操作。' : 'Tap / drag to swim. Arrows / WASD also work.';
    this.$('.hf-bite').textContent = this.ja ? 'パクッ / ぷはっ' : 'BITE / BREATHE · SPACE';
    this.$('.hf-se').textContent = `SE ${this.audio.enabled ? 'ON' : 'OFF'}`; this.$('.hf-se').setAttribute('aria-pressed', String(this.audio.enabled));
    this.$('.hf-pause').setAttribute('aria-label', this.ja ? '一時停止' : 'Pause'); this.$('.hf-photo').textContent = this.ja ? '写真' : 'PHOTO';
    this.$('.hf-photo').disabled = !['playing', 'ending'].includes(this.phase) || this.isPaused;
    const overlay = this.$('.hf-overlay'), h = overlay.querySelector('h2'), p = overlay.querySelector('p');
    overlay.hidden = !(['loading', 'calibration', 'countdown', 'error'].includes(this.phase) || this.manualPause || this.backgroundPause);
    this.$('.hf-resume').hidden = !this.manualPause; this.$('.hf-resume').textContent = this.ja ? '泳ぎを再開' : 'RESUME';
    this.$('.hf-camera-retry').hidden = this.phase !== 'error'; this.$('.hf-camera-retry').textContent = this.ja ? 'カメラを再接続' : 'RECONNECT CAMERA';
    this.$('.hf-fallback').hidden = this.phase !== 'error'; this.$('.hf-fallback').textContent = this.ja ? 'タップで練習' : 'PRACTICE WITH TOUCH';
    if (this.manualPause || this.backgroundPause) { h.textContent = 'PAUSED'; p.textContent = this.ja ? '酸素も時間も止まっています。' : 'Oxygen and time are paused.'; }
    else if (this.phase === 'loading') { h.textContent = 'ENTERING THE AQUARIUM'; p.textContent = this.ja ? 'カメラと顔認識を準備しています…' : 'Preparing your camera and face tracking…'; }
    else if (this.phase === 'calibration') { h.textContent = this.ja ? '正面を向いて、ひと呼吸。' : 'LOOK STRAIGHT AHEAD.'; p.textContent = this.ja ? '顔を中央に。約1秒静止すると始まります。' : 'Keep one face centered and still for about a second.'; }
    else if (this.phase === 'countdown') { h.textContent = String(Math.max(1, Math.ceil(this.countdown / .8))); p.textContent = this.ja ? '顔で泳ぐ。口でパクッ。水面でぷはっ！' : 'MOVE YOUR FACE. BITE. BREATHE AT THE SURFACE.'; }
    else if (this.phase === 'error') { h.textContent = this.ja ? 'カメラを確認してください。' : 'CHECK YOUR CAMERA.'; p.textContent = this.ja ? 'カメラの許可を確認するか、タップで遊べます。' : 'Check camera permission, or play with touch.'; }
    this.$('.hf-tracking').hidden = !this.inputLost || this.phase === 'error';
    this.$('.hf-tracking').textContent = this.ja ? '顔を中央へ。酸素と時間を止めています。' : 'Bring one face back. Oxygen and time are paused.';
    this.updateHud(); this.notify();
  }
  releaseInputs() { ++this.generation; this.input?.stop(); this.audio.stop(); this.recorder?.dispose(); this.recorder = null; this.pendingBite = false; this.packet = null; this.signal.lost(); this.finishing = false; this.lastCapture = null; this.lastPhotoAt = null; }
  deactivate({ retainRenderer = false } = {}) {
    this.active = false; this.abort?.abort(); this.releaseInputs(); this.keys.clear();
    if (retainRenderer) this.runtime?.sleep(); else { this.runtime?.destroy(); this.runtime = null; this.scene = null; }
    this.phase = 'idle'; this.creatorResult = null; this.photo = null;
  }
}
