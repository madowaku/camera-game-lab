import { HookGame } from './core.js';
import { HookSignal } from './signals.js';
import { HookInput } from './input.js';
import { projectPalm } from '../toyDrum/tracking.js';
import { PhaserRuntime } from '../game-runtime/phaser/PhaserRuntime.js';
import { CameraInputBridge } from '../game-runtime/phaser/input/CameraInputBridge.js';
import { GameEventBus } from '../game-runtime/phaser/events/GameEventBus.js';
import { ThreeVisualSession } from '../visual3d/ThreeVisualSession.js';
import { HookScene } from './scene.js';
import { HookAudio } from './audio.js';
import './hook.css';

export const createView = (root, locale) => new HookView(root, locale);
export class HookView {
  constructor(root, locale) {
    this.root = root; this.locale = locale; this.listeners = new Set(); this.keys = new Set(); this.generation = 0;
    this.phase = 'idle'; this.game = new HookGame(); this.signal = new HookSignal(); this.audio = new HookAudio();
    this.inputBridge = new CameraInputBridge({ staleMs: 200 }); this.gameEvents = new GameEventBus();
    root.innerHTML = `<section class="hook-play"><div class="hook-toolbar"><span class="hook-source"></span><div><button class="hook-locale" type="button">EN</button><button class="hook-se" type="button" aria-pressed="true">SE ON</button><button class="hook-pause" type="button">Ⅱ</button></div></div>
      <div class="hook-stage" tabindex="0" role="group" aria-label="HOOK fishing playfield"><video muted playsinline hidden></video><div class="hook-phaser"></div><div class="hook-three"></div>
      <div class="hook-hud"><div><span>TIME</span><strong class="hook-time">30</strong></div><div><span>CATCHES</span><strong class="hook-count">00</strong></div><div><span>SCORE</span><strong class="hook-score">0</strong></div></div>
      <div class="hook-prompt"><span class="hook-step"></span><strong></strong><p></p></div>
      <div class="hook-fever" hidden>FISH FEVER! <b>+5 SEC</b></div>
      <div class="hook-tension" hidden><div class="hook-tension-labels"><span>LOOSE</span><b>GOOD</b><span>BREAK</span></div><div class="hook-tension-track"><i></i></div><p></p><div class="hook-landing"><span>LANDING</span><div><i></i></div><b></b></div></div>
      <div class="hook-catch" hidden><span></span><strong></strong><p></p><button class="hook-release" type="button" hidden></button></div>
      <div class="hook-overlay" hidden role="status"><h2></h2><p></p><button class="hook-resume" type="button" hidden></button><button class="hook-reconnect" type="button" hidden></button><button class="hook-fallback" type="button" hidden></button></div>
      <div class="hook-tracking" hidden role="status"></div><span class="hook-ocean-label">A LITTLE OCEAN. A BIG FIGHT.</span></div>
      <div class="hook-controls"><button class="hook-action" type="button"></button><div class="hook-pulls" hidden><button data-pull="-0.55" type="button">←</button><span></span><button data-pull="0.55" type="button">→</button></div></div><p class="hook-hint"></p><div class="hook-live" aria-live="polite" role="status"></div></section>`;
    this.$ = s => root.querySelector(s); this.video = this.$('video');
    this.three = new ThreeVisualSession({ host: () => this.$('.hook-three'), name: 'HOOK',
      loadScene: () => import('./landing3d.js').then(m => m.createLandingScene) });
    this.input = new HookInput(this.video, { onFrame: (hands, at) => {
      if (!this.active || this.source !== 'camera' || this.phase === 'error') return;
      const box = this.$('.hook-stage').getBoundingClientRect();
      const palms = hands.map(h => projectPalm(h, this.video.videoWidth / this.video.videoHeight || box.width / box.height, box.width / box.height));
      this.motion = this.signal.sample(palms, at, this.game.phase);
      if (this.motion) { this.lastTracked = at; this.stableSince ??= at; } else this.stableSince = null;
      this.inputBridge.publish({ timestamp: at, leftHand: { visible: !!this.motion, ...this.motion?.hand } });
    }, onStatus: (status, error) => {
      if (!this.active || this.source !== 'camera') return; this.status = status;
      if (status === 'ERROR') this.fail(error); else this.render();
    } });
    root.addEventListener('click', e => {
      if (e.target.closest('.hook-locale')) { document.querySelector('.platform-locale')?.click(); this.$('.hook-stage').focus({ preventScroll: true }); }
      if (e.target.closest('.hook-pause')) this.pause();
      if (e.target.closest('.hook-resume')) { this.pause(false); this.$('.hook-stage').focus({ preventScroll: true }); }
      if (e.target.closest('.hook-se')) { this.audio.enabled = !this.audio.enabled; if (this.audio.enabled) this.audio.arm(); else this.audio.stop(); this.render(); this.$('.hook-stage').focus({ preventScroll: true }); }
      if (e.target.closest('.hook-reconnect')) void this.startCamera();
      if (e.target.closest('.hook-fallback')) this.startDemo();
      if (e.target.closest('.hook-release') && !this.isPaused) { this.game.release(); this.flushEvents(); }
      if (e.target.closest('.hook-action') && !this.isPaused) this.action();
    });
    const stage = this.$('.hook-stage');
    root.addEventListener('pointerdown', e => {
      if (this.isPaused || this.phase !== 'playing') return;
      const button = e.target.closest('[data-pull]');
      if (button && this.source === 'demo') { this.holdPull = Number(button.dataset.pull); this.holdPointer = e.pointerId; button.setPointerCapture(e.pointerId); e.preventDefault(); return; }
      if (!e.target.closest('.hook-stage') || e.target.closest('button')) return;
      stage.focus({ preventScroll: true });
      if (this.game.phase === 'ready') this.action();
      if (this.source === 'demo') { stage.setPointerCapture(e.pointerId); this.drag = { x: e.clientX, y: e.clientY, id: e.pointerId }; }
    });
    root.addEventListener('pointermove', e => {
      if (!this.drag || this.drag.id !== e.pointerId || this.isPaused) return;
      const b = stage.getBoundingClientRect(), dy = (e.clientY - this.drag.y) / b.height;
      if (this.game.phase === 'bite' && dy < -.065) { this.game.hook(); this.flushEvents(); this.render(); this.drag.y = e.clientY; }
      if (this.game.phase === 'fight') this.dragPull = Math.max(-1.5, Math.min(1.5, (e.clientX - this.drag.x) / (b.width * .28)));
    });
    const up = e => { if (e.pointerId === this.holdPointer) { this.holdPull = 0; this.holdPointer = null; } if (e.pointerId === this.drag?.id) { this.drag = null; this.dragPull = 0; } };
    root.addEventListener('pointerup', up); root.addEventListener('pointercancel', up); root.addEventListener('lostpointercapture', up);
  }
  get ja() { return this.locale === 'ja'; }
  get isPaused() { return !!(this.manualPause || this.backgroundPause || this.inputLost || this.phase === 'error'); }
  subscribe(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  snapshot() { return { phase: this.phase, source: this.source, paused: this.isPaused, elapsed: this.game.elapsed,
    musicRate: this.game.fever ? 1.16 : 1, result: this.phase === 'result' ? { ...this.game.result, source: this.source, photo: this.photo } : null }; }
  notify() { this.listeners.forEach(fn => fn(this.snapshot())); }
  setLocale(locale) { this.locale = locale; this.render(); }
  activate() {
    this.active = true; this.phase = 'idle'; this.abort?.abort(); this.abort = new AbortController(); const signal = this.abort.signal;
    window.addEventListener('keydown', e => {
      if (!this.active || e.altKey || e.ctrlKey || e.metaKey || /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
      if (e.code === 'KeyP' && !e.repeat) { e.preventDefault(); this.pause(); return; }
      if (this.source !== 'demo' || e.target.closest('button,a') || this.isPaused) return;
      if (['ArrowLeft','ArrowRight','ArrowUp','KeyA','KeyD','Space','ShiftLeft','ShiftRight'].includes(e.code)) {
        e.preventDefault(); this.keys.add(e.code); if (['Space','ArrowUp'].includes(e.code) && !e.repeat) this.action();
      }
    }, { signal });
    window.addEventListener('keyup', e => this.keys.delete(e.code), { signal });
    window.addEventListener('blur', () => { this.clearControls(); if (['playing','calibration'].includes(this.phase)) this.pause(true); }, { signal });
    document.addEventListener('visibilitychange', () => { this.backgroundPause = document.hidden; if (document.hidden) this.pause(true); this.clearControls(); this.render(); }, { signal });
    this.media = matchMedia('(prefers-reduced-motion: reduce)'); this.reducedMotion = this.media.matches;
    this.media.addEventListener('change', e => { this.reducedMotion = e.matches; }, { signal }); this.render();
  }
  clearControls() { this.keys.clear(); this.pull = 0; this.holdPull = 0; this.dragPull = 0; this.drag = null; this.signal.clearMotion(); }
  setup(source) {
    this.releaseInputs(); this.active = true; this.source = source; this.phase = 'loading'; this.game.reset(); this.signal.reset(); this.inputBridge.reset(); this.clearControls();
    this.manualPause = false; this.backgroundPause = document.hidden; this.inputLost = false; this.stableSince = null; this.lastTracked = -Infinity;
    this.motion = null; this.photo = null; this.photoFor = 0; this.photoSize = 0; this.photoPending = false; this.error = null;
    this.audio.arm(); this.video.hidden = source !== 'camera';
    if (!this.runtime) { this.scene = new HookScene(this, { inputBridge: this.inputBridge, gameEvents: this.gameEvents }); this.runtime = new PhaserRuntime(this.$('.hook-phaser'), this.scene, { width: 480, height: 854 }); }
    else this.runtime.restart();
    this.runtime.game.loop.wake(); void this.three.start({ className: 'hook-three-canvas', mirror: false });
    window.scrollTo(0, 0); this.render(); this.notify();
  }
  startDemo() { if (!this.abort || this.abort.signal.aborted) this.activate(); this.setup('demo'); this.phase = 'playing'; this.gameEvents.emit('GAME_START', { source: 'demo' }); this.render(); this.$('.hook-stage').focus({ preventScroll: true }); }
  async startCamera() {
    if (!this.abort || this.abort.signal.aborted) this.activate(); this.setup('camera'); const token = this.generation;
    try { await this.input.start(); if (token !== this.generation || !this.active) return; this.phase = 'calibration'; this.stableSince = null; this.render(); }
    catch (e) { if (token === this.generation && e.name !== 'AbortError') this.fail(e); }
  }
  fail(error) { this.error = error; this.phase = 'error'; this.inputLost = true; this.input.stop(); this.audio.pause(true); this.render(); }
  action() {
    if (this.phase !== 'playing' || this.isPaused) return;
    if (this.game.phase === 'ready') this.game.cast(); else if (this.game.phase === 'bite') this.game.hook();
    this.flushEvents(); this.render(); this.$('.hook-stage').focus({ preventScroll: true });
  }
  pause(value = !this.manualPause) {
    if (!['playing','calibration'].includes(this.phase)) return;
    this.manualPause = value; this.clearControls(); this.audio.pause(this.isPaused); this.render();
  }
  loop(time, dt) {
    if (!this.active || !['playing','calibration'].includes(this.phase)) return;
    const fresh = this.source === 'demo' || !!this.motion && time - this.lastTracked <= 200;
    if (this.source === 'camera') {
      if (!fresh) { this.signal.lost(); this.stableSince = null; }
      const recovered = fresh && this.stableSince != null && time - this.stableSince >= 200;
      const lost = !fresh && time - this.lastTracked > 450 || this.inputLost && !recovered;
      if (lost !== this.inputLost) { this.inputLost = lost; this.clearControls(); }
    }
    if (this.phase === 'calibration') {
      if (fresh && this.stableSince != null && time - this.stableSince > 500) {
        this.signal.neutralX = this.motion.hand.x; this.signal.clearMotion(); this.phase = 'playing'; this.gameEvents.emit('GAME_START', { source: 'camera' });
      }
      this.render(); return;
    }
    this.audio.pause(this.isPaused); if (this.isPaused) { this.render(); return; }
    const keyPull = Number(this.keys.has('ArrowRight') || this.keys.has('KeyD')) - Number(this.keys.has('ArrowLeft') || this.keys.has('KeyA'));
    this.pull = this.source === 'camera' ? this.motion?.pull ?? 0 : keyPull * (this.keys.has('ShiftLeft') || this.keys.has('ShiftRight') ? 1.15 : .55) || this.holdPull || this.dragPull || 0;
    if (fresh) { const action = this.signal.consume(); if (action === 'cast') this.game.cast(); if (action === 'hook') this.game.hook(); }
    this.game.step(dt, { pull: this.pull, tracked: fresh }); this.flushEvents();
    if (this.game.result) {
      this.phase = 'result'; this.input.stop(); this.audio.stop(); this.three.stop(); this.runtime.sleep(); this.render();
    }
  }
  flushEvents() {
    for (const e of this.game.drainEvents()) {
      this.audio.play(e);
      if (e.type === 'BITE') { this.signal.clearMotion(); this.gameEvents.emit('HIT', { x: .5, y: .65 }); if (!this.reducedMotion) navigator.vibrate?.([35, 25, 55]); }
      if (e.type === 'HOOK') this.gameEvents.emit('HIT', { x: .5, y: .65 });
      if (e.type === 'LANDING' || e.type === 'CATCH') this.gameEvents.emit('HIGHLIGHT', { kind: e.type });
      if (e.type === 'CATCH') this.gameEvents.emit('SCORE', { score: this.game.score, amount: e.fish.points });
      if (e.type === 'FEVER') this.gameEvents.emit('FEVER', { bonus: 5 });
      if (e.type === 'MISS') this.gameEvents.emit('MISS', { reason: e.reason });
      if (e.type === 'END') this.gameEvents.emit('GAME_END', { result: e.result });
      if (e.type === 'RELEASE') { try { localStorage.setItem('camera-game-lab-hook-colleague-v1', 'true'); } catch {} this.$('.hook-live').textContent = this.ja ? '実績「同業者」を解除。' : 'Achievement unlocked: COLLEAGUE.'; }
    }
  }
  afterRender() {
    if (!this.active || this.phase !== 'playing' || this.game.phase !== 'catch' || this.game.age < .18 || this.photoPending || this.photoFor === this.game.catches.length || this.isPaused) return;
    this.photoFor = this.game.catches.length;
    if (this.game.lastCatch.size < this.photoSize) return;
    this.photoSize = this.game.lastCatch.size;
    this.photoPending = true; const token = this.generation;
    const canvas = document.createElement('canvas'); canvas.width = 540; canvas.height = 960; const c = canvas.getContext('2d');
    c.fillStyle = '#d9f3e9'; c.fillRect(0,0,540,960);
    if (this.source === 'camera' && this.video.readyState >= 2) {
      const vw = this.video.videoWidth, vh = this.video.videoHeight, fit = Math.max(540/vw,960/vh), dw = vw*fit, dh = vh*fit;
      c.save(); c.translate(540,0); c.scale(-1,1); c.drawImage(this.video,(540-dw)/2,(960-dh)/2,dw,dh); c.restore();
    }
    c.drawImage(this.runtime.canvas,0,0,540,960); c.fillStyle = '#123b43'; c.fillRect(24,30,492,76);
    c.fillStyle = '#fff6d9'; c.font = 'bold 28px sans-serif'; c.textAlign = 'center'; c.fillText('HOOK! / BIG CATCH',270,62);
    c.font = 'bold 19px sans-serif'; c.fillText(`${this.game.lastCatch.id} · ${this.game.lastCatch.size} CM · +${this.game.lastCatch.points}`,270,91);
    canvas.toBlob(blob => { if (token === this.generation && this.active) { this.photoPending = false; if (blob) this.photo = blob; } },'image/png');
  }
  render() {
    const g = this.game, ja = this.ja;
    this.$('.hook-source').textContent = this.source === 'demo' ? ja ? 'カメラなしの練習' : 'CAMERA-FREE PRACTICE' : 'HOOK! / LIVE CAMERA';
    this.$('.hook-locale').textContent = ja ? 'EN' : 'JA'; this.$('.hook-locale').setAttribute('aria-label', ja ? 'Switch to English' : '日本語に切り替え');
    this.$('.hook-se').textContent = `SE ${this.audio.enabled ? 'ON' : 'OFF'}`; this.$('.hook-se').setAttribute('aria-pressed', String(this.audio.enabled));
    this.$('.hook-pause').setAttribute('aria-label', ja ? '一時停止' : 'Pause');
    this.$('.hook-time').textContent = Math.ceil(g.remaining); this.$('.hook-count').textContent = String(g.catches.length).padStart(2,'0'); this.$('.hook-score').textContent = g.score.toLocaleString('en-US');
    const fishRight = g.direction > 0, arrow = fishRight ? '←' : '→';
    const prompts = {
      ready: ['01 / CAST', 'CAST!', ja ? '手をシュッと振る。タップでもOK。' : 'Swing your hand. A tap works too.'],
      cast: ['INCOMING', 'NICE CAST.', ja ? 'ルアーが飛んでいく。' : 'A little lure. A big possibility.'],
      wait: ['02 / WATCH THE FLOAT', 'WAIT…', ja ? 'まだ引かない。赤いウキを見て。' : 'Not yet. Watch the red float.'],
      bite: ['03 / HANDS UP!', 'HIT!!', ja ? '今！ 手を上へ引き上げる！' : 'NOW! Pull your hand UP!'],
      fight: [g.behavior === 'warning' ? 'WATCH THE FISH' : g.behavior === 'tired' ? 'IT’S GETTING TIRED' : '04 / PULL THE OTHER WAY', `${arrow} PULL!`, ja ? `魚は${fishRight ? '右' : '左'}へ。手は${fishRight ? '左' : '右'}へ！` : `FISH ${fishRight ? 'RIGHT' : 'LEFT'}. PULL ${fishRight ? 'LEFT' : 'RIGHT'}!`],
      landing: ['THE BIG MOMENT', 'SPLAAASH!', ja ? 'その魚、いただき！' : 'HERE COMES YOUR CATCH!'],
      catch: ['05 / YOUR TROPHY', 'BIG CATCH!', ''],
      miss: ['ONE MORE CAST', g.reason === 'break' ? 'SNAP!' : g.reason === 'loose' ? 'SLIPPED!' : 'MISS…', ja ? g.reason === 'break' ? '引きすぎ！ もう少しやさしく。' : g.reason === 'loose' ? 'ゆるすぎ！ 魚と逆へ引こう。' : 'HIT!!が出たら、手を上へ。' : g.reason === 'break' ? 'Too hard! Ease your pull.' : g.reason === 'loose' ? 'Too loose! Pull against the fish.' : 'Wait for HIT!!, then pull UP.'],
      result: ['SESSION COMPLETE','TIME!', ''],
    };
    const cue = prompts[g.phase] || prompts.ready, prompt = this.$('.hook-prompt');
    this.$('.hook-step').textContent = cue[0]; prompt.querySelector('strong').textContent = g.phase === 'fight' && g.age < .22 ? 'HOOK!!' : cue[1]; prompt.querySelector('p').textContent = cue[2];
    this.$('.hook-stage').dataset.phase = g.phase; this.$('.hook-stage').dataset.source = this.source;
    this.$('.hook-fever').hidden = !g.fever;
    this.$('.hook-tension').hidden = g.phase !== 'fight'; this.$('.hook-tension').dataset.zone = g.tension > .84 ? 'break' : g.tension < .2 ? 'loose' : 'good';
    this.$('.hook-tension-track i').style.left = `${g.tension * 100}%`;
    this.$('.hook-tension p').textContent = ja ? '緑をキープ。引きすぎたら、手を中央へ。' : 'Keep it green. Too tight? Ease toward center.';
    this.$('.hook-landing i').style.width = `${g.landing * 100}%`; this.$('.hook-landing b').textContent = `${Math.round(g.landing * 100)}%`;
    const catcher = this.$('.hook-catch'); catcher.hidden = g.phase !== 'catch';
    if (g.lastCatch) { catcher.querySelector('span').textContent = g.fish?.[ja ? 'ja' : 'en'] || ''; catcher.querySelector('strong').innerHTML = `${g.lastCatch.size}<small>cm</small>`; catcher.querySelector('p').textContent = g.fish?.id === 'HUMAN' ? ja ? '「釣るなよ。」' : '“Don’t fish me.”' : `+${g.lastCatch.points} PT${g.lastCatch.perfect ? ' · PERFECT HOOK' : ''}`; }
    this.$('.hook-release').hidden = g.phase !== 'catch' || g.fish?.id !== 'HUMAN'; this.$('.hook-release').textContent = ja ? '逃がす / 同業者' : 'RELEASE / COLLEAGUE';
    const fight = g.phase === 'fight', action = this.$('.hook-action'); action.hidden = fight; action.disabled = !['ready','bite'].includes(g.phase) || this.isPaused || this.phase !== 'playing';
    action.textContent = g.phase === 'bite' ? ja ? '↑ 合わせる！' : '↑ HOOK NOW!' : ja ? 'CAST / 投げる ↗' : 'CAST YOUR LINE ↗';
    this.$('.hook-pulls').hidden = !fight || this.source !== 'demo'; this.$('.hook-pulls span').textContent = ja ? '矢印を長押し' : 'HOLD THE ARROW';
    this.root.querySelectorAll('[data-pull]').forEach(b => { b.disabled = this.isPaused; b.setAttribute('aria-label', Number(b.dataset.pull) < 0 ? ja ? '左へ引く' : 'Pull left' : ja ? '右へ引く' : 'Pull right'); b.dataset.cue = Number(b.dataset.pull) * g.direction < 0; });
    this.$('.hook-hint').textContent = this.source === 'demo' ? ja ? 'タップで投げる。上スワイプで合わせる。横ドラッグか矢印長押しで引く。PCは Space / ↑ / ← →。' : 'Tap to cast. Swipe up to hook. Drag sideways or hold an arrow. Keyboard: Space / ↑ / ← →.' : ja ? '片手を映して、投げる・上げる・逆へ引く。手の形は自由。' : 'One hand: cast, lift, pull against the fish. Any hand shape works.';
    const overlay = this.$('.hook-overlay'), show = ['loading','calibration','error'].includes(this.phase) || this.manualPause || this.backgroundPause;
    overlay.hidden = !show;
    this.$('.hook-resume').hidden = !this.manualPause && !this.backgroundPause; this.$('.hook-resume').textContent = ja ? '再開する' : 'RESUME';
    this.$('.hook-reconnect').hidden = this.phase !== 'error'; this.$('.hook-reconnect').textContent = ja ? 'カメラを再接続' : 'RECONNECT CAMERA';
    this.$('.hook-fallback').hidden = this.phase !== 'error' && !this.inputLost; this.$('.hook-fallback').textContent = ja ? 'タップで練習' : 'PRACTICE WITH TOUCH';
    if (show) {
      overlay.querySelector('h2').textContent = this.manualPause || this.backgroundPause ? 'PAUSED' : this.phase === 'error' ? ja ? 'カメラを準備できません' : 'CAMERA UNAVAILABLE' : this.phase === 'calibration' ? ja ? '手を中央に、ひと呼吸。' : 'ONE HAND IN THE CENTER.' : 'LET’S GO FISHING…';
      overlay.querySelector('p').textContent = this.manualPause || this.backgroundPause ? ja ? '魚も時間も止まっています。' : 'Your fish and the timer are paused.' : this.phase === 'error' ? ja ? '権限と接続を確認。カメラなしでも遊べます。' : 'Check camera permission, or play with touch.' : this.phase === 'calibration' ? ja ? '手を映して約0.5秒静止。手の形は自由。' : 'Show one palm and hold still for half a second.' : ja ? 'カメラと手の認識を準備しています。' : 'Preparing your camera and hand tracking.';
    }
    const tracking = this.$('.hook-tracking'); tracking.hidden = !this.inputLost || this.phase !== 'playing'; tracking.textContent = ja ? '手を画面の中へ。魚と時間は待っています。' : 'Bring your hand back. Fish and time are waiting.';
    this.notify();
  }
  releaseInputs() { ++this.generation; this.input.stop(); this.audio.stop(); this.three.stop(); this.clearControls(); this.inputBridge.reset(); }
  deactivate({ retainRenderer = false } = {}) {
    this.active = false; this.releaseInputs(); this.abort?.abort(); this.phase = 'idle'; this.photo = null;
    if (retainRenderer) this.runtime?.sleep(); else { this.runtime?.destroy(); this.runtime = null; this.scene = null; }
  }
}
