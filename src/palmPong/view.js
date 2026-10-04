import { PalmPongGame, W, H, STEP, DURATION } from "./core.js";
import { PalmPongInput } from "../input/palmPongInput.js";
import { PalmPongAudio } from "./audio.js";
import { renderCourt } from "./renderer.js";
import { textFor } from "./messages.js";
import { readSettings, saveSettings, saveResult } from "./records.js";
import "./palmPong.css";
export function createView(root, locale, options = {}) { return new PalmPongView(root, locale, options); }
export class PalmPongView {
  constructor(root, locale, options = {}) {
    this.root = root; this.locale = locale; this.onExit = options.onExit; this.listeners = new Set(); this.game = new PalmPongGame();
    this.audio = new PalmPongAudio(); this.source = "camera"; this.phase = "idle"; this.active = false; this.generation = 0; this.guide = true;
    this.audio.enabled = readSettings().effects;
    this.keys = new Set(); this.pointers = new Map();
    root.innerHTML = `<section class="pp-play"><div class="pp-hud"><span class="pp-source"></span><div class="pp-score"><strong>0</strong><span></span><small></small></div><div class="pp-hud-right"><span class="pp-timer">30</span><button type="button" class="pp-pause"></button></div></div>
      <div class="pp-court" tabindex="0"><video hidden muted playsinline></video><canvas class="pp-canvas" width="1280" height="720" role="img"></canvas><div class="pp-count" aria-live="polite" hidden></div></div>
      <div class="pp-cue" role="status"></div><div class="pp-preparation"><button type="button" class="pp-start pp-primary" disabled></button></div>
      <div class="pp-overlay" hidden><h2></h2><p></p><div class="pp-recovery-buttons"><button type="button" class="pp-resume pp-primary" hidden></button><button type="button" class="pp-camera-retry pp-secondary" hidden></button><button type="button" class="pp-realign pp-secondary" hidden></button><button type="button" class="pp-demo pp-secondary" hidden></button><button type="button" class="pp-exit pp-text" hidden></button></div></div>
      <footer class="pp-play-footer"><p class="pp-tip"></p><button type="button" class="pp-sound" aria-pressed="true"></button></footer></section>`;
    this.$ = selector => root.querySelector(selector); this.canvas = this.$("canvas"); this.video = this.$("video");
    this.input = new PalmPongInput(this.video, { onStatus: (status, error) => {
      if (!this.active || this.source !== "camera") return; this.status = status;
      if (status === "ERROR") { this.phase = "error"; this.error = error; this.game.pause("tracking"); this.audio.pause(); }
      this.render(); this.notify();
    } });
  }
  configure({ guide = true } = {}) { this.guide = guide; }
  subscribe(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  notify() { this.listeners.forEach(fn => fn(this.snapshot())); }
  snapshot() {
    const phase = ["loading", "error", "rotate", "idle"].includes(this.phase) ? this.phase : ({ serve_wait: "playing", round_end: "ending", calibration: "waiting" }[this.game.phase] ?? this.game.phase);
    return { phase, paused: this.game.paused, source: this.source, result: this.game.result, elapsed: this.game.elapsed };
  }
  setLocale(locale) { this.locale = locale; this.render(); }
  activate() {
    this.deactivate(); this.active = true; this.phase = "waiting"; this.status = null; this.error = null; this.lastSnapshot = null; this.uiKey = null;
    this.game.reset(this.source); this.saved = false; this.accumulator = 0;
    this.demoPoints = [0, 1].map(side => ({ x: (side ? .72 : .28) * W, y: H / 2, present: true, continuous: true }));
    this.abort = new AbortController(); const signal = this.abort.signal;
    this.root.addEventListener("click", this.click, { signal });
    const court = this.$(".pp-court");
    court.addEventListener("pointerdown", this.pointerDown, { signal }); court.addEventListener("pointermove", this.pointerMove, { signal });
    for (const type of ["pointerup", "pointercancel", "lostpointercapture"]) court.addEventListener(type, this.pointerUp, { signal });
    window.addEventListener("keydown", this.keyDown, { signal }); window.addEventListener("keyup", this.keyUp, { signal });
    window.addEventListener("blur", this.blur, { signal }); window.addEventListener("resize", this.resize, { signal });
    document.addEventListener("visibilitychange", this.visibility, { signal });
    this.reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
    this.lastFrame = performance.now(); this.frameId = requestAnimationFrame(this.loop); this.render(); this.draw();
  }
  async startCamera() {
    this.source = "camera"; this.game.source = "camera";
    if (innerWidth < innerHeight) { this.phase = "rotate"; this.render(); this.notify(); return; }
    const generation = ++this.generation; this.phase = "loading"; this.error = null; this.audio.arm(); this.render(); this.notify();
    try {
      await this.input.start();
      if (!this.active || generation !== this.generation) return;
      this.phase = "waiting"; this.lastFrame = performance.now(); this.accumulator = 0; this.render(); this.notify();
    } catch (error) {
      if (!this.active || generation !== this.generation || error.name === "AbortError") return;
      this.input.stop(); this.audio.pause(); this.error = error; this.phase = "error"; this.render(); this.notify();
    }
  }
  startDemo() {
    ++this.generation; this.input.stop(); this.source = "demo"; this.phase = "waiting"; this.error = null; this.game.reset("demo"); this.saved = false;
    this.demoPoints = [0, 1].map(side => ({ x: (side ? .72 : .28) * W, y: H / 2, present: true, continuous: true }));
    this.game.setPaddles(this.demoPoints); this.audio.arm(); this.lastFrame = performance.now(); this.accumulator = 0;
    this.render(); this.notify(); this.$(".pp-court").focus({ preventScroll: true });
  }
  releaseInputs() {
    ++this.generation; this.input.stop(); this.audio.stop(); this.abort?.abort(); this.keys.clear();
    for (const id of this.pointers.keys()) { try { this.$(".pp-court").releasePointerCapture(id); } catch {} }
    this.pointers.clear(); if (this.frameId != null) cancelAnimationFrame(this.frameId); this.frameId = null;
  }
  deactivate() { this.active = false; this.releaseInputs(); this.phase = "idle"; }
  click = event => {
    if (event.target.closest(".pp-start")) { this.audio.arm(); this.game.start(); this.$(".pp-court").focus({ preventScroll: true }); }
    else if (event.target.closest(".pp-pause")) this.game.paused ? this.resume() : this.pause("user");
    else if (event.target.closest(".pp-resume")) this.resume();
    else if (event.target.closest(".pp-demo")) this.startDemo();
    else if (event.target.closest(".pp-camera-retry")) { this.game.reset("camera"); this.saved = false; this.input.stop(); void this.startCamera(); }
    else if (event.target.closest(".pp-realign")) { this.input.tracker.reset(); this.game.requestResume(); }
    else if (event.target.closest(".pp-exit")) this.onExit?.();
    else if (event.target.closest(".pp-sound")) { this.audio.enabled = !this.audio.enabled; saveSettings({ effects: this.audio.enabled }); if (this.audio.enabled) this.audio.arm(); }
    this.render(); this.notify();
  };
  pause(reason) {
    this.game.pause(reason); this.audio.pause(); this.keys.clear(); this.pointers.clear(); this.accumulator = 0; this.render(); this.notify();
  }
  resume() {
    if (this.source === "camera" && innerWidth < innerHeight || document.hidden) return;
    this.game.requestResume(); this.audio.arm(); this.lastFrame = performance.now(); this.accumulator = 0; this.render(); this.notify();
  }
  blur = () => { if (this.active) { this.pause("hidden"); if (this.game.paused) this.game.resumeRequested = false; } };
  visibility = () => { if (document.hidden) this.blur(); };
  resize = () => {
    if (!this.active || this.source !== "camera") return;
    if (this.phase === "rotate" && innerWidth >= innerHeight) { void this.startCamera(); return; }
    this.input.tracker.reset(); this.game.ready = false; this.game.stable = 0;
    if (this.input.running) { this.pause("rotation"); if (this.game.paused) this.game.resumeRequested = false; }
  };
  keyDown = event => {
    if (this.source !== "demo" || !this.active || event.altKey || event.ctrlKey || event.metaKey || /INPUT|TEXTAREA|SELECT/.test(event.target.tagName)) return;
    const key = event.key.toLowerCase();
    if (["w", "a", "s", "d", "arrowleft", "arrowright", "arrowup", "arrowdown"].includes(key)) { event.preventDefault(); this.keys.add(key); }
  };
  keyUp = event => this.keys.delete(event.key.toLowerCase());
  courtPoint(event) { const b = this.$(".pp-court").getBoundingClientRect(); return { x: (event.clientX - b.x) / b.width * W, y: (event.clientY - b.y) / b.height * H }; }
  pointerDown = event => {
    if (this.source !== "demo" || this.game.paused || ["round_end", "result"].includes(this.game.phase)) return;
    const point = this.courtPoint(event), side = point.x < W / 2 ? 0 : 1;
    if ([...this.pointers.values()].includes(side)) return;
    event.preventDefault(); this.pointers.set(event.pointerId, side); this.$(".pp-court").setPointerCapture(event.pointerId);
    Object.assign(this.demoPoints[side], point, { continuous: false });
  };
  pointerMove = event => {
    const side = this.pointers.get(event.pointerId);
    if (side != null && !this.game.paused) Object.assign(this.demoPoints[side], this.courtPoint(event));
  };
  pointerUp = event => this.pointers.delete(event.pointerId);
  updateDemo(dt) {
    for (const [side, controls] of [["a", "d", "w", "s"], ["arrowleft", "arrowright", "arrowup", "arrowdown"]].entries()) {
      const p = this.demoPoints[side];
      p.x += ((this.keys.has(controls[1]) ? 1 : 0) - (this.keys.has(controls[0]) ? 1 : 0)) * dt * 6;
      p.y += ((this.keys.has(controls[3]) ? 1 : 0) - (this.keys.has(controls[2]) ? 1 : 0)) * dt * 6;
    }
    this.game.setPaddles(this.demoPoints); this.demoPoints.forEach(p => { p.continuous = true; });
  }
  loop = now => {
    if (!this.active) return;
    const dt = Math.max(0, (now - this.lastFrame) / 1000); this.lastFrame = now;
    if (!["idle", "loading", "error", "rotate"].includes(this.phase)) {
      if (dt + this.accumulator > .2 && !["calibration", "round_end", "result", "paused"].includes(this.game.phase)) { this.pause("processing"); this.accumulator = 0; }
      else {
        this.accumulator += Math.min(.2, dt);
        while (this.accumulator >= STEP - 1e-8) {
          const inputTime = now - this.accumulator * 1000;
          if (this.source === "demo") this.updateDemo(this.game.paused ? 0 : STEP);
          else this.game.setPaddles(this.input.tracker.sample(inputTime));
          if (this.source === "camera" && innerWidth < innerHeight) { this.game.ready = false; this.game.stable = 0; if (this.game.paused) this.game.step(STEP); }
          else this.game.step(STEP);
          this.accumulator -= STEP;
        }
      }
      for (const event of this.game.takeEvents()) this.audio.play(event);
      if (this.game.paused) this.audio.pause(); else if (this.audio.context?.state === "suspended" && this.game.resumeRequested) this.audio.arm();
      if (this.game.phase === "result" && !this.saved) {
        this.saved = true;
        const result = { ...this.game.result, inferenceFps: this.source === "camera" ? Math.round(this.input.tracker.fps * 10) / 10 : null };
        this.game.result = { ...result, personalBest: result.reason === "TIME_UP" ? saveResult(result) : 0 };
        this.audio.stop(); this.input.stop();
      }
    }
    this.render(); this.draw();
    const snapshotKey = `${this.snapshot().phase}|${this.game.paused}`;
    if (snapshotKey !== this.lastSnapshot) { this.lastSnapshot = snapshotKey; this.notify(); }
    if (this.active && this.game.phase !== "result") this.frameId = requestAnimationFrame(this.loop);
  };
  draw() { renderCourt(this.canvas, this.game, { source: this.source, video: this.video, guide: this.guide, reducedMotion: this.reducedMotion }); }
  render() {
    const t = textFor(this.locale), g = this.game;
    const key = [this.locale, this.phase, this.status, this.source, g.phase, g.ready, g.rally, g.best, Math.ceil(g.elapsed), Math.ceil(g.countdown), g.pauseReason, g.resumeRequested, Math.ceil(g.resumeCount ?? -1), g.pauseAge >= 10, ...g.paddles.map(p => `${p.present}:${p.active}`), this.audio.enabled].join("|");
    if (key === this.uiKey) return; this.uiKey = key;
    this.$(".pp-source").textContent = this.source === "demo" ? t.practice : t.camera;
    this.$(".pp-score strong").textContent = String(g.rally); this.$(".pp-score span").textContent = t.rally; this.$(".pp-score small").textContent = `${t.best} ${g.best}`;
    this.$(".pp-timer").textContent = `${Math.max(0, Math.ceil(DURATION - g.elapsed))}s`;
    this.$(".pp-timer").setAttribute("aria-label", `${t.timer}: ${Math.max(0, Math.ceil(DURATION - g.elapsed))}`);
    this.$(".pp-pause").textContent = g.paused ? t.resume : t.pause;
    this.$(".pp-pause").disabled = this.phase !== "waiting" || ["calibration", "round_end", "result"].includes(g.phase);
    this.$(".pp-pause").setAttribute("aria-pressed", String(g.paused));
    this.$(".pp-canvas").setAttribute("aria-label", t.tagline); this.$(".pp-court").setAttribute("aria-label", this.source === "demo" ? t.demoTip : t.tip);
    let cue = t.tip;
    if (g.phase === "calibration") cue = g.ready ? t.ready : !g.paddles[0].present ? t.left : !g.paddles[1].present ? t.right : g.paddles.some(p => !p.active) ? t.zone : t.hold;
    else if (g.phase === "serve_wait") cue = t.miss;
    else if (g.paddles.some(p => p.present && !p.active)) cue = t.zone;
    this.$(".pp-cue").textContent = cue;
    this.$(".pp-preparation").hidden = this.phase !== "waiting" || g.phase !== "calibration";
    this.$(".pp-start").textContent = t.start; this.$(".pp-start").disabled = !g.ready;
    this.$(".pp-count").hidden = g.phase !== "countdown" && !(g.paused && g.resumeCount != null);
    this.$(".pp-count").textContent = g.paused ? "1" : String(Math.max(1, Math.ceil(g.countdown)));
    const special = ["error", "loading", "rotate"].includes(this.phase), overlay = special || g.paused;
    this.$(".pp-overlay").hidden = !overlay;
    this.$(".pp-overlay h2").textContent = special ? this.phase === "rotate" ? t.rotate : this.phase === "error" ? "PALM PONG" : this.status === "REQUESTING_CAMERA" ? t.permission : t.loading : { tracking: t.lost, processing: t.processing, rotation: t.rotation, hidden: t.hidden }[g.pauseReason] ?? t.paused;
    this.$(".pp-overlay p").textContent = this.phase === "error" ? t.error : special ? "" : g.resumeCount != null ? "1" : g.resumeRequested ? t.recovery : t.tip;
    this.$(".pp-resume").hidden = !g.paused || special || g.resumeRequested;
    this.$(".pp-resume").disabled = this.source === "camera" && innerWidth < innerHeight;
    this.$(".pp-resume").textContent = t.resume;
    this.$(".pp-camera-retry").hidden = this.phase !== "error"; this.$(".pp-camera-retry").textContent = t.retryCamera;
    const recoveryActions = g.paused && g.pauseAge >= 10;
    this.$(".pp-realign").hidden = !recoveryActions || this.source !== "camera"; this.$(".pp-realign").textContent = t.realign;
    this.$(".pp-demo").hidden = !special && !recoveryActions; this.$(".pp-demo").textContent = t.demo;
    this.$(".pp-exit").hidden = !special && !g.paused; this.$(".pp-exit").textContent = t.exit;
    this.$(".pp-tip").textContent = this.source === "demo" ? t.demoTip : t.tip;
    this.$(".pp-sound").textContent = `${t.sound} ${this.audio.enabled ? "ON" : "OFF"}`;
    this.$(".pp-sound").setAttribute("aria-pressed", String(this.audio.enabled));
  }
}
