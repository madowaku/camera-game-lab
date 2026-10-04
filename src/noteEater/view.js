import { NoteEaterInput } from "../input/noteEaterInput.js";
import { projectMouth } from "../input/mouthPosition.js";
import { NoteEaterGame, NOTE_TYPES, clamp, grooveStage } from "../games/noteEater.js";
import { NoteEaterAudio } from "./audio.js";
import { drawNoteEater } from "./renderer.js";
import { messages } from "./messages.js";
import { CreatorMode } from "../creator/CreatorMode.js";
import { noteEaterCreatorProfile, selectNoteEaterHighlight } from "./creatorProfile.js";
import "./noteEater.css";

export function createView(root, locale = "ja") { return new NoteEaterView(root, locale); }
export class NoteEaterView {
  constructor(root, locale) {
    this.root = root; this.locale = locale; this.listeners = new Set(); this.keys = new Set(); this.generation = 0;
    this.active = false; this.phase = "idle"; this.source = "camera"; this.options = {};
    this.game = new NoteEaterGame(); this.audio = new NoteEaterAudio(); this.soundPreference = true;
    this.reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
    root.innerHTML = `<section class="ne-view"><div class="ne-toolbar"><span class="ne-wordmark">NOTE<br>EATER<span aria-hidden="true">♪</span></span><span class="ne-source"></span><button type="button" class="ne-sound"></button><button type="button" class="ne-pause"></button></div>
      <div class="ne-topline"><strong class="ne-count">0<span>NOTES</span></strong><span class="ne-time">30<small>s</small></span></div>
      <div class="ne-stage" tabindex="0" role="group"><video muted playsinline></video><canvas class="ne-canvas" aria-hidden="true"></canvas><canvas class="ne-creator creator-scene" aria-hidden="true" hidden></canvas><div class="ne-overlay" role="status" aria-live="polite" hidden></div><div class="ne-cue" role="status" aria-live="polite"></div></div>
      <div class="ne-groove"><div><strong>GROOVE <span class="ne-groove-value">0</span></strong><span class="ne-layer"></span></div><progress max="100" value="0" aria-label="GROOVE"></progress></div>
      <button type="button" class="ne-bite" hidden></button><p class="ne-demo-hint"></p><div class="ne-recovery" hidden><button type="button" class="ne-retry-camera"></button><button type="button" class="ne-practice"></button></div></section>`;
    this.$ = selector => root.querySelector(selector); this.video = this.$("video"); this.canvas = this.$(".ne-canvas"); this.creatorCanvas = this.$(".ne-creator");
    this.input = new NoteEaterInput(this.video, { onFrame: frame => { if (this.active && this.source === "camera") this.raw = frame; }, onStatus: (status, error) => {
      if (!this.active || this.source !== "camera") return;
      if (status === "ERROR") this.fail(error); else { this.status = status; this.render(); }
    } });
    this.render();
  }
  get t() { return messages[this.locale === "ja" ? "ja" : "en"]; }
  subscribe(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  notify() { this.listeners.forEach(fn => fn(this.snapshot())); }
  snapshot() { return { phase: this.phase === "tutorial" ? "countdown" : this.phase, source: this.source,
    result: this.phase === "result" ? { ...this.game.result, creator: this.creatorResult } : null }; }
  configure(options) { this.options = { creator: !!options.creator, faceMode: options.faceMode ?? "ORIGINAL" }; }
  setLocale(locale) { this.locale = locale; this.render(); }
  activate() { this.active = true; this.phase = "idle"; this.render(); }
  bind() {
    this.abort?.abort(); this.abort = new AbortController(); const signal = this.abort.signal, stage = this.$(".ne-stage");
    const move = e => { const r = stage.getBoundingClientRect(); this.cursor.x = clamp((e.clientX - r.left) / r.width, .06, .94); this.cursor.y = clamp((e.clientY - r.top) / r.height, .12, .9); };
    stage.addEventListener("pointerdown", e => {
      if (this.source !== "demo" || e.button > 0 || this.game.paused) return;
      e.preventDefault(); stage.focus({ preventScroll: true }); stage.setPointerCapture(e.pointerId);
      this.pointer = { id: e.pointerId, x: e.clientX, y: e.clientY, moved: false }; move(e);
    }, { signal });
    stage.addEventListener("pointermove", e => {
      if (this.source !== "demo" || this.game.paused) return;
      if (this.pointer?.id === e.pointerId) { this.pointer.moved ||= Math.hypot(e.clientX - this.pointer.x, e.clientY - this.pointer.y) > 8; move(e); }
      else if (e.pointerType === "mouse") move(e);
    }, { signal });
    stage.addEventListener("pointerup", e => { if (this.pointer?.id === e.pointerId && !this.pointer.moved) this.bite(); this.pointer = null; }, { signal });
    stage.addEventListener("pointercancel", () => { this.pointer = null; }, { signal });
    window.addEventListener("keydown", e => {
      if (this.source !== "demo" || e.target.closest("button,a,input,textarea") || !["Space", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.code)) return;
      e.preventDefault(); if (!this.game.paused) this.keys.add(e.code);
    }, { signal });
    window.addEventListener("keyup", e => this.keys.delete(e.code), { signal });
    const background = paused => { this.backgroundPaused = paused; this.keys.clear(); this.pulseUntil = 0; this.pointer = null; this.syncPause(); this.lastTick = performance.now(); this.render(); };
    window.addEventListener("blur", () => background(true), { signal }); window.addEventListener("focus", () => background(document.hidden), { signal });
    document.addEventListener("visibilitychange", () => background(document.hidden), { signal });
    this.$(".ne-pause").addEventListener("click", () => { this.userPaused = !this.userPaused; this.keys.clear(); this.pulseUntil = 0; this.syncPause(); this.render(); }, { signal });
    this.$(".ne-sound").addEventListener("click", () => { this.soundPreference = !this.soundPreference; this.audio.setEnabled(this.soundPreference); this.render(); }, { signal });
    this.$(".ne-bite").addEventListener("click", () => this.bite(), { signal });
    this.$(".ne-retry-camera").addEventListener("click", () => void this.startCamera(), { signal });
    this.$(".ne-practice").addEventListener("click", () => this.startDemo(), { signal });
  }
  bite() { if (this.source === "demo" && !this.game.paused) this.pulseUntil = performance.now() + 110; }
  setup(source) {
    this.releaseInputs(); this.creatorResult = null; this.active = true; this.source = source; this.phase = "loading"; this.status = "LOADING_MODEL";
    this.game = new NoteEaterGame(); this.game.reset(source); this.raw = null; this.cursor = { x: .5, y: .57, width: .075 };
    this.effects = []; this.highlights = []; this.aimOffset = null; this.userPaused = false; this.backgroundPaused = document.hidden; this.pulseUntil = 0; this.receiptSaved = false;
    if (this.options.creator) this.creator = new CreatorMode(this.creatorCanvas, { profile: noteEaterCreatorProfile, faceMode: this.options.faceMode, reducedMotion: this.reducedMotion });
    this.bind(); this.audio.enable(); this.audio.setEnabled(this.soundPreference); this.syncPause(); this.render(); this.notify(); return this.generation;
  }
  async startCamera() {
    const token = this.setup("camera");
    try { await this.input.start(); if (this.active && token === this.generation) this.begin(); }
    catch (error) { if (token === this.generation && error.name !== "AbortError") this.fail(error); }
  }
  startDemo() { this.setup("demo"); this.begin(); this.$(".ne-stage").focus({ preventScroll: true }); }
  begin() { this.phase = "tutorial"; this.lastTick = performance.now(); this.render(); this.notify(); this.raf = requestAnimationFrame(this.tick); }
  syncPause() {
    const paused = this.userPaused || this.backgroundPaused;
    this.game.setPaused(paused); this.audio.stop();
    if (!paused && this.game.phase === "playing") this.audio.startBacking(() => this.game.groove);
  }
  sample(now, dt) {
    if (this.source === "demo") {
      const amount = Math.min(dt, 100) / 1000 * .45;
      this.cursor.x = clamp(this.cursor.x + (Number(this.keys.has("ArrowRight")) - Number(this.keys.has("ArrowLeft"))) * amount, .06, .94);
      this.cursor.y = clamp(this.cursor.y + (Number(this.keys.has("ArrowDown")) - Number(this.keys.has("ArrowUp"))) * amount / this.game.aspect, .12, .9);
      return { mouth: this.cursor, state: this.keys.has("Space") || now < this.pulseUntil ? "OPEN" : "CLOSED" };
    }
    const raw = this.raw;
    if (!raw?.mouth || now - raw.at > 300) return { state: "UNKNOWN", face: null };
    const project = p => projectMouth(p, this.video.videoWidth, this.video.videoHeight, this.$(".ne-stage").clientWidth, this.$(".ne-stage").clientHeight);
    const center = project({ x: raw.faceX, y: raw.faceY }), mouth = project(raw.mouth), left = project(raw.leftLip), right = project(raw.rightLip);
    if (!center || !mouth || !left || !right) return { state: "UNKNOWN", face: null };
    // Face center drives XY. A fixed lip offset anchors the reticle at the mouth
    // without turning fine lip motion or gaze into aiming gestures.
    this.aimOffset ??= { x: mouth.x - center.x, y: mouth.y - center.y };
    const width = Math.hypot(left.x - right.x, (left.y - right.y) * this.game.aspect);
    return { mouth: { x: clamp(center.x + this.aimOffset.x, 0, 1), y: clamp(center.y + this.aimOffset.y, 0, 1), width }, state: raw.state, face: raw.face };
  }
  tick = now => {
    if (!this.active || !["tutorial", "countdown", "playing"].includes(this.phase)) return;
    const dt = now - this.lastTick; this.lastTick = now;
    const oldPhase = this.phase;
    this.currentSample = this.sample(now, this.game.paused ? 0 : dt);
    this.game.step(dt, this.currentSample); this.phase = this.game.phase;
    for (const effect of this.game.effects) {
      this.audio.note(NOTE_TYPES[effect.note.type].midi, effect.type === "pass", { color: effect.note.type, groove: this.game.groove });
      if (effect.type === "eat") this.effects.push(effect);
    }
    this.effects = this.effects.filter(e => this.game.time - e.at < (e.stageUp ? 1500 : 900)).slice(-8);
    for (const event of this.game.events) {
      this.highlights.push(event); this.creator?.highlight(event.type, event.at, event.data);
    }
    if (oldPhase !== "playing" && this.phase === "playing" && !this.game.paused) this.audio.startBacking(() => this.game.groove);
    this.render();
    if (this.phase === "result") {
      if (this.creator) { const snapshot = this.creator.snapshot(); this.creatorResult = { ...snapshot, ...selectNoteEaterHighlight(snapshot.frames, this.highlights) }; }
      this.input.stop(); this.audio.stop(); this.keys.clear(); this.saveReceipt(); this.notify(); this.raf = null; return;
    }
    if (oldPhase !== this.phase) this.notify();
    this.raf = requestAnimationFrame(this.tick);
  };
  saveReceipt() {
    if (this.receiptSaved) return; this.receiptSaved = true;
    try { const key = "camera-game-lab-note-eater-rounds", saved = JSON.parse(localStorage.getItem(key) || "[]");
      const rounds = Array.isArray(saved) ? saved : []; rounds.push({ ...this.game.result, recordedAt: new Date().toISOString() }); localStorage.setItem(key, JSON.stringify(rounds.slice(-50))); } catch { /* Storage is optional. */ }
  }
  fail(error) { this.releaseInputs(); this.phase = "error"; this.error = error; this.bind(); this.render(); this.notify(); }
  releaseInputs() {
    ++this.generation; cancelAnimationFrame(this.raf); this.raf = null; this.abort?.abort(); this.keys.clear(); this.input.stop(); this.audio.dispose();
    this.creator?.dispose(); this.creator = null; this.creatorCanvas.hidden = true; this.raw = null; this.currentSample = null;
  }
  deactivate() { this.active = false; this.releaseInputs(); this.creatorResult = null; this.phase = "idle"; }
  render() {
    const g = this.game, t = this.t, $ = this.$;
    const text = (selector, value) => { const el = $(selector); if (el.textContent !== String(value)) el.textContent = value; };
    $(".ne-stage").setAttribute("aria-label", t.board); $(".ne-stage").classList.toggle("is-demo", this.source === "demo"); $(".ne-stage").classList.toggle("is-creator", !!this.creator);
    text(".ne-source", t[this.source === "demo" ? "practice" : "camera"]); text(".ne-sound", t[this.soundPreference ? "soundOn" : "soundOff"]);
    $(".ne-sound").setAttribute("aria-pressed", String(this.soundPreference)); text(".ne-pause", t[this.userPaused ? "resume" : "pause"]);
    $(".ne-pause").setAttribute("aria-pressed", String(!!this.userPaused)); $(".ne-pause").disabled = ["idle", "loading", "error", "result"].includes(this.phase);
    const count = `${g.eaten}<span>${t.notes}</span>`, time = `${Math.max(0, Math.ceil((30000 - g.elapsed) / 1000))}<small>s</small>`;
    if ($(".ne-count").innerHTML !== count) $(".ne-count").innerHTML = count;
    if ($(".ne-time").innerHTML !== time) $(".ne-time").innerHTML = time;
    text(".ne-groove-value", Math.round(g.groove)); $("progress").value = g.groove; text(".ne-layer", t.layers[grooveStage(g.groove)]);
    $(".ne-view").classList.toggle("is-party", g.phase === "playing" && g.groove >= 80);
    const unknown = this.source === "camera" && (!this.currentSample || this.currentSample.state === "UNKNOWN");
    const overlay = this.phase === "error" ? t.error : this.phase === "loading" ? t[this.status === "REQUESTING_CAMERA" ? "requesting" : "loading"]
      : g.paused ? t[this.userPaused ? "paused" : "background"] : unknown ? t[this.raw?.faces > 1 ? "multiple" : this.raw?.mouth ? "unknown" : "missing"] : "";
    text(".ne-overlay", overlay); $(".ne-overlay").hidden = !overlay || this.phase === "result";
    const closeFirst = !g.armed && g.mouthState === "OPEN";
    const cue = this.phase === "countdown" ? String(Math.max(1, 3 - Math.floor(g.countdown / 1000))) : this.phase === "tutorial" ? t[closeFirst ? "close" : "tutorial"] : this.phase === "playing" ? t[closeFirst ? "close" : "choose"] : "";
    text(".ne-cue", cue); $(".ne-cue").classList.toggle("is-countdown", this.phase === "countdown");
    $(".ne-bite").hidden = this.source !== "demo" || !["tutorial", "playing"].includes(this.phase); $(".ne-bite").disabled = g.paused; text(".ne-bite", t.bite);
    text(".ne-demo-hint", this.source === "demo" ? t.demoHint : ""); $(".ne-recovery").hidden = this.phase !== "error"; text(".ne-retry-camera", t.retryCamera); text(".ne-practice", t.demo);
    this.creatorCanvas.hidden = !this.creator;
    drawNoteEater(this.canvas, g, { demo: this.source === "demo", sample: this.currentSample, effects: this.effects, reducedMotion: this.reducedMotion, overlay: !!this.creator });
    this.creator?.compose(this.video, this.canvas, { time: g.time, face: this.currentSample?.face, open: this.currentSample?.state === "OPEN", source: this.source });
  }
}
