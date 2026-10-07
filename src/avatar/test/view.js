import { AvatarLayer } from '../AvatarLayer.js';
import { PUPPET_PROFILES } from '../profiles/index.js';
import { MotionDebugHUD } from '../debug/MotionDebugHUD.js';
import { PuppetInput } from '../../input/puppetInput.js';
import { demoMotion } from './demoMotion.js';
import { CreatorMode } from '../../creator/CreatorMode.js';
import './style.css';
const copy = locale => locale === 'ja' ? {
  hint: '首をかしげる。腕を上げる。口を開ける。きみの動きが、人形になる。', practice: 'カメラなしの練習', camera: 'カメラ', pause: '一時停止', resume: 'つづける',
  loading: '人形とカメラを準備中…', missing: '顔と肩が映る位置へ。腕は、見える範囲で動かしてね。', error: 'カメラを開始できませんでした。再試行か、練習を選んでね。', retry: 'カメラを再試行', demo: '練習で動かす',
  controls: '人形の設定・練習操作', lost: '追跡ロストを試す', recover: '追跡を戻す', center: '中央に戻す', finish: 'この動きをリプレイ', paused: '一時停止中', debug: '動きの数値を見る',
  labels: ['左右を向く', '上下を向く', '首をかしげる', '口を開ける', 'まばたき', '左腕を上げる', '右腕を上げる', '左右に動く'],
  fallback: '軽量2Dで動作中', status: 'きみの動きを映してみよう', creator: 'CREATOR · 最後の7秒を端末内で記録', loss: '練習：追跡ロスト中', board: '身体の動きで動く人形のステージ',
} : {
  hint: 'Tilt your head. Raise your arms. Open your mouth. Become a little puppet.', practice: 'Camera-free practice', camera: 'CAMERA', pause: 'PAUSE', resume: 'RESUME',
  loading: 'Getting camera and puppet ready…', missing: 'Show your face and shoulders. Move your arms where the camera can see them.', error: 'Camera could not start. Try again or choose practice.', retry: 'Try camera again', demo: 'Move in practice',
  controls: 'Puppet settings & practice controls', lost: 'Try tracking loss', recover: 'Restore tracking', center: 'Return to center', finish: 'Replay this movement', paused: 'PAUSED', debug: 'Show motion values',
  labels: ['Look sideways', 'Look up / down', 'Tilt head', 'Open mouth', 'Blink', 'Raise left arm', 'Raise right arm', 'Move sideways'],
  fallback: 'Lightweight 2D is active', status: 'Let your body become something else', creator: 'CREATOR · last seven seconds, on your device', loss: 'Practice: tracking is lost', board: 'A puppet stage controlled by your body',
};
const sliders = ['yaw', 'pitch', 'roll', 'mouth', 'blink', 'leftArm', 'rightArm', 'lean'];
export const createView = (root, locale = 'ja') => new PuppetTestView(root, locale);
export class PuppetTestView {
  constructor(root, locale) {
    Object.assign(this, { root, locale, phase: 'idle', active: false, source: 'demo', generation: 0, options: {} }); this.listeners = new Set();
    if (import.meta.env.DEV && new URLSearchParams(location.search).get('debug') === '1') root.__puppetTest = this;
    root.innerHTML = `<section class="puppet-test"><div class="puppet-toolbar"><span class="puppet-source"></span><button type="button" class="puppet-pause"></button></div>
      <div class="puppet-stage" role="group" tabindex="0"><video muted playsinline aria-hidden="true"></video><div class="puppet-world" aria-hidden="true"></div><p class="puppet-stage-label">YOU → MOTION → ANYTHING</p><div class="puppet-overlay" role="status" aria-live="polite" hidden></div><span class="puppet-roar" aria-hidden="true" hidden>GAOO!</span></div>
      <p class="puppet-hint"></p><p class="puppet-status" role="status" aria-live="polite"></p>
      <div class="puppet-recovery" hidden><button type="button" class="puppet-retry"></button><button type="button" class="puppet-demo"></button></div>
      <details class="puppet-settings"><summary></summary><div class="puppet-selects"><label>CHARACTER<select class="puppet-driver"><option value="simple">SIMPLE PUPPET</option><option value="mascot">LITTLE MONSTER</option><option value="vrm">VRM TEST</option><option value="canvas">2D PUPPET</option></select></label>
      <label>PROFILE<select class="puppet-profile">${Object.keys(PUPPET_PROFILES).map(p => `<option>${p}</option>`).join('')}</select></label>
      <label>CAMERA<select class="puppet-camera-mode">${['MIRROR', 'STAGE', 'FULL_REPLACE', 'MINI'].map(p => `<option>${p}</option>`).join('')}</select></label>
      <label>SMOOTHING<select class="puppet-smoothing">${['GAME_FAST', 'GAME_NORMAL', 'CREATOR_SMOOTH'].map(p => `<option>${p}</option>`).join('')}</select></label>
      <label>FACE<select class="puppet-face-mode">${['ORIGINAL', 'EFFECT', 'AVATAR', 'HIDE'].map(p => `<option>${p}</option>`).join('')}</select></label></div>
      <div class="puppet-demo-controls">${sliders.map((id, i) => `<label><span data-motion-label="${i}"></span><input type="range" data-motion="${id}" min="${i < 3 || id === 'lean' ? -1 : 0}" max="1" step=".01" value="0"></label>`).join('')}<button type="button" class="puppet-lost"></button><button type="button" class="puppet-center"></button></div></details>
      <div class="puppet-actions"><button type="button" class="puppet-finish" hidden></button><button type="button" class="puppet-debug-toggle" aria-expanded="false"></button></div>
      <div class="puppet-debug" hidden><select aria-label="Motion debug view"><option>RAW</option><option>NORMALIZED</option><option selected>SMOOTHED</option></select><pre></pre></div><canvas class="puppet-capture" hidden></canvas></section>`;
    this.$ = s => root.querySelector(s); this.video = this.$('video'); this.stage = this.$('.puppet-stage'); this.capture = this.$('.puppet-capture'); this.hud = new MotionDebugHUD(this.$('pre'));
    this.input = new PuppetInput(this.video, { onFrame: (results, at) => { if (this.active && this.source === 'camera') this.avatar?.ingest(results, at); }, onStatus: (status, error) => {
      if (this.active && this.source === 'camera') { if (status === 'ERROR') this.fail(error); else { this.status = status; this.render(); } }
    } }); this.empty = document.createElement('canvas'); this.empty.width = this.empty.height = 1; this.render();
  }
  get t() { return copy(this.locale); }
  subscribe(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  notify() { this.listeners.forEach(fn => fn(this.snapshot())); }
  snapshot() { return { phase: this.phase, source: this.source, paused: !!this.paused, result: this.result }; }
  configure(options = {}) { this.options = { creator: !!options.creator, faceMode: 'AVATAR', driver: 'simple', ...options }; }
  activate() { this.active = true; this.phase = 'idle'; this.render(); }
  setLocale(locale) { this.locale = locale; this.render(); }
  startDemo() { return this.start('demo'); }
  startCamera() { return this.start('camera'); }
  async start(source) {
    this.releaseInputs(); this.active = true; this.source = source; this.phase = 'loading'; this.result = null; this.lost = false; this.paused = false; this.backgroundPaused = document.hidden;
    this.faceMode = this.options.faceMode ?? 'AVATAR'; this.driverName = this.options.driver ?? 'simple';
    this.input.paused = this.backgroundPaused;
    this.profileName = this.driverName === 'mascot' ? 'MONSTER' : 'HUMAN';
    this.$('.puppet-driver').value = this.driverName; this.$('.puppet-profile').value = this.profileName;
    this.$('.puppet-face-mode').value = this.faceMode; this.$('.puppet-smoothing').value = this.options.creator ? 'CREATOR_SMOOTH' : 'GAME_NORMAL';
    this.avatar = new AvatarLayer({ preset: this.$('.puppet-smoothing').value, onQualityChange: level => {
      this.input.setQuality(level);
      if (level === 'LOW' && !['simple', 'canvas'].includes(this.$('.puppet-driver').value)) {
        this.driverName = 'simple'; this.$('.puppet-driver').value = 'simple'; void this.loadDriver();
      }
    }, onError: () => { this.render(); } });
    this.input.quality = 'MEDIUM'; this.elapsed = 0; this.bind(); const token = this.generation;
    if (this.options.creator) this.creator = new CreatorMode(this.capture, { profile: { brand: 'CAMERA PUPPET TEST' }, faceMode: this.faceMode });
    this.render(); this.notify();
    try {
      await Promise.all([this.loadDriver(), source === 'camera' ? this.input.start() : Promise.resolve()]);
      if (!this.active || token !== this.generation) return;
      this.phase = 'playing'; this.last = performance.now(); this.render(); this.notify(); this.raf = requestAnimationFrame(this.tick);
    } catch (error) { if (token === this.generation && error.name !== 'AbortError') this.fail(error); }
  }
  async loadDriver() {
    const avatar = this.avatar; if (!avatar) return;
    await avatar.load({ host: this.$('.puppet-world'), driver: this.$('.puppet-driver').value, profile: PUPPET_PROFILES[this.$('.puppet-profile').value], cameraMode: this.$('.puppet-camera-mode').value });
    if (this.avatar === avatar) this.render();
  }
  bind() {
    this.abort?.abort(); this.abort = new AbortController(); const signal = this.abort.signal;
    this.$('.puppet-pause').addEventListener('click', () => { this.paused = !this.paused; this.input.paused = this.paused || this.backgroundPaused; this.last = performance.now(); this.render(); }, { signal });
    this.$('.puppet-driver').addEventListener('change', () => {
      this.driverName = this.$('.puppet-driver').value; this.profileName = this.driverName === 'mascot' ? 'MONSTER' : 'HUMAN'; this.$('.puppet-profile').value = this.profileName; void this.loadDriver();
    }, { signal });
    for (const selector of ['.puppet-profile', '.puppet-camera-mode']) this.$(selector).addEventListener('change', () => { this.profileName = this.$('.puppet-profile').value; void this.loadDriver(); }, { signal });
    this.$('.puppet-smoothing').addEventListener('change', () => this.avatar.smoother.setPreset(this.$('.puppet-smoothing').value), { signal });
    this.$('.puppet-face-mode').addEventListener('change', () => { this.faceMode = this.$('.puppet-face-mode').value; this.creator?.setFaceMode(this.faceMode); this.render(); }, { signal });
    this.$('.puppet-lost').addEventListener('click', () => { this.lost = !this.lost; this.render(); }, { signal });
    this.$('.puppet-center').addEventListener('click', () => { this.root.querySelectorAll('[data-motion]').forEach(n => n.value = '0'); this.lost = false; this.avatar.reset(); this.render(); }, { signal });
    this.$('.puppet-retry').addEventListener('click', () => void this.startCamera(), { signal }); this.$('.puppet-demo').addEventListener('click', () => void this.startDemo(), { signal });
    this.$('.puppet-finish').addEventListener('click', () => this.finish(), { signal });
    this.$('.puppet-debug-toggle').addEventListener('click', () => { const n = this.$('.puppet-debug'); n.hidden = !n.hidden; this.$('pre').hidden = n.hidden; this.$('.puppet-debug-toggle').setAttribute('aria-expanded', String(!n.hidden)); }, { signal });
    this.$('.puppet-debug select').addEventListener('change', e => this.hud.mode = e.target.value, { signal });
    document.addEventListener('visibilitychange', () => { this.backgroundPaused = document.hidden; this.input.paused = this.paused || this.backgroundPaused; this.last = performance.now(); this.avatar?.reset(); this.render(); }, { signal });
    window.addEventListener('pagehide', () => this.deactivate(), { signal });
  }
  tick = now => {
    if (!this.active || this.phase !== 'playing') return;
    const dt = Math.min(.1, Math.max(0, (now - this.last) / 1000)); this.last = now;
    if (!this.paused && !this.backgroundPaused) {
      if (this.source === 'demo') { this.avatar.normalized = demoMotion(Object.fromEntries([...this.root.querySelectorAll('[data-motion]')].map(n => [n.dataset.motion, n.value])), now, this.lost); }
      this.avatar.setVisible(this.faceMode !== 'HIDE');
      // RAF's timestamp is from before this frame's synchronous inference.
      // Sample with the current clock so a freshly recognized result is not
      // briefly treated as a future/stale observation on each inference frame.
      this.avatar.update(performance.now(), dt); this.elapsed += dt * 1000;
      if (this.creator && this.avatar.canvas) this.creator.compose(this.video, this.faceMode === 'HIDE' ? this.empty : this.avatar.canvas, { time: this.elapsed, source: this.source });
      this.hud.update(this.avatar, now);
    }
    this.render(); this.raf = requestAnimationFrame(this.tick);
  };
  finish() {
    const capture = this.creator?.snapshot();
    const result = { source: this.source, seconds: this.elapsed / 1000, creator: capture ? { ...capture, frames: capture.frames.filter(f => f.at >= this.elapsed - 7000) } : null };
    this.releaseInputs(); this.result = result; this.phase = 'result'; this.render(); this.notify();
  }
  fail(error) { this.releaseInputs(); this.phase = 'error'; this.error = error; this.bind(); this.render(); this.notify(); }
  releaseInputs() { ++this.generation; cancelAnimationFrame(this.raf); this.raf = null; this.abort?.abort(); this.input.stop(); this.avatar?.dispose(); this.avatar = null; this.creator?.dispose(); this.creator = null; }
  deactivate() { this.active = false; this.releaseInputs(); this.result = null; this.phase = 'idle'; }
  render() {
    const t = this.t, set = (s, value) => { const n = this.$(s); if (n.textContent !== value) n.textContent = value; };
    set('.puppet-source', `${this.source === 'demo' ? t.practice : t.camera} · ${this.options.creator ? 'CREATOR' : 'PLAY'}`);
    set('.puppet-pause', this.paused ? t.resume : t.pause); this.$('.puppet-pause').disabled = this.phase !== 'playing'; this.$('.puppet-pause').setAttribute('aria-pressed', String(!!this.paused));
    set('.puppet-hint', t.hint); this.stage.setAttribute('aria-label', t.board);
    const overlay = this.phase === 'loading' ? t.loading : this.phase === 'error' ? t.error : this.paused || this.backgroundPaused ? t.paused : '';
    set('.puppet-overlay', overlay); this.$('.puppet-overlay').hidden = !overlay;
    const tracking = this.avatar?.frame.tracking;
    const status = this.avatar?.backend === 'canvas' ? t.fallback : this.lost ? t.loss : this.source === 'camera' && this.phase === 'playing' && !tracking?.face && !tracking?.pose ? t.missing : this.options.creator ? t.creator : t.status;
    set('.puppet-status', status); set('.puppet-roar', this.profileName === 'BIRD' ? 'PIYO!' : 'GAOO!'); this.$('.puppet-roar').hidden = !(this.driverName === 'mascot' && this.avatar?.frame.face.mouthOpen > .45);
    this.$('.puppet-recovery').hidden = this.phase !== 'error'; set('.puppet-retry', t.retry); set('.puppet-demo', t.demo);
    set('.puppet-settings summary', t.controls); this.root.querySelectorAll('[data-motion-label]').forEach(n => n.textContent = t.labels[Number(n.dataset.motionLabel)]);
    this.$('.puppet-demo-controls').hidden = this.source !== 'demo'; set('.puppet-lost', this.lost ? t.recover : t.lost); set('.puppet-center', t.center);
    this.$('.puppet-finish').hidden = !this.options.creator || this.phase !== 'playing'; this.$('.puppet-finish').disabled = this.elapsed < 1200; set('.puppet-finish', t.finish); set('.puppet-debug-toggle', t.debug);
    // AVATAR and HIDE never display the DOM video, even while loading/recovering.
    this.video.hidden = this.source !== 'camera' || !['ORIGINAL', 'EFFECT'].includes(this.faceMode);
    this.video.style.filter = this.faceMode === 'EFFECT' ? 'saturate(1.7) contrast(1.1)' : '';
  }
}
