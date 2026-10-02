import { DuelInput } from './handInput.js';
import { CONFIG, clamp, geometry, updateNets, createMatch, stepMatch } from './rules.js';
import { copy } from './messages.js';
import './duel.css';

export class TensionDuel {
  constructor(root, locale = 'ja', { onExit } = {}) {
    Object.assign(this, { root, locale, onExit, active: false, phase: 'intro', mode: 'camera', nets: [null, null], match: createMatch(), impacts: [null, null], status: '', countdown: 0, generation: 0, sound: true });
    this.fake = [{ x: .18, y: .28, angle: 0, distance: .105 }, { x: .82, y: .28, angle: 0, distance: .105 }];
    root.innerHTML = `<div class="td-shell">
      <section class="td-stage">
        <video class="td-video" autoplay muted playsinline></video><canvas class="td-canvas" aria-hidden="true"></canvas>
        <div class="td-hud"><span class="td-player td-p1">P1 <small></small></span><div class="td-score"><strong>0 : 0</strong><span class="td-timer">15s</span></div><span class="td-player td-p2">P2 <small></small></span></div>
        <div class="td-card"><div class="td-fingers" aria-hidden="true"><svg viewBox="0 0 160 120"><path d="M114 25 C74 4 35 27 35 61 C35 100 79 115 113 94"/><path class="td-string" d="M114 25 Q91 59 113 94"/><circle cx="114" cy="25" r="6"/><circle cx="113" cy="94" r="6"/></svg></div><h2></h2><p></p><div class="td-summary"></div></div>
        <div class="td-hint" role="status" aria-live="polite"></div>
        <button class="td-skip" type="button" hidden></button>
      </section>
      <div class="td-actions"><button class="button button--primary td-start" type="button"></button><button class="button td-demo" type="button"></button><button class="button td-exit" type="button"></button></div>
      <p class="td-status" role="status"></p><p class="td-rotate"></p>
      <section class="td-controls" hidden>${[0, 1].map(p => `<fieldset><legend>P${p + 1}</legend>${['position', 'angle', 'opening'].map((kind, i) => `<label><span data-copy="${kind}"></span><input type="range" data-player="${p}" data-kind="${kind}" min="${i === 0 ? 5 : i === 1 ? -70 : 3}" max="${i === 0 ? 95 : i === 1 ? 70 : 21}" value="${i === 0 ? 50 : i === 1 ? 0 : 10.5}" step="0.5"></label>`).join('')}</fieldset>`).join('')}</section>
      <details class="howto td-how"><summary></summary><p class="td-guide"></p><p class="td-demo-guide" hidden></p><p class="td-keys" hidden></p><p class="td-privacy"></p><div class="td-options"><button class="button td-sound" type="button"></button><button class="button td-full" type="button"></button></div></details>
    </div>`;
    this.$ = s => root.querySelector(s);
    this.stage = this.$('.td-stage'); this.video = this.$('video'); this.canvas = this.$('canvas'); this.ctx = this.canvas.getContext('2d');
    this.input = new DuelInput(this.video, this.stage, {
      onStatus: status => {
        if (!this.active || this.mode !== 'camera') return;
        if (status === 'ERROR') { this.generation++; this.phase = 'intro'; this.status = 'cameraFailed'; this.nets = [null, null]; }
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
    this.$('.td-skip').addEventListener('click', () => { this.countdown = .01; });
    this.$('.td-sound').addEventListener('click', () => { this.sound = !this.sound; this.render(); });
    this.$('.td-full').addEventListener('click', async () => { try { if (document.fullscreenElement) await document.exitFullscreen(); else await this.$('.td-shell').requestFullscreen?.(); } catch { /* Browser may not offer fullscreen. */ } });
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
      if (this.mode !== 'demo' || e.target.closest('button')) return;
      const r = this.stage.getBoundingClientRect(); this.pointers.set(e.pointerId, e.clientX - r.left < r.width / 2 ? 0 : 1); this.stage.setPointerCapture(e.pointerId); movePointer(e);
    });
    this.stage.addEventListener('pointermove', movePointer);
    for (const type of ['pointerup', 'pointercancel']) this.stage.addEventListener(type, e => this.pointers.delete(e.pointerId));
    this.onKey = e => {
      if (!this.active || this.mode !== 'demo' || e.isComposing || e.target?.matches?.('input, summary')) return;
      const bindings = { w:[0,'y',-.025], s:[0,'y',.025], q:[0,'angle',-.1], a:[0,'angle',.1], e:[0,'distance',.01], d:[0,'distance',-.01], ArrowUp:[1,'y',-.025], ArrowDown:[1,'y',.025], o:[1,'angle',-.1], l:[1,'angle',.1], i:[1,'distance',.01], k:[1,'distance',-.01] };
      const b = bindings[e.key]; if (!b) return;
      e.preventDefault(); const f = this.fake[b[0]], kind = b[1];
      f[kind] = clamp(f[kind] + b[2], kind === 'y' ? .03 : kind === 'angle' ? -1.22 : .03, kind === 'y' ? this.height - .03 : kind === 'angle' ? 1.22 : .21); this.syncControls();
    };
    window.addEventListener('keydown', this.onKey);
    this.onVisibility = () => { this.last = null; };
    document.addEventListener('visibilitychange', this.onVisibility);
    this.render();
  }
  get t() { return copy[this.locale]; }
  get height() { const r = this.stage.getBoundingClientRect(); return r.width ? r.height / r.width : 9 / 16; }
  setLocale(locale) { this.locale = locale; this.render(); }
  activate() { this.active = true; this.root.hidden = false; this.phase = 'intro'; this.render(); this.last = null; this.raf = requestAnimationFrame(this.tick); }
  deactivate() {
    this.active = false; this.generation++; clearTimeout(this.timeout); cancelAnimationFrame(this.raf); this.input.stop(); this.nets = [null, null]; this.phase = 'intro'; this.status = ''; this.root.hidden = true; this.audio?.suspend();
    this.pointers.clear();
  }
  prepareAudio() {
    if (!this.audio) { const Audio = window.AudioContext || window.webkitAudioContext; if (Audio) this.audio = new Audio(); }
    this.audio?.resume().catch(() => {});
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
    } catch {
      if (generation !== this.generation || !this.active) return;
      clearTimeout(this.timeout); this.input.stop(); this.phase = 'intro'; this.status = 'error'; this.render();
    }
  }
  startDemo() {
    this.prepareAudio(); this.generation++; clearTimeout(this.timeout); this.input.stop(); this.mode = 'demo';
    this.fake.forEach(f => { f.y = this.height / 2; f.angle = 0; f.distance = .105; }); this.syncControls(); this.ready();
  }
  ready() { this.phase = 'ready'; this.countdown = CONFIG.readyTime; this.status = ''; this.match = createMatch(this.height); this.impacts = [null, null]; this.render(); }
  syncControls() {
    this.root.querySelectorAll('input').forEach(el => {
      const f = this.fake[Number(el.dataset.player)]; el.value = el.dataset.kind === 'position' ? f.y / this.height * 100 : el.dataset.kind === 'angle' ? f.angle * 180 / Math.PI : f.distance * 100;
    });
  }
  tick = now => {
    if (!this.active) return;
    const dt = this.last === null ? 0 : Math.max(0, (now - this.last) / 1000); this.last = now;
    if (this.mode === 'demo') {
      this.nets = this.fake.map(f => { const dx = Math.sin(f.angle) * f.distance / 2, dy = Math.cos(f.angle) * f.distance / 2;
        return { ...geometry({ x:f.x-dx, y:f.y-dy }, { x:f.x+dx, y:f.y+dy }), active:true, opacity:1, seenAt:now }; });
    } else this.nets = this.nets.map(n => !n ? null : { ...n, active: now - n.seenAt <= CONFIG.holdMs, opacity: clamp(1 - (now - n.seenAt - CONFIG.holdMs) / CONFIG.fadeMs, 0, 1) });
    const usable = this.nets.every(n => n?.active && n.distance > .015);
    if (this.phase === 'ready') {
      if (usable && !document.hidden) this.countdown -= dt;
      else this.countdown = CONFIG.readyTime;
      if (this.countdown <= 0) { this.phase = 'playing'; this.tone('start'); this.render(); }
      this.setHint(usable ? `${this.t.steps[Math.min(2, Math.floor(CONFIG.readyTime - this.countdown))]} · ${Math.ceil(Math.max(0, this.countdown))}` : this.t.waiting);
    } else if (this.phase === 'playing') {
      if (usable && !document.hidden) {
        for (const event of stepMatch(this.match, this.nets, dt)) {
          this.tone(event.type, event.state);
          if (event.type === 'hit') this.impacts[event.player] = { at:now, point:event.point, state:event.state };
          if (event.type === 'end') { this.phase = 'result'; this.render(); this.$('.td-start').focus({ preventScroll: true }); }
        }
        this.setHint(this.match.serve > 0 ? this.t.serve : this.mode === 'demo' ? this.t.demoGuide : '');
      } else this.setHint(document.hidden ? this.t.hidden : this.t.lost);
    }
    this.$('.td-score strong').textContent = this.match.score.join(' : ');
    this.$('.td-timer').textContent = `${Math.ceil(this.match.remaining)}s`;
    for (let p = 0; p < 2; p++) this.$(`.td-p${p+1} small`).textContent = this.nets[p]?.active && this.nets[p].distance > .015 ? this.t.ready : this.t.missing;
    this.draw(now); this.raf = requestAnimationFrame(this.tick);
  };
  setHint(text) { const el = this.$('.td-hint'); if (el.textContent !== text) el.textContent = text; el.hidden = !text; }
  render() {
    const t = this.t, result = this.phase === 'result', intro = this.phase === 'intro' || this.phase === 'loading';
    this.stage.setAttribute('aria-label', t.arena); this.stage.dataset.phase = this.phase; this.stage.dataset.mode = this.mode;
    this.$('.td-card').hidden = !intro && !result; this.$('.td-fingers').hidden = result;
    this.$('.td-card h2').textContent = result ? this.match.score[0] === this.match.score[1] ? t.result : `P${this.match.score[0] > this.match.score[1] ? 1 : 2}${t.wins}` : t.intro;
    this.$('.td-card p').textContent = result ? `${this.match.score.join(' : ')}` : t.detail;
    this.$('.td-summary').textContent = result ? `${t.hits} ${this.match.hits} · ${t.rally} ${this.match.bestRally}` : '';
    const start = this.$('.td-start'); start.textContent = result ? t.retry : t.start; start.disabled = this.phase === 'loading'; start.hidden = ['ready','playing'].includes(this.phase); start.setAttribute('aria-busy', String(this.phase === 'loading'));
    this.$('.td-demo').textContent = this.mode === 'demo' && !intro ? t.camera : t.demo;
    this.$('.td-demo').hidden = this.phase === 'playing' || this.phase === 'ready';
    this.$('.td-exit').textContent = t.back;
    this.$('.td-status').textContent = t[this.status] ?? '';
    this.$('.td-rotate').textContent = t.rotate;
    this.$('.td-controls').hidden = this.mode !== 'demo' || intro;
    this.$('.td-how summary').textContent = t.how; this.$('.td-guide').textContent = t.guide;
    this.$('.td-privacy').textContent = t.privacy;
    this.$('.td-demo-guide').hidden = this.$('.td-keys').hidden = this.mode !== 'demo';
    this.$('.td-demo-guide').textContent = t.demoGuide; this.$('.td-keys').textContent = t.keys;
    this.$('.td-sound').textContent = `${t.sound} ${this.sound ? 'ON' : 'OFF'}`; this.$('.td-sound').setAttribute('aria-pressed', String(this.sound));
    this.$('.td-full').textContent = t.fullscreen; this.$('.td-full').hidden = !this.$('.td-shell').requestFullscreen;
    this.root.querySelectorAll('[data-copy]').forEach(el => el.textContent = t[el.dataset.copy]);
    this.root.querySelectorAll('input').forEach(el => el.setAttribute('aria-label', `P${Number(el.dataset.player)+1} ${t[el.dataset.kind]}`));
    this.$('.td-skip').textContent = t.skip; this.$('.td-skip').hidden = this.phase !== 'ready';
    if (intro || result) this.setHint('');
  }
  draw(now) {
    const r = this.stage.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.round(r.width*dpr), height = Math.round(r.height*dpr);
    if (!width || !height) return;
    if (this.canvas.width !== width || this.canvas.height !== height) { this.canvas.width = width; this.canvas.height = height; }
    const c = this.ctx; c.setTransform(width, 0, 0, width, 0, 0); c.clearRect(0, 0, 1, this.height);
    const colors = ['#7be4ec','#ffbe86'];
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
      c.shadowBlur=0; c.font=`600 ${Math.max(.018, 10 / r.width)}px system-ui`; c.textAlign='center';
      c.fillText(this.t.states[n.state],n.center.x,Math.max(.08,n.center.y-n.distance/2-.024));
      if (age < .25) { c.globalAlpha = 1-age/.25; c.lineWidth=.003; c.beginPath(); c.arc(impact.point.x,impact.point.y,.015+age*.15,0,Math.PI*2); c.stroke(); }
      c.restore();
    }
    if (['ready','playing'].includes(this.phase)) {
      const b=this.match.ball; c.fillStyle='#fff9ed'; c.shadowColor='#fff9ed'; c.shadowBlur=14;
      c.beginPath(); c.arc(b.x,b.y,CONFIG.radius,0,Math.PI*2); c.fill(); c.shadowBlur=0;
    }
  }
}
