import { EyeInput } from "../input/eyeInput.js";
import { BlinkHorrorGame } from "../games/blinkHorror.js";
import { HorrorAudio } from "./audio.js";
import corridor from "./assets/corridor-v2.webp";
import monster from "./assets/monster-v2.webp";
import "./blink.css";

const messages = {
  en: { look: "KEEP YOUR EYES OPEN", blink: "BLINK = IT GETS CLOSER", hide: "HIDE TO BLINK", hold: "HOLD TO CLOSE EYES", keys: "Hold Space or the button to close. Release to open.", face: "FIT YOUR FACE", open: "Look at the screen", close: "Close both eyes once, then open", ready: "READY", countdown: "Something is behind you.", escaped: "ESCAPED", caught: "CAUGHT", sound: "SFX ON", muted: "SFX OFF", demo: "PRACTICE · NO CAMERA", camera: "CAMERA · EYE INPUT", pause: "PAUSED", resume: "RESUME", pauseButton: "PAUSE", lost: "FACE NOT FOUND · return to the guide", dark: "More light will help eye tracking", position: "Center your face in the guide", loading: "Preparing camera…", error: "Camera unavailable. Retry or use practice.", retry: "RETRY CAMERA", tryDemo: "TRY PRACTICE", debug: "Eye tracking details", safe: "SAFE", blinkNow: "BLINK NOW", dont: "DON’T LOOK", dontDetail: "Close both eyes. Listen for GO!", go: "GO!", goDetail: "Open your eyes. Run to the exit.", safeDetail: "You can blink safely inside the locker.", moved: "IT MOVED.", saw: "IT SAW YOU.", safeBlink: "SAFE BLINK ✓", pass: "It’s passing your locker…", blinks: "BLINKS", calls: "CLOSE CALLS", time: "TIME", best: "BEST", notBest: "Escape to set a best time", silence: "The door is shut. You made it.", danger: ["Only your footsteps.", "Footsteps, far behind.", "A breath in the reflection.", "Breathing at your shoulder.", "DON’T BLINK."], final: "DON’T BLINK.", noMore: "No more lockers. Almost there." },
  ja: { look: "KEEP YOUR EYES OPEN", blink: "まばたきすると、近づく。", hide: "ロッカーまで、目を開けて。", hold: "押している間、目を閉じる", keys: "Spaceキーかボタンを長押し。離すと目を開く。", face: "FIT YOUR FACE", open: "まず、画面を見てください", close: "両目を一度閉じて、開いてください", ready: "READY", countdown: "背後に、何かいる。", escaped: "ESCAPED", caught: "CAUGHT", sound: "SE ON", muted: "SE OFF", demo: "練習 · カメラなし", camera: "カメラ · 目で操作", pause: "一時停止", resume: "再開", pauseButton: "一時停止", lost: "顔が見つかりません · ガイド内へ戻ってください", dark: "顔を少し明るくすると認識しやすくなります", position: "顔をガイドの中央に合わせてください", loading: "カメラを準備中…", error: "カメラを使えません。再試行か練習を選べます。", retry: "カメラを再試行", tryDemo: "カメラなしで練習", debug: "目の認識状態", safe: "SAFE", blinkNow: "BLINK NOW", dont: "DON’T LOOK", dontDetail: "両目を閉じて。GO! の音まで待とう。", go: "GO!", goDetail: "目を開けて、出口へ走れ。", safeDetail: "ロッカーの中なら、安全にまばたきできる。", moved: "IT MOVED.", saw: "IT SAW YOU.", safeBlink: "安全なまばたき ✓", pass: "ロッカーのそばを、通り過ぎる…", blinks: "BLINKS", calls: "CLOSE CALLS", time: "TIME", best: "BEST", notBest: "脱出するとベストを記録", silence: "扉が閉まった。逃げきった。", danger: ["自分の足音だけ。", "背後で、遠い足音。", "反射の向こうに、息づかい。", "肩のすぐ後ろで、呼吸。", "DON’T BLINK."], final: "DON’T BLINK.", noMore: "もう隠れ場所はない。あと少し。" },
};
const demoFrame = closed => ({ present: true, ready: true, eyeState: closed ? "EYES_CLOSED" : "EYES_OPEN", events: [] });
const bestKey = source => `camera-game-lab-blink-v2-best-${source}`;
export function createView(root, locale = "ja") { return new BlinkView(root, locale); }
class BlinkView {
  constructor(root, locale) {
    this.root = root; this.locale = locale; this.listeners = new Set(); this.audio = new HorrorAudio(); this.game = new BlinkHorrorGame();
    this.phase = "idle"; this.active = false; this.generation = 0; this.source = "camera"; this.frame = null; this.lastInput = -Infinity; this.pendingEvents = new Set();
    root.innerHTML = `<div class="bh-view"><div class="bh-toolbar"><span class="bh-source"></span><div><button type="button" class="bh-sound"></button><button type="button" class="bh-pause"></button></div></div>
      <div class="bh-stage" role="group"><div class="bh-scene"><img class="bh-corridor" src="${corridor}" alt=""><div class="bh-floor"></div><div class="bh-exit-door"><span>EXIT</span><i></i></div><div class="bh-locker-ahead"><i></i><span>HIDE</span></div><div class="bh-mirror"><img src="${monster}" alt=""></div><img class="bh-shoulder" src="${monster}" alt=""><div class="bh-vignette"></div><div class="bh-grain"></div></div>
      <div class="bh-locker-inside"><div class="bh-slats"></div><span>STAY QUIET</span></div><div class="bh-shutter"></div><img class="bh-jump" src="${monster}" alt="">
      <div class="bh-hud"><span>STAGE 001</span><strong class="bh-progress-value">EXIT 100m</strong><span class="bh-state">RUN</span></div>
      <div class="bh-camera-guide"><video class="bh-video" muted playsinline></video><div class="bh-face-outline"></div><span>FIT YOUR FACE</span></div>
      <div class="bh-message" role="status" aria-live="polite"><strong></strong><span></span></div><div class="bh-safe-pips" aria-hidden="true">○ ○ ○</div><div class="bh-danger"></div>
      <div class="bh-eye-status"></div><div class="bh-warning" role="status"></div><div class="bh-receipt" hidden></div></div>
      <p class="bh-instruction"></p><p class="bh-keyhint"></p><button type="button" class="bh-hide"></button><div class="bh-recovery" hidden><button type="button" class="bh-retry"></button><button type="button" class="bh-demo"></button></div><details class="bh-debug"><summary></summary><pre></pre></details></div>`;
    this.$ = s => root.querySelector(s);
    this.input = new EyeInput(this.$("video"), { onFrame: frame => {
      if (this.active && this.source === "camera") { this.frame = frame; this.lastInput = performance.now(); frame.events.forEach(e => this.pendingEvents.add(e)); }
    }, onStatus: status => { if (status === "ERROR" && this.active) this.fail(); } });
    this.lightCanvas = document.createElement("canvas"); this.lightCanvas.width = this.lightCanvas.height = 16;
    this.lightContext = this.lightCanvas.getContext("2d", { willReadFrequently: true });
    this.render();
  }
  get t() { return messages[this.locale === "ja" ? "ja" : "en"]; }
  subscribe(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  notify() { this.listeners.forEach(fn => fn(this.snapshot())); }
  snapshot() {
    const r = this.game.result;
    const result = r ? { ...r, summaryJa: `${r.source === "demo" ? "練習" : "カメラ"} · ${r.outcome.toUpperCase()} · ${r.seconds.toFixed(1)}秒 · BLINKS ${r.blinks} · CLOSE CALLS ${r.closeCalls}`,
      summaryEn: `${r.source === "demo" ? "Practice" : "Camera"} · ${r.outcome.toUpperCase()} · ${r.seconds.toFixed(1)}s · BLINKS ${r.blinks} · CLOSE CALLS ${r.closeCalls}` } : null;
    return { phase: this.phase, source: this.source, paused: this.game.paused, musicSilent: ["HIDE", "DONT_LOOK"].includes(this.game.stage), result: this.phase === "result" ? result : null };
  }
  setLocale(locale) { this.locale = locale; this.render(); }
  activate() { this.active = true; this.phase = "idle"; this.game = new BlinkHorrorGame(); this.render(); }
  bind() {
    this.abort?.abort(); this.abort = new AbortController(); const signal = this.abort.signal;
    const hold = value => { if (this.source === "demo" && this.phase !== "result") this.held = value; };
    this.$(".bh-hide").addEventListener("pointerdown", e => { e.preventDefault(); this.$(".bh-hide").setPointerCapture(e.pointerId); hold(true); }, { signal });
    for (const name of ["pointerup", "pointercancel", "lostpointercapture"]) this.$(".bh-hide").addEventListener(name, () => hold(false), { signal });
    window.addEventListener("keydown", e => { if (e.code === "Space" && (!e.target.closest("button,a,input,textarea,summary") || e.target === this.$(".bh-hide"))) { e.preventDefault(); hold(true); } }, { signal });
    window.addEventListener("keyup", e => { if (e.code === "Space") { e.preventDefault(); hold(false); } }, { signal });
    window.addEventListener("blur", () => { hold(false); this.game.setPaused(true); this.audio.update(this.game); }, { signal });
    window.addEventListener("focus", () => { this.game.setPaused(false); this.lastTick = performance.now(); }, { signal });
    document.addEventListener("visibilitychange", () => { hold(false); this.game.setPaused(document.hidden); this.audio.update(this.game); this.lastTick = performance.now(); }, { signal });
    this.$(".bh-sound").addEventListener("click", () => { this.audio.setMuted(!this.audio.muted); this.render(); }, { signal });
    this.$(".bh-pause").addEventListener("click", () => { this.game.setPaused(!this.game.manualPause); this.audio.update(this.game); this.render(); this.notify(); }, { signal });
    this.$(".bh-retry").addEventListener("click", () => void this.startCamera(), { signal });
    this.$(".bh-demo").addEventListener("click", () => this.startDemo(), { signal });
  }
  setup(source) {
    this.releaseInputs(); this.active = true; this.source = source; this.phase = "loading"; this.held = false; this.frame = null; this.lastInput = -Infinity;
    this.pendingEvents.clear(); this.finishAt = null; this.epilogue = false; this.epilogueClosed = false; this.lowLight = false;
    this.game = new BlinkHorrorGame(); this.game.start(source); this.bind(); this.audio.start(); this.render(); this.notify(); return this.generation;
  }
  async startCamera() {
    const token = this.setup("camera");
    try { await this.input.start(); if (!this.active || token !== this.generation) return; this.beginLoop(); }
    catch (error) { if (token === this.generation && error.name !== "AbortError") this.fail(); }
  }
  startDemo() { this.setup("demo"); this.beginLoop(); }
  beginLoop() { this.phase = this.game.phase; this.lastTick = performance.now(); this.notify(); this.raf = requestAnimationFrame(this.tick); }
  tick = now => {
    if (!this.active) return;
    const dt = Math.min(80, Math.max(0, now - this.lastTick)); this.lastTick = now;
    const input = this.source === "demo" ? demoFrame(this.held) : now - this.lastInput <= 300 ? { ...this.frame, events: [...this.pendingEvents] } : null;
    this.pendingEvents.clear();
    if (this.phase === "resolving") {
      const elapsed = now - this.finishAt, won = this.game.result.outcome === "escaped";
      if (won && elapsed > 1000 && input?.ready) {
        if (input.eyeState === "EYES_CLOSED") this.epilogueClosed = true;
        if (!this.epilogue && ((this.epilogueClosed && input.eyeState === "EYES_OPEN") || input.events?.includes("BLINK_BOTH"))) { this.epilogue = true; this.epilogueAt = now; this.audio.peek(); }
      }
      this.resolveMs = elapsed; this.peekVisible = this.epilogue && now - this.epilogueAt < 280;
      if (elapsed >= (won ? 2600 : 850)) { this.releaseInputs(); this.phase = "result"; this.render(); this.notify(); return; }
    } else {
      this.game.step(dt, input);
      if (this.game.result) {
        this.phase = "resolving"; this.finishAt = now; this.resolveMs = 0; this.recordBest();
        this.audio.finish(this.game.result.outcome === "escaped"); this.notify();
      } else {
        const changed = this.phase !== this.game.phase; this.phase = this.game.phase;
        this.audio.update(this.game); if (changed) this.notify();
      }
    }
    if (this.source === "camera" && now - (this.lastLight ?? -Infinity) > 800 && this.$("video").readyState >= 2) {
      this.lastLight = now;
      try { this.lightContext.drawImage(this.$("video"), 0, 0, 16, 16); const data = this.lightContext.getImageData(0, 0, 16, 16).data;
        let sum = 0; for (let i = 0; i < data.length; i += 4) sum += (data[i] + data[i + 1] + data[i + 2]) / 3; this.lowLight = sum / 256 < 28;
      } catch { /* Brightness guidance is optional; no image leaves this canvas. */ }
    }
    this.render(); this.raf = requestAnimationFrame(this.tick);
  };
  recordBest() {
    const r = this.game.result;
    try { const stored = Number(localStorage.getItem(bestKey(this.source))); r.best = Number.isFinite(stored) && stored > 0 ? stored : null;
      if (r.outcome === "escaped" && (!r.best || r.seconds < r.best)) { r.best = r.seconds; localStorage.setItem(bestKey(this.source), String(r.best)); }
    } catch { r.best = r.outcome === "escaped" ? r.seconds : null; }
  }
  fail() { this.releaseInputs(); this.phase = "error"; this.bind(); this.render(); this.notify(); }
  releaseInputs() {
    ++this.generation; cancelAnimationFrame(this.raf); this.raf = null; this.abort?.abort(); this.input?.stop(); this.audio.close(); this.held = false; this.pendingEvents?.clear();
  }
  deactivate() { this.active = false; this.releaseInputs(); this.phase = "idle"; }
  render() {
    const t = this.t, g = this.game, r = g.result, playing = this.phase === "playing", resolving = this.phase === "resolving";
    const stage = this.$(".bh-stage"), closed = playing && g.lastEye === "EYES_CLOSED" && !g.paused;
    stage.dataset.stage = g.stage; stage.dataset.monster = g.monster ?? 0;
    stage.classList.toggle("is-closed", closed); stage.classList.toggle("is-result", this.phase === "result");
    stage.classList.toggle("is-hide", playing && ["HIDE", "DONT_LOOK"].includes(g.stage));
    stage.classList.toggle("is-reflection", playing && !g.paused && g.stage === "RUN" && g.monster > 0 && g.elapsedMs < g.reflectionUntil);
    stage.classList.toggle("is-caught", resolving && r.outcome === "caught" && this.resolveMs < 320);
    stage.classList.toggle("is-escaped", resolving && r.outcome === "escaped"); stage.classList.toggle("is-peek", !!this.peekVisible && resolving);
    stage.classList.toggle("is-running", playing && !g.paused && !closed && g.stage === "RUN");
    stage.classList.toggle("has-locker", g.hideAhead); stage.classList.toggle("is-guide", ["calibration", "loading"].includes(this.phase) || (playing && g.paused && !g.manualPause));
    stage.style.setProperty("--danger", g.danger ?? 0); stage.style.setProperty("--zoom", 1 + (g.progress ?? 0) * .55);
    stage.setAttribute("aria-label", `${t.look} · ${t.blink}`);
    this.$(".bh-source").textContent = t[this.source === "demo" ? "demo" : "camera"];
    this.$(".bh-sound").textContent = this.audio.muted ? t.muted : t.sound; this.$(".bh-sound").setAttribute("aria-pressed", String(!this.audio.muted));
    this.$(".bh-pause").textContent = g.manualPause ? t.resume : t.pauseButton;
    this.$(".bh-pause").disabled = !["calibration", "countdown", "playing"].includes(this.phase);
    this.$(".bh-progress-value").textContent = `EXIT ${Math.ceil(g.remaining ?? 100)}m`;
    this.$(".bh-state").textContent = g.stage === "DONT_LOOK" ? "HIDE" : g.stage;
    let main = "", sub = "";
    if (this.phase === "loading") main = t.loading;
    else if (this.phase === "error") main = t.error;
    else if (g.paused && !r) { main = g.manualPause ? t.pause : t.face; sub = g.manualPause ? "" : t.lost; }
    else if (this.phase === "calibration") { main = g.calibrationOpen ? t.close : t.open; sub = t.face; }
    else if (this.phase === "countdown") { main = t.ready; sub = `${t.countdown} ${Math.max(1, Math.ceil((g.rules.countdownMs - g.countdown) / 1000))}`; }
    else if (resolving) { main = r.outcome === "escaped" ? t.escaped : t.final; sub = r.outcome === "escaped" ? t.silence : ""; }
    else if (playing) {
      if (g.stage === "HIDE") { main = t.blinkNow; sub = g.safeBlinks ? t.safeBlink : t.safeDetail; }
      else if (g.stage === "DONT_LOOK") { main = t.dont; sub = t.dontDetail; }
      else if (g.stage === "GO") { main = t.go; sub = t.goDetail; }
      else if (g.elapsedMs < g.cueUntil) { main = g.cue === "IT MOVED." ? t.moved : g.cue === "IT SAW YOU." ? t.saw : g.cue === "GO!" ? t.go : t.look; sub = g.cue === "IT MOVED." ? t.blink : ""; }
      else if (g.hideAhead) { main = "HIDE AHEAD"; sub = t.hide; }
      else if (g.elapsedMs < 2400) { main = t.look; sub = t.blink; }
    }
    for (const [selector, text] of [[".bh-message strong", main], [".bh-message span", sub]]) if (this.$(selector).textContent !== text) this.$(selector).textContent = text;
    this.$(".bh-message").hidden = !main;
    this.$(".bh-safe-pips").hidden = !playing || g.stage !== "HIDE";
    this.$(".bh-safe-pips").textContent = `${t.safe} · ${g.safeBlinks ? "●" : "○"}`;
    this.$(".bh-danger").textContent = g.stage === "DONT_LOOK" ? t.pass : g.hides && g.stage === "RUN" ? t.noMore : t.danger[g.monster ?? 0];
    const eyeState = this.source === "demo" ? (this.held ? "CLOSED" : "OPEN") : this.frame?.ready ? this.frame.eyeState.replace("EYES_", "") : "NO FACE";
    this.$(".bh-eye-status").textContent = `◉ ${eyeState}`;
    this.$(".bh-eye-status").hidden = !!r;
    const position = this.frame?.facePosition, misplaced = position && (position.x < .2 || position.x > .8 || position.y < .1 || position.y > .85);
    this.$(".bh-warning").textContent = !r && this.source === "camera" ? this.lowLight ? t.dark : misplaced ? t.position : "" : "";
    this.$(".bh-camera-guide").hidden = this.source !== "camera";
    this.$(".bh-instruction").textContent = g.stage === "DONT_LOOK" ? t.dontDetail : g.stage === "HIDE" ? t.safeDetail : t.blink;
    this.$(".bh-keyhint").textContent = this.source === "demo" ? t.keys : t.look;
    this.$(".bh-instruction").hidden = !!r; this.$(".bh-keyhint").hidden = !!r; this.$(".bh-debug").hidden = !!r;
    this.$(".bh-hide").textContent = t.hold; this.$(".bh-hide").hidden = this.source !== "demo" || this.phase === "result" || this.phase === "error";
    this.$(".bh-hide").setAttribute("aria-pressed", String(!!this.held));
    this.$(".bh-recovery").hidden = this.phase !== "error"; this.$(".bh-retry").textContent = t.retry; this.$(".bh-demo").textContent = t.tryDemo;
    const receipt = this.$(".bh-receipt"); receipt.hidden = this.phase !== "result";
    if (r && this.phase === "result") receipt.innerHTML = `<small>${t[this.source === "demo" ? "demo" : "camera"]} · STAGE 001</small><h2>${t[r.outcome]}</h2><div class="bh-stats"><p><span>${t.blinks}</span><b>${r.blinks}</b></p><p><span>${t.calls}</span><b>${r.closeCalls}</b></p><p><span>${t.time}</span><b>${r.seconds.toFixed(1)}s</b></p><p><span>${t.best}</span><b>${r.best ? r.best.toFixed(1) + "s" : "—"}</b></p></div>`;
    this.$(".bh-debug summary").textContent = t.debug;
    if (this.$(".bh-debug").open) this.$(".bh-debug pre").textContent = JSON.stringify({ face: this.frame?.present ?? this.source === "demo", eyes: eyeState, left: this.frame?.blinkLeftScore, right: this.frame?.blinkRightScore, monster: g.monsterStage, stage: g.stage, holdMs: g.hold, distance: g.remaining, fps: this.frame?.fps }, null, 2);
  }
}
