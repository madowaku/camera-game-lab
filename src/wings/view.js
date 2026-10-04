import { BodyWingsInput } from "../input/bodyWingsInput.js";
import { BodyWingsGame } from "../games/bodyWings.js";
import { clamp } from "../input/bodyWingsPose.js";
import { WingsRenderer } from "./renderer.js";
import { FlightAudio } from "./audio.js";
import { messages } from "./messages.js";
import { CreatorMode } from "../creator/CreatorMode.js";
import { bodyWingsCreatorProfile, selectFlightHighlight } from "./creatorProfile.js";
import "./wings.css";

export const createView = (root, locale = "ja") => new BodyWingsView(root, locale);
export class BodyWingsView {
  constructor(root, locale) {
    this.root = root; this.locale = locale; this.listeners = new Set(); this.keys = new Set(); this.generation = 0;
    this.phase = "idle"; this.source = "camera"; this.active = false; this.options = {}; this.soundEnabled = true;
    this.game = new BodyWingsGame(); this.audio = new FlightAudio();
    this.reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
    root.innerHTML = `<section class="bw-view"><div class="bw-toolbar"><span class="bw-source"></span><button type="button" class="bw-sound"></button><button type="button" class="bw-pause"></button></div>
      <div class="bw-stage" tabindex="0" role="group"><video muted playsinline aria-hidden="true"></video><canvas class="bw-canvas" aria-hidden="true"></canvas><canvas class="bw-capture" hidden aria-hidden="true"></canvas>
      <div class="bw-hud"><div><small>RINGS</small><strong class="bw-rings">0</strong></div><span class="bw-flight-tag">RING RUSH</span><div><small>COMBO</small><strong class="bw-combo">×0</strong></div></div>
      <div class="bw-overlay" role="status" aria-live="polite" hidden></div><div class="bw-cue" role="status" aria-live="polite"></div><div class="bw-boost" hidden>BOOST · ×2</div>
      <div class="bw-timer"><strong class="bw-time">30.0</strong><small>SEC</small><progress class="bw-progress" max="30000" value="30000" aria-label="Remaining flight time"></progress></div></div>
      <p class="bw-hint"></p><div class="bw-recovery" hidden><button type="button" class="bw-retry"></button><button type="button" class="bw-practice"></button></div></section>`;
    this.$ = s => root.querySelector(s); this.video = this.$("video"); this.canvas = this.$(".bw-canvas");
    this.creatorCanvas = this.$(".bw-capture"); this.renderer = new WingsRenderer(this.canvas);
    this.input = new BodyWingsInput(this.video, { onPose: pose => { this.raw = pose; }, onStatus: (status, error) => {
      if (!this.active || this.source !== "camera") return;
      if (status === "ERROR") this.fail(error); else { this.status = status; this.render(); }
    } }); this.render();
  }
  get t() { return messages[this.locale === "ja" ? "ja" : "en"]; }
  subscribe(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  notify() { this.listeners.forEach(fn => fn(this.snapshot())); }
  snapshot() {
    const phase = ["ready", "transform", "tutorial", "landing"].includes(this.phase) ? "countdown" : this.phase;
    const r = this.game.result;
    return { phase, source: this.source, result: this.phase === "result" ? { ...r, creator: this.creatorResult,
      summaryJa: `${r.rings}/${r.totalRings}リング · ${r.distance}m · 最大コンボ ×${r.bestCombo}`,
      summaryEn: `${r.rings}/${r.totalRings} rings · ${r.distance}m · Best combo ×${r.bestCombo}` } : null };
  }
  configure(options = {}) { this.options = { creator: !!options.creator, faceMode: options.faceMode ?? "ORIGINAL" }; }
  activate() { this.active = true; this.phase = "idle"; this.render(); }
  setLocale(locale) { this.locale = locale; this.render(); }
  bind() {
    this.abort?.abort(); this.abort = new AbortController(); const signal = this.abort.signal, stage = this.$(".bw-stage");
    const steer = e => { const b = stage.getBoundingClientRect(); this.pointerTilt = clamp(((e.clientX - b.left) / b.width - .5) * .64, -.32, .32); };
    stage.addEventListener("pointerdown", e => {
      if (this.source !== "demo" || e.button > 0 || this.game.paused) return;
      e.preventDefault(); stage.focus({ preventScroll: true }); stage.setPointerCapture(e.pointerId); this.pointerId = e.pointerId; steer(e);
    }, { signal });
    stage.addEventListener("pointermove", e => { if (this.source === "demo" && !this.game.paused && this.pointerId === e.pointerId) steer(e); }, { signal });
    const release = () => { this.pointerId = null; this.pointerTilt = 0; };
    stage.addEventListener("pointerup", release, { signal }); stage.addEventListener("pointercancel", release, { signal }); stage.addEventListener("lostpointercapture", release, { signal });
    window.addEventListener("keydown", e => {
      if (this.source !== "demo" || !["ArrowLeft", "ArrowRight", "KeyA", "KeyD"].includes(e.code) || e.target.closest("button,a,input,textarea")) return;
      e.preventDefault(); if (!this.game.paused) this.keys.add(e.code);
    }, { signal });
    window.addEventListener("keyup", e => this.keys.delete(e.code), { signal });
    const background = value => { this.backgroundPaused = value; this.keys.clear(); release(); this.syncPause(); this.lastTick = performance.now(); this.render(); };
    window.addEventListener("blur", () => background(true), { signal }); window.addEventListener("focus", () => background(document.hidden), { signal });
    document.addEventListener("visibilitychange", () => background(document.hidden), { signal });
    this.$(".bw-pause").addEventListener("click", () => { this.userPaused = !this.userPaused; this.keys.clear(); release(); this.syncPause(); this.render(); }, { signal });
    this.$(".bw-sound").addEventListener("click", () => { this.soundEnabled = !this.soundEnabled; this.audio.setEnabled(this.soundEnabled); this.render(); }, { signal });
    this.$(".bw-retry").addEventListener("click", () => void this.startCamera(), { signal });
    this.$(".bw-practice").addEventListener("click", () => this.startDemo(), { signal });
  }
  syncPause() { this.game.setPaused(this.userPaused || this.backgroundPaused); this.audio.update(this.game); }
  setup(source) {
    this.releaseInputs(); this.creatorResult = null; this.active = true; this.source = source; this.phase = "loading"; this.status = "LOADING_MODEL";
    this.game = new BodyWingsGame(source); this.raw = null; this.pointerTilt = 0; this.pointerId = null;
    this.userPaused = false; this.backgroundPaused = document.hidden; this.landingMs = 0; this.highlights = []; this.receiptSaved = false;
    if (this.options.creator) this.creator = new CreatorMode(this.creatorCanvas, { profile: bodyWingsCreatorProfile, faceMode: this.options.faceMode, reducedMotion: this.reducedMotion });
    this.bind(); this.audio.enable(); this.audio.setEnabled(this.soundEnabled); this.syncPause(); this.render(); this.notify(); return this.generation;
  }
  async startCamera() {
    const token = this.setup("camera");
    try { await this.input.start(); if (this.active && token === this.generation) this.begin(); }
    catch (error) { if (token === this.generation && error.name !== "AbortError") this.fail(error); }
  }
  startDemo() { this.setup("demo"); this.begin(); this.$(".bw-stage").focus({ preventScroll: true }); }
  begin() { this.phase = "ready"; this.lastTick = performance.now(); this.render(); this.notify(); this.raf = requestAnimationFrame(this.tick); }
  sample(now) {
    if (this.source === "demo") return { spread: true, tilt: (Number(this.keys.has("ArrowRight") || this.keys.has("KeyD")) - Number(this.keys.has("ArrowLeft") || this.keys.has("KeyA"))) * .24 || this.pointerTilt };
    return this.raw && now - this.raw.at <= 180 ? this.raw : null;
  }
  tick = now => {
    if (!this.active || ["idle", "loading", "error", "result"].includes(this.phase)) return;
    const dt = now - this.lastTick; this.lastTick = now; const previous = this.phase;
    this.currentPose = this.sample(now);
    if (this.phase === "landing") {
      if (!this.game.paused) this.landingMs += Math.min(dt, 100);
      if (this.landingMs >= 800) this.phase = "result";
    } else {
      this.game.step(dt, this.currentPose); this.phase = this.game.phase === "result" ? "landing" : this.game.phase;
      for (const event of this.game.events) { this.highlights.push(event); this.audio.effect(event.type); this.creator?.highlight(event.type, event.at, event.data); }
    }
    this.audio.update(this.game); this.render();
    if (this.phase === "result") {
      if (this.creator) { const capture = this.creator.snapshot(); this.creatorResult = { ...capture, ...selectFlightHighlight(capture.frames, this.highlights) }; }
      this.input.stop(); this.audio.stopEngine(); this.saveReceipt(); this.notify(); this.raf = null; return;
    }
    if (previous !== this.phase) this.notify(); this.raf = requestAnimationFrame(this.tick);
  };
  saveReceipt() {
    if (this.receiptSaved) return; this.receiptSaved = true;
    try { const key = "camera-game-lab-body-wings-rounds", saved = JSON.parse(localStorage.getItem(key) || "[]");
      const rounds = Array.isArray(saved) ? saved : []; rounds.push({ ...this.game.result, experiment: "EXP-046", recordedAt: new Date().toISOString() }); localStorage.setItem(key, JSON.stringify(rounds.slice(-50))); } catch { /* Optional storage. */ }
  }
  fail(error) { this.releaseInputs(); this.phase = "error"; this.error = error; this.bind(); this.render(); this.notify(); }
  releaseInputs() {
    ++this.generation; cancelAnimationFrame(this.raf); this.raf = null; this.abort?.abort(); this.keys.clear(); this.input.stop(); this.audio.dispose();
    this.creator?.dispose(); this.creator = null; this.raw = null; this.currentPose = null;
  }
  deactivate() { this.active = false; this.releaseInputs(); this.creatorResult = null; this.phase = "idle"; }
  render() {
    const g = this.game, t = this.t, $ = this.$, text = (s, value) => { const n = $(s); if (n.textContent !== String(value)) n.textContent = value; };
    text(".bw-source", t[this.source === "demo" ? "demo" : "camera"] + (this.options.creator ? " · CREATOR" : ""));
    text(".bw-sound", t[this.soundEnabled ? "soundOn" : "soundOff"]); $(".bw-sound").setAttribute("aria-pressed", String(this.soundEnabled));
    text(".bw-pause", t[this.userPaused ? "resume" : "pause"]); $(".bw-pause").disabled = ["idle", "loading", "error", "result"].includes(this.phase); $(".bw-pause").setAttribute("aria-pressed", String(!!this.userPaused));
    text(".bw-rings", g.rings); text(".bw-combo", `×${g.combo}`); text(".bw-time", (g.remainingMs / 1000).toFixed(1)); $(".bw-progress").value = g.remainingMs;
    $(".bw-stage").setAttribute("aria-label", t.board); $(".bw-boost").hidden = !g.boosted;
    const overlay = this.phase === "error" ? t.error : this.phase === "loading" ? t[this.status === "REQUESTING_CAMERA" ? "requesting" : "loading"]
      : g.paused ? t[this.userPaused ? "paused" : "background"] : this.source === "camera" && g.missingMs >= 800 ? t.missing : "";
    text(".bw-overlay", overlay); $(".bw-overlay").hidden = !overlay;
    const event = g.effect && g.time - g.effect.at < 600 ? g.effect.type : null;
    const eventLabel = event === "BOOST" ? g.combo >= 10 ? "SUPER FLIGHT!" : "FLOW!" : event === "PERFECT" ? "PERFECT!" : event === "GOOD" ? "GOOD!" : event === "MISS" ? "MISS!" : event === "TUTORIAL_PASS" ? "PERFECT!" : null;
    const cue = this.phase === "ready" ? t.ready : this.phase === "transform" ? t.transform : this.phase === "playing" ? eventLabel || (g.elapsed < 2500 ? t.playing : "") : this.phase === "landing" ? "YOUR FLIGHT" : "";
    text(".bw-cue", cue); $(".bw-cue").dataset.state = this.phase;
    text(".bw-hint", t[this.source === "demo" ? "demoHint" : "cameraHint"]);
    $(".bw-recovery").hidden = this.phase !== "error"; text(".bw-retry", t.retryCamera); text(".bw-practice", t.practice);
    this.renderer.draw(g, { video: this.video, input: this.input, pose: this.source === "camera" ? this.currentPose ?? (this.phase === "ready" ? this.raw : null) : null,
      demo: this.source === "demo", faceMode: this.options.faceMode, reducedMotion: this.reducedMotion, landing: clamp(this.landingMs / 800), locale: this.locale });
    // Scene already contains the segmented, face-mode-safe player. Feed that
    // opaque composite to the shared recorder, without a second camera layer.
    if (this.creator && !g.paused && !["idle", "loading", "error"].includes(this.phase)) this.creator.compose(this.video, this.canvas, { time: g.time, source: "demo" });
  }
}
