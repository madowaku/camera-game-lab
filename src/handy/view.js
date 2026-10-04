import { HandyPalsGame } from "../games/handyPals.js";
import { HandyPalsInput } from "../input/handyPalsInput.js";
import { handToStage } from "./tracking.js";
import { HandyPalsAudio } from "./audio.js";
import { W, H, loadSprites, renderStage } from "./renderer.js";
import { textFor } from "./messages.js";
import "./handyPals.css";

export function createView(root, locale, options = {}) { return new HandyPalsView(root, locale, options); }
export class HandyPalsView {
  constructor(root, locale) {
    this.root = root; this.locale = locale; this.listeners = new Set(); this.source = "camera";
    this.characters = ["bear", "bunny"]; this.game = new HandyPalsGame(); this.audio = new HandyPalsAudio();
    this.active = false; this.generation = 0; this.phase = "idle"; this.lastPhase = null;
    this.keys = new Set(); this.pointers = new Map(); this.demoPoints = [];
    root.innerHTML = `<section class="hp-play"><div class="hp-hud"><span class="hp-source"></span><span class="hp-timer">30<span>s</span></span><button type="button" class="hp-pause"></button></div>
      <div class="hp-stage" tabindex="0"><video hidden playsinline muted></video><canvas width="${W}" height="${H}" class="hp-canvas" role="img"></canvas>
      <div class="hp-cue" aria-live="polite"><strong></strong><span></span></div>
      <button type="button" class="hp-hand" data-hand="0" hidden aria-label="Move left hand">A</button><button type="button" class="hp-hand" data-hand="1" hidden aria-label="Move right hand">B</button>
      <div class="hp-overlay" hidden><h2></h2><p></p><button type="button" class="hp-resume"></button><button type="button" class="hp-camera-retry" hidden></button><button type="button" class="hp-demo" hidden></button></div></div>
      <div class="hp-progress" aria-hidden="true"><i></i></div><p class="hp-tip"></p>
      <div class="hp-tools" hidden>${["highFive", "hug", "spin", "sparkle"].map(action => `<button type="button" data-move="${action}"></button>`).join("")}</div>
      <div class="hp-footer"><span>NO WRONG MOVES.</span><button type="button" class="hp-sound" aria-pressed="true"></button></div></section>`;
    this.$ = selector => root.querySelector(selector);
    this.canvas = this.$("canvas"); this.video = this.$("video");
    this.input = new HandyPalsInput(this.video, {
      onFrame: hands => {
        if (!this.active || this.source !== "camera" || this.phase === "error") return;
        const aspect = this.video.videoWidth / this.video.videoHeight || W / H;
        this.game.setHands(hands.map(h => handToStage(h, aspect)));
      },
      onStatus: (status, error) => {
        if (!this.active) return;
        this.status = status;
        if (status === "ERROR") { this.error = error; this.phase = "error"; this.game.paused = true; this.audio.stop(); }
        this.render(); this.notify();
      },
    });
    this.spritePromise = loadSprites().then(sprites => { this.sprites = sprites; if (this.active) this.draw(); }).catch(error => {
      this.assetError = error;
      console.error("HANDY PALS sprites could not load", error);
      if (this.active) { this.phase = "error"; this.game.paused = true; this.render(); this.notify(); }
    });
  }
  configure({ characters } = {}) {
    if (characters?.length === 2) this.characters = characters.map(s => ["bear", "bunny"].includes(s) ? s : "bear");
  }
  subscribe(listener) { this.listeners.add(listener); return () => this.listeners.delete(listener); }
  notify() { this.listeners.forEach(fn => fn(this.snapshot())); }
  snapshot() {
    const phase = ["idle", "loading", "error"].includes(this.phase) ? this.phase : this.game.phase === "intro" ? "countdown" : this.game.phase === "pose" ? "playing" : this.game.phase;
    return { phase, source: this.source, paused: this.game.paused, result: this.game.result, elapsed: this.game.elapsed };
  }
  activate() {
    this.deactivate(); this.active = true; this.phase = "waiting"; this.status = null; this.error = null;
    this.game.reset(this.characters); this.lastPhase = null; this.uiKey = null; this.photoPromise = null; this.photoData = null; this.finishing = false; this.scripted = null;
    this.demoPoints = [{ x: .28, y: .72, present: true, open: false }, { x: .72, y: .72, present: true, open: false }];
    this.reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
    this.abort = new AbortController(); const signal = this.abort.signal;
    this.root.addEventListener("click", this.click, { signal });
    this.$(".hp-stage").addEventListener("pointerdown", this.pointerDown, { signal });
    this.$(".hp-stage").addEventListener("pointermove", this.pointerMove, { signal });
    this.$(".hp-stage").addEventListener("pointerup", this.pointerUp, { signal });
    this.$(".hp-stage").addEventListener("pointercancel", this.pointerUp, { signal });
    this.$(".hp-stage").addEventListener("lostpointercapture", this.pointerUp, { signal });
    window.addEventListener("keydown", this.keyDown, { signal }); window.addEventListener("keyup", this.keyUp, { signal });
    document.addEventListener("visibilitychange", this.visibility, { signal }); window.addEventListener("blur", this.blur, { signal });
    this.lastFrame = performance.now(); this.frameId = requestAnimationFrame(this.loop); this.render(); this.draw();
  }
  setLocale(locale) { this.locale = locale; this.render(); }
  async startCamera() {
    this.source = "camera"; this.phase = "loading"; this.game.paused = false; this.error = null;
    const generation = ++this.generation; this.audio.arm(); this.render(); this.notify();
    try {
      await this.spritePromise;
      if (generation !== this.generation || !this.active) return;
      if (!this.sprites) throw Error("Sprites not loaded");
      await this.input.start();
      if (generation !== this.generation || !this.active) return;
      this.phase = "waiting"; this.render(); this.notify();
    } catch (error) {
      if (generation !== this.generation || !this.active || error.name === "AbortError") return;
      this.error = error; this.phase = "error"; this.audio.stop(); this.input.stop(); this.render(); this.notify();
    }
  }
  async startDemo() {
    const generation = ++this.generation; this.input.stop(); this.source = "demo"; this.phase = "loading"; this.game.reset(this.characters); this.error = null;
    this.audio.arm(); this.render(); this.notify();
    await this.spritePromise;
    if (!this.active || generation !== this.generation) return;
    if (!this.sprites) { this.phase = "error"; this.render(); this.notify(); return; }
    this.game.setHands(this.demoPoints); this.game.start(); this.phase = "running";
    this.render(); this.notify(); this.$(".hp-stage").focus({ preventScroll: true });
  }
  releaseInputs() {
    ++this.generation; this.input.stop(); this.audio.stop();
    if (this.frameId != null) cancelAnimationFrame(this.frameId); this.frameId = null;
    this.abort?.abort(); this.keys.clear(); this.pointers.clear();
  }
  deactivate() {
    this.active = false; this.releaseInputs(); this.phase = "idle";
    this.canvas?.getContext("2d").clearRect(0, 0, W, H);
    this.photoData = null; this.photoPromise = null;
    if (this.game.result) { this.game.result.photoData = null; this.game.result.image = null; }
  }
  click = event => {
    if (event.target.closest(".hp-pause, .hp-resume")) this.togglePause();
    else if (event.target.closest(".hp-demo")) this.startDemo();
    else if (event.target.closest(".hp-camera-retry")) { this.game.reset(this.characters); void this.startCamera(); }
    else if (event.target.closest(".hp-sound")) { this.audio.enabled = !this.audio.enabled; this.render(); }
    else if (event.target.closest("[data-move]")) this.demoAction(event.target.closest("[data-move]").dataset.move);
  };
  togglePause() {
    if (!this.active || ["loading", "error", "idle"].includes(this.phase) || this.game.phase === "result") return;
    this.game.paused = !this.game.paused; this.keys.clear(); this.pointers.clear();
    this.game.pals.forEach(p => { p.history = []; p.motion = {}; p.pending = null; });
    if (this.game.paused) void this.audio.context?.suspend().catch(() => {}); else this.audio.arm();
    this.lastFrame = performance.now(); this.render(); this.notify();
  }
  visibility = () => { if (document.hidden) this.blur(); };
  blur = () => { if (this.active && !this.game.paused && ["intro", "playing", "pose"].includes(this.game.phase)) this.togglePause(); };
  keyDown = event => {
    if (!this.active || this.source !== "demo" || event.altKey || event.ctrlKey || event.metaKey || /INPUT|TEXTAREA|SELECT/.test(event.target.tagName)) return;
    const key = event.key.toLowerCase();
    if (["arrowleft", "arrowright", "arrowup", "arrowdown", "w", "a", "s", "d"].includes(key)) { event.preventDefault(); this.keys.add(key); }
    if (key === " " && event.target === this.$(".hp-stage") && !event.repeat) { event.preventDefault(); this.demoAction("sparkle"); }
  };
  keyUp = event => this.keys.delete(event.key.toLowerCase());
  stagePoint(event) {
    const bounds = this.$(".hp-stage").getBoundingClientRect();
    return { x: Math.max(.06, Math.min(.94, (event.clientX - bounds.x) / bounds.width)), y: Math.max(.28, Math.min(.9, (event.clientY - bounds.y) / bounds.height)) };
  }
  pointerDown = event => {
    if (this.source !== "demo" || this.game.paused || event.target.closest(".hp-overlay") || this.game.phase === "result") return;
    const p = this.stagePoint(event), named = event.target.closest("[data-hand]")?.dataset.hand;
    const slot = named != null ? Number(named) : this.demoPoints.map(h => Math.hypot(h.x - p.x, h.y - p.y)).reduce((best, d, i, all) => d < all[best] ? i : best, 0);
    if ([...this.pointers.values()].includes(slot)) return;
    event.preventDefault(); this.scripted = null; this.pointers.set(event.pointerId, slot);
    this.$(".hp-stage").setPointerCapture(event.pointerId); this.$(".hp-stage").focus({ preventScroll: true });
    Object.assign(this.demoPoints[slot], p);
  };
  pointerMove = event => { const slot = this.pointers.get(event.pointerId); if (slot != null && !this.game.paused) Object.assign(this.demoPoints[slot], this.stagePoint(event)); };
  pointerUp = event => this.pointers.delete(event.pointerId);
  demoAction(action) {
    if (this.source !== "demo" || this.game.paused || this.game.phase !== "playing") return;
    if (action === "highFive" || action === "hug") {
      const gap = action === "hug" ? .04 : .11;
      this.demoPoints.forEach((p, i) => Object.assign(p, { x: .5 + (i ? gap : -gap), y: .72 }));
    } else if (action === "spin") {
      this.scripted = { at: this.game.clock, x: this.demoPoints[0].x, y: this.demoPoints[0].y };
    } else if (action === "sparkle") {
      this.demoPoints.forEach(p => p.open = false); this.game.setHands(this.demoPoints); this.demoPoints.forEach(p => p.open = true);
    }
    this.$(".hp-stage").focus({ preventScroll: true });
  }
  updateDemo(dt) {
    if (this.scripted) {
      const age = this.game.clock - this.scripted.at;
      const a = age / 1.15 * Math.PI * 2;
      this.demoPoints[0].x = this.scripted.x + Math.sin(a) * .14;
      this.demoPoints[0].y = this.scripted.y + (Math.cos(a) - 1) * .1;
      if (age > 1.2) this.scripted = null;
    }
    for (const [i, controls] of [["a", "d", "w", "s"], ["arrowleft", "arrowright", "arrowup", "arrowdown"]].entries()) {
      const p = this.demoPoints[i]; p.x += ((this.keys.has(controls[1]) ? 1 : 0) - (this.keys.has(controls[0]) ? 1 : 0)) * dt * .5;
      p.y += ((this.keys.has(controls[3]) ? 1 : 0) - (this.keys.has(controls[2]) ? 1 : 0)) * dt * .5;
      p.x = Math.max(.06, Math.min(.94, p.x)); p.y = Math.max(.28, Math.min(.9, p.y));
    }
    this.game.setHands(this.demoPoints);
  }
  capturePhoto() {
    const canvas = document.createElement("canvas"); canvas.width = W; canvas.height = H;
    renderStage(canvas, this.game, { sprites: this.sprites, video: this.video, source: this.source, photo: true, reducedMotion: true });
    this.photoData = canvas.toDataURL("image/png");
    this.photoPromise = new Promise(resolve => canvas.toBlob(blob => resolve(blob ? new File([blob], "handy-pals-todays-duo.png", { type: "image/png" }) : null), "image/png"));
  }
  async finish() {
    if (this.finishing) return;
    this.finishing = true; const generation = this.generation;
    this.input.stop(); this.audio.stop();
    const image = await this.photoPromise?.catch(() => null);
    if (!this.active || generation !== this.generation) { this.finishing = false; return; }
    this.game.result = { ...this.game.result, source: this.source, photoData: this.photoData, image };
    this.phase = "result"; this.finishing = false; this.render(); this.notify();
  }
  loop = now => {
    if (!this.active) return;
    const dt = Math.min(.25, Math.max(0, (now - this.lastFrame) / 1000)); this.lastFrame = now;
    if (!["loading", "error", "idle", "result"].includes(this.phase) && !this.game.paused) {
      // Keep the 30-second active clock at low camera FPS; small catch-up steps
      // also preserve animation triggers when an inference blocks the UI.
      for (let remaining = dt; remaining > 1e-7;) {
        const step = Math.min(.05, remaining);
        if (this.source === "demo") this.updateDemo(step);
        this.game.step(step); remaining -= step;
      }
      for (const event of this.game.takeEvents()) {
        this.audio.play(event.type);
        if (event.type === "photo") { try { this.capturePhoto(); } catch { this.photoData = null; } }
      }
      if (this.game.phase === "result") { void this.finish(); return; }
      if (this.game.phase !== "waiting") this.phase = "running";
    }
    this.render(); this.draw();
    const phase = this.snapshot().phase; if (phase !== this.lastPhase) { this.lastPhase = phase; this.notify(); }
    this.frameId = requestAnimationFrame(this.loop);
  };
  draw() { renderStage(this.canvas, this.game, { sprites: this.sprites, video: this.video, source: this.source, reducedMotion: this.reducedMotion }); }
  render() {
    const t = textFor(this.locale), game = this.game;
    this.$(".hp-progress i").style.width = `${game.elapsed / 30 * 100}%`;
    this.root.querySelectorAll("[data-hand]").forEach((b, i) => {
      b.style.left = `${this.demoPoints[i]?.x * 100}%`; b.style.top = `${this.demoPoints[i]?.y * 100}%`;
    });
    const key = [this.locale, this.source, this.phase, this.status, game.phase, game.cue, Math.ceil(game.elapsed), game.paused, ...game.pals.map(p => p.state), this.audio.enabled].join("|");
    if (key === this.uiKey) return; this.uiKey = key;
    this.$(".hp-source").textContent = this.source === "demo" ? t.practice : t.camera;
    this.$(".hp-timer").firstChild.textContent = String(Math.max(0, Math.ceil(30 - game.elapsed)));
    this.$(".hp-pause").textContent = game.paused ? t.resume : t.pause;
    this.$(".hp-pause").disabled = ["error", "loading"].includes(this.phase);
    this.$(".hp-pause").setAttribute("aria-pressed", String(game.paused));
    this.$(".hp-canvas").setAttribute("aria-label", t.tagline);
    this.$(".hp-stage").setAttribute("aria-label", this.source === "demo" ? `${t.demoTip} WASD / ↑↓←→` : t.cameraTip);
    this.$(".hp-progress i").style.width = `${game.elapsed / 30 * 100}%`;
    const waiting = game.phase === "waiting";
    let cue = this.phase === "loading" ? "HOLD YOUR HANDS!" : waiting ? "HOLD YOUR HANDS!" : { pop: "POP!", highFive: "HIGH FIVE!", free: "FREE DANCE", spin: "SPIN!", yeah: "YEAH!", almost: "ALMOST!", pose: "POSE!", final: "SO CUTE!" }[game.cue] ?? "FREE DANCE";
    let detail = waiting ? game.pals.filter(p => p.state === "present").length === 1 ? t.one : t.hold : { highFive: t.highFiveTip, spin: t.spinTip, free: t.freeTip, pose: t.poseTip, final: t.finalTip, pop: t.caption, yeah: t.caption, almost: t.caption }[game.cue] ?? t.caption;
    if (this.phase === "loading") detail = this.status === "REQUESTING_CAMERA" ? t.permission : t.loading;
    if (game.phase === "pose" && game.elapsed < 28) cue = `POSE! ${Math.max(1, Math.ceil(28 - game.elapsed))}`;
    // Avoid repeatedly announcing identical live-region text on render frames.
    if (this.$(".hp-cue strong").textContent !== cue) this.$(".hp-cue strong").textContent = cue;
    if (this.$(".hp-cue span").textContent !== detail) this.$(".hp-cue span").textContent = detail;
    this.$(".hp-tip").textContent = this.source === "camera" && !waiting && game.pals.some(p => p.state === "search") ? t.lost : this.source === "demo" ? `${t.demoTip} WASD / ↑↓←→` : t.cameraTip;
    const overlay = this.$(".hp-overlay"), error = this.phase === "error";
    overlay.hidden = !error && !game.paused;
    overlay.querySelector("h2").textContent = error ? "OH, HEY…" : t.paused;
    overlay.querySelector("p").textContent = error ? t.error : t.pausedDetail;
    this.$(".hp-resume").hidden = error; this.$(".hp-resume").textContent = t.resume;
    this.$(".hp-camera-retry").hidden = !error; this.$(".hp-camera-retry").textContent = t.cameraRetry;
    this.$(".hp-demo").hidden = !error; this.$(".hp-demo").textContent = t.demo;
    this.$(".hp-tools").hidden = this.source !== "demo";
    this.root.querySelectorAll("[data-move]").forEach(b => { b.textContent = t[b.dataset.move]; b.disabled = game.phase !== "playing" || game.paused; });
    this.root.querySelectorAll("[data-hand]").forEach((b, i) => {
      b.hidden = this.source !== "demo" || game.phase === "pose" || game.phase === "result" || error || game.paused;
      b.style.left = `${this.demoPoints[i]?.x * 100}%`; b.style.top = `${this.demoPoints[i]?.y * 100}%`;
      b.setAttribute("aria-label", `${i ? t.right : t.left} · ${t.demoTip}`);
    });
    this.$(".hp-sound").textContent = `${t.sound} ${this.audio.enabled ? "ON" : "OFF"}`; this.$(".hp-sound").setAttribute("aria-pressed", String(this.audio.enabled));
  }
}
