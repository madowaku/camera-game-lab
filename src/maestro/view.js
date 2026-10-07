import { InstrumentSession } from '../camera/instrument/InstrumentSession.js';
import { projectCameraPoint } from '../camera/instrument/InstrumentZone.js';
import { MaestroPoseInput } from '../input/cameraInstrumentInput.js';
import { MaestroGame, clamp } from './core.js';
import { GestureMapper, normalizePose } from './GestureMapper.js';
import { OrchestraAudio } from './audio.js';
import orchestra from './assets/orchestra-v1.webp';
import '../camera/instrument/style.css';

export function createView(root, locale = 'ja') { return new MaestroView(root, locale); }
export class MaestroView extends InstrumentSession {
  constructor(root, locale) {
    super(root, locale); this.audio = new OrchestraAudio(); this.mapper = new GestureMapper();
    root.innerHTML = `<section class="cmi-view maestro-view"><header class="cmi-toolbar"><span>MAESTRO / FREE SESSION</span><button class="cmi-sound" type="button"></button><button class="cmi-pause" type="button"></button></header>
      <div class="cmi-stage maestro-stage" tabindex="0" role="group" aria-label="Conduct your miniature orchestra"><video muted playsinline></video><canvas aria-hidden="true"></canvas><span class="cmi-mode-badge"></span><div class="maestro-state">READY</div><div class="cmi-guidance" role="status" aria-live="polite"></div><div class="maestro-orchestra" aria-hidden="true">${['strings','brass','percussion'].map((name, i) => `<div class="maestro-musician" data-section="${name}"><img src="${orchestra}" style="--cell:${i}" alt=""></div>`).join('')}</div><div class="cmi-overlay" role="status" hidden></div><div class="maestro-bravo" hidden><small>TAKE A BOW</small><strong>BRAVO!</strong><button class="maestro-again cmi-primary" type="button"></button></div></div>
      <div class="maestro-sections">${['strings','brass','percussion'].map((name, i) => `<button type="button" data-action="${name.toUpperCase()}" aria-pressed="false"><span>${['🎻','🎺','🥁'][i]}</span><small>${name.toUpperCase()}</small></button>`).join('')}</div>
      <div class="maestro-dynamics"><span>p</span><progress max="1" value="0" aria-label="Orchestra intensity"></progress><span>ff</span><strong class="maestro-dynamic">p</strong></div>
      <div class="maestro-practice"><label class="maestro-slider-label"><span>INTENSITY</span><input class="maestro-slider" aria-label="Intensity" type="range" min="0" max="1" step="0.01" value="0.2"></label><div class="maestro-controls"><button type="button" data-action="START" class="cmi-primary">▶ START</button><button type="button" data-action="CUT">✋ CUT</button><button type="button" data-action="FINALE">✦ FINALE</button></div></div>
      <p class="cmi-hint"></p><p class="cmi-credit">SE: <a href="https://otologic.jp/free/se/applause-cheer01.html" target="_blank" rel="noopener noreferrer">OtoLogic</a> (<a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer">CC BY 4.0</a>) · edited / 音量・長さ調整</p>
      <div class="cmi-recovery" hidden><button class="cmi-camera" type="button"></button><button class="cmi-demo" type="button"></button></div><button class="cmi-debug-toggle" type="button">DEBUG</button><pre class="cmi-debug" hidden></pre></section>`;
    this.stage = this.$('.cmi-stage'); this.video = this.$('video'); this.canvas = this.$('canvas'); this.context = this.canvas.getContext('2d');
    this.input = new MaestroPoseInput(this.video, { onFrame: (points, at) => { this.raw = points ? { points, at } : null; }, onStatus: (status, error) => { if (status === 'ERROR' && this.active && this.source === 'camera') this.fail(error); } });
    if (import.meta.env.DEV && this.debug) root.__maestro = this;
    this.reset(); this.render();
  }
  reset() { this.game = new MaestroGame(); this.mapper.reset(); this.demoIntensity = .2; this.$('.maestro-slider').value = this.demoIntensity; this.cursor = { x: .5, y: .42 }; this.fx = []; this.pose = null; this.lostAt = null; this.lossGain = 1; this.lastCue = ''; this.lastRender = 0; this.burstAt = -Infinity; this.applauded = false; }
  resetTracking() { this.mapper.reset(); this.raw = null; this.pose = null; this.pointerId = null; }
  muteBacking() { this.audio.update(this.game, 1, true); }
  bind() {
    const signal = this.bindCommon();
    this.root.querySelectorAll('[data-action]').forEach(button => button.addEventListener('click', () => this.command(button.dataset.action), { signal }));
    this.$('.maestro-again').addEventListener('click', () => this.command('START'), { signal });
    this.$('.maestro-slider').addEventListener('input', e => { this.demoIntensity = Number(e.target.value); this.game.update(this.clock, this.demoIntensity); this.audio.update(this.game); }, { signal });
    const point = e => { const r = this.stage.getBoundingClientRect(); this.cursor = { x: clamp((e.clientX - r.left) / r.width), y: clamp((e.clientY - r.top) / r.height) }; };
    this.stage.addEventListener('pointerdown', e => {
      if (this.source !== 'demo' || this.phase !== 'playing' || this.paused || e.button > 0 || e.target.closest('button')) return;
      e.preventDefault(); this.stage.focus({ preventScroll: true }); this.pointerId = e.pointerId; this.stage.setPointerCapture(e.pointerId); point(e);
      if (['READY','CUT'].includes(this.game.state)) this.command('START');
    }, { signal });
    this.stage.addEventListener('pointermove', e => { if (this.pointerId === e.pointerId && !this.paused) point(e); }, { signal });
    this.stage.addEventListener('pointerup', () => { this.pointerId = null; }, { signal });
    this.stage.addEventListener('pointercancel', () => { this.pointerId = null; }, { signal });
    window.addEventListener('keydown', e => {
      if (!this.active || this.source !== 'demo' || this.phase !== 'playing' || this.paused || e.repeat || e.target.closest('input,select,textarea')) return;
      const type = { Space: 'START', Digit1: 'STRINGS', Digit2: 'BRASS', Digit3: 'PERCUSSION', KeyX: 'CUT', KeyF: 'FINALE' }[e.code];
      if (type) { e.preventDefault(); this.command(type); }
      else if (['ArrowUp','ArrowDown'].includes(e.code)) { e.preventDefault(); this.demoIntensity = clamp(this.demoIntensity + (e.code === 'ArrowUp' ? .1 : -.1)); this.$('.maestro-slider').value = this.demoIntensity; }
    }, { signal });
  }
  command(type) {
    if (this.phase !== 'playing' || this.paused) return false;
    if (!this.game.dispatch(type, this.clock)) return false;
    this.audio.event(type); this.audio.update(this.game, this.lossGain ?? 1); // sound before visual state
    if (type === 'FINALE') {
      this.burstAt = performance.now(); this.applauded = false;
      for (let i = 0; i < 65; i++) this.fx.push({ x: Math.random(), y: Math.random() * .3, vx: (Math.random() - .5) * .25, vy: .1 + Math.random() * .3, color: ['#f3c879','#9ed8cd','#f39485','#fff4d3'][i % 4], at: this.burstAt });
    }
    if (type === 'START') { this.mapper.raiseSince = null; this.applauded = false; }
    this.render(); return true;
  }
  tick = at => {
    if (!this.active || this.phase !== 'playing') return;
    const dt = Math.min(100, Math.max(0, at - this.lastTick)); this.lastTick = at;
    if (this.audio.context?.state !== 'running' && !this.paused) { this.paused = true; this.muteBacking(); this.resetTracking(); }
    if (!this.paused) {
      this.clock += dt;
      if (this.source === 'camera') {
        const fresh = this.raw && at - this.raw.at < 300;
        const project = p => projectCameraPoint(p, this.video.videoWidth, this.video.videoHeight, this.stage.clientWidth, this.stage.clientHeight, true);
        this.pose = fresh ? normalizePose(this.raw.points, project, this.stage.clientHeight / Math.max(1, this.stage.clientWidth)) : null;
        if (this.pose) {
          this.lostAt = null; this.lossGain = 1;
          const events = this.mapper.update(this.pose, this.raw.at, this.game);
          this.game.update(this.clock, this.mapper.input?.intensity ?? this.game.intensity);
          events.forEach(type => this.command(type));
        } else {
          this.lostAt ??= at; this.mapper.update(null, at, this.game);
          this.lossGain = 1 - clamp((at - this.lostAt - 1500) / 800);
          this.game.update(this.clock, this.game.intensity);
        }
      } else { this.lossGain = 1; this.game.update(this.clock, this.demoIntensity); }
      if (this.game.state === 'BRAVO' && !this.applauded) { this.audio.sample('applause', .5); this.applauded = true; }
    }
    this.audio.update(this.game, this.lossGain ?? 1, this.paused);
    this.draw(at);
    if (at - this.lastRender > 80) { this.render(); this.lastRender = at; }
    this.raf = requestAnimationFrame(this.tick);
  };
  draw(at) {
    const width = this.stage.clientWidth, height = this.stage.clientHeight, dpr = Math.min(1.5, window.devicePixelRatio || 1);
    if (this.canvas.width !== Math.round(width * dpr) || this.canvas.height !== Math.round(height * dpr)) { this.canvas.width = Math.round(width * dpr); this.canvas.height = Math.round(height * dpr); }
    const ctx = this.context; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, width, height);
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (this.source === 'demo') {
      ctx.strokeStyle = '#addbd16b'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(width * .5, height * .32, width * .09, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(width * .5, height * .42); ctx.lineTo(width * .5, height * .65); ctx.stroke();
      const spread = .11 + this.game.intensity * .25;
      for (const side of [-1,1]) { const x = clamp(this.cursor.x + side * spread, .06, .94) * width, y = this.cursor.y * height;
        ctx.beginPath(); ctx.moveTo(width * .5, height * .44); ctx.lineTo(x, y); ctx.stroke(); ctx.beginPath(); ctx.arc(x, y, 9, 0, Math.PI * 2); ctx.fillStyle = '#f2c675'; ctx.fill(); }
    } else if (this.pose) {
      for (const p of [this.pose.screen.left, this.pose.screen.right]) { ctx.beginPath(); ctx.arc(p.x * width, p.y * height, 10, 0, Math.PI * 2); ctx.strokeStyle = '#f5cb77'; ctx.lineWidth = 3; ctx.stroke(); }
    }
    if (!reduced && this.game.playing && !this.paused) {
      for (let i = 0; i < 8; i++) { const t = (at / (2200 - this.game.intensity * 800) + i / 8) % 1; ctx.globalAlpha = Math.sin(t * Math.PI) * (.3 + this.game.intensity * .5); ctx.fillStyle = '#f1c574'; ctx.font = `${15 + this.game.intensity * 12}px Georgia`; ctx.fillText(i % 2 ? '♪' : '♫', width * ((i * .137 + .1) % .9), height * (.82 - t * .52)); }
    }
    ctx.globalAlpha = 1;
    this.fx = this.fx.filter(f => at - f.at < 3500);
    if (!reduced) for (const f of this.fx) { const t = (at - f.at) / 1000; ctx.fillStyle = f.color; ctx.save(); ctx.translate((f.x + f.vx * t) * width, (f.y + f.vy * t + .12 * t * t) * height); ctx.rotate(t * 3); ctx.fillRect(-3, -2, 6, 4); ctx.restore(); }
    const flash = at - this.burstAt;
    if (!reduced && flash >= 0 && flash < 450) { ctx.fillStyle = `rgba(255,239,183,${.5 * (1 - flash / 450)})`; ctx.fillRect(0, 0, width, height); }
  }
  render() {
    if (!this.stage) return; this.renderCommon(); const ja = this.locale === 'ja';
    const state = this.game.state, live = this.phase === 'playing' && !this.paused;
    this.stage.dataset.state = state; this.stage.style.setProperty('--intensity', this.game.intensity);
    this.$('.maestro-state').textContent = state === 'PLAY' ? this.game.intensity > .8 ? 'FORTISSIMO' : 'YOUR ORCHESTRA' : state === 'CUT' ? '… SILENCE' : state;
    this.$('.maestro-dynamics progress').value = this.game.intensity; this.$('.maestro-dynamic').textContent = this.game.intensity > .8 ? 'ff' : this.game.intensity > .5 ? 'f' : this.game.intensity > .25 ? 'mf' : 'p';
    this.$('.maestro-practice').hidden = this.source !== 'demo';
    this.$('.maestro-bravo').hidden = state !== 'BRAVO'; this.$('.maestro-again').textContent = ja ? 'もう一度、指揮しよう' : 'CONDUCT AGAIN';
    this.$('.maestro-again').disabled = !live;
    this.$('.cmi-mode-badge').textContent = this.source === 'demo' ? ja ? 'カメラなしの練習' : 'CAMERA-FREE PRACTICE' : 'LIVE · FRONT CAMERA';
    let cue = this.game.tutorial === 0 ? ja ? '手を上げてみよう' : 'Raise a hand' : this.game.tutorial === 1 ? ja ? '両腕を広げて、もっと大きく！' : 'Open your arms. A little bigger!' : this.game.tutorial === 2 ? ja ? '両手を大きく振って、ピタッと止めよう' : 'Move both hands, then freeze!' : state === 'CUT' ? ja ? '手を上げると、また始まる' : 'Raise a hand to bring them back' : this.game.finaleReady ? ja ? '両手を強く下へ。フィナーレ！' : 'Bring both hands down. Finale!' : ja ? '左で弦。右で金管。下へ振るとドラム。' : 'Left for strings. Right for brass. Down for drums.';
    if (this.source === 'demo') cue = state === 'READY' ? ja ? '▶ STARTで小さな演奏会を始めよう' : 'Press START. Your concert begins.' : this.game.tutorial === 1 ? ja ? 'スライダーを右へ。もっと大きく！' : 'Slide to the right. A little louder!' : this.game.tutorial === 2 ? ja ? '✋ CUTで、ピタッと止めよう' : 'Press CUT. Make them freeze!' : state === 'CUT' ? ja ? '▶ STARTで、もう一度' : 'Press START to bring them back.' : this.game.finaleReady ? ja ? '✦ FINALEで、ジャーーン！' : 'Press FINALE. Take a bow!' : ja ? 'パートと強弱で、きみの演奏に。' : 'Choose your sections. Make it your own.';
    if (state === 'FINALE') cue = ja ? 'ジャーーン！' : 'Ta-daaa!';
    if (state === 'BRAVO') cue = ja ? 'きみの演奏会に、大きな拍手！' : 'A big round of applause. All yours!';
    if (this.source === 'camera' && this.lostAt !== null && performance.now() - this.lostAt > 600) cue = ja ? '両手と肩を映して、戻ってきてね！' : 'Show both hands and shoulders. Come back, maestro!';
    if (cue !== this.lastCue) { this.$('.cmi-guidance').textContent = cue; this.lastCue = cue; }
    for (const name of ['strings','brass','percussion']) {
      const engaged = this.game.sections[name], moving = engaged && this.game.playing && !this.paused && (this.lossGain ?? 1) > .05;
      this.$(`[data-section="${name}"]`).classList.toggle('is-playing', moving);
      const button = this.$(`[data-action="${name.toUpperCase()}"]`); button.setAttribute('aria-pressed', String(engaged)); button.disabled = !this.game.playing || !live;
    }
    this.$('[data-action="FINALE"]').disabled = !this.game.finaleReady || !live;
    this.$('[data-action="START"]').disabled = !['READY','CUT','BRAVO'].includes(state) || !live;
    this.$('[data-action="CUT"]').disabled = !this.game.playing || !live;
    this.$('.maestro-slider').disabled = !live;
    this.$('.cmi-hint').textContent = this.source === 'demo' ? ja ? 'Space: 開始 · 1/2/3: パート · ↑↓: 強弱 · X: CUT · F: フィナーレ。画面のボタンでも演奏できます。' : 'Space start · 1/2/3 sections · ↑↓ dynamics · X cut · F finale. Or use the buttons.' : ja ? 'スマホを固定して、胸から上と両手を映そう。大きく振って、きみのオーケストラに。' : 'Set the phone down. Frame your shoulders and hands, then make a big gesture.';
    if (this.debug) { const p = this.mapper.input; this.$('.cmi-debug').textContent = `POSE ${this.pose ? 'FOUND' : 'LOST'}\nLEFT ${p ? `${p.left.x.toFixed(2)} / ${p.left.y.toFixed(2)}` : '—'}\nRIGHT ${p ? `${p.right.x.toFixed(2)} / ${p.right.y.toFixed(2)}` : '—'}\nSPREAD ${p?.spread.toFixed(2) ?? '—'}\nINTENSITY ${this.game.intensity.toFixed(2)}\nGESTURE ${this.game.gesture}\nSTATE ${state}\nLOSS GAIN ${(this.lossGain ?? 1).toFixed(2)}\nAUDIO ${this.audio.context?.state ?? 'OFF'}`; }
  }
}
