import { FalseBridgeGame } from "../games/falseBridge.js";
import { BridgeCamera } from "./camera.js";
import { WIDTH, HEIGHT, STAGES, coverCrop, traceShape } from "./shapes.js";
import { compareFrames } from "./scoring.js";
import { renderWorld, drawDemoObject } from "./renderer.js";
import { messages } from "./messages.js";
import "./falseBridge.css";

const makeCanvas = (w = WIDTH * 2, h = HEIGHT * 2) => { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; };
const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
export function createView(root, locale) { return new BridgeView(root, locale); }
class BridgeView {
  constructor(root, locale = "ja") {
    this.root = root; this.locale = locale; this.game = new FalseBridgeGame(); this.listeners = new Set(); this.active = false; this.generation = 0; this.frozen = []; this.sample = null;
    this.raw = makeCanvas(); this.rawContext = this.raw.getContext("2d"); this.sampling = makeCanvas(180, 220); this.sampleContext = this.sampling.getContext("2d", { willReadFrequently: true });
    this.reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
    root.innerHTML = `<section class="fb-view"><div class="fb-meta"><span class="fb-source"></span><button class="fb-pause" type="button"></button></div>
      <header class="fb-heading"><div><p class="fb-stage-label"></p><h2 class="fb-title"></h2></div><span class="fb-count">01<span>/ 05</span></span></header>
      <div class="fb-scene" tabindex="0" role="group"><video muted playsinline aria-hidden="true"></video><canvas class="fb-world" width="720" height="880" aria-hidden="true"></canvas><div class="fb-scene-top"><span class="fb-world-label">A LITTLE WORLD, UNFINISHED.</span><span class="fb-part"></span></div><div class="fb-feedback" role="status" aria-live="polite"></div><div class="fb-overlay" hidden><h3></h3><p></p><div class="fb-overlay-actions"><button type="button" data-fb="primary"></button><button type="button" data-fb="secondary"></button></div></div><div class="fb-lock-flash" aria-hidden="true"></div></div>
      <div class="fb-actions"><p class="fb-instruction"></p><button class="fb-lock" type="button">LOCK <span>↗</span></button><div class="fb-demo-controls" hidden><label><span class="fb-angle-label"></span><input class="fb-angle" type="range" min="-180" max="180" step="1" value="0"></label><label><span class="fb-size-label"></span><input class="fb-size" type="range" min="0.4" max="1.8" step="0.02" value="0.72"></label></div><div class="fb-foot"><button class="fb-reset" type="button"></button><span class="fb-hint"></span></div><p class="fb-keys"></p></div><div class="fb-receipt" hidden></div></section>`;
    this.$ = s => root.querySelector(s); this.canvas = this.$("canvas"); this.context = this.canvas.getContext("2d");
    this.camera = new BridgeCamera(this.$("video"), () => this.interrupt()); this.render();
  }
  get t() { return messages[this.locale === "ja" ? "ja" : "en"]; }
  get source() { return this.game.source; }
  get phase() { return this.error ? "error" : this.loading ? "loading" : this.game.phase; }
  subscribe(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  notify() { this.listeners.forEach(fn => fn(this.snapshot())); }
  snapshot() {
    const r = this.game.result;
    return { phase: this.phase, source: this.source, result: r ? { ...r,
      summaryJa: `${r.source === "demo" ? "デモ" : "カメラ"} · 5/5 クリア · ${r.seconds.toFixed(1)}秒 · 自己確認 ${r.selfJudged}回`,
      summaryEn: `${r.source === "demo" ? "Demo" : "Camera"} · 5/5 CLEAR · ${r.seconds.toFixed(1)}s · ${r.selfJudged} self-judged` } : null };
  }
  setLocale(locale) { this.locale = locale; this.render(); }
  activate() { this.active = true; }
  setup(source) {
    this.releaseInputs(); this.active = true; this.error = false; this.loading = false; this.interrupted = false;
    this.game = new FalseBridgeGame(); this.game.start(source); this.frozen = []; this.pendingImage = null; this.reference = null; this.sample = null; this.lastSample = -Infinity;
    this.resetMaterial(); this.bind(); this.render(); this.notify();
  }
  async startCamera(preserve = false) {
    if (!preserve) this.setup("camera");
    const token = ++this.generation; this.loading = true; this.error = false; this.render(); this.notify();
    try {
      await this.camera.start(); if (token !== this.generation || !this.active) return;
      this.loading = false; this.game.paused = false; this.interrupted = false;
      if (["calibration", "playing"].includes(this.game.phase)) this.game.phase = "background";
      this.reference = null; this.sample = null; this.beginLoop(); this.render(); this.notify();
    } catch (error) {
      if (token !== this.generation || error.name === "AbortError") return;
      this.loading = false; this.error = true; this.game.paused = true; this.render(); this.notify();
    }
  }
  startDemo() { this.setup("demo"); this.beginLoop(); this.$(".fb-scene").focus({ preventScroll: true }); }
  resetMaterial() {
    const shape = this.game.guide; this.material = { x: 170, y: 365, angle: shape.angle - 22, scale: .72 };
    this.updateMaterial();
  }
  updateMaterial() {
    const shape = this.game.guide, m = this.material;
    this.game.demoShape = { ...shape, x: m.x, y: m.y, angle: m.angle, w: shape.w * m.scale, h: shape.h * m.scale };
    this.$(".fb-angle").value = m.angle; this.$(".fb-size").value = m.scale;
  }
  bind() {
    this.abort?.abort(); this.abort = new AbortController(); const signal = this.abort.signal, scene = this.$(".fb-scene");
    const canMove = () => this.source === "demo" && this.game.phase === "playing" && !this.game.paused;
    const move = e => { const b = scene.getBoundingClientRect(); this.material.x = clamp((e.clientX - b.left) / b.width * WIDTH, 0, WIDTH); this.material.y = clamp((e.clientY - b.top) / b.height * HEIGHT, 0, HEIGHT); this.updateMaterial(); };
    scene.addEventListener("pointerdown", e => { if (!canMove() || e.button > 0 || e.target.closest("button")) return; e.preventDefault(); scene.focus({ preventScroll: true }); this.pointerId = e.pointerId; scene.setPointerCapture(e.pointerId); move(e); }, { signal });
    scene.addEventListener("pointermove", e => { if (canMove() && this.pointerId === e.pointerId) move(e); }, { signal });
    for (const event of ["pointerup", "pointercancel", "lostpointercapture"]) scene.addEventListener(event, () => { this.pointerId = null; }, { signal });
    scene.addEventListener("keydown", e => {
      if (!canMove() || e.target !== scene || !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "q", "Q", "e", "E", "+", "=", "-", " "].includes(e.key)) return;
      e.preventDefault(); const m = this.material;
      if (e.key === " ") { if (!e.repeat) this.lock(); return; }
      if (e.key === "ArrowLeft") m.x = clamp(m.x - 6, 0, WIDTH);
      if (e.key === "ArrowRight") m.x = clamp(m.x + 6, 0, WIDTH);
      if (e.key === "ArrowUp") m.y = clamp(m.y - 6, 0, HEIGHT);
      if (e.key === "ArrowDown") m.y = clamp(m.y + 6, 0, HEIGHT);
      if (e.key.toLowerCase() === "q") m.angle = clamp(m.angle - 3, -180, 180);
      if (e.key.toLowerCase() === "e") m.angle = clamp(m.angle + 3, -180, 180);
      if (["+", "="].includes(e.key)) m.scale = clamp(m.scale + .04, .4, 1.8);
      if (e.key === "-") m.scale = clamp(m.scale - .04, .4, 1.8);
      this.updateMaterial();
    }, { signal });
    this.$(".fb-angle").addEventListener("input", e => { if (canMove()) { this.material.angle = Number(e.target.value); this.updateMaterial(); } }, { signal });
    this.$(".fb-size").addEventListener("input", e => { if (canMove()) { this.material.scale = Number(e.target.value); this.updateMaterial(); } }, { signal });
    this.$(".fb-lock").addEventListener("click", () => this.lock(), { signal });
    this.$(".fb-reset").addEventListener("click", () => { if (this.source === "demo") this.resetMaterial(); else this.game.calibrate(); this.sample = null; this.render(); this.notify(); }, { signal });
    this.$(".fb-pause").addEventListener("click", () => { this.game.paused = true; if (this.source === "camera") this.interrupt(); this.render(); }, { signal });
    this.$('[data-fb="primary"]').addEventListener("click", () => this.primary(), { signal });
    this.$('[data-fb="secondary"]').addEventListener("click", () => { if (this.error) this.startDemo(); else if (this.game.retryLock()) { this.pendingImage = null; this.render(); this.notify(); this.$(".fb-lock").focus(); } }, { signal });
    document.addEventListener("visibilitychange", () => { if (!document.hidden || !this.active || this.phase === "result") return; this.game.paused = true; if (this.source === "camera") this.interrupt(); this.render(); }, { signal });
    window.addEventListener("pagehide", () => this.deactivate(), { signal });
  }
  primary() {
    const g = this.game;
    if (this.error) { void this.startCamera(this.interrupted); return; }
    if (g.paused) { if (this.source === "camera") void this.startCamera(true); else { g.paused = false; this.lastTick = performance.now(); this.render(); } return; }
    if (g.phase === "background") { if (!this.camera.ready) return; g.calibrate(); }
    else if (g.phase === "review") { g.accept(true); this.commitImage(); }
    else if (g.phase === "clear") {
      g.next();
      if (g.phase === "result") { this.saveReceipt(); this.camera.stop(); }
      else { this.frozen = []; this.reference = null; this.sample = null; this.resetMaterial(); }
    }
    this.render(); this.notify();
    if (g.phase === "playing") this.$(".fb-lock").focus();
  }
  interrupt() {
    if (!this.active || this.phase === "result") return;
    // This also cancels a permission/play promise still in flight, leaving a
    // usable resume button instead of an indefinitely loading screen.
    ++this.generation; this.loading = false; this.interrupted = true; this.game.paused = true; this.camera.stop(); this.render(); this.notify();
  }
  beginLoop() { cancelAnimationFrame(this.raf); this.lastTick = performance.now(); this.raf = requestAnimationFrame(this.tick); }
  drawRaw(empty = false) {
    const c = this.rawContext; c.setTransform(2, 0, 0, 2, 0, 0);
    if (this.source === "camera") {
      if (!this.camera.ready) return false;
      const video = this.$("video"), crop = coverCrop(video.videoWidth, video.videoHeight);
      c.drawImage(video, crop.x, crop.y, crop.w, crop.h, 0, 0, WIDTH, HEIGHT);
    } else {
      const gradient = c.createLinearGradient(0, 0, 0, HEIGHT); gradient.addColorStop(0, "#142e39"); gradient.addColorStop(1, "#3c6260"); c.fillStyle = gradient; c.fillRect(0, 0, WIDTH, HEIGHT);
      if (!empty) drawDemoObject(c, this.game.demoShape);
    }
    return true;
  }
  readPixels() { this.sampleContext.drawImage(this.raw, 0, 0, 180, 220); return this.sampleContext.getImageData(0, 0, 180, 220); }
  measure() {
    if (this.source === "demo" && !this.reference) { this.drawRaw(true); this.reference = this.readPixels(); }
    if (!this.drawRaw()) return null;
    this.sample = compareFrames(this.reference, this.readPixels(), this.game.guide); return this.sample;
  }
  lock() {
    if (this.game.phase !== "playing" || this.game.paused || this.loading || this.error) return;
    const sample = this.measure(); if (!sample) return;
    const image = makeCanvas(), c = image.getContext("2d"); c.scale(2, 2); traceShape(c, this.game.guide); c.clip(); c.drawImage(this.raw, 0, 0, WIDTH, HEIGHT);
    if (!this.game.lock(sample)) return;
    this.pendingImage = image;
    if (this.game.phase === "locked") this.commitImage();
    this.render(); this.notify();
    if (this.game.phase === "review") this.$('[data-fb="primary"]').focus();
  }
  commitImage() { this.frozen[this.game.partIndex] = this.pendingImage; this.pendingImage = null; }
  tick = now => {
    if (!this.active || this.phase === "result") return;
    const dt = Math.min(100, Math.max(0, now - this.lastTick)); this.lastTick = now;
    const g = this.game, previous = g.phase, part = g.partIndex;
    if (!this.loading && !this.error && !g.paused) {
      if (this.source === "camera" && !this.camera.ready) { if ((this.notReadyMs = (this.notReadyMs ?? 0) + dt) > 1500) this.interrupt(); }
      else { this.notReadyMs = 0; g.step(dt); }
      if (previous === "calibration" && g.phase === "playing" && this.drawRaw()) { this.reference = this.readPixels(); this.sample = null; }
      if (part !== g.partIndex) { this.reference = null; this.sample = null; this.resetMaterial(); }
      if (g.phase === "playing" && now - this.lastSample > 140) { this.lastSample = now; this.measure(); }
      else if (g.phase !== "review") this.drawRaw();
    }
    this.render(now);
    if (g.phase !== previous) { this.notify(); if (g.phase === "clear" || g.phase === "background") this.$('[data-fb="primary"]').focus({ preventScroll: true }); }
    this.raf = requestAnimationFrame(this.tick);
  };
  saveReceipt() {
    try { const key = "camera-game-lab-false-bridge-v1", prior = JSON.parse(localStorage.getItem(key) ?? "[]"); localStorage.setItem(key, JSON.stringify([...(Array.isArray(prior) ? prior : []), { at: new Date().toISOString(), ...this.game.result }].slice(-50))); } catch { /* Play remains available without storage. Images are never persisted. */ }
  }
  releaseInputs() { ++this.generation; cancelAnimationFrame(this.raf); this.abort?.abort(); this.camera.stop(); this.pointerId = null; }
  deactivate() {
    this.active = false; this.releaseInputs(); this.frozen = []; this.pendingImage = null; this.reference = null;
    for (const canvas of [this.raw, this.sampling, this.canvas]) { const ctx = canvas.getContext("2d"); ctx.save(); ctx.resetTransform(); ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.restore(); }
  }
  render(now = performance.now()) {
    const g = this.game, t = this.t, demo = this.source === "demo", playing = g.phase === "playing" && !g.paused && !this.error && !this.loading, result = g.phase === "result";
    this.$(".fb-source").textContent = t[demo ? "demo" : "camera"];
    this.$(".fb-pause").textContent = t.pause; this.$(".fb-pause").disabled = this.loading || this.error || g.paused || result;
    this.$(".fb-stage-label").textContent = `${t.progress} ${String(g.stageIndex + 1).padStart(2, "0")} / ${g.stage.name}`;
    this.$(".fb-title").textContent = g.stage.prompt[this.locale === "ja" ? 1 : 0];
    this.$(".fb-count").innerHTML = `${String(g.stageIndex + 1).padStart(2, "0")}<span>/ 05</span>`;
    this.$(".fb-part").textContent = g.stage.parts.length > 1 ? `${g.partIndex + 1} / 2` : "";
    this.$(".fb-world-label").textContent = result ? "A LITTLE WORLD, REIMAGINED." : "A LITTLE WORLD, UNFINISHED.";
    const ready = !this.sample?.reason && this.sample?.fit >= .65, almost = !this.sample?.reason && this.sample?.coverage >= .22;
    const feedback = g.phase === "locked" ? t.locked : playing && ready ? t.ready : playing && almost ? t.almost : "";
    const f = this.$(".fb-feedback"); if (f.textContent !== feedback) f.textContent = feedback;
    f.classList.toggle("is-ready", ready); this.$(".fb-lock-flash").classList.toggle("is-locked", g.phase === "locked");
    this.$(".fb-instruction").textContent = g.partIndex === 1 ? t.part : demo ? t.demoHint : t.find;
    this.$(".fb-lock").disabled = !playing || (!demo && !this.camera.ready); this.$(".fb-lock").classList.toggle("is-ready", ready);
    this.$(".fb-actions").hidden = result; this.$(".fb-demo-controls").hidden = !demo || !playing;
    this.$(".fb-angle-label").textContent = t.rotate; this.$(".fb-size-label").textContent = t.size;
    this.$(".fb-reset").textContent = t[demo ? "reset" : "recapture"]; this.$(".fb-reset").disabled = !playing;
    this.$(".fb-hint").textContent = !demo && g.stageMs > 8000 && playing ? t[g.stage.id === "moon" ? "moonHint" : "hint"] : "";
    this.$(".fb-keys").textContent = demo ? t.keys : t.local;
    this.$(".fb-scene").setAttribute("aria-label", t.board);
    let title = "", detail = "", primary = "", secondary = "";
    if (this.loading) { title = t.loading; }
    else if (this.error) { title = t.error; primary = t.retryCamera; secondary = t.tryDemo; }
    else if (g.paused) { title = t.paused; detail = this.interrupted ? t.interrupted : ""; primary = t.resume; }
    else if (g.phase === "background") { title = t.background; primary = t.capture; }
    else if (g.phase === "calibration") { title = `${Math.max(1, Math.ceil((1000 - g.timer) / 1000))}`; detail = t.calibrating; }
    else if (g.phase === "review") { title = t.look; detail = t[g.pending?.reason] ?? t.review; primary = t.yes; secondary = t.retry; }
    else if (g.phase === "clear") { const self = g.parts.some(p => p.selfJudged), grade = g.parts.every(p => p.grade === "PERFECT") ? t.clear : `${g.parts.some(p => p.grade === "GREAT") ? "GREAT" : "GOOD"} FIT!`; title = self ? t.selfClear : grade; primary = g.stageIndex === 4 ? t.finish : t.next; }
    const overlay = this.$(".fb-overlay"); overlay.hidden = !title; overlay.classList.toggle("is-clear", g.phase === "clear"); overlay.classList.toggle("is-review", g.phase === "review" && !g.paused && !this.error);
    overlay.querySelector("h3").textContent = title; overlay.querySelector("p").textContent = detail;
    const a = this.$('[data-fb="primary"]'), b = this.$('[data-fb="secondary"]'); a.textContent = primary; a.hidden = !primary; b.textContent = secondary; b.hidden = !secondary;
    a.disabled = g.phase === "background" && !this.error && !g.paused && !this.camera.ready;
    this.context.setTransform(2, 0, 0, 2, 0, 0);
    renderWorld(this.context, { game: g, raw: demo ? null : this.raw, frozen: this.frozen, pending: this.pendingImage, sample: this.sample, now, reducedMotion: this.reducedMotion });
    const receipt = this.$(".fb-receipt"); receipt.hidden = !result;
    if (result) receipt.innerHTML = `<span>${t[demo ? "resultDemo" : "resultCamera"]}</span><h2>${t.complete}</h2><p>${t.summary}</p><ol>${STAGES.map((s, i) => `<li><span>0${i + 1} ${s.name}</span><b>✓</b></li>`).join("")}</ol><p>${g.result.seconds.toFixed(1)}s · ${g.result.selfJudged} ${t.selfJudged}</p>`;
  }
}
