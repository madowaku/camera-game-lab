import { DuelInput } from './handInput.js';
import { CONFIG, clamp, geometry, updateNets, createMatch, stepMatch, resizeMatch, usableNet } from './rules.js';
import { copy } from './messages.js';
import './duel.css';

function cameraErrorMessageKey(error) {
  if (window.isSecureContext === false) return 'secureRequired';
  if (error?.name === 'NotAllowedError') return 'permissionDenied';
  if (['NotFoundError', 'FrontCameraUnavailableError'].includes(error?.name)) return 'cameraUnavailable';
  if (error?.name === 'NotReadableError') return 'cameraBusy';
  return 'error';
}

export class TensionDuel {
  constructor(root, locale = 'ja', { onExit } = {}) {
    Object.assign(this, { root, locale, onExit, active: false, phase: 'intro', mode: 'camera', nets: [null, null], match: createMatch(), impacts: [null, null], status: '', countdown: 0, generation: 0, sound: true, advancing: false, trail: [], pointAt: -Infinity });
    this.fake = [{ x: .18, y: .28, angle: 0, distance: .105 }, { x: .82, y: .28, angle: 0, distance: .105 }];
    root.innerHTML = `<div class="td-shell">
      <section class="td-stage">
        <img class="td-artwork" src="/artwork/tension-duel-intro.webp" alt="" width="1536" height="864" fetchpriority="high">
        <video class="td-video" autoplay muted playsinline aria-hidden="true"></video><canvas class="td-canvas" aria-hidden="true"></canvas>
        <div class="td-hud"><span class="td-player td-p1">P1 <small></small></span><div class="td-score"><strong>0 : 0</strong><span class="td-timer">15s</span><span class="td-rally"></span></div><span class="td-player td-p2">P2 <small></small></span></div>
        <div class="td-card"><span class="td-card-label"></span><h2></h2><p></p><div class="td-summary"></div></div>
        <div class="td-ready-panel" hidden><strong class="td-countdown"></strong><span class="td-ready-copy"></span></div>
        <div class="td-point" hidden aria-hidden="true"></div>
        <div class="td-hint" role="status" aria-live="polite"></div>
        <button class="td-skip" type="button" hidden></button>
      </section>
      <div class="td-session"><span class="td-mode"></span><span class="td-length"></span><span class="td-tip"></span></div>
      <div class="td-actions"><button class="button button--primary td-start" type="button"></button><button class="button td-demo" type="button"></button><button class="button td-full" type="button"></button><button class="button td-pause" type="button" hidden></button><button class="button td-exit" type="button"></button></div>
      <p class="td-status" role="status"></p><p class="td-rotate"></p>
      <section class="td-controls" hidden>${[0, 1].map(p => `<fieldset><legend>P${p + 1}</legend>${['position', 'angle', 'opening'].map((kind, i) => `<label><span data-copy="${kind}"></span><input type="range" data-player="${p}" data-kind="${kind}" min="${i === 0 ? 5 : i === 1 ? -70 : 3}" max="${i === 0 ? 95 : i === 1 ? 70 : 21}" value="${i === 0 ? 50 : i === 1 ? 0 : 10.5}" step="0.5"></label>`).join('')}</fieldset>`).join('')}</section>
      <details class="howto td-how"><summary></summary><p class="td-guide"></p><p class="td-demo-guide" hidden></p><p class="td-keys" hidden></p><p class="td-privacy"></p><div class="td-options"><button class="button td-sound" type="button"></button></div></details>
    </div>`;
    this.$ = s => root.querySelector(s);
    this.stage = this.$('.td-stage'); this.video = this.$('video'); this.canvas = this.$('canvas'); this.ctx = this.canvas.getContext('2d');
    this.input = new DuelInput(this.video, this.stage, {
      onStatus: (status, error) => {
        if (!this.active || this.mode !== 'camera') return;
        if (status === 'ERROR') { this.generation++; clearTimeout(this.timeout); this.phase = 'intro'; this.status = cameraErrorMessageKey(error); this.nets = [null, null]; this.advancing = false; }
        else this.status = status === 'LOADING_MODEL' ? 'loading' : status === 'REQUESTING_CAMERA' ? 'permission' : '';
        this.render();
      },
      onResult: (hands, now) => { if (this.active && this.mode === 'camera') this.nets = updateNets(this.nets, hands, now); }
    });
    this.$('.td-start').addEventListener('click', () => this.start());
    this.$('.td-demo').addEventListener('click', () => {
      if (this.mode === 'demo' && this.phase !== 'intro' && this.phase !== 'loading') { this.mode = 'camera'; this.phase = 'intro'; void this.start(); }
      else this.startDemo();
    });
    this.$('.td-exit').addEventListener('click', () => this.onExit?.());
    this.$('.td-pause').addEventListener('click', () => this.pause());
    this.$('.td-skip').addEventListener('click', () => { this.countdown = .01; });
    this.$('.td-sound').addEventListener('click', () => { this.sound = !this.sound; this.render(); });
    this.$('.td-full').addEventListener('click', () => { void this.toggleFullscreen(); });
    root.querySelectorAll('input').forEach(el => el.addEventListener('input', () => {
      const f = this.fake[Number(el.dataset.player)], value = Number(el.value);
      if (el.dataset.kind === 'position') f.y = this.height * value / 100;
      if (el.dataset.kind === 'angle') f.angle = value * Math.PI / 180;
      if (el.dataset.kind === 'opening') f.distance = value / 100;
    }));
    const movePointer = e => {
      if (this.mode !== 'demo' || !this.pointers?.has(e.pointerId)) return;
      const r = this.stage.getBoundingClientRect(), f = this.fake[this.pointers.get(e.pointerId)];
      f.y = clamp((e.clientY - r.top) / r.width, .03, this.height - .03);
      this.syncControls();
    };
    this.pointers = new Map();
    this.stage.addEventListener('pointerdown', e => {
      if (this.mode !== 'demo' || !['ready', 'playing', 'paused'].includes(this.phase) || e.target.closest('button')) return;
      const r = this.stage.getBoundingClientRect(); this.pointers.set(e.pointerId, e.clientX - r.left < r.width / 2 ? 0 : 1); this.stage.setPointerCapture(e.pointerId); movePointer(e);
    });
    this.stage.addEventListener('pointermove', movePointer);
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) this.stage.addEventListener(type, e => this.pointers.delete(e.pointerId));
    this.onKey = e => {
      if (!this.active || e.isComposing || e.target?.matches?.('input, summary')) return;
      if (e.key === 'Escape' && this.phase === 'playing') { this.pause(); return; }
      if (this.mode !== 'demo' || !['ready', 'playing', 'paused'].includes(this.phase)) return;
      const bindings = { w:[0,'y',-.025], s:[0,'y',.025], q:[0,'angle',-.1], a:[0,'angle',.1], e:[0,'distance',.01], d:[0,'distance',-.01], ArrowUp:[1,'y',-.025], ArrowDown:[1,'y',.025], o:[1,'angle',-.1], l:[1,'angle',.1], i:[1,'distance',.01], k:[1,'distance',-.01] };
      const b = bindings[e.key]; if (!b) return;
      e.preventDefault(); const f = this.fake[b[0]], kind = b[1];
      f[kind] = clamp(f[kind] + b[2], kind === 'y' ? .03 : kind === 'angle' ? -1.22 : .03, kind === 'y' ? this.height - .03 : kind === 'angle' ? 1.22 : .21); this.syncControls();
    };
    window.addEventListener('keydown', this.onKey);
    this.onVisibility = () => {
      this.last = null; this.advancing = false; this.pointers.clear();
      if (document.hidden) void this.releaseWakeLock();
      else if (this.phase === 'playing') void this.keepAwake();
    };
    document.addEventListener('visibilitychange', this.onVisibility);
    this.onFullscreenChange = () => {
      if (document.fullscreenElement !== this.$('.td-shell')) window.screen?.orientation?.unlock?.();
      this.render();
    };
    document.addEventListener('fullscreenchange', this.onFullscreenChange);
    this.render();
  }
  get t() { return copy[this.locale]; }
  get height() { const r = this.stage.getBoundingClientRect(); return r.width ? r.height / r.width : 9 / 16; }
  setLocale(locale) { this.locale = locale; this.render(); }
  activate() { this.active = true; this.root.hidden = false; this.phase = 'intro'; this.mode = 'camera'; this.render(); this.last = null; this.raf = requestAnimationFrame(this.tick); }
  deactivate() {
    this.active = false; this.generation++; clearTimeout(this.timeout); cancelAnimationFrame(this.raf); this.input.stop(); this.nets = [null, null]; this.phase = 'intro'; this.status = ''; this.root.hidden = true; this.audio?.suspend();
    void this.releaseWakeLock();
    this.pointers.clear();
    this.advancing = false; this.trail = [];
    if (document.fullscreenElement === this.$('.td-shell')) document.exitFullscreen().catch(() => {});
  }
  prepareAudio() {
    if (!this.audio) { const Audio = window.AudioContext || window.webkitAudioContext; if (Audio) this.audio = new Audio(); }
    this.audio?.resume().catch(() => {});
  }
  async toggleFullscreen() {
    const shell = this.$('.td-shell');
    try {
      if (document.fullscreenElement === shell) {
        await document.exitFullscreen();
        window.screen?.orientation?.unlock?.();
      } else if (shell.requestFullscreen) {
        await shell.requestFullscreen({ navigationUI: 'hide' });
        try { await window.screen?.orientation?.lock?.('landscape'); } catch { /* Rotation lock is optional and browser-specific. */ }
      }
    } catch { /* Fullscreen can be unavailable or declined; the page remains playable. */ }
    this.render();
  }
  async keepAwake() {
    if (!navigator.wakeLock?.request || this.wakeLock || this.wakeLockPending || document.hidden || !this.active || this.phase !== 'playing') return;
    this.wakeLockPending = true;
    try {
      const sentinel = await navigator.wakeLock.request('screen');
      if (!this.active || this.phase !== 'playing' || document.hidden) { await sentinel.release(); return; }
      this.wakeLock = sentinel;
      sentinel.addEventListener('release', () => { if (this.wakeLock === sentinel) this.wakeLock = null; }, { once: true });
    } catch { /* Wake Lock is an enhancement; unsupported browsers still play normally. */ }
    finally { this.wakeLockPending = false; }
  }
  async releaseWakeLock() {
    const sentinel = this.wakeLock;
    this.wakeLock = null;
    if (sentinel && !sentinel.released) { try { await sentinel.release(); } catch { /* The browser may already have released it. */ } }
  }
  tone(type, state = 1) {
    if (!this.sound || !this.audio || this.audio.state !== 'running') return;
    const osc = this.audio.createOscillator(), gain = this.audio.createGain(), now = this.audio.currentTime;
    osc.type = 'sine'; osc.frequency.setValueAtTime(type === 'hit' ? [180, 300, 450, 510][state] : type === 'point' ? 700 : 540, now);
    osc.frequency.exponentialRampToValueAtTime(type === 'hit' ? 90 : 260, now + .15);
    gain.gain.setValueAtTime(.0001, now); gain.gain.exponentialRampToValueAtTime(.08, now + .008); gain.gain.exponentialRampToValueAtTime(.0001, now + .22);
    osc.connect(gain).connect(this.audio.destination); osc.start(); osc.stop(now + .23);
  }
  async start() {
    this.prepareAudio();
    if (this.phase === 'paused') return this.resume();
    if (this.phase === 'loading') return;
    if (this.mode === 'demo' && this.phase === 'result') return this.ready();
    if (this.mode === 'camera' && this.input.running) return this.ready();
    this.mode = 'camera'; this.phase = 'loading'; this.status = 'loading'; this.nets = [null, null]; this.render();
    const generation = ++this.generation;
    // Bound initialization so an offline model request never traps the user.
    this.timeout = setTimeout(() => {
      if (generation !== this.generation || !this.active) return;
      this.generation++; this.input.stop(); this.phase = 'intro'; this.status = 'error'; this.render();
    }, 25000);
    try {
      await this.input.start();
      if (generation !== this.generation || !this.active) return;
      clearTimeout(this.timeout); this.ready();
    } catch (error) {
      if (generation !== this.generation || !this.active) return;
      clearTimeout(this.timeout); this.input.stop(); this.phase = 'intro'; this.status = cameraErrorMessageKey(error); this.render();
    }
  }
  startDemo() {
    this.prepareAudio(); this.generation++; clearTimeout(this.timeout); this.input.stop(); this.mode = 'demo';
    this.fake.forEach(f => { f.y = this.height / 2; f.angle = 0; f.distance = .105; }); this.syncControls(); this.ready();
  }
  ready() { this.phase = 'ready'; this.countdown = CONFIG.readyTime; this.status = ''; this.match = createMatch(this.height); this.impacts = [null, null]; this.last = null; this.advancing = false; this.trail = []; this.pointAt = -Infinity; this.render(); }
  pause() {
    if (this.phase !== 'playing') return;
    this.phase = 'paused'; this.advancing = false; void this.releaseWakeLock(); this.pointers.clear(); this.render();
    this.$('.td-start').focus({ preventScroll: true });
  }
  resume() { this.phase = 'playing'; this.last = null; this.advancing = false; void this.keepAwake(); this.render(); }
  fitArena() {
    const before = this.match.height;
    if (!resizeMatch(this.match, this.height)) return;
    this.fake.forEach(f => { f.y = clamp(f.y / before * this.height, .03, this.height - .03); });
    // Camera cover-cropping also changes on rotation. Await a fresh projection
    // rather than colliding against endpoints from the previous viewport.
    if (this.mode === 'camera') this.nets = [null, null];
    this.impacts = [null, null]; this.trail = []; this.advancing = false;
    this.syncControls();
  }
  syncControls() {
    this.root.querySelectorAll('input').forEach(el => {
      const f = this.fake[Number(el.dataset.player)]; el.value = el.dataset.kind === 'position' ? f.y / this.height * 100 : el.dataset.kind === 'angle' ? f.angle * 180 / Math.PI : f.distance * 100;
    });
  }
  tick = now => {
    if (!this.active) return;
    const dt = this.last === null ? 0 : Math.max(0, (now - this.last) / 1000); this.last = now;
    this.fitArena();
    if (this.mode === 'demo') {
      this.nets = this.fake.map(f => { const dx = Math.sin(f.angle) * f.distance / 2, dy = Math.cos(f.angle) * f.distance / 2;
        f.y = clamp(f.y, Math.abs(dy) + .006, this.height - Math.abs(dy) - .006);
        return { ...geometry({ x:f.x-dx, y:f.y-dy }, { x:f.x+dx, y:f.y+dy }), active:true, opacity:1, seenAt:now }; });
    } else this.nets = this.nets.map(n => !n ? null : { ...n, active: now - n.seenAt <= CONFIG.holdMs, opacity: clamp(1 - (now - n.seenAt - CONFIG.holdMs) / CONFIG.fadeMs, 0, 1) });
    const usable = this.nets.every(n => usableNet(n, this.height));
    if (this.phase === 'ready') {
      const placed = usable && this.nets[0].center.x < .5 && this.nets[1].center.x >= .5;
      if (placed && !document.hidden) this.countdown -= Math.min(dt, .1);
      else this.countdown = CONFIG.readyTime;
      if (this.countdown <= 0) { this.phase = 'playing'; void this.keepAwake(); this.tone('start'); this.render(); }
      this.$('.td-countdown').textContent = placed ? String(Math.ceil(Math.max(0, this.countdown))) : 'C';
      this.$('.td-ready-copy').textContent = placed ? this.t.steps[Math.min(2, Math.floor(CONFIG.readyTime - this.countdown))] : this.t.waiting;
      this.setHint(placed ? this.t.countdown : this.t.readyDetail);
    } else if (this.phase === 'playing') {
      if (usable && !document.hidden) {
        // The elapsed interval may have begun with missing hands. Never charge
        // that paused interval to the match, or jump after a stalled frame.
        for (const event of stepMatch(this.match, this.nets, this.advancing ? Math.min(dt, .1) : 0)) {
          this.tone(event.type, event.state);
          if (event.type === 'hit') this.impacts[event.player] = { at:now, point:event.point, state:event.state };
          if (event.type === 'point') { this.pointAt = now; this.pointPlayer = event.player; this.trail = []; }
          if (event.type === 'end') { this.phase = 'result'; void this.releaseWakeLock(); this.render(); this.$('.td-start').focus({ preventScroll: true }); }
        }
        this.advancing = this.phase === 'playing';
        if (this.phase === 'playing') this.setHint(this.match.serve > 0 ? `${this.t.serveTo}${this.match.serveDirection < 0 ? 1 : 2}` : '');
      } else this.setHint(document.hidden ? this.t.hidden : this.t.lost);
      if (!usable || document.hidden) this.advancing = false;
    }
    this.$('.td-score strong').textContent = this.match.score.join(' : ');
    this.$('.td-timer').textContent = `${Math.ceil(this.match.remaining)}s`;
    this.$('.td-rally').textContent = `${this.t.rallyLive} ${this.match.rally}`;
    this.$('.td-point').hidden = this.phase !== 'playing' || now - this.pointAt > 650;
    this.$('.td-point').textContent = `P${(this.pointPlayer ?? 0) + 1} +1`;
    this.$('.td-point').dataset.player = String(this.pointPlayer ?? 0);
    for (let p = 0; p < 2; p++) this.$(`.td-p${p+1} small`).textContent = usableNet(this.nets[p], this.height) ? this.t.ready : this.t.missing;
    this.draw(now); this.raf = requestAnimationFrame(this.tick);
  };
  setHint(text) { const el = this.$('.td-hint'); if (el.textContent !== text) el.textContent = text; el.hidden = !text; }
  render() {
    const t = this.t, result = this.phase === 'result', paused = this.phase === 'paused', intro = this.phase === 'intro' || this.phase === 'loading';
    this.root.closest('.lab')?.classList.toggle('lab--in-round', ['ready', 'playing', 'paused'].includes(this.phase));
    this.stage.setAttribute('aria-label', t.arena); this.stage.dataset.phase = this.phase; this.stage.dataset.mode = this.mode;
    this.$('.td-artwork').hidden = !intro && !result;
    this.video.hidden = this.mode !== 'camera' || !this.input.running;
    this.$('.td-card').hidden = !intro && !result && !paused;
    this.$('.td-card-label').textContent = result ? this.mode === 'demo' ? t.resultDemo : t.resultCamera : paused ? t.pause : t.playerCount;
    this.$('.td-card h2').textContent = paused ? t.paused : result ? this.match.score[0] === this.match.score[1] ? t.result : `P${this.match.score[0] > this.match.score[1] ? 1 : 2}${t.wins}` : t.intro;
    this.$('.td-card p').textContent = paused ? t.pausedDetail : result ? `${this.match.score.join(' : ')}` : t.detail;
    this.$('.td-summary').textContent = result ? `${t.hits} ${this.match.hits} · ${t.rally} ${this.match.bestRally}` : '';
    const start = this.$('.td-start'); start.textContent = paused ? t.resume : result ? t.retry : t.start; start.disabled = this.phase === 'loading'; start.hidden = ['ready','playing'].includes(this.phase); start.setAttribute('aria-busy', String(this.phase === 'loading'));
    this.$('.td-demo').textContent = this.mode === 'demo' && !intro ? t.camera : t.demo;
    this.$('.td-demo').hidden = ['playing', 'ready', 'paused'].includes(this.phase);
    this.$('.td-pause').textContent = t.pause; this.$('.td-pause').hidden = this.phase !== 'playing';
    this.$('.td-exit').textContent = t.back;
    this.$('.td-status').textContent = t[this.status] ?? '';
    this.$('.td-rotate').textContent = t.rotate;
    this.$('.td-mode').textContent = this.mode === 'demo' ? t.mode : t.cameraMode;
    this.$('.td-mode').dataset.mode = this.mode;
    this.$('.td-length').textContent = t.matchLength;
    this.$('.td-tip').textContent = t.returnTip;
    this.$('.td-ready-panel').hidden = this.phase !== 'ready';
    this.$('.td-controls').hidden = this.mode !== 'demo' || intro;
    this.$('.td-how summary').textContent = t.how; this.$('.td-guide').textContent = t.guide;
    this.$('.td-privacy').textContent = t.privacy;
    this.$('.td-demo-guide').hidden = this.$('.td-keys').hidden = this.mode !== 'demo';
    this.$('.td-demo-guide').textContent = t.demoGuide; this.$('.td-keys').textContent = t.keys;
    this.$('.td-sound').textContent = `${t.sound} ${this.sound ? 'ON' : 'OFF'}`; this.$('.td-sound').setAttribute('aria-pressed', String(this.sound));
    this.$('.td-full').textContent = document.fullscreenElement === this.$('.td-shell') ? t.exitFullscreen : t.fullscreen;
    this.$('.td-full').hidden = !this.$('.td-shell').requestFullscreen;
    this.root.querySelectorAll('[data-copy]').forEach(el => el.textContent = t[el.dataset.copy]);
    this.root.querySelectorAll('input').forEach(el => el.setAttribute('aria-label', `P${Number(el.dataset.player)+1} ${t[el.dataset.kind]}`));
    this.$('.td-skip').textContent = t.skip; this.$('.td-skip').hidden = this.phase !== 'ready';
    if (intro || result || paused) this.setHint('');
  }
  draw(now) {
    const r = this.stage.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.round(r.width*dpr), height = Math.round(r.height*dpr);
    if (!width || !height) return;
    if (this.canvas.width !== width || this.canvas.height !== height) { this.canvas.width = width; this.canvas.height = height; }
    const c = this.ctx; c.setTransform(width, 0, 0, width, 0, 0); c.clearRect(0, 0, 1, this.height);
    const colors = ['#7be4ec','#ffbe86'];
    if (!['ready', 'playing', 'paused'].includes(this.phase)) return;
    // A quiet center line and colored goal edges make direction legible without
    // covering the camera. All coordinates share the fingertip projection.
    c.save(); c.strokeStyle = '#ffffff20'; c.lineWidth = .002; c.setLineDash([.008, .014]);
    c.beginPath(); c.moveTo(.5, .025); c.lineTo(.5, this.height - .025); c.stroke(); c.setLineDash([]);
    for (let p = 0; p < 2; p++) {
      c.strokeStyle = colors[p]; c.globalAlpha = .35; c.lineWidth = .005;
      c.beginPath(); c.moveTo(p ? .998 : .002, .035); c.lineTo(p ? .998 : .002, this.height - .035); c.stroke();
    }
    c.restore();
    for (let p=0;p<2;p++) {
      const n = this.nets[p]; if (!n?.opacity) continue;
      c.save(); c.globalAlpha = n.opacity; c.strokeStyle = colors[p]; c.fillStyle = colors[p]; c.shadowColor = colors[p]; c.shadowBlur = 12;
      const impact = this.impacts[p], age = impact ? (now-impact.at)/1000 : 1;
      const snap = age < .32 ? Math.sin(age*34)*Math.exp(-age*10)*.045 : 0;
      const sag = n.state === 0 ? .025 : 0;
      const mid = { x:n.center.x + snap * (p ? -1 : 1), y:n.center.y + sag };
      c.lineWidth = [.008,.005,.003,.002][n.state];
      for (let strand=-1;strand<=1;strand++) {
        c.beginPath(); c.moveTo(n.thumb.x,n.thumb.y); c.quadraticCurveTo(mid.x+strand*.004,mid.y+strand*.004,n.index.x,n.index.y); c.stroke();
      }
      for (const point of [n.thumb,n.index]) { c.beginPath(); c.arc(point.x,point.y,.007,0,Math.PI*2); c.fill(); }
      c.shadowBlur=0; c.font=`600 ${Math.max(.018, 12 / r.width)}px system-ui`; c.textAlign='center';
      c.fillText(`P${p + 1} · ${this.t.states[n.state]}`,clamp(n.center.x, .1, .9),clamp(n.center.y-n.distance/2-.024, .13, this.height - .02));
      if (age < .25) { c.globalAlpha = 1-age/.25; c.lineWidth=.003; c.beginPath(); c.arc(impact.point.x,impact.point.y,.015+age*.15,0,Math.PI*2); c.stroke(); }
      c.restore();
    }
    if (['ready','playing','paused'].includes(this.phase)) {
      const b=this.match.ball;
      if (this.phase === 'playing' && this.advancing && this.match.serve === 0) {
        this.trail.push({ x:b.x, y:b.y }); if (this.trail.length > 9) this.trail.shift();
      }
      c.save(); c.fillStyle='#fff9ed';
      this.trail.forEach((point, i) => { c.globalAlpha = (i + 1) / this.trail.length * .2; c.beginPath(); c.arc(point.x, point.y, CONFIG.radius * .65, 0, Math.PI * 2); c.fill(); });
      c.restore(); c.fillStyle='#fff9ed'; c.shadowColor='#fff9ed'; c.shadowBlur=14;
      c.beginPath(); c.arc(b.x,b.y,CONFIG.radius,0,Math.PI*2); c.fill(); c.shadowBlur=0;
    }
  }
}
