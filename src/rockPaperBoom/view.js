import { RockPaperBoomGame, ICONS, SIGNS, impactTime } from './core.js';
import { ZONES, containRect } from './tracking.js';
import { RockPaperBoomInput } from '../input/rockPaperBoomInput.js';
import { PhaserRuntime } from '../game-runtime/phaser/PhaserRuntime.js';
import { GameEventBus } from '../game-runtime/phaser/events/GameEventBus.js';
import { BoomScene } from './scene.js';
import { BoomAudio } from './audio.js';
import './rockPaperBoom.css';
export function createView(root, locale, options) { return new BoomView(root, locale, options); }
export class BoomView {
  constructor(root, locale, { onExit } = {}) {
    this.root = root; this.locale = locale; this.onExit = onExit; this.active = false; this.generation = 0;
    this.game = new RockPaperBoomGame(); this.gameEvents = new GameEventBus(); this.audio = new BoomAudio(); this.listeners = new Set(); this.source = 'camera';
    root.innerHTML = `<section class="rpb-play"><header class="rpb-hud"><span class="rpb-source"></span><strong>ROCK PAPER<br><em>BOOM!</em></strong><button class="rpb-pause" type="button" aria-label="Pause">Ⅱ</button></header>
      <div class="rpb-stage camera-stage" tabindex="0"><video muted playsinline></video><canvas class="rpb-freeze" hidden></canvas><canvas class="rpb-split" hidden></canvas><div class="rpb-phaser"></div>
      <div class="rpb-divider"></div><span class="rpb-vs">VS</span>
      ${ZONES.map((z, side) => `<div class="rpb-zone" data-side="${side}" style="left:${z.x * 100}%;top:${z.y * 100}%;width:${z.w * 100}%;height:${z.h * 100}%"><span>PLAYER ${side + 1}</span><b>HAND ZONE</b><i>${side ? '✌️' : '✊'}</i><small></small></div>`).join('')}
      <div class="rpb-call" role="status" aria-live="polite"><small></small><h2></h2><p></p></div><div class="rpb-outcome"><span></span><span></span></div>
      <button class="rpb-again" type="button" hidden>AGAIN? ↗</button><button class="rpb-start" type="button" disabled>READY!</button>
      <div class="rpb-overlay" hidden role="status"><h2></h2><p></p><button class="rpb-resume" type="button" hidden></button><button class="rpb-camera-retry" type="button" hidden></button><button class="rpb-fallback" type="button" hidden></button></div></div>
      <div class="rpb-practice" hidden>${[0, 1].map(side => `<fieldset><legend>PLAYER ${side + 1}</legend>${SIGNS.map((sign, i) => `<button type="button" data-sign="${sign}" data-player="${side}" aria-label="Player ${side + 1}: ${sign}" aria-pressed="false">${ICONS[sign]}<span>${sign}</span></button>`).join('')}</fieldset>`).join('')}</div>
      <footer class="rpb-footer"><p></p><button type="button" class="rpb-sound" aria-pressed="true">SE ON</button><button type="button" class="rpb-debug" aria-pressed="false">HUD</button></footer><pre class="rpb-debug-hud" hidden></pre></section>`;
    this.$ = s => root.querySelector(s); this.video = this.$('video'); this.phase = 'idle';
    this.input = new RockPaperBoomInput(this.video, { onStatus: (status, error) => {
      if (!this.active || this.source !== 'camera') return;
      this.status = status;
      if (status === 'ERROR') { this.phase = 'error'; this.error = error; this.game.pause(); this.audio.pause(); }
      this.render(); this.notify();
    }, onResult: (hands, at) => { if (this.active && this.source === 'camera' && this.phase === 'playing') this.game.input(hands, at); } });
  }
  t(ja, en) { return this.locale === 'ja' ? ja : en; }
  subscribe(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  notify() { this.listeners.forEach(fn => fn(this.snapshot())); }
  snapshot() {
    const phase = this.phase === 'playing' ? ({ ready: 'waiting', again: 'waiting', countdown: 'countdown', shoot: 'playing', freeze: 'locked', boom: 'playing', result: 'ending', retry: 'waiting' }[this.game.phase]) : this.phase;
    // Keep the camera and Phaser alive through immediate in-game rematches.
    return { phase, roundPhase: this.game.phase, source: this.source, paused: this.game.paused, elapsed: this.game.clock,
      musicSilent: this.game.phase !== 'boom', result: null };
  }
  setLocale(locale) { this.locale = locale; this.render(); }
  activate() {
    this.releaseInputs(); this.active = true; this.phase = 'waiting'; this.game.reset(this.source); this.error = null; this.lastFrame = performance.now();
    this.demoSigns = ['ROCK', 'SCISSORS']; this.demoAt = -Infinity; this.abort = new AbortController(); const signal = this.abort.signal;
    this.root.addEventListener('click', this.click, { signal }); window.addEventListener('keydown', this.key, { signal });
    window.addEventListener('blur', this.blur, { signal }); document.addEventListener('visibilitychange', this.visibility, { signal });
    window.addEventListener('resize', this.resize, { signal });
    const motion = matchMedia('(prefers-reduced-motion: reduce)'); this.reducedMotion = motion.matches;
    motion.addEventListener('change', e => { this.reducedMotion = e.matches; this.render(); }, { signal });
    if (this.runtime) this.runtime.restart();
    else { this.scene = new BoomScene(this, { gameEvents: this.gameEvents }); this.runtime = new PhaserRuntime(this.$('.rpb-phaser'), this.scene, { width: 540, height: 960 }); }
    this.render(); this.notify();
  }
  async startCamera() {
    this.source = 'camera'; this.game.reset('camera'); this.phase = 'loading'; this.error = null; this.audio.arm();
    const token = ++this.generation; this.render(); this.notify();
    try {
      await this.input.start();
      if (!this.active || token !== this.generation) return;
      this.phase = 'playing'; this.lastFrame = performance.now(); this.render(); this.notify();
    } catch (error) {
      if (!this.active || token !== this.generation || error.name === 'AbortError') return;
      this.input.stop(); this.error = error; this.phase = 'error'; this.render(); this.notify();
    }
  }
  startDemo() {
    ++this.generation; this.input.stop(); this.source = 'demo'; this.phase = 'playing'; this.error = null; this.game.reset('demo'); this.demoAt = -Infinity;
    this.audio.arm(); this.lastFrame = performance.now(); this.render(); this.notify();
  }
  releaseInputs() {
    ++this.generation; this.input.stop(); this.audio.stop(); this.abort?.abort(); this.runtime?.sleep();
    for (const canvas of [this.$('.rpb-freeze'), this.$('.rpb-split')]) { canvas.width = 1; canvas.height = 1; }
  }
  deactivate({ retainRenderer = false } = {}) {
    this.active = false; this.releaseInputs(); this.phase = 'idle';
    if (!retainRenderer) { this.runtime?.destroy(); this.runtime = null; this.scene = null; }
  }
  startRound() {
    this.audio.arm();
    if (this.game.start()) for (const canvas of [this.$('.rpb-freeze'), this.$('.rpb-split')]) { canvas.width = 1; canvas.height = 1; }
    this.render(); this.notify();
  }
  pause() { if (this.phase !== 'playing') return; this.game.pause(); this.audio.pause(); this.render(); this.notify(); }
  resume() { this.game.resume(); this.audio.arm(); this.lastFrame = performance.now(); this.render(); this.notify(); }
  blur = () => { if (this.active) this.pause(); };
  visibility = () => { if (document.hidden) this.blur(); };
  resize = () => { if (this.active && this.source === 'camera') { this.input.stageAspect = this.$('.rpb-stage').clientWidth / this.$('.rpb-stage').clientHeight; this.game.clearInput(); if (['countdown', 'shoot'].includes(this.game.phase)) this.pause(); } };
  click = e => {
    const sign = e.target.closest('[data-sign]');
    if (sign && this.source === 'demo' && !this.game.paused && ['ready', 'countdown', 'shoot', 'again', 'retry'].includes(this.game.phase)) this.demoSigns[Number(sign.dataset.player)] = sign.dataset.sign;
    else if (e.target.closest('.rpb-start, .rpb-again')) this.startRound();
    else if (e.target.closest('.rpb-pause')) this.game.paused ? this.resume() : this.pause();
    else if (e.target.closest('.rpb-resume')) this.resume();
    else if (e.target.closest('.rpb-camera-retry')) { this.input.stop(); void this.startCamera(); }
    else if (e.target.closest('.rpb-fallback')) this.startDemo();
    else if (e.target.closest('.rpb-sound')) { this.audio.enabled = !this.audio.enabled; this.audio.enabled ? this.audio.arm() : this.audio.silence(); }
    else if (e.target.closest('.rpb-debug')) this.debug = !this.debug;
    this.render(); this.notify();
  };
  key = e => {
    if (!this.active || e.ctrlKey || e.altKey || e.metaKey || e.repeat || /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
    if (e.key.toLowerCase() === 'p') { e.preventDefault(); this.game.paused ? this.resume() : this.pause(); }
    if (this.source !== 'demo' || this.game.paused) return;
    const i = ['a', 's', 'd', 'j', 'k', 'l'].indexOf(e.key.toLowerCase());
    if (i >= 0 && ['ready', 'countdown', 'shoot', 'again', 'retry'].includes(this.game.phase)) { e.preventDefault(); this.demoSigns[i < 3 ? 0 : 1] = SIGNS[i % 3]; }
    if (e.code === 'Space' && !e.target.closest('button')) { e.preventDefault(); this.startRound(); }
  };
  capture() {
    const stage = this.$('.rpb-stage'), w = Math.min(540, stage.clientWidth * (devicePixelRatio || 1)), h = w * stage.clientHeight / stage.clientWidth;
    for (const canvas of [this.$('.rpb-freeze'), this.$('.rpb-split')]) {
      canvas.width = w; canvas.height = h; const ctx = canvas.getContext('2d'); ctx.fillStyle = '#111721'; ctx.fillRect(0, 0, w, h);
      if (this.source === 'camera' && this.video.readyState >= 2) {
        const r = containRect(this.video.videoWidth / this.video.videoHeight, w / h);
        ctx.drawImage(this.video, r.x * w, r.y * h, r.w * w, r.h * h);
      } else {
        const gradient = ctx.createLinearGradient(0, 0, w, h); gradient.addColorStop(0, '#492b20'); gradient.addColorStop(1, '#163c48'); ctx.fillStyle = gradient; ctx.fillRect(0, 0, w, h);
        ctx.font = `${w * .12}px sans-serif`; ctx.textAlign = 'center';
        [0, 1].forEach(i => ctx.fillText(ICONS[this.demoSigns[i]], w * (i ? .76 : .24), h * .5));
      }
    }
  }
  loop = now => {
    if (!this.active) return;
    const dt = (now - this.lastFrame) / 1000; this.lastFrame = now;
    if (this.phase !== 'playing') return;
    this.input.stageAspect = this.$('.rpb-stage').clientWidth / this.$('.rpb-stage').clientHeight;
    if (dt > .5 && !['ready', 'again'].includes(this.game.phase)) this.pause();
    if (this.source === 'demo' && now - this.demoAt >= 30) { this.demoAt = now; this.game.input(this.demoSigns.map(sign => ({ sign, confidence: 1 })), now); }
    this.game.step(Math.min(.06, Math.max(0, dt)), now);
    for (const event of this.game.takeEvents()) {
      if (event.type === 'LOCK') this.capture();
      this.audio.play(event); this.gameEvents.emit(event.type, { ...event, timestamp: now });
    }
    // Retry is automatic once both fresh hands are back inside their own zones.
    if (this.game.phase === 'ready' && this.game.retries && this.game.ready) this.game.start();
    this.render(); this.notify();
  };
  render() {
    if (!this.$) return;
    const g = this.game, p = g.phase, r = g.result, play = this.phase === 'playing', frozen = !!r && ['freeze', 'boom', 'result', 'again'].includes(p);
    const stage = this.$('.rpb-stage'); stage.dataset.phase = p; stage.dataset.move = r?.sign ?? ''; stage.classList.toggle('rpb-reduced', !!this.reducedMotion);
    this.$('.rpb-source').textContent = this.source === 'demo' ? this.t('カメラなし · 練習', 'PRACTICE · NO CAMERA') : this.t('アウトカメラ · 2人', 'REAR CAMERA · 2 PLAYERS');
    this.$('.rpb-practice').hidden = this.source !== 'demo'; this.video.hidden = frozen || this.source !== 'camera';
    this.$('.rpb-freeze').hidden = !frozen; this.$('.rpb-split').hidden = !frozen || r.sign !== 'SCISSORS' || p !== 'boom';
    const fx = ['freeze', 'boom', 'result', 'again'].includes(p);
    this.$('.rpb-divider').hidden = fx; this.$('.rpb-vs').hidden = fx;
    for (const [i, zone] of [...this.root.querySelectorAll('.rpb-zone')].entries()) {
      zone.hidden = fx; zone.classList.toggle('is-locked', !!g.current[i]);
      zone.querySelector('i').textContent = ICONS[g.current[i]?.sign ?? (this.source === 'demo' ? this.demoSigns?.[i] : 'UNKNOWN')];
      zone.querySelector('small').textContent = g.current[i] ? 'LOCKED ✓' : this.input.hands[i]?.ambiguous ? this.t('手は1つだけ', 'ONE HAND ONLY') : this.t('ここに手を出して', 'SHOW YOUR HAND HERE');
    }
    let title = '', detail = '', kicker = '';
    if (p === 'ready') { title = this.t('二人でじゃんけん！', 'TWO HANDS. ONE BOOM.'); detail = this.t('左がP1、右がP2。手を枠の中へ。', 'P1 left · P2 right. Show one hand in each zone.'); kicker = '✊  ✌️  🖐'; }
    if (p === 'countdown') { title = String(g.count); kicker = 'ROCK · PAPER ·'; detail = this.t('SHOOT!で手を出そう', 'Choose on SHOOT!'); }
    if (p === 'shoot') { title = 'SHOOT!'; detail = this.t('そのまま、少しキープ！', 'Hold that hand for a moment!'); }
    if (p === 'retry') { title = this.t('もう一回！', 'ONE MORE TRY!'); detail = this.t('手を1つずつ、左右の枠へ', 'One clear hand in each zone'); kicker = 'SHOW YOUR HAND!'; }
    if (p === 'freeze' && r) { title = 'LOCKED!'; kicker = `${ICONS[r.p1]}  ×  ${ICONS[r.p2]}`; detail = this.t('……来るぞ。', '…wait for it.'); }
    if (p === 'boom' && r) { title = g.age < impactTime(r) ? r.move : r.shout; kicker = `${r.p1} ${r.winner === 0 ? '×' : r.winner === 1 ? '>' : '<'} ${r.p2}`; }
    if (['result', 'again'].includes(p) && r) { title = r.winner ? `P${r.winner} WINNER!` : r.shout; kicker = r.winner ? 'K.O.' : 'DRAW!'; detail = r.winner ? this.t('じゃんけん。ただし、爆裂。', 'Just janken. With consequences.') : this.t('あいこも、ただでは済まない。', 'Even a draw goes BOOM.'); }
    this.$('.rpb-call').hidden = !play || g.paused; this.$('.rpb-call h2').textContent = title; this.$('.rpb-call p').textContent = detail; this.$('.rpb-call small').textContent = kicker;
    this.$('.rpb-start').hidden = !play || p !== 'ready' || g.paused; this.$('.rpb-start').disabled = !g.ready;
    this.$('.rpb-again').hidden = !play || p !== 'again' || g.paused;
    this.$('.rpb-pause').textContent = g.paused ? '▶' : 'Ⅱ'; this.$('.rpb-pause').ariaLabel = this.t(g.paused ? '再開' : '一時停止', g.paused ? 'Resume' : 'Pause');
    this.root.querySelectorAll('.rpb-outcome span').forEach((el, i) => { el.textContent = frozen && p !== 'freeze' && (p !== 'boom' || g.age > 1) ? r.winner === i + 1 ? '♛' : r.winner ? '👻 ✦' : '✦' : ''; });
    this.root.querySelectorAll('[data-sign]').forEach(el => { el.setAttribute('aria-pressed', String(this.demoSigns?.[Number(el.dataset.player)] === el.dataset.sign)); el.disabled = g.paused || !['ready', 'countdown', 'shoot', 'again', 'retry'].includes(p); });
    const overlay = this.$('.rpb-overlay'), error = this.phase === 'error', loading = this.phase === 'loading'; overlay.hidden = !(error || loading || g.paused);
    this.$('.rpb-overlay h2').textContent = error ? this.t('カメラを使えません', 'CAMERA UNAVAILABLE') : loading ? this.t('カメラを準備中…', 'GETTING READY…') : this.t('ひと休み', 'PAUSED');
    this.$('.rpb-overlay p').textContent = error ? this.t('スマホの背面カメラとカメラ許可を確認してください。練習でも全演出を遊べます。', 'Check rear camera access and permission. Practice includes every finish.') : loading ? this.t('初回は手の認識モデルを読み込みます。', 'Downloading the hand model on first use.') : this.t('再開してから、もう一度手を構えてください。', 'Resume, then show your hands again.');
    this.$('.rpb-resume').hidden = !g.paused || error; this.$('.rpb-resume').textContent = this.t('再開', 'RESUME');
    this.$('.rpb-camera-retry').hidden = !error; this.$('.rpb-camera-retry').textContent = this.t('カメラを再試行', 'RETRY CAMERA');
    this.$('.rpb-fallback').hidden = !error && !loading; this.$('.rpb-fallback').textContent = this.t('カメラなしで遊ぶ', 'PLAY WITHOUT CAMERA');
    this.$('.rpb-footer p').textContent = this.source === 'demo' ? this.t('P1: A/S/D · P2: J/K/L · P: 一時停止', 'P1: A/S/D · P2: J/K/L · P: pause') : this.t('明るい場所で。顔や体ではなく、手だけを枠へ。', 'Good light helps. Keep one hand in each zone.');
    this.$('.rpb-sound').textContent = this.audio.enabled ? 'SE ON' : 'SE OFF'; this.$('.rpb-sound').setAttribute('aria-pressed', String(this.audio.enabled));
    this.$('.rpb-debug').setAttribute('aria-pressed', String(!!this.debug)); this.$('.rpb-debug-hud').hidden = !this.debug;
    if (this.debug) this.$('.rpb-debug-hud').textContent = `Camera Input Debug HUD v0.1\n${[0, 1].map(i => `P${i + 1} HAND: ${g.current[i]?.sign ?? this.input.hands[i]?.sign ?? 'UNKNOWN'}\nconfidence: ${(g.current[i]?.confidence ?? this.input.hands[i]?.confidence ?? 0).toFixed(2)}`).join('\n')}\nhands detected: ${this.source === 'demo' ? 2 : this.input.detected ?? 0}\nFPS: ${this.source === 'demo' ? '30 (practice)' : (this.input.fps ?? 0).toFixed(1)}\nstate: ${p.toUpperCase()}${g.paused ? ' / PAUSED' : ''}\nretry: ${g.retries}`;
  }
}
