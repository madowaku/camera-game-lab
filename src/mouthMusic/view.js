import { NoteEaterInput } from '../input/noteEaterInput.js';
import { projectMouth } from '../input/mouthPosition.js';
import { MouthMusicGame, SHAPES, clamp, musicStage, sectionAt } from './core.js';
import { MouthMusicAudio } from './audio.js';
import './style.css';

export const copy = locale => locale === 'ja' ? {
  tagline: 'パクッ。きみの口が、楽器になる。', instruction: '口を閉じて待ち、音の粒が集まったらパクッ。',
  practice: 'カメラなしの練習', camera: 'カメラ', pause: '一時停止', resume: 'つづける',
  missing: '顔と口をカメラに映して、口を閉じてね。', multiple: 'ひとりだけ映してね。',
  loading: 'カメラと音を準備中…', error: 'カメラか音を開始できませんでした。再試行するか、練習を選んでください。',
  retry: 'もう一度カメラを開始', demo: '練習で遊ぶ', bite: 'パクッ！', close: '一度、口を閉じてね。',
  paused: '一時停止中', background: 'つづけるを押して、音と演奏を再開。',
  hint: 'タップかSpaceでパクッ。ドラッグ・矢印で口を移動。',
  board: '飛んでくる5種類の音の粒を、口を開けて食べる演奏場', again: '▶ PLAY AGAIN', next: '次のゲーム', share: '共有',
  layers: ['小さなビート', 'ベースが仲間入り', 'ハイハットが仲間入り', 'ハーモニーが仲間入り', 'SPARKLE MODE'],
  phases: ['まずは、ひと口。', 'きみのメロディ。', 'まとめてパクッ！', 'FINALE!'],
} : {
  tagline: 'Take a bite. Your mouth is the instrument.', instruction: 'Close your mouth, wait for the shapes, then open wide.',
  practice: 'Camera-free practice', camera: 'CAMERA', pause: 'PAUSE', resume: 'RESUME',
  missing: 'Show your face and mouth. Close your mouth to get ready.', multiple: 'One face at a time, please.',
  loading: 'Getting camera and sound ready…', error: 'Camera or audio could not start. Try again or choose practice.',
  retry: 'Try camera again', demo: 'Play practice', bite: 'BITE!', close: 'Close your mouth once to rearm.',
  paused: 'PAUSED', background: 'Press RESUME to bring your music back.',
  hint: 'Tap or Space to bite. Drag or use arrows to move your mouth.',
  board: 'Open your mouth to eat five shapes and make music', again: '▶ PLAY AGAIN', next: 'NEXT GAME', share: 'SHARE',
  layers: ['A little beat', 'Bass joins in', 'Hi-hat joins in', 'Harmony joins in', 'SPARKLE MODE'],
  phases: ['One little bite.', 'Your melody.', 'Catch a chord!', 'FINALE!'],
};

class MusicInput extends NoteEaterInput {
  get cameraConstraints() { return { audio: false, video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } } }; }
  inferFrame(now) {
    const start = performance.now(), result = super.inferFrame(now);
    if (result !== undefined) this.inferenceMs = performance.now() - start;
    return result;
  }
}

