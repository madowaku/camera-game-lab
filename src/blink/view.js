import { EyeInput } from "../input/eyeInput.js";
import { BlinkHorrorGame } from "../games/blinkHorror.js";
import { HorrorAudio } from "./audio.js";
import "./blink.css";

const messages = {
  en: { look: "Look to escape.", hide: "Close your eyes to hide.", hold: "HOLD TO HIDE", keys: "Hold Space or this button to close your eyes.", face: "Face the camera", calibrate: "Look normally at the screen", countdown: "Something is behind you.", escaped: "ESCAPED", caught: "CAUGHT", timeout: "STILL IN THE DARK", hides: "hides", nearest: "closest danger", progress: "ESCAPE", sound: "SOUND", muted: "MUTED", demo: "DEMO · BUTTON INPUT", camera: "CAMERA · EYE INPUT", pause: "PAUSED", danger: ["A distant sound.", "It is getting closer.", "It is right behind you."], error: "Camera unavailable. Retry or try the demo.", retry: "RETRY CAMERA", tryDemo: "TRY DEMO", loading: "Preparing camera…", resultDemo: "Demo result", resultCamera: "Camera result", debug: "Debug input" },
  ja: { look: "見続けると脱出へ進む", hide: "目を閉じると隠れられる", hold: "押している間、目を閉じる", keys: "Spaceキー、または下のボタンを長押し。", face: "カメラに顔を映してください", calibrate: "いつもどおり画面を見てください", countdown: "背後に、何かいる。", escaped: "脱出", caught: "捕まった", timeout: "まだ、闇の中", hides: "回 隠れた", nearest: "最大の危険度", progress: "脱出まで", sound: "音あり", muted: "消音", demo: "デモ · ボタン操作", camera: "カメラ · 目で操作", pause: "一時停止", danger: ["遠くで、音がする。", "近づいてくる。", "すぐ後ろにいる。"], error: "カメラを使えません。再試行かデモを選べます。", retry: "カメラを再試行", tryDemo: "デモで試す", loading: "カメラを準備中…", resultDemo: "デモの結果", resultCamera: "カメラの結果", debug: "入力デバッグ" },
};
const demoFrame = (closed) => ({ present: true, ready: true, eyeState: closed ? "EYES_CLOSED" : "EYES_OPEN", blinkLeftScore: closed ? 1 : 0, blinkRightScore: closed ? 1 : 0, events: [], facePosition: { x: 0.5, y: 0.46 } });

