import { SoftServeInput } from "../input/softServeInput.js";
import { NozzleGuide } from "./nozzleGuide.js";
import { projectMouth } from "../input/mouthPosition.js";
import { SoftServeGame, clamp, heightLabel } from "../games/softServe.js";
import { drawSoftServe } from "./renderer.js";
import { SoftServeAudio } from "./audio.js";
import { messages } from "./messages.js";
import { SoftServeAnimation } from "./animation.js";
import logo from "./assets/logo.png";
import { CreatorMode } from "../creator/CreatorMode.js";
import { softServeCreatorProfile } from "./creatorProfile.js";
import { SoftServeDirectorEvents } from "./directorEvents.js";
import "../creator/creator.css";
import "./softServe.css";

export function createView(root, locale = "ja") { return new SoftServeView(root, locale); }
class SoftServeView {
  constructor(root, locale) {
    this.root = root; this.locale = locale; this.listeners = new Set(); this.keys = new Set();
    this.generation = 0; this.phase = "idle"; this.source = "camera"; this.active = false;
    this.game = new SoftServeGame(); this.audio = new SoftServeAudio(); this.soundPreference = true; this.reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
    root.innerHTML = `<div class="ss-view"><div class="ss-toolbar"><img class="ss-mini-logo" src="${logo}" alt="SOFT SERVE"><strong class="ss-height"></strong><div class="ss-tools"><button type="button" class="ss-sound" aria-pressed="false"></button><button type="button" class="ss-pause"></button></div></div>
      <span class="ss-source"></span><div class="ss-creator-face" hidden><label><span>FACE</span><select aria-label="Face mode"><option>ORIGINAL</option><option>EFFECT</option><option>HIDE</option></select></label></div><div class="ss-hud"><span class="ss-risk"></span><strong class="ss-multiplier"></strong></div>
      <div class="ss-stage" tabindex="0" role="group"><video muted playsinline></video><canvas aria-hidden="true"></canvas><canvas class="creator-scene" aria-hidden="true" hidden></canvas><div class="ss-overlay" role="status" aria-live="polite" hidden></div></div>
      <div class="ss-meters"><label class="ss-meter"><span class="ss-melt-label"></span><span class="ss-melt-value"></span><progress class="ss-melt" max="100"></progress></label><label class="ss-meter"><span class="ss-balance-label"></span><span class="ss-balance-value"></span><progress class="ss-balance" max="100"></progress></label></div>
      <div class="ss-caption"><h2 class="ss-callout" role="status" aria-live="polite"></h2><p class="ss-instruction"></p></div>
      <div class="ss-actions"><button type="button" class="ss-finish" hidden></button><button type="button" class="ss-bite" hidden></button></div><ol class="ss-steps"></ol><p class="ss-hint"></p>
      <div class="ss-recovery" hidden><button type="button" class="ss-retry"></button><button type="button" class="ss-demo"></button></div></div>`;
    this.$ = s => root.querySelector(s);
    this.nodes = Object.fromEntries([...root.querySelectorAll("[class]")].filter(e => e.classList.length === 1).map(e => [e.className.replace("ss-", ""), e]));
    this.video = this.$("video"); this.canvas = this.$("canvas");
    this.feelVariant = new URLSearchParams(window.location.search).get("debug") === "1" &&
      new URLSearchParams(window.location.search).get("feel") === "B" ? "B" : "A";
    this.nozzleGuide = new NozzleGuide();
    this.creatorCanvas = this.$(".creator-scene"); this.creatorConfig = { creator: false, faceMode: "ORIGINAL" };
    this.input = new SoftServeInput(this.video, { onFrame: frame => {
      if (this.active && this.source === "camera") { this.raw = frame; this.lastInput = performance.now(); }
    }, onStatus: status => {
      if (this.active && this.source === "camera") {
        if (status === "ERROR") this.fail();
        else if (["LOADING_MODEL", "REQUESTING_CAMERA"].includes(status)) { this.status = status; this.render(); }
      }
    } });
    this.render();
  }
  get t() { return messages[this.locale === "ja" ? "ja" : "en"]; }
  subscribe(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  notify() { this.listeners.forEach(fn => fn(this.snapshot())); }
  snapshot() {
    const r = this.game.result;
    return { phase: ["serve", "eat"].includes(this.phase) ? "playing" : this.phase === "ready" ? "countdown" : this.phase, source: this.source,
      result: this.phase === "result" && r ? { ...r, shape: this.game.completedShape, creator: this.creatorResult, titleJa: messages.ja[r.outcome], titleEn: messages.en[r.outcome],
        summaryJa: `${r.source === "demo" ? "練習" : "カメラ"} · ${r.maxSwirls}巻き ×${r.multiplier} · ${r.eatenPercent}%食べた`,
        summaryEn: `${r.source === "demo" ? "Practice" : "Camera"} · ${r.maxSwirls} swirls ×${r.multiplier} · ${r.eatenPercent}% eaten` } : null };
  }
  setLocale(locale) { this.locale = locale; this.render(); }
  configure(options) { this.launchOptions=options;this.creatorConfig = { creator: !!options.creator, faceMode: options.faceMode ?? "ORIGINAL" }; }
  activate() { this.active = true; this.phase = "idle"; this.render(); }
  bind() {
    this.abort?.abort(); this.abort = new AbortController(); const signal = this.abort.signal, n = this.nodes;
    const move = e => { const b = n.stage.getBoundingClientRect(); this.cursor = { x: clamp((e.clientX - b.left) / b.width, .08, .92), y: clamp((e.clientY - b.top) / b.height, .38, .84) }; };
    n.stage.addEventListener("pointerdown", e => {
      if (this.source !== "demo" || e.button > 0 || this.game.paused) return;
      e.preventDefault(); n.stage.focus({ preventScroll: true }); n.stage.setPointerCapture(e.pointerId);
      this.pointer = { id: e.pointerId, x: e.clientX, y: e.clientY, phase: this.phase, moved: false };
      if (this.phase !== "eat") move(e);
    }, { signal });
    n.stage.addEventListener("pointermove", e => {
      if (this.source !== "demo" || this.game.paused) return;
      if (this.pointer?.id === e.pointerId) {
        this.pointer.moved ||= Math.hypot(e.clientX - this.pointer.x, e.clientY - this.pointer.y) > 8;
        if (this.phase !== "eat" || this.pointer.moved) move(e);
      } else if (e.pointerType === "mouse" && this.phase !== "eat") move(e);
    }, { signal });
    n.stage.addEventListener("pointerup", e => {
      if (this.pointer?.id === e.pointerId && this.pointer.phase === "eat" && !this.pointer.moved && !this.game.paused) this.pendingBite = true;
      this.pointer = null;
    }, { signal });
    n.stage.addEventListener("pointercancel", () => { this.pointer = null; }, { signal });
    window.addEventListener("keydown", e => {
      if (this.source !== "demo" || e.target.closest("button,a,input,textarea") || !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Space"].includes(e.code)) return;
      e.preventDefault();
      if (e.code === "Space") { if (!e.repeat && this.phase === "eat" && !this.game.paused) this.pendingBite = true; }
      else this.keys.add(e.code);
    }, { signal });
    window.addEventListener("keyup", e => this.keys.delete(e.code), { signal });
    const background = paused => { this.backgroundPaused = paused; this.keys.clear(); this.pointer = null; this.pendingBite = false; this.syncPause(); this.lastTick = performance.now(); };
    window.addEventListener("blur", () => background(true), { signal });
    window.addEventListener("focus", () => background(document.hidden), { signal });
    document.addEventListener("visibilitychange", () => background(document.hidden), { signal });
    n.pause.addEventListener("click", () => { this.userPaused = !this.userPaused; this.keys.clear(); this.pendingBite = false; this.syncPause(); this.render(); }, { signal });
    n.sound.addEventListener("click", () => { this.soundPreference = !this.audio.enabled; if (this.audio.enabled) this.audio.stop(); else { this.audio.enable(); this.audio.play("swirl"); } this.render(); }, { signal });
    n.finish.addEventListener("click", () => { if (this.source === "demo") this.game.completeServe(); }, { signal });
    n.bite.addEventListener("click", () => { if (this.source === "demo" && !this.game.paused) this.pendingBite = true; }, { signal });
    n.retry.addEventListener("click", () => void this.startCamera(), { signal });
    n.demo.addEventListener("click", () => this.startDemo(), { signal });
    this.$(".ss-creator-face select").addEventListener("change", event => {
      this.creatorConfig.faceMode=event.target.value;
      if(this.launchOptions)this.launchOptions.faceMode=event.target.value;
      this.creator?.setFaceMode(event.target.value);this.render();
    }, { signal });
  }
  syncPause() {
    const paused = this.userPaused || this.backgroundPaused;
    this.game.setPaused(paused); this.game.paused = paused || this.game.missing || this.game.wasMissing;
  }
  setup(source) {
    this.releaseInputs(); this.active = true; this.source = source; this.phase = "loading"; this.status = "LOADING_MODEL";
    this.game = new SoftServeGame(); this.game.reset(source); this.raw = null; this.lastInput = -Infinity;
    this.nozzleGuide.reset();
    this.cursor = { x: .5, y: .72 }; this.pendingBite = false; this.pointer = null; this.userPaused = false; this.backgroundPaused = document.hidden; this.lastEffect = null; this.lastPour = 0;
    this.animation = new SoftServeAnimation({ finishMs: this.creatorConfig.creator ? 3100 : 750 }); this.receiptSaved = false;
    this.creatorResult = null; this.oversizeHighlight = false; this.finalApproach = false; this.lastHighlight = null;
    if(this.creatorConfig.creator)this.creator = new CreatorMode(this.creatorCanvas,{profile:softServeCreatorProfile,faceMode:this.creatorConfig.faceMode,reducedMotion:this.reducedMotion});
    this.directorEvents=this.creator?new SoftServeDirectorEvents(event=>this.creator.event(event)):null;
    this.bind(); this.syncPause(); if (this.soundPreference) this.audio.enable(); this.render(); this.notify(); return this.generation;
  }
  async startCamera() {
    const token = this.setup("camera");
    try { await this.input.start(); if (this.active && token === this.generation) this.begin(); }
    catch (error) { if (token === this.generation && error.name !== "AbortError") this.fail(); }
  }
  startDemo() { this.setup("demo"); this.begin(); this.nodes.stage.focus({ preventScroll: true }); }
  begin() { this.phase = "ready"; this.creator?.event({type:"GAME_START",timestamp:0});this.lastTick = performance.now(); this.render(); this.notify(); this.raf = requestAnimationFrame(this.tick); }
  project(point) { return projectMouth(point, this.video.videoWidth, this.video.videoHeight, this.nodes.stage.clientWidth, this.nodes.stage.clientHeight); }
  sample(now, dt) {
    if (this.source === "camera") {
      if (now - this.lastInput > 350) return null;
      return { hand: this.project(this.raw?.hand), mouth: this.project(this.raw?.mouth), open: this.raw?.open, face: this.raw?.face };
    }
    if (!this.game.manualPause && dt < 500) {
      const dx = Number(this.keys.has("ArrowRight")) - Number(this.keys.has("ArrowLeft"));
      const dy = Number(this.keys.has("ArrowDown")) - Number(this.keys.has("ArrowUp"));
      this.cursor.x = clamp(this.cursor.x + dx * dt / 1000 * .35, .08, .92); this.cursor.y = clamp(this.cursor.y + dy * dt / 1000 * .3, .38, .84);
    }
    const bite = this.pendingBite; this.pendingBite = false; return { hand: this.cursor, bite };
  }
  tick = now => {
    if (!this.active) return;
    const dt = now - this.lastTick; this.lastTick = now;
    if (this.animation.advance(dt, this.userPaused || this.backgroundPaused)) {
      this.render();this.raf=null;void this.completeRound();return;
    }
    if (this.phase === "finishing") { this.currentSample=this.sample(now,dt);this.render(); this.raf = requestAnimationFrame(this.tick); return; }
    const sample = this.sample(now, dt);
    if(this.creator && !this.finalApproach && this.game.phase === "eat" && this.game.amount <= 1.01 && sample?.open && sample?.mouth && Math.hypot(sample.mouth.x-this.game.tip.x,sample.mouth.y-this.game.tip.y)<.15) {
      this.finalApproach=true;this.creator.highlight("finish",this.animation.time,{anticipation:true});
    }
    this.currentSample = sample; this.game.step(dt, sample);
    this.directorEvents?.observe(this.game,this.animation.time);
    const changed = this.phase !== this.game.phase; this.phase = this.game.phase;
    const effect = this.game.effect;
    if (effect && effect !== this.lastEffect) { this.audio.play(effect.type); this.lastEffect = effect; this.animation.consume(effect, sample?.mouth); }
    if(this.creator && effect?.type === "swirl" && effect !== this.lastHighlight && this.game.amount >= 3 && this.game.beauty >= .72 && this.game.stability > .7) {
      this.creator.highlight("perfect",this.animation.time,{size:Math.floor(this.game.amount),point:{...this.game.tip}});this.lastHighlight=effect;
    }
    if(this.creator && !this.oversizeHighlight && this.game.maxAmount>=10){this.oversizeHighlight=true;this.creator.highlight("fail",this.animation.time,{reason:"oversize"});}
    if (this.phase === "serve" && !this.game.paused && this.game.elapsedMs - this.lastPour > 300) { this.audio.play("pour"); this.lastPour = this.game.elapsedMs; }
    if (this.phase === "result") {
      this.phase = "finishing"; this.animation.finish(this.game.result.outcome);
      const r=this.game.result;
      this.creator?.highlight(r.outcome === "clean" ? "finish" : "fail",this.animation.time,{final:true,score:r.score,size:r.maxSwirls,swirl:r.beauty,outcome:r.outcome});
      this.render();
      if(!this.creator){this.input.stop(); this.raw = null; this.currentSample = null;}
      this.keys.clear(); this.pendingBite = false;
      this.audio.play(this.game.result.outcome);
    }
    this.render();
    if (changed) this.notify(); this.raf = requestAnimationFrame(this.tick);
  };
  async completeRound() {
    const token=this.generation;
    this.creator?.event({type:"GAME_END",timestamp:this.animation.time,score:this.game.result.score});
    this.creatorResult=this.creator?await this.creator.finish({source:this.source,sound:this.soundPreference}):null;
    if(token!==this.generation||!this.active)return;
    this.input.stop();this.raw=null;this.currentSample=null;
    this.phase="result";this.saveReceipt();this.render();this.notify();
  }
  saveReceipt() {
    if (this.receiptSaved) return; this.receiptSaved = true;
    try {
      const key = "camera-game-lab-soft-serve-rounds", stored = JSON.parse(localStorage.getItem(key) || "[]");
      const rounds = Array.isArray(stored) ? stored : []; rounds.push({ experiment: "EXP-044", ...this.game.result, recordedAt: new Date().toISOString() });
      localStorage.setItem(key, JSON.stringify(rounds.slice(-50)));
    } catch { /* Blocked storage does not interrupt play. */ }
  }
  fail() { this.releaseInputs(); this.phase = "error"; this.bind(); this.render(); this.notify(); }
  releaseInputs() {
    ++this.generation; cancelAnimationFrame(this.raf); clearTimeout(this.resultTimer); this.resultTimer = null; this.raf = null; this.abort?.abort(); this.keys.clear();
    this.input.stop(); this.audio.stop(); this.raw = null; this.currentSample = null; this.pendingBite = false;
    this.nozzleGuide.reset();
    this.creator?.dispose(); this.creator = null; this.creatorCanvas.hidden = true;
    this.creatorResult = null;
  }
  deactivate() { this.active = false; this.releaseInputs(); this.phase = "idle"; }
  render() {
    const t = this.t, n = this.nodes, g = this.game, r = this.phase === "result" ? g.result : null;
    const text = (key, value) => { if (n[key].textContent !== String(value)) n[key].textContent = value; };
    n.view.classList.toggle("is-result", !!r); n.stage.classList.toggle("is-demo", this.source === "demo"); n.stage.classList.toggle("is-finishing", this.phase === "finishing"); n.stage.setAttribute("aria-label", t.board);
    n.view.classList.toggle("is-creator", !!this.creator); this.creatorCanvas.hidden = !this.creator;
    n.view.classList.toggle("is-reaction",this.phase==="finishing"&&this.animation.finishAge>650);
    this.$(".ss-creator-face").hidden=!this.creator||!!r;
    this.$(".ss-creator-face select").value=this.creatorConfig.faceMode;
    this.$(".ss-creator-face select").title=this.locale==="ja"?"変更後の映像に反映されます":"Applies to newly captured frames";
    const guideMode = this.feelVariant === "B" && this.source === "camera";
    const visualGuide = guideMode ? this.nozzleGuide.update(this.currentSample?.hand, {
      phase: g.phase, paused: g.paused || this.userPaused || this.backgroundPaused,
    }) : null;
    text("source", t[this.source] + (guideMode ? (this.locale === "ja" ? " · 誘導B（表示のみ）" : " · GUIDE B (VISUAL)") : "")); text("pause", t[this.userPaused ? "resume" : "pause"]); n.pause.setAttribute("aria-pressed", String(!!this.userPaused)); n.pause.disabled = ["idle", "loading", "error", "result"].includes(this.phase);
    text("sound", t[this.audio.enabled ? "soundOn" : "soundOff"]); n.sound.setAttribute("aria-pressed", String(this.audio.enabled)); n.sound.disabled = !!r;
    const steps = t.steps.map((label, i) => `<li class="${(g.phase === "eat" ? i === 2 : g.amount >= 3 ? i === 1 : i === 0) ? "is-current" : ""}"><b>${i + 1}</b>${label}</li>`).join("");
    if (steps !== this.lastSteps) { n.steps.innerHTML = steps; this.lastSteps = steps; }
    const heightMarkup = `${Math.floor(["eat","result"].includes(g.phase) ? g.maxAmount : g.amount)}<small>${t.swirls}</small>`;
    if (n.height.innerHTML !== heightMarkup) n.height.innerHTML = heightMarkup;
    text("risk", heightLabel(Math.floor(g.maxAmount))); n.risk.classList.toggle("is-danger", g.maxAmount >= 8);
    const mult = `<small>${t.multiplier}</small>×${g.multiplier.toFixed(1)}`; if (n.multiplier.innerHTML !== mult) n.multiplier.innerHTML = mult;
    text("melt-label", t.melt); text("balance-label", t.balance); text("melt-value", `${Math.round(g.melt)}%`); text("balance-value", `${Math.round(g.stability * 100)}%`);
    n.melt.value = g.melt; n.balance.value = g.stability * 100; n.melt.setAttribute("aria-label", t.melt); n.balance.setAttribute("aria-label", t.balance);
    const overlay = this.phase === "error" ? t.error : this.phase === "loading" ? t[this.status === "REQUESTING_CAMERA" ? "requesting" : "loading"]
      : g.paused ? this.userPaused ? t.paused : this.backgroundPaused ? t.background : g.recoveryMs > 0 ? t.recovery : t[!this.currentSample?.hand ? "missingHand" : "missingMouth"] : "";
    text("overlay", overlay); n.overlay.hidden = !overlay || !!r;
    const danger = g.stability < .45 || g.melt > 70;
    const cue = this.phase === "finishing" ? g.result.outcome === "clean" ? "finishing" : g.result.outcome : g.phase === "eat" ? this.source === "demo" ? "eatDemo" : !g.biteArmed ? "separate" : !this.currentSample?.open ? "closedMouth" : "farMouth" : g.phase === "ready" ? "ready" : danger ? "danger" : !g.catching ? "missed" : g.amount >= 3 ? "greedy" : "serve";
    text("callout", t[cue]); n.callout.classList.toggle("is-danger", danger);
    text("instruction", t[cue === "ready" ? this.source === "demo" ? "readyDemo" : "readyHint" : ["separate", "closedMouth", "farMouth"].includes(cue) ? "eatHint" : `${cue}Hint`] ?? t.failureHint);
    text("hint", t[this.source === "demo" ? "demoHint" : "cameraHint"]);
    n.finish.hidden = this.source !== "demo" || this.phase !== "serve" || g.amount < .35; n.finish.disabled = g.paused; text("finish", t.finish);
    n.bite.hidden = this.source !== "demo" || this.phase !== "eat"; n.bite.disabled = g.paused; text("bite", t.bite);
    n.recovery.hidden = this.phase !== "error"; text("retry", t.retry); text("demo", t.tryDemo);
    for (const key of ["hud", "meters", "caption", "hint", "steps", "actions"]) n[key].hidden = !!r;
    drawSoftServe(this.canvas, g, { demo: this.source === "demo", mouth: this.currentSample?.mouth, open: this.currentSample?.open, locale: this.locale, reducedMotion: this.reducedMotion, animation: this.animation, quietReaction:!!this.creator, visualGuide });
    if(this.creator)this.creator.hud={swirls:Math.floor(g.maxAmount)};
    this.creator?.compose(this.video,this.canvas,{time:this.animation.time,face:this.currentSample?.face,open:this.currentSample?.open,biteAge:this.animation.biteAge,source:this.source});
  }
}
