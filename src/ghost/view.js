import { GhostInput } from "../input/ghostInput.js";
import { projectGhostPosition } from "../input/ghostPosition.js";
import { GhostTrailGame, GHOST_SCHEDULE } from "../games/ghostTrail.js";
import { drawGhostTrail } from "./draw.js";
import { messages } from "./messages.js";
import "./ghost.css";

const clamp = (n) => Math.max(.045, Math.min(.955, n));
const RECEIPTS = "camera-game-lab-ghost-trail-rounds";
export function createView(root, locale = "ja") { return new GhostView(root, locale); }
class GhostView {
  constructor(root, locale) {
    this.root = root; this.locale = locale; this.listeners = new Set(); this.keys = new Set();
    this.generation = 0; this.phase = "idle"; this.source = "camera"; this.active = false; this.game = new GhostTrailGame();
    this.reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
    root.innerHTML = `<div class="gt-view"><div class="gt-toolbar"><span class="gt-source"></span><button type="button" class="gt-pause"></button></div>
      <div class="gt-hud"><div><span class="gt-time-label"></span><strong class="gt-time">30.0</strong></div><div class="gt-life"><span class="gt-life-label"></span><strong class="gt-hearts"></strong></div><div><span class="gt-score-label"></span><strong class="gt-score">0000</strong></div></div>
      <div class="gt-stage" tabindex="0" role="group"><video muted playsinline></video><canvas aria-hidden="true"></canvas><span class="gt-now"></span><div class="gt-flash"></div><div class="gt-overlay" role="status" aria-live="polite"></div><div class="gt-receipt" hidden></div></div>
      <div class="gt-legend"></div><div class="gt-caption"><h2 class="gt-callout" role="status" aria-live="polite"></h2><p class="gt-instruction"></p></div><p class="gt-hint"></p>
      <div class="gt-recovery" hidden><button type="button" class="gt-retry"></button><button type="button" class="gt-demo"></button></div></div>`;
    this.$ = (s) => root.querySelector(s);
    this.nodes = Object.fromEntries([...root.querySelectorAll("[class]")].filter((e) => e.classList.length === 1).map((e) => [e.className.replace("gt-", ""), e]));
    this.video = this.$("video"); this.canvas = this.$("canvas");
    this.input = new GhostInput(this.video, { onPosition: (point) => {
      if (this.active && this.source === "camera") { this.rawPoint = point; this.lastInput = performance.now(); }
    }, onStatus: (status) => { if (status === "ERROR" && this.active && this.source === "camera") this.fail(); } });
    this.render();
  }
  get t() { return messages[this.locale === "ja" ? "ja" : "en"]; }
  subscribe(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  notify() { this.listeners.forEach((fn) => fn(this.snapshot())); }
  snapshot() {
    const r = this.game.result;
    return { phase: this.phase === "recording" ? "countdown" : this.phase, source: this.source,
      result: this.phase === "result" && r ? { ...r,
        summaryJa: `${r.source === "demo" ? "デモ" : "カメラ"} · ${r.outcome === "survived" ? "逃げ切った" : "追いつかれた"} · ${r.seconds.toFixed(1)}秒 · ニアミス ${r.nearMisses}回`,
        summaryEn: `${r.source === "demo" ? "Demo" : "Camera"} · ${r.outcome === "survived" ? "SURVIVED" : "CAUGHT"} · ${r.seconds.toFixed(1)}s · ${r.nearMisses} near misses` } : null };
  }
  setLocale(locale) { this.locale = locale; this.render(); }
  activate() { this.active = true; this.phase = "idle"; this.render(); }
  bind() {
    this.abort?.abort(); this.abort = new AbortController(); const signal = this.abort.signal, n = this.nodes;
    const position = (e) => {
      const b = n.stage.getBoundingClientRect(); this.cursor = { x: clamp((e.clientX - b.left) / b.width), y: clamp((e.clientY - b.top) / b.height) };
    };
    n.stage.addEventListener("pointerdown", (e) => {
      if (this.source !== "demo" || e.button > 0) return;
      e.preventDefault(); n.stage.focus({ preventScroll: true }); n.stage.setPointerCapture(e.pointerId); position(e);
    }, { signal });
    n.stage.addEventListener("pointermove", (e) => { if (this.source === "demo" && (e.pointerType === "mouse" || e.buttons)) position(e); }, { signal });
    window.addEventListener("keydown", (e) => {
      if (this.source !== "demo" || !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "KeyW", "KeyA", "KeyS", "KeyD"].includes(e.code) || e.target.closest("button,a,input,textarea")) return;
      e.preventDefault(); this.keys.add(e.code);
    }, { signal });
    window.addEventListener("keyup", (e) => this.keys.delete(e.code), { signal });
    const background = (paused) => { this.backgroundPaused = paused; this.keys.clear(); this.syncPause(); this.lastTick = performance.now(); };
    window.addEventListener("blur", () => background(true), { signal });
    window.addEventListener("focus", () => background(document.hidden), { signal });
    document.addEventListener("visibilitychange", () => background(document.hidden), { signal });
    n.pause.addEventListener("click", () => { this.userPaused = !this.userPaused; this.keys.clear(); this.syncPause(); this.render(); }, { signal });
    n.retry.addEventListener("click", () => void this.startCamera(), { signal });
    n.demo.addEventListener("click", () => this.startDemo(), { signal });
  }
  syncPause() { this.game.setPaused(this.userPaused || this.backgroundPaused); }
  setup(source) {
    this.releaseInputs(); this.active = true; this.source = source; this.phase = "loading";
    this.game = new GhostTrailGame(); this.game.start(source); this.rawPoint = null; this.lastInput = -Infinity;
    this.cursor = { x: .5, y: .5 }; this.userPaused = false; this.backgroundPaused = document.hidden;
    this.bind(); this.syncPause(); this.render(); this.notify(); return this.generation;
  }
  async startCamera() {
    const token = this.setup("camera");
    try { await this.input.start(); if (this.active && token === this.generation) this.begin(); }
    catch (error) { if (token === this.generation && error.name !== "AbortError") this.fail(); }
  }
  startDemo() { this.setup("demo"); this.begin(); this.nodes.stage.focus({ preventScroll: true }); }
  begin() { this.phase = this.game.phase; this.lastTick = performance.now(); this.render(); this.notify(); this.raf = requestAnimationFrame(this.tick); }
  sample(now, dt) {
    if (this.source === "camera") {
      if (now - this.lastInput > 250) return null;
      return projectGhostPosition(this.rawPoint, this.video.videoWidth, this.video.videoHeight, this.nodes.stage.clientWidth, this.nodes.stage.clientHeight);
    }
    if (!this.game.manualPause && dt <= 250) {
      const x = Number(this.keys.has("ArrowRight") || this.keys.has("KeyD")) - Number(this.keys.has("ArrowLeft") || this.keys.has("KeyA"));
      const y = Number(this.keys.has("ArrowDown") || this.keys.has("KeyS")) - Number(this.keys.has("ArrowUp") || this.keys.has("KeyW"));
      const speed = dt / 1000 * .5 / (Math.hypot(x, y) || 1);
      this.cursor = { x: clamp(this.cursor.x + x * speed), y: clamp(this.cursor.y + y * speed * .75) };
    }
    return this.cursor;
  }
  tick = (now) => {
    if (!this.active) return;
    const dt = now - this.lastTick; this.lastTick = now;
    this.game.step(dt, this.sample(now, dt));
    const changed = this.phase !== this.game.phase; this.phase = this.game.phase; this.render();
    if (this.phase === "result") { this.saveReceipt(); this.releaseInputs(); this.notify(); return; }
    if (changed) this.notify();
    this.raf = requestAnimationFrame(this.tick);
  };
  saveReceipt() {
    try {
      const parsed = JSON.parse(localStorage.getItem(RECEIPTS) || "[]"), rounds = Array.isArray(parsed) ? parsed : [];
      rounds.push({ ...this.game.result, experiment: "EXP-030", recordedAt: new Date().toISOString() });
      localStorage.setItem(RECEIPTS, JSON.stringify(rounds.slice(-50)));
    } catch { /* Gameplay also works with blocked storage. */ }
  }
  fail() { this.releaseInputs(); this.phase = "error"; this.bind(); this.render(); this.notify(); }
  releaseInputs() {
    ++this.generation; cancelAnimationFrame(this.raf); this.raf = null;
    this.abort?.abort(); this.keys.clear(); this.input.stop(); this.rawPoint = null;
  }
  deactivate() { this.active = false; this.releaseInputs(); this.phase = "idle"; }
  render() {
    const t = this.t, n = this.nodes, g = this.game, r = g.result, text = (key, value) => { if (n[key].textContent !== value) n[key].textContent = value; };
    text("source", t[this.source]); text("pause", t[this.userPaused ? "resume" : "pause"]);
    n.pause.disabled = ["idle", "loading", "error", "result"].includes(this.phase); n.pause.setAttribute("aria-pressed", String(!!this.userPaused));
    text("time-label", t.time); text("life-label", t.lives); text("score-label", t.score);
    text("time", (g.remainingMs / 1000).toFixed(1)); text("hearts", "♥".repeat(g.lives) + "♡".repeat(3 - g.lives));
    n.hearts.setAttribute("aria-label", `${t.lives}: ${g.lives} / 3`); text("score", String(g.score || 0).padStart(4, "0")); text("now", t.you);
    n.stage.setAttribute("aria-label", t.board); n.stage.classList.toggle("is-demo", this.source === "demo"); n.stage.classList.toggle("is-result", !!r);
    const message = this.phase === "error" ? t.error : this.phase === "loading" ? t.loading : g.paused ? t[g.manualPause ? "paused" : g.recovery > 0 ? "recovering" : "missing"] : "";
    text("overlay", message); n.overlay.hidden = !message || !!r;
    n.flash.classList.toggle("is-hit", !this.reducedMotion && g.effect?.type === "hit" && g.effect.until - g.elapsedMs > 650 && !g.paused);
    const effect = g.effect && g.effect.until > g.elapsedMs ? g.effect.type : null;
    const arrival = GHOST_SCHEDULE.findLast((s) => g.elapsedMs >= s.at);
    const cue = effect || (g.elapsedMs < 3000 ? "recording" : g.elapsedMs >= 25000 ? "last" : arrival && g.elapsedMs - arrival.at < 1600 ? arrival.at === 3000 ? "first" : "incoming" : "playing");
    text("callout", t[cue]); n.callout.dataset.cue = cue;
    text("instruction", t[g.elapsedMs < 3000 ? "recordHint" : "playHint"]);
    text("hint", t[this.source === "demo" ? "demoHint" : "cameraHint"]);
    const next = GHOST_SCHEDULE.find((s) => g.elapsedMs < s.at);
    const legend = GHOST_SCHEDULE.map((s) => `<span style="--echo:${s.color}" class="${g.elapsedMs >= s.at ? "is-active" : ""}">${s.delay / 1000}${t.ago}</span>`).join("") + `<small>${next ? `${t.next} ${Math.ceil((next.at - g.elapsedMs) / 1000)}s` : "4 / 4"}</small>`;
    if (this.legendMarkup !== legend) { n.legend.innerHTML = legend; this.legendMarkup = legend; }
    for (const key of ["legend", "caption", "hint"]) n[key].hidden = !!r;
    n.recovery.hidden = this.phase !== "error"; text("retry", t.retry); text("demo", t.tryDemo);
    n.receipt.hidden = !r;
    if (r) n.receipt.innerHTML = `<small>${t[r.source === "demo" ? "resultDemo" : "resultCamera"]}</small><h2>${t[r.outcome]}</h2><strong>${r.score}<small> ${t.score}</small></strong><p>${r.seconds.toFixed(1)}${this.locale === "ja" ? "" : "s "}${t.survival} · ${r.nearMisses} ${t.misses}</p><p>${r.maxGhosts} ${t.ghosts} · ${t.lives} ${r.lives} / 3</p>`;
    if (this.phase !== "idle") drawGhostTrail(this.canvas, g, { demo: this.source === "demo", locale: this.locale, reducedMotion: this.reducedMotion });
  }
}
