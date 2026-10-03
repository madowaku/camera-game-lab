import './smuggler.css';
import { FrameSmuggler, ROUND_MS } from '../games/frameSmuggler.js';
import { SmugglerInput } from './input.js';
import { CargoFrame } from './cargoFrame.js';
import { createRecords, GATE_KEYS } from './records.js';
import { messages } from './messages.js';

const diamond = '<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M15 10h34L61 27 32 58 3 27Z" fill="#adffe8" stroke="#092f2a" stroke-width="3"/><path d="m15 10 7 17 10 31 10-31 7-17M3 27h58M22 27 32 10l10 17" fill="none" stroke="#168e77" stroke-width="2"/></svg>';
const clamp = v => Math.min(1.15, Math.max(-.15, v));
export function createView(root, locale, options) { return new SmugglerView(root, locale, options); }

class SmugglerView {
  constructor(root, locale, { onReplay } = {}) {
    this.root = root; this.locale = locale; this.onReplay = onReplay; this.listeners = new Set(); this.generation = 0; this.active = false;
    this.source = 'camera'; this.facing = 'environment'; this.swapped = false; this.records = createRecords(); this.phase = 'idle'; this.game = new FrameSmuggler(); this.keys = new Set(); this.demoCargo = new CargoFrame();
    root.innerHTML = `<section class="fs-game">
      <div class="fs-topline"><span>EXP-035 / CO-OP</span><span class="fs-source"></span></div>
      <div class="fs-hud"><span><small>SCORE</small><strong class="fs-score">000</strong></span><span class="fs-clock">30<small>SEC</small></span><span><small>CHECKS</small><strong class="fs-checks">0 / 4</strong></span></div>
      <div class="fs-stage" tabindex="0" role="region">
        <video autoplay muted playsinline></video><div class="fs-demo-scene" aria-hidden="true"><span>FRAME / 035</span><i></i></div>
        <div class="fs-safe-frame" aria-hidden="true"></div>
        <div class="fs-command"><span class="fs-eyebrow">30 SECOND SURVIVAL</span><h1 class="fs-call">READY</h1><p class="fs-instruction"></p></div>
        <div class="fs-cargo">${diamond}<span>CARGO</span></div>
        <div class="fs-notice" role="status" aria-live="polite"></div>
        <div class="fs-bottom"><span class="fs-tracking"></span><div class="fs-progress"><i></i></div></div>
        <div class="fs-pause-overlay" hidden><strong>PAUSED</strong><p></p><button type="button" data-fs="resume"></button></div>
      </div>
      <div class="fs-controls"><button type="button" data-fs="pause"></button><span class="fs-controls-hint"></span></div>
      <div class="fs-practice" hidden><p></p><div><button type="button" data-fs="hide"></button><button type="button" data-fs="back"></button></div></div>
      <section class="fs-ready"><div class="fs-roles"><div><b class="fs-camera-role"></b><span class="fs-camera-desc"></span></div><div><b class="fs-smuggler-role"></b><span class="fs-smuggler-desc"></span></div></div><p class="fs-ready-copy"></p>
        <div class="fs-camera-settings"><label><input type="radio" name="fs-facing" value="environment" checked><span class="fs-rear"></span></label><label><input type="radio" name="fs-facing" value="user"><span class="fs-front"></span></label><button type="button" data-fs="connect"></button></div>
        <p class="fs-error" role="alert" hidden></p><button type="button" class="fs-start" data-fs="start"></button><button type="button" class="fs-try-demo" data-fs="demo" hidden></button>
      </section>
      <section class="fs-result" hidden><p class="fs-result-source"></p><h2>DELIVERY REPORT</h2><dl class="fs-stats"></dl><button type="button" class="fs-swap" data-fs="swap">SWAP ROLES</button><p class="fs-swap-hint"></p>
        <details class="fs-survey"><summary></summary><p class="fs-survey-hint"></p><form><div class="fs-questions"></div><button type="submit" class="fs-save"></button></form><p class="fs-save-status" role="status"></p></details>
        <p class="fs-record-count"></p><button type="button" data-fs="export"></button>
      </section>
    </section>`;
    this.input = new SmugglerInput(this.$('video'), this.$('.fs-stage'), { onStatus: status => { if (status === 'ERROR' && this.active) this.fail(); } });
    this.root.addEventListener('click', event => this.action(event.target.closest('[data-fs]')?.dataset.fs));
    this.root.addEventListener('change', event => { if (event.target.name === 'fs-facing') { this.facing = event.target.value; if (this.connected || this.phase === 'loading') void this.connect(); } });
    this.$('form').addEventListener('submit', event => {
      event.preventDefault();
      const answers = Object.fromEntries(new FormData(event.currentTarget));
      const saved = this.records.observe(this.recordId, answers);
      this.saveStatus = saved.accepted ? saved.persisted ? 'saved' : 'sessionOnly' : 'incomplete'; this.render();
    });
    this.setLocale(locale);
  }
  $(selector) { return this.root.querySelector(selector); }
  get t() { return messages[this.locale === 'ja' ? 'ja' : 'en']; }
  subscribe(listener) { this.listeners.add(listener); return () => this.listeners.delete(listener); }
  notify() { for (const fn of this.listeners) fn(); }
  snapshot() { return { phase: this.phase === 'keep' || this.phase === 'warning' || this.phase === 'hide' || this.phase === 'return' ? 'playing' : this.phase, source: this.source, result: this.game.result ? { ...this.game.result, summaryJa: `${this.source === 'demo' ? '練習' : 'カメラ'} · 検問 ${this.game.cleared}/4`, summaryEn: `${this.source === 'demo' ? 'Practice' : 'Camera'} · ${this.game.cleared}/4 inspections cleared` } : null }; }
  setLocale(locale) {
    this.locale = locale;
    const values = Object.fromEntries(Array.from(this.root.querySelectorAll('.fs-questions select'), el => [el.name, el.value]));
    this.$('.fs-questions').innerHTML = this.t.questions.map((question, i) => `<label>${i + 1}. ${question}<select name="${GATE_KEYS[i]}" required><option value="">${this.t.choose}</option>${['yes', 'no', 'unobserved'].map(v => `<option value="${v}">${this.t[v]}</option>`).join('')}</select></label>`).join('');
    for (const el of this.root.querySelectorAll('.fs-questions select')) el.value = values[el.name] ?? '';
    this.render();
  }
  activate() {
    this.active = true; this.abort?.abort(); this.abort = new AbortController(); const signal = this.abort.signal;
    document.addEventListener('visibilitychange', () => { if (document.hidden) this.pause(); }, { signal });
    window.addEventListener('blur', () => this.pause(), { signal });
    window.addEventListener('keydown', event => {
      if (this.source !== 'demo' || !event.code.startsWith('Arrow') || event.target.closest('button,input,select,textarea,a')) return;
      event.preventDefault(); this.keys.add(event.code);
    }, { signal });
    window.addEventListener('keyup', event => this.keys.delete(event.code), { signal });
    const stage = this.$('.fs-stage');
    const move = event => { const b = stage.getBoundingClientRect(); this.cursor = { x: clamp((event.clientX - b.left) / b.width), y: clamp((event.clientY - b.top) / b.height) }; };
    stage.addEventListener('pointerdown', event => { if (this.source !== 'demo' || event.target.closest('button') || this.game.result) return; this.pointer = event.pointerId; stage.setPointerCapture(event.pointerId); move(event); }, { signal });
    stage.addEventListener('pointermove', event => { if (event.pointerId === this.pointer) move(event); }, { signal });
    for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) stage.addEventListener(name, () => { this.pointer = null; }, { signal });
  }
  setup(source) {
    this.releaseInputs(); this.source = source; this.phase = source === 'camera' ? 'setup' : 'ready'; this.game = new FrameSmuggler(); this.cursor = { x: .5, y: .56 };
    this.demoCargo.reset(); this.cargo = { state: 'lost', point: null }; this.readyFor = 0; this.connected = false; this.recordId = null; this.saveStatus = ''; this.pauseReason = '';
    this.$('form').reset(); this.$('.fs-survey').open = false; this.render(); this.notify();
  }
  startCamera() { this.setup('camera'); }
  startDemo() { this.setup('demo'); this.connected = true; this.beginLoop(); this.$('.fs-stage').focus({ preventScroll: true }); }
  async connect() {
    if (!['setup', 'ready', 'error', 'loading'].includes(this.phase)) return;
    this.releaseInputs(); const token = this.generation; this.phase = 'loading'; this.connected = false; this.readyFor = 0; this.cargo = { state: 'lost', point: null }; this.input.facing = this.facing; this.render(); this.notify();
    try {
      await this.input.start(); if (!this.active || token !== this.generation) return;
      this.connected = true; this.phase = 'ready'; this.beginLoop();
    } catch (error) { if (token === this.generation && error.name !== 'AbortError') this.fail(); }
  }
  beginLoop() { this.lastTick = performance.now(); this.render(); this.notify(); this.raf = requestAnimationFrame(this.tick); }
  pause(reason = 'pauseHint') { if (!this.active || !['countdown', 'keep', 'warning', 'hide', 'return'].includes(this.phase)) return; this.game.paused = true; this.pauseReason = reason; this.keys.clear(); this.render(); }
  action(action) {
    if (!this.active) return;
    if (action === 'connect') void this.connect();
    if (action === 'demo') this.startDemo();
    if (action === 'start' && this.phase === 'ready' && this.readyFor >= 400) { this.game.start(); this.phase = this.game.phase; this.lastTick = performance.now(); this.render(); this.notify(); }
    if (action === 'pause') this.pause();
    if (action === 'resume' && this.cargo?.state !== 'stale') { this.game.paused = false; this.lastTick = performance.now(); this.render(); }
    if (action === 'hide' && this.source === 'demo') this.cursor = { x: 1.1, y: .56 };
    if (action === 'back' && this.source === 'demo') this.cursor = { x: .5, y: .56 };
    if (action === 'swap' && this.game.result) { this.swapped = !this.swapped; this.onReplay?.(); }
    if (action === 'export') {
      const data = { experiment: 'EXP-035', exportedAt: new Date().toISOString(), humanGate: 'Manual review of five camera rounds; focus on questions 3, 4, 6.', rounds: this.records.all() };
      const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })); const link = document.createElement('a'); link.href = url; link.download = 'frame-smuggler-playtests.json'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
  }
  tick = now => {
    if (!this.active) return;
    const rawDt = now - this.lastTick, dt = Math.min(100, Math.max(0, rawDt)); this.lastTick = now;
    if (this.source === 'demo') {
      if (!this.game.paused) {
        this.cursor.x = clamp(this.cursor.x + (Number(this.keys.has('ArrowRight')) - Number(this.keys.has('ArrowLeft'))) * dt / 1000 * .8);
        this.cursor.y = clamp(this.cursor.y + (Number(this.keys.has('ArrowDown')) - Number(this.keys.has('ArrowUp'))) * dt / 1000 * .8);
      }
      this.cargo = this.demoCargo.update(this.cursor, now);
    } else this.cargo = this.input.cargo.snapshot(now);
    if (rawDt > 500 || this.cargo.state === 'stale') this.pause('stalled');
    if (this.phase === 'ready') this.readyFor = this.cargo.state === 'inside' ? this.readyFor + dt : 0;
    if (this.phase !== 'ready') this.game.step(dt, this.cargo.state);
    const changed = this.phase !== this.game.phase; this.phase = this.game.phase;
    if (this.game.result) {
      this.recordId = crypto.randomUUID();
      const persisted = this.records.add({ id: this.recordId, at: new Date().toISOString(), source: this.source, facing: this.source === 'camera' ? this.facing : null, cameraPlayer: this.swapped ? 'P2' : 'P1', smugglerPlayer: this.swapped ? 'P1' : 'P2', result: this.game.result });
      if (!persisted) this.saveStatus = 'sessionOnly';
      this.releaseInputs(); this.render(); this.notify(); return;
    }
    this.render(); if (changed) this.notify(); this.raf = requestAnimationFrame(this.tick);
  };
  fail() { this.releaseInputs(); this.connected = false; this.phase = 'error'; this.game = new FrameSmuggler(); this.render(); this.notify(); }
  releaseInputs() { ++this.generation; cancelAnimationFrame(this.raf); this.raf = null; this.input.stop(); this.keys.clear(); this.pointer = null; }
  deactivate() { this.active = false; this.releaseInputs(); this.abort?.abort(); this.phase = 'idle'; }
  render() {
    const t = this.t, g = this.game, r = g.result, ready = ['idle', 'setup', 'ready', 'loading', 'error'].includes(this.phase), inspection = g.schedule[g.index];
    const set = (s, text) => { const el = this.$(s); if (el.textContent !== String(text)) el.textContent = text; };
    this.$('.fs-game').dataset.phase = this.phase; this.$('.fs-game').classList.toggle('is-demo', this.source === 'demo');
    this.$('.fs-stage').setAttribute('aria-label', t.board); this.$('.fs-stage').hidden = !!r;
    set('.fs-source', t[this.source === 'demo' ? 'demo' : 'camera']); set('.fs-score', String(Math.floor(g.score)).padStart(3, '0')); set('.fs-checks', `${g.index} / 4`);
    this.$('.fs-clock').innerHTML = `${Math.ceil((ROUND_MS - g.elapsed) / 1000)}<small>SEC</small>`;
    const calls = { keep: 'KEEP', warning: `INSPECTION IN ${Math.max(1, Math.ceil(((inspection?.hide ?? 0) - g.elapsed) / 1000))}`, hide: 'HIDE!', return: 'BACK!', countdown: String(Math.ceil(g.countdown / 1000)) };
    set('.fs-call', g.paused ? 'PAUSED' : calls[this.phase] ?? 'READY');
    set('.fs-instruction', this.phase === 'loading' ? t.loading : ready ? this.connected ? t.ready : t.setup : t[this.phase] ?? '');
    set('.fs-eyebrow', this.phase === 'hide' ? `INSPECTION ${g.index + 1} / 4` : '30 SECOND SURVIVAL');
    const cargo = this.cargo ?? { state: 'lost', point: null }, point = cargo.point;
    this.$('.fs-cargo').hidden = !point || cargo.state === 'outside' || cargo.state === 'stale';
    if (point) { this.$('.fs-cargo').style.left = `${point.x * 100}%`; this.$('.fs-cargo').style.top = `${point.y * 100}%`; }
    set('.fs-tracking', t[cargo.state]);
    const notice = g.noticeUntil > g.elapsed ? t[g.notice] : g.safeUntil > g.elapsed ? t.safe : this.phase === 'hide' && cargo.state === 'outside' ? t.hideHeld : '';
    set('.fs-notice', notice); this.$('.fs-progress i').style.width = `${100 * (1 - g.elapsed / ROUND_MS)}%`;
    this.$('.fs-ready').hidden = !ready; set('.fs-camera-role', `CAMERA · ${this.swapped ? 'P2' : 'P1'}`); set('.fs-smuggler-role', `SMUGGLER · ${this.swapped ? 'P1' : 'P2'}`);
    set('.fs-camera-desc', t.roles[0]); set('.fs-smuggler-desc', t.roles[1]); set('.fs-ready-copy', this.swapped ? t.swapHint : t.setup);
    this.$('.fs-camera-settings').hidden = this.source !== 'camera'; set('.fs-rear', t.rear); set('.fs-front', t.front);
    set('[data-fs="connect"]', this.phase === 'loading' ? t.loading : this.connected ? t.switch : t.connect); this.$('[data-fs="connect"]').disabled = this.phase === 'loading';
    set('.fs-start', t.start); this.$('.fs-start').disabled = this.phase !== 'ready' || this.readyFor < 400;
    this.$('.fs-error').hidden = this.phase !== 'error'; set('.fs-error', t.error); this.$('.fs-try-demo').hidden = this.phase !== 'error'; set('.fs-try-demo', t.tryDemo);
    this.$('.fs-controls').hidden = ready || !!r; set('[data-fs="pause"]', t.pause); set('.fs-controls-hint', 'KEEP → HIDE → BACK');
    this.$('.fs-pause-overlay').hidden = !g.paused || !!r; set('.fs-pause-overlay p', t[this.pauseReason] ?? t.pauseHint); set('[data-fs="resume"]', t.resume); this.$('[data-fs="resume"]').disabled = cargo.state === 'stale';
    this.$('.fs-practice').hidden = this.source !== 'demo' || !!r; set('.fs-practice p', t.practice); set('[data-fs="hide"]', t.hideButton); set('[data-fs="back"]', t.backButton);
    this.$('.fs-result').hidden = !r;
    if (r) {
      set('.fs-result-source', t[this.source === 'demo' ? 'demo' : 'sourceCamera']);
      this.$('.fs-stats').innerHTML = [[t.score, r.score], [t.cleared, `${r.inspectionsCleared} / 4`], [t.best, r.bestHideMs === null ? '—' : `${(r.bestHideMs / 1000).toFixed(2)}s`], [t.caughtLabel, r.caught]].map(([label, value]) => `<div><dt>${label}</dt><dd>${value}</dd></div>`).join('');
    }
    set('.fs-swap-hint', t.swapHint); set('.fs-survey summary', t.survey); set('.fs-survey-hint', t.surveyHint); set('.fs-save', t.save);
    this.$('.fs-survey').hidden = this.source !== 'camera'; set('.fs-save-status', this.saveStatus ? t[this.saveStatus] : '');
    const count = this.records.humanCount(); set('.fs-record-count', `${t.recorded}: ${count} / 5. ${count >= 5 ? t.gateReady : t.pending}`); set('[data-fs="export"]', t.export);
  }
}
