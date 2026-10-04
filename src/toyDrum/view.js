import { ToyDrumGame, DRUMS, BIG_DRUM, inside } from "../games/toyDrum.js";
import { ToyDrumInput } from "../input/toyDrumInput.js";
import { projectPalm } from "./tracking.js";
import { ToyDrumAudio } from "./audio.js";
import { ToyDrumRenderer, W, H, loadAtlas } from "./renderer.js";
import { copy } from "./messages.js";
import "./toyDrum.css";

export const createView = (root, locale) => new ToyDrumView(root, locale);
export class ToyDrumView {
  constructor(root, locale) {
    this.root = root; this.locale = locale; this.game = new ToyDrumGame(); this.audio = new ToyDrumAudio();
    this.listeners = new Set(); this.active = false; this.phase = "idle"; this.generation = 0; this.hands = [];
    root.innerHTML = `<section class="td-play"><div class="td-toolbar"><span class="td-source"></span><span class="td-time">30<small>s</small></span><button type="button" class="td-pause">Ⅱ</button></div>
      <div class="td-stage" tabindex="0"><video playsinline muted hidden></video><canvas width="${W}" height="${H}" role="img"></canvas>
      <div class="td-cue"><span class="td-mode"></span><strong></strong><small></small><div class="td-sequence" aria-hidden="true"></div></div>
      <div class="td-score"><span>0000</span><b></b></div>
      <div class="td-inputs">${DRUMS.map(d => `<button type="button" data-drum="${d.id}" style="left:${d.x * 100}%;top:${d.y * 100}%" aria-label="${d.name}"></button>`).join("")}<button type="button" class="td-big-hand td-big-left" data-big-hand="0" hidden></button><button type="button" class="td-big-hand td-big-right" data-big-hand="1" hidden></button></div>
      <div class="td-overlay" hidden><h2></h2><p></p><button type="button" class="td-resume" hidden></button><button type="button" class="td-reconnect" hidden></button><button type="button" class="td-demo" hidden></button></div></div>
      <div class="td-progress" aria-hidden="true"><i></i></div><div class="td-footer"><p></p><button type="button" class="td-sound" aria-pressed="true"></button></div><div class="td-announcement" role="status" aria-live="polite"></div></section>`;
    this.$ = s => root.querySelector(s); this.video = this.$("video"); this.canvas = this.$("canvas");
    this.renderer = new ToyDrumRenderer(this.canvas);
    this.atlasPromise = loadAtlas().then(a => { this.atlas = a; if (this.active) this.draw(); }).catch(e => { this.assetError = e; });
    this.input = new ToyDrumInput(this.video, {
      onFrame: (hands, timestamp) => {
        if (!this.active || this.source !== "camera" || this.phase === "error") return;
        this.hands = hands.map(h => projectPalm(h, this.video.videoWidth / this.video.videoHeight || W / H));
        if (this.hands.some(h => h.present)) { this.lastHandAt = performance.now(); this.recoverAt ??= performance.now(); }
        else this.recoverAt = null;
        if (!this.manualPause && !this.inputLost && this.phase === "running") this.game.input(this.hands, timestamp / 1000);
        else this.game.clearMotion();
        this.flushEvents();
      },
      onStatus: (status, error) => {
        if (!this.active) return; this.status = status;
        if (status === "ERROR") { this.error = error; this.phase = "error"; this.game.paused = true; this.audio.stop(); }
        this.render(); this.notify();
      },
    });
  }
  subscribe(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  notify() { this.listeners.forEach(fn => fn(this.snapshot())); }
  snapshot() { return { phase: this.phase === "running" ? "playing" : this.phase, source: this.source, paused: this.game.paused, elapsed: this.game.elapsed, musicRate: this.game.phase === "fever" ? 1.18 : 1, result: this.game.result }; }
  setLocale(locale) { this.locale = locale; this.uiKey = null; this.render(); }
  activate() {
    this.deactivate(); this.active = true; this.phase = "waiting"; this.game.reset(); this.renderer.reset();
    this.manualPause = false; this.inputLost = false; this.hands = []; this.error = null; this.status = null; this.uiKey = null;
    this.reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
    this.abort = new AbortController(); const signal = this.abort.signal;
    this.root.addEventListener("click", this.click, { signal });
    this.$(".td-stage").addEventListener("pointerdown", this.pointerDown, { signal });
    window.addEventListener("keydown", this.keyDown, { signal }); document.addEventListener("visibilitychange", this.visibility, { signal }); window.addEventListener("blur", this.blur, { signal });
    this.lastFrame = performance.now(); this.frameId = requestAnimationFrame(this.loop); this.render(); this.draw();
  }
  async startCamera() {
    const token = ++this.generation; this.source = "camera"; this.phase = "loading"; this.error = null; this.audio.arm(); this.render(); this.notify();
    try {
      await this.atlasPromise; if (!this.active || token !== this.generation) return;
      if (!this.atlas) throw this.assetError;
      await this.input.start(); if (!this.active || token !== this.generation) return;
      this.phase = "waiting"; this.lastHandAt = performance.now(); this.recoverAt = null; this.render(); this.notify();
    } catch (error) {
      if (!this.active || token !== this.generation || error?.name === "AbortError") return;
      this.phase = "error"; this.error = error; this.input.stop(); this.audio.stop(); this.render(); this.notify();
    }
  }
  async startDemo() {
    const token = ++this.generation; this.input.stop(); this.source = "demo"; this.phase = "loading"; this.audio.arm(); this.render(); this.notify();
    await this.atlasPromise; if (!this.active || token !== this.generation) return;
    if (!this.atlas) { this.phase = "error"; this.render(); this.notify(); return; }
    this.hands = []; this.manualPause = false; this.inputLost = false; this.game.start(); this.renderer.reset(); this.phase = "running";
    this.lastFrame = performance.now(); this.render(); this.notify(); this.$(".td-stage").focus({ preventScroll: true });
  }
  releaseInputs() {
    ++this.generation; this.input.stop(); this.audio.stop(); this.abort?.abort();
    if (this.frameId != null) cancelAnimationFrame(this.frameId); this.frameId = null; this.hands = []; this.game.clearMotion();
  }
  deactivate() { this.active = false; this.releaseInputs(); this.phase = "idle"; this.renderer.reset(); }
  click = e => {
    if (e.target.closest(".td-pause,.td-resume")) this.togglePause();
    else if (e.target.closest(".td-demo")) void this.startDemo();
    else if (e.target.closest(".td-reconnect")) { this.game.reset(); this.renderer.reset(); this.manualPause = false; this.inputLost = false; this.hands = []; void this.startCamera(); }
    else if (e.target.closest(".td-sound")) { this.audio.enabled = !this.audio.enabled; this.uiKey = null; this.render(); }
    else if (this.source === "demo" && e.detail === 0) {
      const drum = e.target.closest("[data-drum]"), big = e.target.closest("[data-big-hand]");
      if (drum) this.practiceHit(Number(drum.dataset.drum)); if (big) this.practiceHit(4, Number(big.dataset.bigHand));
    }
  };
  practiceHit(drum, hand = drum % 2) { if (this.source !== "demo" || this.phase !== "running") return; this.game.practiceHit(drum, hand); this.flushEvents(); this.draw(); }
  pointerDown = e => {
    if (this.source !== "demo" || this.phase !== "running" || this.game.paused || e.target.closest(".td-overlay")) return;
    const drum = e.target.closest("[data-drum]"), big = e.target.closest("[data-big-hand]");
    if (drum || big) { e.preventDefault(); if (big) this.practiceHit(4, Number(big.dataset.bigHand)); else this.practiceHit(Number(drum.dataset.drum)); return; }
    const b = this.canvas.getBoundingClientRect(), p = { x: (e.clientX - b.x) / b.width, y: (e.clientY - b.y) / b.height };
    const d = this.game.targets.find(d => inside(p, d)); if (d) { e.preventDefault(); this.practiceHit(d.id, d.id === 4 ? (p.x < .5 ? 0 : 1) : d.id % 2); }
  };
  keyDown = e => {
    if (this.source !== "demo" || e.repeat || e.altKey || e.ctrlKey || e.metaKey || /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
    const id = ["d", "f", "j", "k"].indexOf(e.key.toLowerCase()); if (id < 0) return;
    e.preventDefault(); if (this.game.phase === "finish") this.practiceHit(4, id < 2 ? 0 : 1); else this.practiceHit(id, id % 2);
  };
  togglePause() {
    if (this.phase !== "running") return; this.manualPause = !this.manualPause;
    this.game.paused = this.manualPause || this.inputLost; this.game.clearMotion(); this.lastFrame = performance.now();
    if (this.game.paused) void this.audio.context?.suspend().catch(() => {}); else this.audio.arm(); this.render(); this.notify();
  }
  visibility = () => { if (document.hidden) this.blur(); };
  blur = () => { if (this.phase === "running" && !this.manualPause) this.togglePause(); };
  flushEvents() {
    for (const e of this.game.takeEvents()) {
      this.audio.play(e); this.renderer.event(e);
      if (["free", "rhythm", "fever", "finish"].includes(e.type)) { this.uiKey = null; this.$(".td-announcement").textContent = copy(this.locale)[e.type]; }
    }
  }
  loop = now => {
    if (!this.active) return;
    const dt = Math.min(.25, Math.max(0, (now - this.lastFrame) / 1000)); this.lastFrame = now;
    if (this.source === "camera" && ["waiting", "running"].includes(this.phase)) {
      if (this.phase === "waiting" && this.hands.some(h => h.present)) { this.game.start(); this.phase = "running"; this.lastHandAt = now; this.notify(); }
      if (this.phase === "running") {
        const lost = now - this.lastHandAt > 650 || this.inputLost && (this.recoverAt == null || now - this.recoverAt < 200);
        if (lost !== this.inputLost) { this.inputLost = lost; this.game.paused = this.manualPause || lost; this.game.clearMotion(); if (!this.game.paused) this.audio.arm(); this.notify(); }
      }
    }
    if (this.phase === "running") {
      this.game.step(dt); this.flushEvents();
      if (this.game.phase === "result") { this.game.result.source = this.source; this.phase = "result"; this.input.stop(); this.audio.stop(); this.notify(); }
    }
    this.render(); this.draw(); this.frameId = requestAnimationFrame(this.loop);
  };
  draw() { this.renderer.draw(this.game, { atlas: this.atlas, video: this.video, source: this.source, hands: this.hands, reducedMotion: this.reducedMotion }); }
  render() {
    const t = copy(this.locale), g = this.game, cue = g.cue;
    this.$(".td-time").innerHTML = `${Math.ceil(30 - g.elapsed)}<small>s</small>`;
    this.$(".td-score span").textContent = String(g.score).padStart(4, "0"); this.$(".td-score b").textContent = g.combo > 1 ? `COMBO ×${g.combo}` : "";
    this.$(".td-progress i").style.width = `${g.elapsed / 30 * 100}%`;
    const key = [this.locale, this.phase, g.phase, this.manualPause, this.inputLost, g.finishSuccess, cue?.at, this.status, this.source, this.audio.enabled].join(":");
    if (key === this.uiKey) return; this.uiKey = key;
    this.$(".td-source").textContent = this.source === "demo" ? t.demo : t.camera;
    this.canvas.setAttribute("aria-label", t.canvas); this.$(".td-pause").setAttribute("aria-label", t.pause); this.$(".td-pause").disabled = this.phase !== "running";
    this.$(".td-sound").textContent = `${t.sound} ${this.audio.enabled ? "ON" : "OFF"}`; this.$(".td-sound").setAttribute("aria-pressed", String(this.audio.enabled));
    this.$(".td-footer p").textContent = this.source === "demo" ? t.demoHint : t.cameraHint;
    this.$(".td-mode").textContent = g.phase === "rhythm" ? `RHYTHM / LEVEL ${g.level}` : g.phase === "fever" ? "FEVER TIME" : g.phase === "finish" ? "THE GRAND FINALE" : "FREE PLAY";
    this.$(".td-cue strong").textContent = g.phase === "waiting" ? t.wait : t[g.phase] ?? "";
    this.$(".td-cue small").textContent = g.phase === "finish" ? t.both : "";
    this.$(".td-sequence").innerHTML = cue ? cue.drums.map(id => `<i style="--dot:${DRUMS[id].color}">${DRUMS[id].name}</i>`).join("<b>＋</b>") : "";
    this.$(".td-stage").dataset.phase = g.phase; this.$(".td-stage").dataset.source = this.source;
    this.root.querySelectorAll("[data-drum]").forEach(b => { b.hidden = g.phase === "finish"; b.disabled = this.source !== "demo" || g.paused || this.phase !== "running"; });
    this.root.querySelectorAll("[data-big-hand]").forEach(b => { b.hidden = g.phase !== "finish" || g.finishSuccess; b.disabled = this.source !== "demo" || g.paused; b.setAttribute("aria-label", Number(b.dataset.bigHand) ? t.finishRight : t.finishLeft); });
    const overlay = this.$(".td-overlay"), show = ["loading", "error", "waiting"].includes(this.phase) || this.manualPause || this.inputLost;
    overlay.hidden = !show; if (!show) return;
    overlay.querySelector("h2").textContent = this.phase === "loading" ? t.loading : this.phase === "error" ? t.error : this.manualPause ? t.paused : this.inputLost ? t.lost : t.wait;
    overlay.querySelector("p").textContent = this.phase === "loading" ? (this.status === "REQUESTING_CAMERA" ? t.permission : t.model) : this.phase === "error" ? t.errorHint : this.phase === "waiting" ? t.tip : "";
    this.$(".td-resume").hidden = !this.manualPause; this.$(".td-resume").textContent = t.resume;
    this.$(".td-reconnect").hidden = this.phase !== "error"; this.$(".td-reconnect").textContent = t.retryCamera;
    this.$(".td-demo").hidden = !["waiting", "error"].includes(this.phase) && !this.inputLost; this.$(".td-demo").textContent = t.practice;
  }
}