export function createView(root, locale = "ja") { return new BlinkView(root, locale); }
class BlinkView {
  constructor(root, locale) {
    this.root = root; this.locale = locale; this.listeners = new Set(); this.audio = new HorrorAudio(); this.game = new BlinkHorrorGame();
    this.phase = "idle"; this.active = false; this.generation = 0; this.source = "camera"; this.frame = null; this.lastInput = -Infinity;
    root.innerHTML = `<div class="bh-view"><div class="bh-toolbar"><span class="bh-source"></span><button type="button" class="bh-sound"></button></div>
      <div class="bh-stage" role="group"><div class="bh-scene"><video class="bh-video" muted playsinline></video><div class="bh-room"><i></i><i></i><i></i></div><svg class="bh-monster" viewBox="0 0 180 330" aria-hidden="true"><path d="M37 330 48 158Q14 136 33 101L53 84Q44 12 93 9q43 2 36 65l23 53-16 27 19 176Z"/><path class="bh-eyes" d="m63 82 22 5-2 6-22-3m35-3 21-7 3 7-23 8"/></svg><div class="bh-vignette"></div><div class="bh-grain"></div></div><div class="bh-shutter"></div>
      <div class="bh-hud"><div><span class="bh-progress-label"></span><strong class="bh-progress-value">0%</strong></div><div class="bh-meter" role="progressbar" aria-valuemin="0" aria-valuemax="100"><i></i></div></div>
      <div class="bh-message" role="status" aria-live="polite"></div><div class="bh-danger"><i></i><span></span></div><div class="bh-receipt" hidden></div></div>
      <p class="bh-instruction"></p><p class="bh-keyhint"></p><button type="button" class="bh-hide"></button><div class="bh-recovery" hidden><button type="button" class="bh-retry"></button><button type="button" class="bh-demo"></button></div><details class="bh-debug"><summary></summary><pre></pre></details></div>`;
    this.$ = (s) => root.querySelector(s);
    this.input = new EyeInput(this.$("video"), { onFrame: (frame) => { if (this.active && this.source === "camera") { this.frame = frame; this.lastInput = performance.now(); } }, onStatus: (status) => { if (status === "ERROR" && this.active) this.fail(); } });
    this.render();
  }
  get t() { return messages[this.locale === "ja" ? "ja" : "en"]; }
  subscribe(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  notify() { this.listeners.forEach((fn) => fn(this.snapshot())); }
  snapshot() {
    const result = this.game.result ? { ...this.game.result,
      summaryJa: `${this.game.result.source === "demo" ? "デモ" : "カメラ"} · ${messages.ja[this.game.result.outcome]} · ${this.game.result.seconds.toFixed(1)}秒 · ${this.game.result.hides}回 隠れた`,
      summaryEn: `${this.game.result.source === "demo" ? "Demo" : "Camera"} · ${messages.en[this.game.result.outcome]} · ${this.game.result.seconds.toFixed(1)}s · ${this.game.result.hides} hides` } : null;
    return { phase: this.phase, source: this.source, result: this.phase === "result" ? result : null };
  }
  setLocale(locale) { this.locale = locale; this.render(); }
  activate() { this.active = true; this.phase = "idle"; this.game = new BlinkHorrorGame(); this.render(); }
  bind() {
    this.abort?.abort(); this.abort = new AbortController(); const signal = this.abort.signal;
    const hold = (value) => { if (this.source === "demo" && this.phase !== "result") this.held = value; };
    this.$(".bh-hide").addEventListener("pointerdown", (e) => { e.preventDefault(); this.$(".bh-hide").setPointerCapture(e.pointerId); hold(true); }, { signal });
    for (const name of ["pointerup", "pointercancel", "lostpointercapture"]) this.$(".bh-hide").addEventListener(name, () => hold(false), { signal });
    window.addEventListener("keydown", (e) => { if (e.code === "Space" && (!e.target.closest("button,a,input,textarea,summary") || e.target === this.$(".bh-hide"))) { e.preventDefault(); hold(true); } }, { signal });
    window.addEventListener("keyup", (e) => { if (e.code === "Space") { e.preventDefault(); hold(false); } }, { signal });
    window.addEventListener("blur", () => { hold(false); this.game.setPaused(true); }, { signal });
    window.addEventListener("focus", () => { this.game.setPaused(false); this.lastTick = performance.now(); }, { signal });
    document.addEventListener("visibilitychange", () => { hold(false); this.game.setPaused(document.hidden); this.lastTick = performance.now(); }, { signal });
    this.$(".bh-sound").addEventListener("click", () => { this.audio.setMuted(!this.audio.muted); this.render(); }, { signal });
    this.$(".bh-retry").addEventListener("click", () => void this.startCamera(), { signal });
    this.$(".bh-demo").addEventListener("click", () => this.startDemo(), { signal });
  }
  setup(source) {
    this.releaseInputs(); this.active = true; this.source = source; this.phase = "loading"; this.held = false; this.frame = null; this.lastInput = -Infinity;
    this.game = new BlinkHorrorGame(); this.game.start(source); this.bind(); this.audio.start(); this.render(); this.notify(); return this.generation;
  }
  async startCamera() {
    const token = this.setup("camera");
    try { await this.input.start(); if (!this.active || token !== this.generation) return; this.beginLoop(); }
    catch (error) { if (token === this.generation && error.name !== "AbortError") this.fail(); }
  }
  startDemo() { this.setup("demo"); this.beginLoop(); }
  beginLoop() { this.phase = this.game.phase; this.lastTick = performance.now(); this.notify(); this.raf = requestAnimationFrame(this.tick); }
  tick = (now) => {
    if (!this.active) return;
    const dt = Math.min(80, Math.max(0, now - this.lastTick)); this.lastTick = now;
    const input = this.source === "demo" ? demoFrame(this.held) : now - this.lastInput <= 300 ? this.frame : null;
    this.game.step(dt, input); if (this.frame) this.frame.events = [];
    if (this.game.phase === "result") {
      this.phase = "resolving"; this.input.stop(); this.audio.finish(this.game.result.outcome === "escaped"); this.render();
      this.finishTimer = setTimeout(() => { this.releaseInputs(); this.phase = "result"; this.render(); this.notify(); }, 360);
      return;
    }
    const changed = this.phase !== this.game.phase; this.phase = this.game.phase;
    this.audio.update(this.game); this.render(); if (changed) this.notify();
    this.raf = requestAnimationFrame(this.tick);
  };
  fail() { this.releaseInputs(); this.phase = "error"; this.bind(); this.render(); this.notify(); }
  releaseInputs() {
    ++this.generation; cancelAnimationFrame(this.raf); this.raf = null; clearTimeout(this.finishTimer); this.finishTimer = null;
    this.abort?.abort(); this.input?.stop(); this.audio.close(); this.held = false;
  }
  deactivate() { this.active = false; this.releaseInputs(); this.phase = "idle"; }
  render() {
    const t = this.t, game = this.game, result = game.result;
    const closed = game.phase === "playing" && game.lastEye === "EYES_CLOSED" && !game.paused;
    const stage = this.$(".bh-stage"); stage.classList.toggle("is-closed", closed); stage.classList.toggle("is-result", !!result);
    stage.style.setProperty("--danger", game.danger ?? 0);
    stage.setAttribute("aria-label", `${t.look} ${t.hide}`);
    this.$(".bh-source").textContent = t[this.source === "demo" ? "demo" : "camera"];
    this.$(".bh-sound").textContent = this.audio.muted ? t.muted : t.sound;
    this.$(".bh-sound").setAttribute("aria-pressed", String(!this.audio.muted)); this.$(".bh-sound").disabled = this.phase === "result";
    this.$(".bh-progress-label").textContent = t.progress;
    this.$(".bh-progress-value").textContent = `${Math.round((game.progress ?? 0) * 100)}%`;
    this.$(".bh-meter").setAttribute("aria-label", t.progress); this.$(".bh-meter").setAttribute("aria-valuenow", Math.round((game.progress ?? 0) * 100));
    this.$(".bh-meter i").style.width = `${(game.progress ?? 0) * 100}%`;
    this.$(".bh-monster").style.transform = `translateX(${((this.frame?.facePosition?.x ?? 0.5) - 0.5) * 60}%) scale(${0.5 + (game.danger ?? 0) * 1.1})`;
    const message = this.phase === "error" ? t.error : this.phase === "loading" ? t.loading : result ? "" : game.paused ? (game.manualPause ? t.pause : t.face) : game.phase === "calibration" ? t.calibrate : game.phase === "countdown" ? `${t.countdown} ${Math.max(1, Math.ceil((game.rules.countdownMs - game.countdown) / 1000))}` : "";
    if (this.$(".bh-message").textContent !== message) this.$(".bh-message").textContent = message;
    this.$(".bh-danger span").textContent = t.danger[Math.min(2, Math.floor((game.danger ?? 0) * 3))];
    this.$(".bh-instruction").textContent = closed ? t.hide : t.look;
    this.$(".bh-keyhint").textContent = this.source === "demo" ? t.keys : t.hide;
    this.$(".bh-instruction").hidden = !!result; this.$(".bh-keyhint").hidden = !!result; this.$(".bh-debug").hidden = !!result;
    this.$(".bh-hide").textContent = t.hold; this.$(".bh-hide").hidden = this.source !== "demo" || !!result || this.phase === "error";
    this.$(".bh-hide").setAttribute("aria-pressed", String(!!this.held));
    this.$(".bh-recovery").hidden = this.phase !== "error"; this.$(".bh-retry").textContent = t.retry; this.$(".bh-demo").textContent = t.tryDemo;
    const receipt = this.$(".bh-receipt"); receipt.hidden = !result;
    if (result) receipt.innerHTML = `<small>${t[this.source === "demo" ? "resultDemo" : "resultCamera"]}</small><h2>${t[result.outcome]}</h2><p>${result.seconds.toFixed(1)}s · ${result.hides} ${t.hides}</p><p>${t.nearest} ${Math.round(result.closestDanger * 100)}%</p>`;
    this.$(".bh-debug summary").textContent = t.debug;
    if (this.$(".bh-debug").open) this.$(".bh-debug pre").textContent = JSON.stringify({ face: this.frame?.present ?? this.source === "demo", eyes: this.frame?.eyeState ?? (this.held ? "EYES_CLOSED" : "EYES_OPEN"), left: this.frame?.blinkLeftScore, right: this.frame?.blinkRightScore, danger: game.danger, escape: game.progress, rush: game.rush, fps: this.frame?.fps }, null, 2);
  }
}
