import { SonicInkGame, W, H, NOTES, INKS, noteAt, ROUND_MS } from './core.js';
import { InkTracker } from './tracking.js';
import { SonicInkInput } from './input.js';
import { SonicInkAudio } from './audio.js';
import { SonicInkScene } from './scene.js';
import { paintInk } from './fallback.js';
import './style.css';

export const createView = (root, locale) => new SonicInkView(root, locale);
export class SonicInkView {
  constructor(root, locale = 'ja') {
    this.root = root; this.locale = locale; this.listeners = new Set(); this.generation = 0; this.active = false;
    this.game = new SonicInkGame(); this.tracker = new InkTracker(); this.audio = new SonicInkAudio(); this.source = 'demo'; this.status = null;
    root.innerHTML = `<section class="si-studio"><header class="si-heading"><div><span>EXP—057 / SOUND TOY</span><h1>SONIC INK<span>✦</span></h1></div><button data-action="sound" aria-pressed="true"></button></header>
      <div class="si-stage" tabindex="0" role="img"><video muted playsinline aria-hidden="true"></video><canvas class="si-fallback" width="540" height="960" aria-hidden="true" hidden></canvas>
        <div class="si-hud"><span class="si-mode">FREE DRAW</span><span class="si-timer">15s</span></div><div class="si-time"><i></i></div>
        <div class="si-note"><span>♪</span><b>C4</b><small>GLASS MARIMBA</small></div>
        <div class="si-empty"><div class="si-dream" aria-hidden="true"><svg viewBox="0 0 240 210"><defs><linearGradient id="si-ribbon"><stop stop-color="#ff9bc8"/><stop offset=".5" stop-color="#afabff"/><stop offset="1" stop-color="#8ee8d0"/></linearGradient></defs><path d="M120 156C49 117 34 57 69 49C96 39 115 70 120 84C136 32 180 40 183 74C188 106 156 133 120 156Z" fill="none" stroke="url(#si-ribbon)" stroke-width="12" stroke-linecap="round"/><path d="M120 156C49 117 34 57 69 49C96 39 115 70 120 84C136 32 180 40 183 74C188 106 156 133 120 156Z" fill="none" stroke="#ffffffab" stroke-width="2"/><circle cx="165" cy="120" r="7" fill="white"/><path d="m197 23 3 9 9 3-9 3-3 9-3-9-9-3 9-3M33 139l2 7 7 2-7 2-2 7-2-7-7-2 7-2" fill="#ffd784"/><path d="M195 159v-23l18-5v23m-18-17 18-5" stroke="#d0a7ff" stroke-width="3" fill="none"/><ellipse cx="190" cy="161" rx="7" ry="5" fill="#d0a7ff"/><ellipse cx="208" cy="156" rx="7" ry="5" fill="#d0a7ff"/></svg></div><h2></h2><p></p><span>DRAW = COMPOSE</span></div>
        <div class="si-loop" hidden>LOOP!</div><div class="si-overlay" hidden><h2></h2><p></p><button data-action="resume"></button><button data-action="camera"></button><button data-action="practice"></button></div>
        <footer class="si-stage-footer"><span class="si-state"></span><span class="si-slots" aria-label="Strokes">${[0,1,2].map(i=>`<i data-slot="${i}"></i>`).join('')}</span></footer>
      </div><p class="si-status" role="status" aria-live="polite"></p>
      <div class="si-tools"><button data-action="undo"></button><button data-action="clear"></button><button data-action="pause"></button><button data-action="replay" hidden></button><button data-action="retry" hidden></button><button data-action="save" hidden></button></div>
      <label class="si-depth"><span></span><input type="range" min="-.5" max=".5" step=".01" value="0"/></label><label class="si-orbit" hidden><span></span><input type="range" min="-65" max="65" value="0"/></label><p class="si-caption"></p></section>`;
    this.$ = s => root.querySelector(s); this.stage = this.$('.si-stage'); this.canvas = this.$('canvas'); this.video = this.$('video');
    this.input = new SonicInkInput(this.video, { onResult: (r,t) => this.onHand(r,t), onStatus: (s,e) => { if (s === 'ERROR' && this.active) this.fail(e); } });
    root.addEventListener('click', e => { const action = e.target.closest('button')?.dataset.action; if (action && this.active) this.action(action); });
    this.stage.addEventListener('pointerdown', e => {
      if (this.source !== 'demo' || this.game.paused || this.game.phase === 'review' || this.status || this.pointer != null || !this.active || e.target.closest('button')) return;
      e.preventDefault(); this.pointer = e.pointerId; this.stage.setPointerCapture(e.pointerId); this.audio.resume(); this.move(e);
    });
    this.stage.addEventListener('pointermove', e => { if (e.pointerId === this.pointer) this.move(e); });
    for (const name of ['pointerup','pointercancel','lostpointercapture']) this.stage.addEventListener(name, e => {
      if (e.pointerId !== this.pointer) return; this.pointer = null; this.tip = null; this.game.end(); this.flush(); this.render();
    });
    this.$('.si-orbit input').addEventListener('input', e => { this.yaw = Number(e.target.value) * Math.PI / 180; });
    this.render();
  }
  say(ja,en) { return this.locale === 'ja' ? ja : en; }
  get phase() { return this.status ?? this.game.phase; }
  subscribe(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  snapshot() { return { phase: this.phase, source: this.source, paused: this.game.paused, result: null }; }
  setLocale(locale) { this.locale = locale; this.render(); }
  activate() { this.active = true; }
  setup(source, retained = null) {
    const enabled = this.audio.enabled; this.releaseInputs(); this.active = true; this.source = source; this.status = null; this.pauseReason = null;
    this.game = retained ?? new SonicInkGame(); this.game.resume(); this.tracker.reset(); this.tip = null; this.hand = null; this.yaw = 0; this.loopUntil = 0;
    this.$('.si-orbit input').value = '0'; this.$('.si-depth input').value = '0'; this.audio = new SonicInkAudio(); this.audio.enabled = enabled; this.audio.arm();
    this.fallback = false;
    try { this.scene = new SonicInkScene(this.stage, () => { queueMicrotask(() => { if (this.active) this.useFallback(); }); }); } catch { this.useFallback(); }
    this.abort = new AbortController();
    document.addEventListener('visibilitychange', () => { if (document.hidden) this.setPaused(true,'focus'); }, { signal: this.abort.signal });
    window.addEventListener('blur', () => this.setPaused(true,'focus'), { signal: this.abort.signal });
    this.lastFrame = performance.now(); this.frameId = requestAnimationFrame(this.frame); this.render();
  }
  startDemo() { this.setup('demo', this.status === 'error' ? this.game : null); }
  async startCamera() { this.setup('camera'); await this.resumeCamera(); }
  async resumeCamera() {
    const token = this.generation; this.status = 'loading'; this.tracker.reset(); this.input.trackingEnabled = true; this.render();
    try { await this.input.start(); if (token !== this.generation || !this.active) return; this.status = null; this.render(); }
    catch (e) { if (token === this.generation && e.name !== 'AbortError') this.fail(e); }
  }
  fail(error) { this.error = error; this.status = 'error'; this.input.stop(); this.game.end('camera-error'); this.game.pause(); this.tip = null; this.flush(); this.render(); }
  useFallback() { this.scene?.dispose(); this.scene = null; this.fallback = true; this.canvas.hidden = false; this.render(); }
  setPaused(paused, reason = 'manual') {
    if (!this.active || this.status) return;
    if (paused) { this.game.end('pause'); this.game.pause(); this.pauseReason = reason; this.tracker.rearm(); this.pointer = null; this.tip = null; }
    else { this.pauseReason = null; this.game.resume(); this.tracker.rearm(); this.audio.resume(); this.lastFrame = performance.now(); }
    this.flush(); this.render();
  }
  onHand(result, time) {
    if (!this.active || this.status || this.game.phase === 'review') return;
    const f = this.tracker.update(result, time, this.video.videoWidth, this.video.videoHeight); this.consumeHand(f);
    if (this.game.paused || !f.present) return;
    this.tip = f.position;
    if (f.drawing) { const drawing = this.game.current; this.game.add(f.position, time); if (drawing && !this.game.current) this.tracker.rearm(); }
    this.flush();
  }
  consumeHand(f) {
    this.hand = f;
    if (f.end) this.game.end('tracking');
    if (!f.present && f.lostFor >= 500 && this.tracker.seen && this.game.phase === 'playing' && !this.game.paused) this.setPaused(true,'hand');
    if (this.game.paused && this.pauseReason === 'hand' && f.present && f.open && f.stable && !this.tracker.needsOpen) { this.game.resume(); this.pauseReason = null; this.audio.resume(); }
    if (!f.present && f.lostFor >= 500) this.tip = null;
  }
  move(e) {
    const r = this.stage.getBoundingClientRect(); this.tip = { x: (e.clientX-r.left)/r.width, y: (e.clientY-r.top)/r.height, z: Number(this.$('.si-depth input').value) };
    const drawing = this.game.current; this.game.add(this.tip, performance.now()); if (drawing && !this.game.current) this.pointer = null; this.flush(); this.render();
  }
  flush() {
    for (const e of this.game.drain()) {
      if (e.type === 'silence') this.audio.silence();
      if (e.type === 'start' || e.type === 'playback') { if (!this.game.paused) this.audio.resume(); }
      if (e.type === 'note' && !this.game.paused && !this.status) { this.audio.note(e); this.lastNote = e.note; if (e.spark) this.scene?.spark(e.position, INKS[e.note%5]); }
      if (e.type === 'loop') { this.loopUntil = performance.now() + 1200; this.scene?.flash(e.stroke, performance.now()); this.scene?.spark(e.stroke.points[0], INKS[0]); }
      if (['start','clear','undo'].includes(e.type)) this.scene?.clearEffects();
      if (e.type === 'finish-stroke' || e.type === 'clear' || e.type === 'undo') this.scene?.sync(this.game, performance.now(), true);
      if (e.type === 'review') { this.input.trackingEnabled = false; this.tip = null; this.pointer = null; }
    }
  }
  frame = now => {
    if (!this.active) return;
    const dt = Math.max(0, now - this.lastFrame); this.lastFrame = now;
    if (this.source === 'camera' && !this.status && this.game.phase !== 'review' && this.tracker.lastPresent !== null && now - this.tracker.lastPresent >= 500) this.consumeHand(this.tracker.missing(now));
    if (!this.status) this.game.tick(dt); this.flush();
    if (this.scene) this.scene.draw(this.game, this.game.paused ? null : this.tip, now, dt, this.yaw);
    else if (this.fallback) paintInk(this.canvas, this.game, { tip: this.game.paused ? null : this.tip, yaw: this.yaw });
    if (!this.lastUi || now - this.lastUi > 100) { this.lastUi = now; this.render(); }
    this.frameId = requestAnimationFrame(this.frame);
  };
  action(action) {
    if (action === 'sound') this.audio.setEnabled(!this.audio.enabled);
    if (action === 'pause') this.setPaused(!this.game.paused);
    if (action === 'resume') this.setPaused(false);
    if (action === 'undo') { this.game.undo(); this.tracker.rearm(); this.pointer = null; }
    if (action === 'clear') { this.game.clear(); this.tracker.rearm(); this.pointer = null; }
    if (action === 'replay') { this.game.resume(); this.pauseReason = null; this.audio.resume(); this.game.play(); }
    if (action === 'retry') { const source = this.source; this.setup(source); if (source === 'camera') void this.resumeCamera(); }
    if (action === 'practice') this.startDemo();
    if (action === 'camera') { this.game.resume(); void this.resumeCamera(); }
    if (action === 'save') { const c = document.createElement('canvas'); c.width = W*2; c.height = H*2; paintInk(c, this.game, { background:true, yaw:this.yaw }); const a=document.createElement('a'); a.download='sonic-ink.png'; a.href=c.toDataURL('image/png'); a.click(); }
    this.flush(); this.render();
  }
  render() {
    const say = (a,b) => this.say(a,b), g = this.game, review = g.phase === 'review';
    this.stage.dataset.phase = this.phase; this.stage.dataset.source = this.source; this.stage.dataset.paused = String(g.paused); this.stage.dataset.renderer = this.fallback ? 'canvas' : 'three';
    this.stage.setAttribute('aria-label',say('音を描く3Dキャンバス','3D musical drawing canvas'));
    this.$('.si-timer').textContent = review ? say('完成','DONE') : `${Math.ceil(g.remaining/1000)}s`; this.$('.si-time i').style.width = `${review ? 100 : g.remaining/ROUND_MS*100}%`;
    this.$('.si-note b').textContent = NOTES[g.cursor?.note ?? (this.tip ? noteAt(this.tip.y) : this.lastNote ?? 0)];
    this.$('.si-note').hidden = !g.strokes.length && !this.tip;
    this.$('.si-note').style.setProperty('--note-color', INKS[(g.cursor?.note ?? this.lastNote ?? 0)%5]);
    this.$('.si-empty').hidden = !!g.strokes.length || !!this.status || g.paused;
    this.$('.si-empty h2').textContent = say('その線が、\nメロディになる。','Your doodle.\nYour melody.');
    this.$('.si-empty p').textContent = this.source === 'camera' ? say('親指と人差し指をつまんで、空に描こう。','Pinch your thumb and index finger. Draw in the air.') : say('ドラッグで描こう。離すと、音が走りだす。','Drag to draw. Release to hear it sing.');
    this.$('.si-loop').hidden = !(this.loopUntil > performance.now()) || g.paused;
    this.$('.si-state').textContent = review ? (g.playback ? '♪ YOUR LITTLE MELODY' : '✧ MADE BY YOU') : g.current ? '✦ DRAWING' : g.playback ? '♪ PLAYING' : '✧ PINCH & DRAW';
    for (const dot of this.root.querySelectorAll('[data-slot]')) dot.dataset.filled = String(Number(dot.dataset.slot) < g.strokes.length);
    this.$('.si-slots').setAttribute('aria-label',say(`${g.strokes.length}/3本の線`,`${g.strokes.length} of 3 strokes`));
    const labels = { sound: this.audio.enabled ? '♪ SOUND ON' : '♪ SOUND OFF', undo: say('ひと筆戻す','UNDO'), clear: say('全消去','CLEAR'), pause: g.paused ? say('再開','RESUME') : say('一時停止','PAUSE'), resume: say('再開する','RESUME'), replay: say('もう一度聴く ↻','REPLAY ↻'), retry: say('新しく描く ✦','DRAW AGAIN ✦'), save: say('絵を保存 ↓','SAVE ART ↓'), camera: say('カメラを再試行','RETRY CAMERA'), practice: say('カメラなしで試す','TRY WITHOUT CAMERA') };
    for (const [a,label] of Object.entries(labels)) this.$(`[data-action="${a}"]`).textContent = label;
    this.$('[data-action="sound"]').setAttribute('aria-pressed',String(this.audio.enabled));
    for (const a of ['undo','clear']) { this.$(`[data-action="${a}"]`).hidden = review; this.$(`[data-action="${a}"]`).disabled = !g.strokes.length || !!this.status || g.paused; }
    for (const a of ['retry','save','replay']) { this.$(`[data-action="${a}"]`).hidden = !review; this.$(`[data-action="${a}"]`).disabled = !!this.status || (a !== 'retry' && !g.strokes.length); }
    this.$('[data-action="pause"]').disabled = !!this.status;
    this.$('.si-depth').hidden = this.source !== 'demo' || review; this.$('.si-depth span').textContent = say('奥 ← 奥行き → 手前','FAR ← DEPTH → NEAR');
    this.$('.si-orbit').hidden = !review; this.$('.si-orbit span').textContent = say('作品を回してみる','TURN YOUR SCULPTURE');
    this.video.hidden = this.source !== 'camera'; this.canvas.hidden = !this.fallback;
    const status = this.status === 'loading' ? say('初回は手の認識モデルを読み込みます。','Downloading the hand model on first use.') : this.status === 'error' ? say('カメラの許可と接続を確認してください。絵は残っています。','Check camera permission and connection. Your drawing is kept.') : g.paused ? (this.pauseReason === 'hand' ? say('手を映して指を開くと、続きから再開します。','Show your hand with fingers open to continue.') : say('一時停止中。再開するにはボタンを押してください。','Paused. Press RESUME to continue.')) : review ? say('きみだけの音の彫刻。カメラの前で、ポーズもどうぞ。','Your own sound sculpture. Strike a pose with it.') : this.source === 'camera' ? (this.hand?.present ? say('上は高い音、下は低い音。輪を閉じるとループ！','High up, high notes. Low down, low notes. Close a loop!') : say('片手を映して、親指と人差し指をつまもう。','Show one hand and pinch your thumb and index finger.')) : say('上は高い音、下は低い音。15秒で、3本まで。','High up, high notes. Low down, low notes. 15 seconds, 3 strokes.');
    if (this.$('.si-status').textContent !== status) this.$('.si-status').textContent = status;
    this.$('.si-overlay').hidden = !this.status && !g.paused;
    this.$('.si-overlay h2').textContent = this.status === 'loading' ? say('音のアトリエを準備中…','Opening your sound atelier…') : this.status === 'error' ? say('カメラを開けませんでした','Camera unavailable') : this.pauseReason === 'hand' ? say('手を、もう一度。','Show your hand again.') : 'PAUSED';
    this.$('.si-overlay p').textContent = status;
    this.$('[data-action="resume"]').hidden = !!this.status || this.pauseReason === 'hand'; this.$('[data-action="camera"]').hidden = this.status !== 'error'; this.$('[data-action="practice"]').hidden = this.status !== 'error';
    this.$('.si-caption').textContent = this.audio.failed ? say('音声を使えません。光の線はそのまま描けます。','Audio unavailable. You can still draw with light.') : this.fallback ? say('軽量描画で遊んでいます。音とループはそのまま。','Using lightweight visuals. Sound and loops still work.') : say('光で描く、小さな音楽。保存する絵にカメラ映像は入りません。','Little melodies made of light. Saved art contains no camera image.');
    this.listeners.forEach(fn => fn(this.snapshot()));
  }
  releaseInputs() {
    ++this.generation; cancelAnimationFrame(this.frameId); this.frameId = null; this.abort?.abort(); this.input.stop(); this.input.trackingEnabled = false;
    this.audio.dispose(); this.scene?.dispose(); this.scene = null; this.pointer = null; this.tip = null; this.game.pause(); this.game.stopPlayback(); this.game.drain();
  }
  deactivate() { this.active = false; this.releaseInputs(); }
}
