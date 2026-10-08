import { MaruGame, SIZE, RULES, DwellRetry, updateRecords } from './core.js';
import { smoothVec2 } from '../inputFeel/index.js';
import { MaruInput, projectTip } from './input.js';
import { PhaserRuntime } from '../game-runtime/phaser/PhaserRuntime.js';
import { CameraInputBridge } from '../game-runtime/phaser/input/CameraInputBridge.js';
import { GameEventBus } from '../game-runtime/phaser/events/GameEventBus.js';
import { MaruScene } from './scene.js';
import { MaruAudio } from './audio.js';
import { SPIRITS, HINTS, resultHint } from './copy.js';
import './style.css';
const KEY = 'camera-lab:maru-magic:records:v1';

export const createView = (root, locale) => new MaruView(root, locale);
export class MaruView {
  constructor(root, locale = 'ja') {
    this.root = root; this.locale = locale; this.listeners = new Set(); this.game = new MaruGame(); this.audio = new MaruAudio(); this.generation = 0;
    this.phase = 'idle'; this.source = 'demo'; this.visualPoints = []; this.inputBridge = new CameraInputBridge(); this.gameEvents = new GameEventBus(); this.history = [];
    this.retryDwell = new DwellRetry();
    try { this.records = JSON.parse(localStorage.getItem(KEY)) ?? {}; } catch { this.records = {}; }
    root.innerHTML = `<section class="maru-play"><header class="maru-heading"><div><span class="maru-eyebrow">EXP–062 / LITTLE SUMMONING RITUAL</span><h1>MARU <em>MAGIC</em><i>✦</i></h1><p class="maru-subtitle"></p></div><div class="maru-tools"><button data-action="sound" type="button"></button><button data-action="pause" type="button"></button></div></header>
      <div class="maru-records"><div><span class="maru-best-label"></span><b class="maru-best">—</b><small>/ 100</small></div><div><span class="maru-fast-label"></span><b class="maru-fast">—</b><small>s</small></div><span class="maru-source"></span></div>
      <div class="maru-stage" role="group" tabindex="0"><video muted playsinline aria-hidden="true" hidden></video><div class="maru-phaser"></div><div class="maru-stage-top"><span class="maru-phase-label"></span><span class="maru-progress"></span></div><div class="maru-invitation"><span>✧</span><h2></h2><p></p></div><div class="maru-cue" hidden><strong></strong><span></span><div><i></i></div></div><div class="maru-stamp" hidden><span></span><strong></strong><small></small></div><button data-action="again" type="button" class="maru-stage-again" hidden><span></span><small></small><i aria-hidden="true"></i></button><div class="maru-overlay" hidden><h2></h2><p></p><button data-action="resume" type="button" hidden></button><button data-action="camera" type="button" hidden></button><button data-action="practice" type="button" hidden></button></div><span class="maru-stage-foot">DRAW A CIRCLE. GIVE IT A SOUL.</span></div>
      <p class="maru-status" role="status" aria-live="polite"></p><section class="maru-result" hidden><div class="maru-result-heading"><div><span class="maru-rank"></span><h2 class="maru-spirit-name"></h2></div><div class="maru-score"><b></b><small>/ 100</small></div></div><p class="maru-quote"></p><div class="maru-parts">${['roundness','closure','smoothness'].map(k => `<div data-part="${k}"><span></span><b></b><div><i></i></div></div>`).join('')}</div><div class="maru-time-line"><span></span><b></b></div><p class="maru-result-hint"></p></section>
      <button data-action="again" type="button" class="maru-again" hidden></button><p class="maru-note"></p><div class="maru-roster">${SPIRITS.map((s,i)=>`<div><i class="maru-mini" data-spirit="${i}" aria-hidden="true"></i><b></b><span>${s.band}</span></div>`).join('')}</div><details class="maru-debug" hidden><summary>SCORE LAB · v0.1</summary><pre></pre><button data-action="export" type="button">EXPORT LOCAL TRIALS</button></details></section>`;
    this.$ = s => root.querySelector(s); this.stage = this.$('.maru-stage'); this.video = this.$('video');
    this.input = new MaruInput(this.video, { onResult: (r, at) => this.onHand(r, at), onStatus: (s, error) => { if (s === 'ERROR' && this.active && this.source === 'camera') this.fail(error); } });
    root.addEventListener('click', e => { const a = e.target.closest('button')?.dataset.action; if (a && this.active) this.action(a); });
    this.stage.addEventListener('pointerdown', e => {
      if (!this.active || this.source !== 'demo' || this.phase !== 'playing' || this.game.paused || this.game.phase === 'summoned' || this.pointer != null || e.target.closest('button')) return;
      e.preventDefault(); this.pointer = e.pointerId; this.stage.setPointerCapture(e.pointerId); this.audio.arm(); this.move(e);
    });
    this.stage.addEventListener('pointermove', e => { if (e.pointerId === this.pointer) this.move(e); });
    this.stage.addEventListener('pointerup', e => { if (e.pointerId !== this.pointer) return; this.pointer = null; this.tip = null; this.game.finish(performance.now(), 'release'); this.checkResult(); this.render(); });
    for (const type of ['pointercancel','lostpointercapture']) this.stage.addEventListener(type, e => { if (e.pointerId === this.pointer) { this.pointer = null; this.clearStroke('tracking'); this.render(); } });
    this.render();
  }
  say(ja, en) { return this.locale === 'ja' ? ja : en; }
  subscribe(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  notify() { this.listeners.forEach(fn => fn(this.snapshot())); }
  snapshot() { return { phase: this.phase, menuPhase: this.game.phase === 'summoned' ? 'result' : null, source: this.source, paused: this.game.paused, musicSilent: this.game.phase === 'summoned' || this.game.missingAt !== null, result: null }; }
  setLocale(locale) { this.locale = locale; this.render(); }
  activate() {
    this.active = true; this.abort?.abort(); this.abort = new AbortController(); const signal = this.abort.signal;
    window.addEventListener('blur', () => { if (this.phase === 'playing') this.pause(true); }, { signal });
    document.addEventListener('visibilitychange', () => { if (document.hidden && this.phase === 'playing') this.pause(true); }, { signal });
    const media = matchMedia('(prefers-reduced-motion: reduce)'); this.reducedMotion = media.matches; media.addEventListener('change', e => { this.reducedMotion = e.matches; }, { signal });
    this.debug = new URLSearchParams(location.search).get('debug') === '1';
  }
  setup(source) {
    this.input.stop(); ++this.generation; this.source = source; this.phase = 'playing'; this.game.reset(); this.retryDwell.reset(); this.dwellRetries = 0; this.visualPoints = []; this.tip = null; this.menuTip = null; this.pointer = null; this.handAt = null; this.handSeen = false; this.lastResult = null; this.error = null;
    this.audio.arm(); this.video.hidden = source !== 'camera'; this.input.trackingEnabled = source === 'camera';
    if (!this.runtime) { this.scene = new MaruScene(this, { inputBridge: this.inputBridge, gameEvents: this.gameEvents, reducedMotion: this.reducedMotion }); this.runtime = new PhaserRuntime(this.$('.maru-phaser'), this.scene, { width: SIZE, height: SIZE }); }
    this.runtime.game.loop.wake(); this.render(); this.notify();
  }
  startDemo() { this.setup('demo'); }
  async startCamera() {
    this.setup('camera'); const token = this.generation; this.phase = 'loading'; this.render();
    try { await this.input.start(); if (token !== this.generation || !this.active) return; this.phase = 'playing'; this.render(); }
    catch (e) { if (token === this.generation && this.active && e.name !== 'AbortError') this.fail(e); }
  }
  fail(error) { this.error = error; this.input.stop(); this.phase = 'error'; this.clearStroke('tracking'); this.audio.pause(true); this.render(); }
  onHand(result, at) {
    if (!this.active || this.phase !== 'playing' || this.source !== 'camera' || this.game.paused) return;
    const p = projectTip(result, this.video.videoWidth, this.video.videoHeight);
    if (this.game.phase === 'summoned') {
      this.menuTip = p;
      if (this.menuUiEnabled) { this.tip = null; this.retryDwell.reset(); return; }
      this.tip = p;
      if (p) { this.handAt = at; if (this.retryDwell.update(p, at, this.retryTarget())) { this.dwellRetries++; this.again(); } }
      else this.retryDwell.reset();
      return;
    }
    if (p) { this.handSeen = true; this.handAt = at; this.consume(p, at, 'camera'); }
    else { this.game.missing(at); this.tip = null; if (this.game.phase === 'ready' && this.visualPoints.length) this.clearVisual(); }
  }
  consume(p, at, source) {
    const previous = this.game.phase, wasArmed = this.game.armed; this.game.sample(p, at, source); this.tip = p;
    if (!wasArmed && this.game.armed && this.game.phase === 'ready') { this.audio.ready(); this.render(); }
    this.inputBridge.publish({ timestamp: at, leftHand: { visible: true, x: p.x / SIZE, y: p.y / SIZE, pointing: true, confidence: 1 } });
    if (this.game.phase === 'drawing' || this.game.phase === 'summoned') {
      if (previous === 'ready') { this.visualPoints = [{ ...this.game.points[0] }]; this.lastVisualAt = at; this.audio.start(); this.gameEvents.emit('GAME_START', { source: this.source }); }
      const last = this.visualPoints.at(-1) ?? p, dt = Math.min(.15, Math.max(.001, (at - (this.lastVisualAt ?? at - 16)) / 1000));
      this.visualPoints.push(smoothVec2(last, p, dt, .028)); this.lastVisualAt = at;
      if (this.visualPoints.length > 800) this.visualPoints.splice(1, 1);
    } else if (this.visualPoints.length) this.clearVisual();
    this.checkResult();
  }
  move(e) { if (this.game.paused || this.phase !== 'playing') return; const b = this.stage.getBoundingClientRect(); this.consume({ x: (e.clientX - b.left) / b.width * SIZE, y: (e.clientY - b.top) / b.height * SIZE }, performance.now(), 'touch'); this.render(); }
  retryTarget() {
    const stage = this.stage.getBoundingClientRect(), button = this.$('.maru-stage-again').getBoundingClientRect(), margin = 10;
    if (!stage.width || !button.width) return null;
    return { left: (button.left - stage.left) / stage.width * SIZE - margin, right: (button.right - stage.left) / stage.width * SIZE + margin, top: (button.top - stage.top) / stage.height * SIZE - margin, bottom: (button.bottom - stage.top) / stage.height * SIZE + margin };
  }
  checkResult() {
    const r = this.game.result; if (!r || this.lastResult === r) return;
    this.lastResult = r; this.summonedAt = performance.now(); this.pointer = null; this.tip = null; this.retryDwell.reset(); this.input.trackingEnabled = this.source === 'camera';
    const oldBest = this.records?.best ?? 0; this.records = updateRecords(this.records, r); this.newBest = r.score > oldBest;
    try { localStorage.setItem(KEY, JSON.stringify(this.records)); } catch {}
    this.history.push({ source: this.source, ...r, points: this.game.points.map(p => ({ ...p })) }); if (this.history.length > 20) this.history.shift();
    this.audio.summon(r.spirit); this.gameEvents.emit('HIGHLIGHT', { tier: r.spirit, score: r.score }); this.gameEvents.emit('GAME_END', { score: r.score, source: this.source });
    this.render();
  }
  clearVisual() { this.visualPoints = []; this.tip = null; }
  clearStroke(reason = null) { this.game.cancel(reason); this.clearVisual(); this.pointer = null; }
  again(fromMenu = false) {
    if (this.phase !== 'playing' || this.game.paused) return;
    // Menu cursors use the whole viewport, while the game uses the camera crop.
    // Guard the actual game-space fingertip before the fixed menu disappears.
    const p = fromMenu ? this.menuTip : null, margin = SIZE * .1;
    const retryZone = this.source !== 'camera' ? null : p ? { left: p.x - margin, right: p.x + margin, top: p.y - margin, bottom: p.y + margin } : this.retryTarget();
    this.menuTip = null;
    this.game.reset(); this.game.waitOutside(retryZone); this.retryDwell.reset(); this.clearVisual(); this.lastResult = null; this.pointer = null; this.handAt = null; this.handSeen = false;
    this.audio.silence(); this.audio.arm(); this.input.trackingEnabled = this.source === 'camera'; this.render();
  }
  pause(paused = !this.game.paused) {
    if (!this.active || this.phase !== 'playing') return;
    if (paused) { if (this.game.phase === 'summoned') this.game.paused = true; else { this.game.pause(); this.clearVisual(); } this.pointer = null; }
    else { this.game.resume(); this.handAt = null; this.handSeen = false; }
    this.retryDwell.reset(); this.tip = null; this.input.trackingEnabled = !paused && this.source === 'camera'; this.audio.pause(paused); this.render();
  }
  loop(at) {
    if (!this.active) return;
    if (this.phase === 'playing' && !this.game.paused) {
      if (this.source === 'camera' && this.handAt !== null && at - this.handAt > 150) { this.game.missing(at); this.tip = null; this.retryDwell.reset(); if (this.game.phase === 'ready') this.clearVisual(); }
      this.game.tick(at); this.checkResult();
    }
    if (!this.uiAt || at - this.uiAt > 100) { this.uiAt = at; this.render(); }
  }
  action(a) {
    if (a === 'again') this.again(); if (a === 'pause') this.pause(); if (a === 'resume') this.pause(false);
    if (a === 'camera') void this.startCamera(); if (a === 'practice') this.startDemo();
    if (a === 'sound') { this.audio.enabled = !this.audio.enabled; if (this.audio.enabled) this.audio.arm(); else this.audio.stop(); }
    if (a === 'export') { const blob = new Blob([JSON.stringify({ version: '0.1', trials: this.history }, null, 2)], { type: 'application/json' }), url = URL.createObjectURL(blob), link = document.createElement('a'); link.href = url; link.download = 'maru-magic-trials.json'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
    this.render();
  }
  render() {
    const say = (a,b) => this.say(a,b), g = this.game, r = g.result, summoned = g.phase === 'summoned', ja = this.locale === 'ja';
    this.stage.dataset.phase = g.phase; this.stage.dataset.source = this.source;
    this.stage.setAttribute('aria-label', say('まるを描く魔法のキャンバス', 'Magic canvas: draw one circle'));
    this.$('.maru-subtitle').textContent = say('まるを描くと、何かが生まれる。', 'One circle. A little life.');
    this.$('[data-action="sound"]').textContent = this.audio.enabled ? 'SE ON' : 'SE OFF'; this.$('[data-action="sound"]').setAttribute('aria-pressed', String(this.audio.enabled));
    this.$('[data-action="pause"]').textContent = g.paused ? say('再開', 'RESUME') : say('一時停止', 'PAUSE'); this.$('[data-action="pause"]').disabled = this.phase !== 'playing';
    this.$('.maru-best-label').textContent = say('最高のまる', 'BEST CIRCLE'); this.$('.maru-best').textContent = Number.isFinite(this.records?.best) ? this.records.best : '—';
    this.$('.maru-fast-label').textContent = say('80点以上の最速', 'FASTEST · 80+'); this.$('.maru-fast').textContent = Number.isFinite(this.records?.fastestMs) ? (this.records.fastestMs / 1000).toFixed(2) : '—';
    this.$('.maru-source').textContent = this.source === 'demo' ? say('タッチ練習', 'TOUCH PRACTICE') : say('指先で召喚', 'FINGERTIP MAGIC');
    this.$('.maru-phase-label').textContent = summoned ? '03 / SUMMON!' : g.phase === 'drawing' ? '02 / DRAW' : '01 / READY';
    this.$('.maru-progress').textContent = g.phase === 'drawing' ? (g.elapsedMs / 1000).toFixed(1) + 's / 8s' : say('何度でも、ゆっくりどうぞ', 'TAKE YOUR TIME. TRY AGAIN.');
    const invite = this.$('.maru-invitation'); invite.hidden = g.phase !== 'ready' || (this.source === 'camera' && !!this.tip);
    const positioning = !!g.startExclusion;
    invite.querySelector('h2').textContent = this.source === 'camera' ? positioning ? say('描き始めたい場所へ', 'Choose your starting point') : say('人差し指を見せて', 'Show your index finger') : say('まるに、命を。', 'A circle comes alive.');
    invite.querySelector('p').textContent = this.source === 'demo' ? say('指でぐるっと描いて、始めた場所へ。', 'Draw one loop. Return to your starting point.') : positioning ? say('好きな場所に指を移して、そこで止めよう。', 'Move your finger to your chosen spot, then hold still.') : say('① 指を止める → ② 準備OK → ③ 円を描く\nまずは、指先をカメラの中へ。', '① Hold still → ② READY → ③ Draw a circle\nFirst, put your fingertip in view.');
    const cue = this.$('.maru-cue'); cue.hidden = this.source !== 'camera' || g.phase !== 'ready' || !this.tip || g.paused || this.phase !== 'playing'; cue.dataset.ready = String(g.armed);
    cue.querySelector('strong').textContent = positioning ? say('描き始めたい場所へ指を移動', 'CHOOSE YOUR STARTING POINT') : g.armed ? say('✦ 準備OK！まるを描こう', '✦ READY! DRAW YOUR CIRCLE') : say('指をここで止めて', 'HOLD YOUR FINGER STILL');
    cue.querySelector('span').textContent = positioning ? say('そこで止めると、また「準備OK！」', 'Hold still there to get READY again.') : g.armed ? say('指を動かすと、光の線がはじまるよ。', 'Move your finger to start your line of light.') : say('光の輪がいっぱいになるまで、ほんの少し。', 'Just a moment — let the ring fill with light.');
    cue.querySelector('div').hidden = positioning;
    cue.querySelector('i').style.width = (g.armed ? 100 : Math.min(100, Math.max(0, (performance.now() - (g.anchorAt ?? performance.now())) / RULES.holdMs * 100))) + '%';
    const overlay = this.$('.maru-overlay'), loading = this.phase === 'loading', error = this.phase === 'error'; overlay.hidden = !g.paused && !loading && !error;
    overlay.querySelector('h2').textContent = loading ? say('魔法の準備中…', 'Preparing your magic…') : error ? say('カメラを使えませんでした', 'Couldn’t start the camera') : say('ひと休み。', 'A little break.');
    overlay.querySelector('p').textContent = error ? say('カメラの許可と接続を確認するか、タッチで遊べます。', 'Check camera permissions or try touch practice.') : loading ? say('初回は手の認識モデルを読み込みます。', 'The hand model downloads on first use.') : say('準備ができたら、次のまるを。', 'Ready when you are.');
    this.$('[data-action="resume"]').hidden = !g.paused || error || loading; this.$('[data-action="resume"]').textContent = say('つづける', 'CONTINUE');
    this.$('[data-action="camera"]').hidden = !error; this.$('[data-action="camera"]').textContent = say('カメラを再接続', 'RETRY CAMERA');
    this.$('[data-action="practice"]').hidden = !error; this.$('[data-action="practice"]').textContent = say('タッチで遊ぶ', 'TRY TOUCH');
    const status = positioning ? say('好きな場所へ移動 → そこで止める → 準備OK → 描く', 'Move to your spot → Hold still → READY → Draw') : g.message ? HINTS[g.message]?.[ja ? 0 : 1] : g.missingAt !== null && g.phase === 'drawing' ? say('指を探しています…描きかけを少し待ちます。', 'Finding your finger… keeping your stroke briefly.') : this.source === 'camera' && g.phase === 'ready' ? (g.armed ? say('準備OK！そのまま、ぐるっと。', 'Ready! Draw one loop.') : say('人差し指を見せて、0.3秒だけ静止。', 'Show your index finger. Hold still for 0.3 seconds.')) : '';
    this.$('.maru-status').textContent = status ?? '';
    this.$('.maru-result').hidden = !summoned; this.$('.maru-stamp').hidden = !summoned;
    this.root.querySelectorAll('[data-action="again"]').forEach(button => {
      button.hidden = !summoned; button.disabled = g.paused;
      if (button.classList.contains('maru-stage-again')) {
        button.querySelector('span').textContent = say('もう一度', 'AGAIN') + ' ↻';
        button.querySelector('small').hidden = this.source !== 'camera';
        button.querySelector('small').textContent = this.retryDwell.progress > 0 ? say('そのまま、少し待って…', 'Hold still a moment…') : say('指をかざしてもOK', 'Or hold your finger here');
        button.querySelector('i').style.width = (this.retryDwell.progress * 100) + '%';
      } else button.textContent = say('もう一度、召喚する', 'SUMMON AGAIN') + ' ↻';
    });
    if (r) {
      const s = SPIRITS[r.spirit]; this.root.style.setProperty('--maru-spirit', s.color);
      this.$('.maru-rank').textContent = s[ja ? 'rankJa' : 'rankEn'] + (this.newBest ? say(' · 自己ベスト！', ' · NEW BEST!') : ''); this.$('.maru-spirit-name').textContent = s[ja ? 'ja' : 'en'];
      this.$('.maru-score b').textContent = r.score; this.$('.maru-quote').textContent = s[ja ? 'quoteJa' : 'quoteEn'];
      ['roundness','closure','smoothness'].forEach((k,i) => { const el = this.$(`[data-part="${k}"]`); el.querySelector('span').textContent = [say('丸さ · 75%', 'ROUNDNESS · 75%'), say('閉じ具合 · 15%', 'CLOSURE · 15%'), say('滑らかさ · 10%', 'SMOOTHNESS · 10%')][i]; el.querySelector('b').textContent = r.parts[k]; el.querySelector('i').style.width = r.parts[k] + '%'; });
      this.$('.maru-time-line span').textContent = say('描いた時間（点数には加算しません）', 'DRAW TIME · NO SPEED BONUS'); this.$('.maru-time-line b').textContent = (r.elapsedMs / 1000).toFixed(2) + 's'; this.$('.maru-result-hint').textContent = resultHint(r, this.locale);
      this.$('.maru-stamp span').textContent = s[ja ? 'rankJa' : 'rankEn']; this.$('.maru-stamp strong').textContent = r.score; this.$('.maru-stamp small').textContent = 'MARU / 100';
    }
    this.$('.maru-note').textContent = say('ひとつの円を、一周だけ。速さより、まるさ。', 'One circle. One loop. Shape comes before speed.');
    this.root.querySelectorAll('.maru-roster>div').forEach((el,i) => { el.querySelector('b').textContent = SPIRITS[i][ja ? 'ja' : 'en']; });
    this.$('.maru-debug').hidden = !this.debug; this.$('.maru-debug pre').textContent = JSON.stringify(r ? { ...r, circle: r.circle, source: this.source, fingerRetries: this.dwellRetries } : { phase: g.phase, armed: g.armed, points: g.points.length, fingerRetries: this.dwellRetries }, null, 2);
    this.notify();
  }
  releaseInputs() { ++this.generation; this.input.stop(); this.audio.stop(); this.pointer = null; this.tip = null; this.runtime?.destroy(); this.runtime = null; this.scene = null; this.sceneReady = false; }
  deactivate() { this.active = false; this.abort?.abort(); this.releaseInputs(); this.phase = 'idle'; this.game.reset(); this.visualPoints = []; this.history = []; this.inputBridge.reset(); }
}
