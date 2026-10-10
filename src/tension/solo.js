import { clamp, geometry, CONFIG, netDeflection, netResponse } from './rules.js';
import { SOLO, LAYOUTS, screenX, mirrorNet, createBrickLayout, brickRect, createSoloMatch, stepSoloMatch, resizeSoloMatch, changeSoloHand, updateSoloNet, soloNetUsable } from './soloRules.js';
import { SoloInput } from './soloInput.js';
import { DuelAudio } from './audio.js';
import { soloCopy } from './soloMessages.js';
import './solo.css';

const HAND_KEY = 'camera-game-lab-tension-solo-hand';
export class TensionSolo {
  constructor(root, locale = 'ja', { onExit } = {}) {
    Object.assign(this, { root, locale, onExit, active: false, phase: 'setup', mode: 'camera', setupStep: 'hand', handSide: 'right', layoutId: LAYOUTS[0], generation: 0, net: null, sound: true, status: '', effects: [], trail: [] });
    try { if (localStorage.getItem(HAND_KEY) === 'left') this.handSide = 'left'; } catch { /* Storage is optional. */ }
    this.match = createSoloMatch({ handSide: this.handSide }); this.fake = { x: .18, y: .28, angle: 0, distance: .12 };
    this.audio = new DuelAudio();
    root.innerHTML = `<div class="tns-shell">
      <section class="tns-setup"><div class="tns-poster"><img src="/artwork/tension-break-intro.webp" width="1536" height="1024" alt=""><span>SOLO / EXP-021</span><h1>TENSION<br>BREAK!</h1></div><p class="tns-tagline"></p><h2 class="tns-setup-title"></h2>
        <div class="tns-hands">${['right', 'left'].map(side => `<button type="button" data-hand="${side}"><b></b><small>${side === 'right' ? '→' : '←'} NET</small></button>`).join('')}</div>
        <p class="tns-hand-hint"></p><div class="tns-layouts">${LAYOUTS.map((id, i) => `<button type="button" data-layout="${id}"><span class="tns-mini" aria-hidden="true">${createBrickLayout(id).map(b => `<i style="left:${b.x * 100}%;top:${b.y * 100}%"></i>`).join('')}<em></em></span><b>${String.fromCharCode(65+i)} / <span></span></b><small></small></button>`).join('')}</div>
        <div class="tns-setup-actions"><button type="button" class="button button--primary tns-confirm-layout"></button><button type="button" class="button tns-back-hand"></button></div></section>
      <section class="tns-play"><div class="tns-hud"><span><small class="tns-score-label"></small><strong class="tns-score">0000</strong></span><span class="tns-lives"></span><strong class="tns-timer">00:30</strong><button class="tns-pause" type="button"></button></div>
        <div class="tns-stage"><img class="tns-court" src="/artwork/tension-duel-court.webp" alt=""><video autoplay playsinline muted aria-hidden="true"></video><canvas aria-hidden="true"></canvas><div class="tns-ready" role="status"><strong></strong><span></span></div><div class="tns-overlay"><h2></h2><p></p><div class="tns-overlay-actions"><button class="button button--primary tns-resume" type="button"></button><button class="button tns-restart" type="button"></button><button class="button tns-change-hand" type="button"></button><button class="button button--primary tns-switch-confirm" type="button"></button><button class="button tns-switch-cancel" type="button"></button></div></div></div>
        <p class="tns-hint" role="status" aria-live="polite"></p><section class="tns-controls">${['position', 'angle', 'opening'].map((kind,i) => `<label><span data-copy="${kind}"></span><input type="range" data-kind="${kind}" min="${i===0?5:i===1?-65:3}" max="${i===0?95:i===1?65:21}" value="${i===0?50:i===1?0:12}" step="0.5"></label>`).join('')}<p class="tns-control-hint"></p></section></section>
      <div class="tns-session"><span class="tns-mode"></span><span class="tns-side"></span><button class="button tns-full" type="button"></button><button class="button tns-sound" type="button"></button><button class="button tns-layout-back" type="button"></button><button class="button tns-exit" type="button"></button></div>
      <p class="tns-status" role="status"></p><div class="tns-recovery"><button class="button tns-camera-retry" type="button"></button><button class="button tns-demo-recovery" type="button"></button></div><p class="tns-rotate"></p>
      <details class="tns-how"><summary></summary><p class="tns-guide"></p><p class="tns-privacy"></p><p class="tns-credits">Artwork: OpenAI Imagegen · BGM: “Loop03” · <a href="https://otologic.jp/free/bgm/short-loop01.html" target="_blank" rel="noopener">OtoLogic</a> (<a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener">CC BY 4.0</a>) · SE: <a href="https://kenney.nl/assets/impact-sounds" target="_blank" rel="noopener">Kenney Impact Sounds</a> / <a href="https://kenney.nl/assets/interface-sounds" target="_blank" rel="noopener">Interface Sounds</a> (CC0)</p></details></div>`;
    this.$ = s => root.querySelector(s); this.stage = this.$('.tns-stage'); this.video = this.$('video'); this.canvas = this.$('canvas'); this.ctx = this.canvas.getContext('2d');
    this.input = new SoloInput(this.video, this.stage, {
      onResult: (hands, now) => { if (this.active && this.mode === 'camera') this.net = updateSoloNet(this.net, hands.map(h => mirrorNet(h, this.handSide)), now); },
      onStatus: (status, error) => {
        if (!this.active || this.mode !== 'camera') return;
        if (status === 'ERROR') this.cameraFailed(error);
        else { this.status = status === 'LOADING_MODEL' ? 'loading' : status === 'REQUESTING_CAMERA' ? 'permission' : ''; this.render(); }
      },
    });
    root.querySelectorAll('[data-hand]').forEach(b => b.addEventListener('click', () => { this.setHand(b.dataset.hand); this.setupStep = 'layout'; this.render(); }));
    root.querySelectorAll('[data-layout]').forEach(b => b.addEventListener('click', () => { this.layoutId = b.dataset.layout; this.render(); }));
    this.$('.tns-confirm-layout').addEventListener('click', () => this.beginRound());
    this.$('.tns-back-hand').addEventListener('click', () => { this.setupStep = 'hand'; this.render(); });
    this.$('.tns-pause').addEventListener('click', () => this.pause());
    this.$('.tns-resume').addEventListener('click', () => this.resume());
    this.$('.tns-restart').addEventListener('click', () => this.ready());
    this.$('.tns-change-hand').addEventListener('click', () => { this.phase = 'confirm-hand'; this.render(); });
    this.$('.tns-switch-cancel').addEventListener('click', () => { this.phase = 'paused'; this.render(); });
    this.$('.tns-switch-confirm').addEventListener('click', () => { this.setHand(this.handSide === 'right' ? 'left' : 'right'); changeSoloHand(this.match, this.handSide); this.net = null; this.ready(); });
    this.$('.tns-layout-back').addEventListener('click', () => this.showSetup('layout'));
    this.$('.tns-exit').addEventListener('click', () => this.onExit?.());
    this.$('.tns-camera-retry').addEventListener('click', () => { this.mode = 'camera'; void this.beginRound(); });
    this.$('.tns-demo-recovery').addEventListener('click', () => { this.mode = 'demo'; this.ready(); });
    this.$('.tns-sound').addEventListener('click', () => { this.sound = !this.sound; this.audio.setEnabled(this.sound); if (this.sound) void this.audio.unlock(); this.render(); });
    this.$('.tns-full').addEventListener('click', () => this.toggleFullscreen());
    this.root.querySelectorAll('input').forEach(el => el.addEventListener('input', () => {
      const value = Number(el.value), kind = el.dataset.kind;
      if (kind === 'position') this.fake.y = this.height * value / 100;
      if (kind === 'angle') this.fake.angle = value * Math.PI / 180;
      if (kind === 'opening') this.fake.distance = value / 100;
    }));
    const move = e => {
      if (this.pointer !== e.pointerId || this.mode !== 'demo') return;
      const r = this.stage.getBoundingClientRect(); this.fake.y = (e.clientY - r.top) / r.width; this.fitFake(); this.syncControls();
    };
    this.stage.addEventListener('pointerdown', e => { if (this.mode !== 'demo' || !['ready','playing'].includes(this.phase) || e.target.closest('button')) return; this.pointer = e.pointerId; this.stage.setPointerCapture(e.pointerId); move(e); });
    this.stage.addEventListener('pointermove', move);
    for (const event of ['pointerup','pointercancel','lostpointercapture']) this.stage.addEventListener(event, () => { this.pointer = null; });
    this.onKey = e => {
      if (!this.active || e.isComposing || e.target?.closest?.('input,summary')) return;
      if (e.key === 'Escape') { this.phase === 'playing' ? this.pause() : this.phase === 'paused' && this.resume(); return; }
      if (this.mode !== 'demo' || !['ready','playing'].includes(this.phase)) return;
      const key = { ArrowUp:['y',-.025], ArrowDown:['y',.025], ArrowLeft:['angle',-.1], ArrowRight:['angle',.1], '[':['distance',-.01], ']':['distance',.01] }[e.key];
      if (!key) return; e.preventDefault(); this.fake[key[0]] += key[1]; this.fitFake(); this.syncControls();
    };
    window.addEventListener('keydown', this.onKey);
    this.onVisibility = () => { this.last = null; this.pointer = null; if (document.hidden) { this.audio.setMusic(false); this.audio.stopEffects(); } };
    document.addEventListener('visibilitychange', this.onVisibility);
    this.render();
  }
  get t() { return soloCopy[this.locale === 'ja' ? 'ja' : 'en']; }
  get height() { const r = this.stage.getBoundingClientRect(); return r.width && r.height ? r.height / r.width : 9/16; }
  get paused() { return ['paused','confirm-hand'].includes(this.phase) || this.phase === 'playing' && (document.hidden || !soloNetUsable(this.net, this.height)); }
  setLocale(locale) { this.locale = locale; this.render(); }
  configure(options) { this.roundAction = options?.roundAction ?? 'setup'; }
  setHand(side) { this.handSide = side; try { localStorage.setItem(HAND_KEY, side); } catch { /* Optional. */ } }
  activate() { this.active = true; this.root.hidden = false; this.phase = 'setup'; this.setupStep = 'hand'; this.status = ''; this.last = null; this.render(); this.raf = requestAnimationFrame(this.tick); }
  startCamera() { this.mode = 'camera'; if (this.roundAction === 'retry') void this.beginRound(); else this.showSetup(this.roundAction === 'layout' ? 'layout' : 'hand'); }
  startDemo() { this.mode = 'demo'; if (this.roundAction === 'retry') this.ready(); else this.showSetup(this.roundAction === 'layout' ? 'layout' : 'hand'); }
  showSetup(step) { this.generation++; clearTimeout(this.timeout); this.input.stop(); this.audio.reset(); this.phase = 'setup'; this.setupStep = step; this.status = ''; this.net = null; this.pointer = null; this.render(); }
  async beginRound() {
    if (!this.active || this.phase === 'loading') return;
    void this.audio.unlock();
    if (this.mode === 'demo') { this.input.stop(); this.ready(); return; }
    if (this.input.running) { this.ready(); return; }
    this.phase = 'loading'; this.status = 'loading'; this.net = null; this.render();
    const token = ++this.generation;
    this.timeout = setTimeout(() => { if (token === this.generation && this.active) this.cameraFailed(new Error('timeout')); }, 25000);
    try { await this.input.start(); if (token !== this.generation || !this.active) return; clearTimeout(this.timeout); this.ready(); }
    catch (error) { if (token === this.generation && this.active) this.cameraFailed(error); }
  }
  cameraFailed(error) {
    this.generation++; clearTimeout(this.timeout); this.input.stop(); this.audio.reset(); this.net = null; this.phase = 'camera-error';
    this.status = window.isSecureContext === false ? 'secureRequired' : error?.name === 'NotAllowedError' ? 'permissionDenied' : ['NotFoundError','FrontCameraUnavailableError'].includes(error?.name) ? 'cameraUnavailable' : error?.name === 'NotReadableError' ? 'cameraBusy' : 'error'; this.render();
  }
  ready() {
    this.audio.reset(); this.phase = 'ready'; this.status = ''; this.countdown = SOLO.readyTime;
    this.match = createSoloMatch({ height: this.height, layoutId: this.layoutId, handSide: this.handSide });
    this.fake = { x: .18, y: this.height/2, angle: 0, distance: .12 }; this.effects = []; this.trail = []; this.impact = null; this.last = null; this.advancing = false; this.pointer = null; this.syncControls(); this.render();
  }
  pause() { if (!['ready','playing'].includes(this.phase)) return; this.beforePause = this.phase; this.phase = 'paused'; this.audio.setMusic(false); this.audio.stopEffects(); this.pointer = null; this.render(); this.$('.tns-resume').focus({ preventScroll:true }); }
  resume() { if (this.phase !== 'paused') return; void this.audio.unlock(); this.phase = this.beforePause ?? 'playing'; this.last = null; this.render(); }
  async toggleFullscreen() {
    try { const shell = this.$('.tns-shell'); if (document.fullscreenElement === shell) { await document.exitFullscreen(); window.screen?.orientation?.unlock?.(); } else { await shell.requestFullscreen({ navigationUI:'hide' }); try { await window.screen?.orientation?.lock?.('landscape'); } catch { /* Optional. */ } } } catch { /* Optional. */ }
    this.render();
  }
  fitFake() {
    this.fake.angle = clamp(this.fake.angle, -1.13, 1.13); this.fake.distance = clamp(this.fake.distance, .03, .21);
    const half = Math.abs(Math.cos(this.fake.angle)*this.fake.distance/2); this.fake.y = clamp(this.fake.y, half+.012, this.height-half-.012);
  }
  syncControls() { for (const el of this.root.querySelectorAll('input')) el.value = el.dataset.kind === 'position' ? this.fake.y / this.height * 100 : el.dataset.kind === 'angle' ? this.fake.angle*180/Math.PI : this.fake.distance*100; }
  snapshot() { return { phase: this.phase === 'ready' ? 'countdown' : this.phase, source: this.mode, paused: this.paused, result: this.phase === 'result' ? { outcome:this.match.reason === 'clear' ? 'clear' : 'failed', reason:this.match.reason, score:this.match.score, bricks:this.match.bricks.filter(b=>!b.alive).length, lives:this.match.lives, hits:this.match.hits, durationMs:Math.round(this.match.elapsed*1000), handSide:this.handSide, layoutId:this.layoutId, scored:false } : null }; }
  releaseInputs() { this.active = false; this.generation++; clearTimeout(this.timeout); cancelAnimationFrame(this.raf); this.input.stop(); this.net = null; this.pointer = null; this.audio.suspend(); if (document.fullscreenElement === this.$('.tns-shell')) { window.screen?.orientation?.unlock?.(); void document.exitFullscreen().catch(()=>{}); } }
  deactivate() { this.releaseInputs(); this.phase = 'setup'; this.root.hidden = true; }
  tick = now => {
    if (!this.active) return;
    const dt = this.last == null ? 0 : clamp((now-this.last)/1000,0,.05); this.last = now;
    const height = this.height;
    if (resizeSoloMatch(this.match,height)) { this.net = null; this.last = null; this.advancing = false; this.fake.y = height/2; this.trail = []; this.effects = []; this.impact = null; this.syncControls(); }
    if (this.mode === 'demo') {
      this.fitFake(); const f=this.fake, dx=Math.sin(f.angle)*f.distance/2,dy=Math.cos(f.angle)*f.distance/2;
      this.net = { ...geometry({x:f.x-dx,y:f.y-dy},{x:f.x+dx,y:f.y+dy}), active:true, opacity:1, seenAt:now };
    } else if (this.net && now-this.net.seenAt>CONFIG.holdMs) this.net = updateSoloNet(this.net,[],now);
    const usable = soloNetUsable(this.net,height), advance = usable && !document.hidden;
    // The first recovered frame establishes a new clock boundary. A long frame
    // gap, resize or recognition recovery never spends suspended play time.
    const activeDt = this.advancing && advance ? dt : 0;
    if (this.phase === 'ready' && advance) {
      this.countdown = Math.max(0,this.countdown-activeDt);
      if (!this.countdown) { this.phase='playing'; this.audio.effect('start'); }
    }
    if (this.phase === 'playing' && advance) {
      for (const event of stepSoloMatch(this.match,this.net,activeDt)) {
        if (event.type === 'hit') this.impact = event;
        if (['wall','brick'].includes(event.type)) this.effects.push({...event});
        if (event.type === 'miss') { this.missAt = this.match.elapsed; this.trail=[]; }
        this.audio.effect(event.type === 'brick' ? 'point' : event.type === 'miss' ? 'wall' : event.type,event.state,event.response?.opening ?? event.opening);
      }
      this.trail.push({x:this.match.ball.x,y:this.match.ball.y}); if(this.trail.length>12)this.trail.shift();
      this.effects = this.effects.filter(e=>this.match.elapsed-e.at<.55);
      if (this.match.phase==='result') { this.phase='result'; this.audio.reset(); }
    }
    this.advancing = advance && ['ready','playing'].includes(this.phase);
    this.audio.setMusic(this.phase==='playing' && advance);
    this.render(); this.draw(); this.raf=requestAnimationFrame(this.tick);
  };
  render() {
    const t=this.t, setup=this.phase==='setup', hand=this.setupStep==='hand', paused=['paused','confirm-hand'].includes(this.phase), confirm=this.phase==='confirm-hand';
    this.$('.tns-shell').dataset.phase=this.phase;
    this.$('.tns-setup').hidden=!setup; this.$('.tns-play').hidden=setup;
    this.$('.tns-tagline').textContent=t.tagline; this.$('.tns-setup-title').textContent=hand?t.handTitle:t.layoutTitle;
    this.$('.tns-hands').hidden=!hand; this.$('.tns-hand-hint').hidden=!hand; this.$('.tns-hand-hint').textContent=t.handHint;
    this.root.querySelectorAll('[data-hand]').forEach(b=>{b.querySelector('b').textContent=t[b.dataset.hand];b.setAttribute('aria-pressed',String(b.dataset.hand===this.handSide));});
    this.$('.tns-layouts').hidden=hand; this.$('.tns-setup-actions').hidden=hand;
    this.root.querySelectorAll('[data-layout]').forEach((b,i)=>{b.querySelector('b span').textContent=t.layouts[i];b.querySelector('small').textContent=t.descriptions[i];b.setAttribute('aria-pressed',String(b.dataset.layout===this.layoutId));b.querySelector('.tns-mini').dataset.side=this.handSide;});
    this.$('.tns-confirm-layout').textContent=t.continue; this.$('.tns-back-hand').textContent=t.back;
    this.$('.tns-score-label').textContent=t.score; this.$('.tns-score').textContent=String(this.match.score).padStart(4,'0');
    this.$('.tns-lives').textContent='♥'.repeat(this.match.lives)+'♡'.repeat(3-this.match.lives);this.$('.tns-lives').setAttribute('aria-label',`${t.lives}: ${this.match.lives}`);
    this.$('.tns-timer').textContent=`00:${String(Math.ceil(Math.max(0,SOLO.duration-this.match.elapsed))).padStart(2,'0')}`;
    this.$('.tns-pause').textContent=t.pause; this.$('.tns-pause').hidden=!['ready','playing'].includes(this.phase);
    this.$('.tns-overlay').hidden=!paused && this.phase!=='result';
    this.$('.tns-overlay h2').textContent=confirm?t.confirmTitle:paused?t.paused:t[this.match.reason]??'';
    this.$('.tns-overlay p').textContent=confirm?t.confirmText:paused?t.tagline:`${this.match.score} · ${t.resultHint}`;
    for (const [selector,key,visible] of [['resume','resume',paused&&!confirm],['restart','restart',!confirm],['change-hand','change',paused&&!confirm],['switch-confirm','confirm',confirm],['switch-cancel','cancel',confirm]]) {const b=this.$(`.tns-${selector}`);b.textContent=t[key];b.hidden=!visible;}
    const good=soloNetUsable(this.net,this.height), waiting=this.phase==='ready'||this.phase==='playing'&&!good;
    this.$('.tns-ready').hidden=!waiting;this.$('.tns-ready strong').textContent=good?`${t.ready} ${Math.ceil(this.countdown)}`:t.makeC;
    this.$('.tns-ready span').textContent=t.place(this.handSide);
    this.$('.tns-hint').textContent=this.phase==='playing'&&!good?t.lost:this.match.elapsed-(this.missAt??-Infinity)<.7?t.miss:this.match.serve>0?t.serve:t.return;
    this.stage.dataset.mode=this.mode; this.stage.dataset.side=this.handSide; this.video.hidden=this.mode!=='camera';
    this.$('.tns-controls').hidden=this.mode!=='demo'||!['ready','playing','paused'].includes(this.phase);
    this.root.querySelectorAll('[data-copy]').forEach(e=>e.textContent=t[e.dataset.copy]);this.root.querySelectorAll('input').forEach(e=>e.setAttribute('aria-label',t[e.dataset.kind]));
    this.$('.tns-control-hint').textContent=t.controls;this.$('.tns-mode').textContent=this.mode==='demo'?t.practice:t.camera;this.$('.tns-mode').dataset.mode=this.mode;
    this.$('.tns-side').textContent=t[this.handSide];this.$('.tns-layout-back').textContent=t.chooseLayout;this.$('.tns-layout-back').hidden=setup;
    this.$('.tns-exit').textContent=t.exit;this.$('.tns-sound').textContent=`${t.sound} ${this.sound?'ON':'OFF'}`;this.$('.tns-sound').setAttribute('aria-pressed',String(this.sound));
    this.$('.tns-full').textContent=document.fullscreenElement===this.$('.tns-shell')?t.fullExit:t.full;this.$('.tns-full').hidden=setup||!this.$('.tns-shell').requestFullscreen;
    this.$('.tns-status').textContent=t[this.status]??'';this.$('.tns-recovery').hidden=this.phase!=='camera-error';this.$('.tns-camera-retry').textContent=t.cameraRetry;this.$('.tns-demo-recovery').textContent=t.demo;
    this.$('.tns-rotate').textContent=t.rotate;this.$('.tns-how summary').textContent=t.how;this.$('.tns-guide').textContent=t.guide;this.$('.tns-privacy').textContent=t.privacy;
  }
  draw() {
    if (this.phase==='setup') return;
    const r=this.stage.getBoundingClientRect(),dpr=Math.min(window.devicePixelRatio||1,2),w=Math.round(r.width*dpr),h=Math.round(r.height*dpr);if(!w||!h)return;
    if(this.canvas.width!==w||this.canvas.height!==h){this.canvas.width=w;this.canvas.height=h;}
    const c=this.ctx,height=this.height, sx=x=>screenX(x,this.handSide);c.setTransform(w,0,0,w,0,0);c.clearRect(0,0,1,height);
    c.fillStyle='#06172155';c.fillRect(0,0,1,height);c.lineWidth=.008;c.strokeStyle='#dbeff4';
    for(const y of [.005,height-.005]){c.beginPath();c.moveTo(0,y);c.lineTo(1,y);c.stroke();}
    c.beginPath();c.moveTo(sx(.995),0);c.lineTo(sx(.995),height);c.stroke();
    c.strokeStyle='#7be4ec50';c.lineWidth=.002;c.setLineDash([.008,.012]);c.beginPath();c.moveTo(.5,0);c.lineTo(.5,height);c.stroke();c.setLineDash([]);
    c.fillStyle='#7be4ec0c';c.fillRect(this.handSide==='right'?.5:0,0,.5,height);
    for(const b of this.match.bricks){if(!b.alive)continue;const rect=brickRect(b,height),x=this.handSide==='right'?sx(rect.x+rect.width):rect.x;
      c.shadowColor='#ffb88c';c.shadowBlur=9;c.fillStyle=['#ffd49a','#ffb18c','#ff8f86'][b.id%3];c.beginPath();c.roundRect(x,rect.y,rect.width,rect.height,.007);c.fill();c.shadowBlur=0;
      c.fillStyle='#fff9ed77';c.fillRect(x+.008,rect.y+.007,rect.width-.016,.004);
    }
    for(const e of this.effects){const age=this.match.elapsed-e.at;if(!e.point||age<0||age>.55)continue;c.globalAlpha=1-age/.55;c.strokeStyle=e.type==='brick'?'#ffc99d':'#7be4ec';c.lineWidth=.003;c.beginPath();c.arc(sx(e.point.x),e.point.y,.012+age*.12,0,Math.PI*2);c.stroke();if(e.type==='brick'){c.fillStyle='#ffc99d';for(let i=0;i<7;i++){const a=i*Math.PI*2/7;c.fillRect(sx(e.point.x+Math.cos(a)*age*.12)-.003,e.point.y+Math.sin(a)*age*.12-.003,.006,.006);}}}c.globalAlpha=1;
    const n=this.net;if(n?.opacity){const valid=soloNetUsable(n,height),response=netResponse(n),age=this.impact?this.match.elapsed-this.impact.at:1,snap=this.impact?netDeflection(this.impact.response,age):0,dir=this.impact?.direction??{x:-1,y:0};
      const mid={x:n.center.x+2*snap*dir.x-response.stretch*.08,y:n.center.y+2*snap*dir.y};c.globalAlpha=n.opacity;c.strokeStyle=c.fillStyle=valid?'#7be4ec':'#ff9292';c.shadowColor=c.strokeStyle;c.shadowBlur=12;c.lineWidth=.004;
      for(let i=-1;i<=1;i++){c.beginPath();c.moveTo(sx(n.thumb.x),n.thumb.y);c.quadraticCurveTo(sx(mid.x+i*.003),mid.y+i*.003,sx(n.index.x),n.index.y);c.stroke();}
      for(const p of[n.thumb,n.index]){c.beginPath();c.arc(sx(p.x),p.y,.008,0,Math.PI*2);c.fill();}c.shadowBlur=0;c.globalAlpha=1;
    }
    this.trail.forEach((p,i)=>{c.fillStyle='#fff9ed';c.globalAlpha=i/this.trail.length*.2;c.beginPath();c.arc(sx(p.x),p.y,CONFIG.radius*(i/this.trail.length),0,Math.PI*2);c.fill();});c.globalAlpha=1;
    const ball=this.match.ball;c.fillStyle='#fff9ed';c.shadowColor='#a1f5ff';c.shadowBlur=14;c.beginPath();c.arc(sx(ball.x),ball.y,CONFIG.radius,0,Math.PI*2);c.fill();c.shadowBlur=0;
    if(this.match.serve>0){c.strokeStyle='#fff9ed88';c.lineWidth=.002;c.setLineDash([.008,.008]);c.beginPath();c.moveTo(sx(ball.x-.04),ball.y);c.lineTo(sx(.23),ball.y);c.stroke();c.setLineDash([]);}
  }
}
export const createView=(root,locale,options)=>new TensionSolo(root,locale,options);