export function createView(root, locale = 'ja') { return new MouthMusicView(root, locale); }
export class MouthMusicView {
  constructor(root, locale) {
    this.root = root; this.locale = locale; this.active = false; this.phase = 'idle'; this.generation = 0;
    this.listeners = new Set(); this.keys = new Set(); this.audio = new MouthMusicAudio();
    this.game = new MouthMusicGame(); this.sound = true; this.backing = true; this.source = 'demo'; this.musicMode = 'music';
    this.debug = new URLSearchParams(location.search).get('debug') === '1';
    if (import.meta.env.DEV && this.debug) root.__mouthMusic = this;
    root.innerHTML = `<section class="mm-view"><div class="mm-toolbar"><span>TECH-003 / MOUTH MUSIC</span><select class="mm-mode" aria-label="Music comparison"><option value="music">MUSIC</option><option value="se">SIMPLE SE</option></select><button class="mm-sound" type="button"></button><button class="mm-backing" type="button"></button><button class="mm-pause" type="button"></button></div>
      <div class="mm-hud"><span class="mm-source"></span><strong class="mm-time">30 s</strong></div>
      <div class="mm-stage" tabindex="0" role="group"><video muted playsinline></video><canvas aria-hidden="true"></canvas><div class="mm-overlay" role="status" aria-live="polite" hidden></div><div class="mm-cue" role="status" aria-live="polite"></div></div>
      <div class="mm-music"><span class="mm-layer"></span><span class="mm-count"></span><progress max="20" value="0" aria-label="Music growth"></progress></div>
      <button type="button" class="mm-bite" hidden></button><p class="mm-hint"></p>
      <div class="mm-recovery" hidden><button type="button" class="mm-camera"></button><button type="button" class="mm-demo"></button></div>
      <button class="mm-debug-toggle" type="button" aria-expanded="false">PERFORMANCE</button><pre class="mm-debug" hidden></pre></section>`;
    this.$ = selector => root.querySelector(selector); this.stage = this.$('.mm-stage'); this.video = this.$('video'); this.canvas = this.$('canvas');
    this.input = new MusicInput(this.video, { onFrame: raw => {
      if (!this.active || this.source !== 'camera') return;
      if (Number.isFinite(raw.at)) {
        const interval = raw.at - (this.raw?.at ?? raw.at);
        if (interval > 0 && interval < 300) this.inputInterval = this.inputInterval ? this.inputInterval * .8 + interval * .2 : interval;
      }
      this.raw = raw;
    }, onStatus: (status, error) => { if (this.active && this.source === 'camera' && status === 'ERROR') this.fail(error); } });
    this.render();
  }
  get t() { return copy(this.locale); }
  subscribe(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  notify() { this.listeners.forEach(fn => fn(this.snapshot())); }
  snapshot() { return { phase: this.phase, source: this.source, result: this.phase === 'result' ? this.game.result : null }; }
  setLocale(locale) { this.locale = locale; this.render(); }
  activate() { this.active = true; this.phase = 'idle'; this.render(); }
  setup(source) {
    this.releaseInputs(); this.active = true; this.source = source; this.phase = 'loading'; this.raw = null;
    this.game = new MouthMusicGame(); this.cursor = { x: .5, y: .58 }; this.userPaused = false;
    this.backgroundPaused = document.hidden; this.inputLost = false; this.audioInterrupted = false;
    this.effects = []; this.cue = null; this.pulseUntil = 0; this.lastTick = performance.now();
    this.renderInterval = 0; this.inputInterval = 0; this.dispatchMs = null; this.frameMs = 0;
    this.audio.setEnabled(this.sound); this.audio.setBacking(this.backing); this.audio.setMode(this.musicMode);
    this.comparisonChanges = 0; this.bind(); this.render(); this.notify();
    return this.generation;
  }
  async startCamera() { await this.start('camera'); }
  async startDemo() { await this.start('demo'); }
  async start(source) {
    const token = this.setup(source);
    try {
      // Unlock audio in the same PLAY event, before awaiting camera permission.
      const audio = this.audio.enable();
      const camera = source === 'camera' ? this.input.start() : Promise.resolve();
      const [enabled] = await Promise.all([audio, camera]);
      if (!this.active || token !== this.generation || !enabled) return;
      this.phase = 'countdown'; this.lastTick = performance.now(); this.render(); this.notify();
      this.raf = requestAnimationFrame(this.tick); this.stage.focus({ preventScroll: true });
    } catch (error) { if (token === this.generation && error.name !== 'AbortError') this.fail(error); }
  }
  bind() {
    this.abort?.abort(); this.abort = new AbortController(); const signal = this.abort.signal;
    const move = e => { const r = this.stage.getBoundingClientRect(); this.cursor = { x: clamp((e.clientX - r.left) / r.width, .08, .92), y: clamp((e.clientY - r.top) / r.height, .12, .9) }; };
    this.stage.addEventListener('pointerdown', e => {
      if (this.source !== 'demo' || this.game.paused || e.button > 0) return;
      e.preventDefault(); this.stage.focus({ preventScroll: true }); this.stage.setPointerCapture(e.pointerId);
      this.pointer = { id: e.pointerId, x: e.clientX, y: e.clientY, moved: false }; move(e);
    }, { signal });
    this.stage.addEventListener('pointermove', e => {
      if (this.source !== 'demo' || this.game.paused || this.pointer?.id !== e.pointerId) return;
      this.pointer.moved ||= Math.hypot(e.clientX - this.pointer.x, e.clientY - this.pointer.y) > 8; move(e);
    }, { signal });
    this.stage.addEventListener('pointerup', () => { if (this.pointer && !this.pointer.moved) this.bite(); this.pointer = null; }, { signal });
    this.stage.addEventListener('pointercancel', () => { this.pointer = null; }, { signal });
    window.addEventListener('keydown', e => {
      if (this.source !== 'demo' || e.target.closest('button,a,input,textarea,select') || !['Space', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.code)) return;
      e.preventDefault(); if (!this.game.paused) this.keys.add(e.code);
    }, { signal });
    window.addEventListener('keyup', e => this.keys.delete(e.code), { signal });
    const background = () => { this.backgroundPaused = true; this.keys.clear(); this.pointer = null; this.pulseUntil = 0; this.game.disarm(); };
    window.addEventListener('blur', background, { signal });
    document.addEventListener('visibilitychange', () => { if (document.hidden) background(); }, { signal });
    this.$('.mm-pause').addEventListener('click', () => void this.togglePause(), { signal });
    this.$('.mm-sound').addEventListener('click', () => { this.sound = !this.sound; this.comparisonChanges++; this.audio.setEnabled(this.sound); this.render(); }, { signal });
    this.$('.mm-backing').addEventListener('click', () => { this.backing = !this.backing; this.comparisonChanges++; this.audio.setBacking(this.backing); this.render(); }, { signal });
    this.$('.mm-mode').addEventListener('change', e => { this.musicMode = e.target.value; this.comparisonChanges++; this.audio.setMode(this.musicMode); this.render(); }, { signal });
    this.$('.mm-bite').addEventListener('click', () => this.bite(), { signal });
    this.$('.mm-camera').addEventListener('click', () => void this.startCamera(), { signal });
    this.$('.mm-demo').addEventListener('click', () => void this.startDemo(), { signal });
    this.$('.mm-debug-toggle').addEventListener('click', () => { this.debug = !this.debug; this.render(); }, { signal });
  }
  bite() { if (this.source === 'demo' && !this.game.paused && !this.pulseUntil) this.pulseUntil = performance.now() + 95; }
  async togglePause() {
    if (!['playing', 'countdown'].includes(this.phase)) return;
    if (!this.game.paused) { this.userPaused = true; this.keys.clear(); this.pulseUntil = 0; this.game.disarm(); return; }
    const token = this.generation;
    try {
      await this.audio.resume(); if (!this.active || token !== this.generation) return;
      this.userPaused = false; this.backgroundPaused = false; this.audioInterrupted = false;
      this.game.disarm(); this.lastTick = performance.now();
    } catch (error) { if (token === this.generation) this.fail(error); }
  }
  sample(now, dt) {
    if (this.source === 'demo') {
      if (now >= this.pulseUntil) this.pulseUntil = 0;
      const amount = Math.min(dt, 100) / 1000 * .45;
      this.cursor.x = clamp(this.cursor.x + (Number(this.keys.has('ArrowRight')) - Number(this.keys.has('ArrowLeft'))) * amount, .08, .92);
      this.cursor.y = clamp(this.cursor.y + (Number(this.keys.has('ArrowDown')) - Number(this.keys.has('ArrowUp'))) * amount / this.game.aspect, .12, .9);
      return { mouth: this.cursor, state: this.keys.has('Space') || this.pulseUntil ? 'OPEN' : 'CLOSED', at: now };
    }
    const raw = this.raw;
    if (!raw?.mouth || now - raw.at > 300) return { state: 'UNKNOWN' };
    const mouth = projectMouth(raw.mouth, this.video.videoWidth, this.video.videoHeight, this.stage.clientWidth, this.stage.clientHeight);
    return mouth ? { mouth, state: raw.state, at: raw.at } : { state: 'UNKNOWN' };
  }
  tick = now => {
    if (!this.active || !['playing', 'countdown'].includes(this.phase)) return;
    const started = performance.now(), dt = now - this.lastTick; this.lastTick = now;
    this.renderInterval = this.renderInterval ? this.renderInterval * .9 + dt * .1 : dt;
    this.game.aspect = this.stage.clientHeight / Math.max(1, this.stage.clientWidth);
    const sample = this.sample(now, this.game.paused ? 0 : dt);
    this.currentSample = sample; this.inputLost = sample.state === 'UNKNOWN';
    this.audioInterrupted = this.audio.metrics().state !== 'running';
    const paused = this.userPaused || this.backgroundPaused || this.inputLost || this.audioInterrupted;
    const wasPaused = this.game.paused; this.game.setPaused(paused);
    if (paused && !wasPaused) this.audio.pause();
    if (!paused && wasPaused && this.phase === 'playing') this.audio.startBacking(() => this.game.combo);
    this.game.step(dt, sample); const previous = this.phase; this.phase = this.game.phase;
    for (const e of this.game.events) {
      if (e.type === 'start') this.audio.startBacking(() => this.game.combo);
      if (e.type === 'bite') {
        const dispatched = this.audio.note(e.types, e.stage);
        this.dispatchMs = dispatched === null ? null : Math.max(0, dispatched - sample.at);
        this.effects.push(e); this.cue = e;
      }
    }
    this.effects = this.effects.filter(e => this.game.elapsed - e.at < 650).slice(-6);
    this.render(); this.frameMs = performance.now() - started;
    if (this.phase === 'result') {
      this.game.result.performance = { ...this.audio.metrics(), inputFps: this.inputInterval ? 1000 / this.inputInterval : null,
        renderFps: this.renderInterval ? 1000 / this.renderInterval : null, inferenceMs: this.input.inferenceMs ?? null,
        dispatchMs: this.dispatchMs, frameMs: this.frameMs, sound: this.sound, backing: this.backing,
        mode: this.musicMode, comparisonChanges: this.comparisonChanges };
      this.audio.pause(); this.notify(); return;
    }
    if (previous !== this.phase) this.notify();
    this.raf = requestAnimationFrame(this.tick);
  };
  fail(error) { this.releaseInputs(); this.error = error; this.phase = 'error'; this.bind(); this.render(); this.notify(); }
  releaseInputs() {
    ++this.generation; cancelAnimationFrame(this.raf); this.raf = null; this.abort?.abort();
    this.keys.clear(); this.input.stop(); this.audio.dispose(); this.raw = null;
  }
  deactivate() { this.active = false; this.releaseInputs(); this.effects = []; this.game = new MouthMusicGame(); this.phase = 'idle'; }
  render() {
    const t = this.t, g = this.game, text = (selector, value) => { const el = this.$(selector); if (el.textContent !== String(value)) el.textContent = value; };
    const ja = this.locale === 'ja';
    text('.mm-sound', `SOUND ${this.sound ? 'ON' : 'OFF'}`); this.$('.mm-sound').setAttribute('aria-pressed', String(this.sound));
    text('.mm-backing', `BACKING ${this.backing ? 'ON' : 'OFF'}`); this.$('.mm-backing').setAttribute('aria-pressed', String(this.backing));
    this.$('.mm-mode').value = this.musicMode;
    text('.mm-pause', g.paused ? t.resume : t.pause); this.$('.mm-pause').disabled = !['playing', 'countdown'].includes(this.phase);
    text('.mm-source', t[this.source === 'demo' ? 'practice' : 'camera']); text('.mm-time', `${Math.ceil((30000 - g.elapsed) / 1000)} s`);
    text('.mm-layer', t.layers[musicStage(g.combo)]); text('.mm-count', `${g.eaten} NOTES · ${g.chords} CHORDS`);
    this.$('progress').value = g.combo; this.video.hidden = this.source !== 'camera';
    this.stage.setAttribute('aria-label', t.board); this.stage.classList.toggle('mm-practice', this.source === 'demo');
    const overlay = this.phase === 'loading' ? t.loading : this.phase === 'error' ? t.error
      : this.backgroundPaused || this.audioInterrupted ? t.background : this.userPaused ? t.paused
        : this.inputLost ? t[this.raw?.faces > 1 ? 'multiple' : 'missing'] : '';
    text('.mm-overlay', overlay); this.$('.mm-overlay').hidden = !overlay;
    const cue = this.phase === 'countdown' ? String(3 - Math.min(2, Math.floor(g.countdown / 1000)))
      : this.cue && g.elapsed - this.cue.at < 650 ? this.cue.count >= 3 ? 'TRIAD!' : this.cue.count >= 2 ? 'CHORD!' : 'PAK!'
        : this.currentSample?.state === 'OPEN' ? t.close : t.phases[sectionAt(g.elapsed)];
    text('.mm-cue', cue); this.$('.mm-cue').hidden = !['playing', 'countdown'].includes(this.phase);
    this.$('.mm-bite').hidden = this.source !== 'demo' || !['playing', 'countdown'].includes(this.phase);
    this.$('.mm-bite').disabled = g.paused; text('.mm-bite', t.bite); text('.mm-hint', this.source === 'demo' ? t.hint : t.instruction);
    this.$('.mm-recovery').hidden = this.phase !== 'error'; text('.mm-camera', t.retry); text('.mm-demo', t.demo);
    this.$('.mm-debug').hidden = !this.debug; this.$('.mm-debug-toggle').setAttribute('aria-expanded', String(this.debug));
    if (this.debug) {
      const a = this.audio.metrics(), ms = n => n == null ? 'n/a' : `${n.toFixed(1)} ms`;
      text('.mm-debug', `RENDER ${this.renderInterval ? (1000 / this.renderInterval).toFixed(1) : '—'} FPS · INPUT ${this.source === 'demo' ? 'PRACTICE' : this.inputInterval ? (1000 / this.inputInterval).toFixed(1) : '—'} FPS\nINFERENCE ${ms(this.input.inferenceMs)} · FRAME ${ms(this.frameMs)}\nFRAME → AUDIO ${ms(this.dispatchMs)}\nBASE ${ms(a.baseMs)} · OUTPUT ${ms(a.outputMs)} · ${a.state}\nNOTES ${g.notes.length} / 24 · VOICES ${a.voices} / 12\n${ja ? '数値は処理・APIの参考値。口→耳の実測ではありません。' : 'Processing/API estimates, not measured mouth-to-ear latency.'}`);
    }
    if (['playing', 'countdown'].includes(this.phase)) draw(this);
  }
}

function draw(view) {
  const { canvas, stage, game: g } = view, w = stage.clientWidth, h = stage.clientHeight;
  const dpr = Math.min(devicePixelRatio || 1, 1.5);
  if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) { canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); }
  const c = canvas.getContext('2d'); if (!c || !w || !h) return;
  c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, w, h);
  const colors = ['#ffca78', '#8fe5cb', '#9ccfff', '#ebc0ff', '#ff9db7'];
  for (const n of g.notes) {
    c.fillStyle = colors[n.type]; c.strokeStyle = '#282232'; c.lineWidth = 1.5;
    c.font = `${Math.max(26, w * .075)}px sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.strokeText(SHAPES[n.type], n.x * w, n.y * h); c.fillText(SHAPES[n.type], n.x * w, n.y * h);
  }
  const x = g.mouth.x * w, y = g.mouth.y * h, open = view.currentSample?.state === 'OPEN';
  c.strokeStyle = '#fff6de'; c.lineWidth = 3; c.beginPath(); c.ellipse(x, y, w * .055, w * (open ? .052 : .017), 0, 0, Math.PI * 2); c.stroke();
  if (view.source === 'demo') { c.font = `${w * .11}px sans-serif`; c.fillStyle = '#fff6de'; c.textAlign = 'center'; c.fillText(open ? '◡' : '·', x, y + 1); }
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  for (const e of view.effects) {
    const q = (g.elapsed - e.at) / 650, ex = e.mouth.x * w, ey = e.mouth.y * h;
    c.globalAlpha = 1 - q; c.strokeStyle = '#fff2bc'; c.lineWidth = e.count >= 3 ? 5 : 2;
    c.beginPath(); c.arc(ex, ey, w * (.06 + (reduced ? 0 : q * (e.count >= 3 ? .32 : .16))), 0, Math.PI * 2); c.stroke();
    c.fillStyle = '#fff2bc'; c.font = `${w * .04}px sans-serif`;
    for (let i = 0; i < 6; i++) { const angle = i * Math.PI / 3, r = w * (.09 + (reduced ? 0 : q * .2)); c.fillText('✦', ex + Math.cos(angle) * r, ey + Math.sin(angle) * r); }
  }
  c.globalAlpha = 1;
}
