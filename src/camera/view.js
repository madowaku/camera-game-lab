import { CameraIsItGame } from "../games/cameraIsIt.js";
import { CameraOrientation } from "../input/cameraOrientation.js";
import { VIEW, stages } from "./stages.js";
import { drawWorld } from "./renderer.js";
import "./camera.css";

const messages = {
  ja: { demo: "DEMO / 視野をドラッグ", camera: "CAMERA / スマホを向ける", background: "実写背景", on: "ON", off: "OFF", pause: "一時停止", resume: "再開", center: "向きを合わせ直す", loading: "カメラと姿勢センサーを準備中…", ready: "LOOK TO CREATE THE WORLD", readyDetail: "進むのは彼。道をつくるのは、あなた。", next: "NEXT STAGE →", stageClear: "WORLD CREATED", clear: "見ることで 世界は変わる", retry: "世界を見失った。", ahead: "進みたい方向を映そう。", both: "彼の足元も、次の足場も。", up: "ジャンプ台。その先は、上。", frame: "上と下。両方をひとつのフレームへ。", choose: "今、必要な世界はどこ？", edge: "足元が消えかけている", lost: "彼をフレームへ戻そう", focusAim: "点線の足場を画面中央へ。", focusHold: "そのまま見続けて、リングを満たそう。", focusWait: "足場を中央に映して、見続けよう", memoryStart: "まず手前の足場を映そう。", memoryLook: "先の着地点を映そう。手前は2.5秒だけ残る。", memoryWait: "先の着地点を映そう", fall: "足場が消えて、落下した。", time: "時間切れ。もう一度、世界をつくろう。", keys: "ドラッグで視野を動かす / 矢印キーでも操作", sensorHint: "小さく左右・上下に向けよう。", secure: "カメラとセンサーにはHTTPS接続が必要です。", sensor: "姿勢データを取得できません。スマホで再試行するか、デモを選んでください。", permission: "姿勢センサーが許可されていません。設定を確認するか、デモを選んでください。", error: "カメラを使えません。許可を確認するか、デモを選んでください。", tryAgain: "カメラを再試行", tryDemo: "デモで試す", paused: "いったん、止まろう。", sensorLost: "姿勢データが途切れました。端末を構えて再開してください。", board: "映した足場だけが存在する世界。視野を動かして自動で歩くキャラクターを出口へ。", stages: "ステージ", plain: "単色", live: "実写", resultDemo: "デモ", resultCamera: "カメラ", cleared: "クリア", failed: "RETRY", stageRetry: "このステージをやり直す" },
  en: { demo: "DEMO / DRAG THE VIEW", camera: "CAMERA / POINT YOUR PHONE", background: "LIVE BACKGROUND", on: "ON", off: "OFF", pause: "Pause", resume: "Resume", center: "Recenter", loading: "Preparing camera & orientation…", ready: "LOOK TO CREATE THE WORLD", readyDetail: "He walks. You make the way.", next: "NEXT STAGE →", stageClear: "WORLD CREATED", clear: "YOU CONTROL THE WORLD BY LOOKING", retry: "The world slipped away.", ahead: "Look in the direction you want to go.", both: "Keep his feet and the next platform in view.", up: "A springboard. Look up for the landing.", frame: "Above and below. Keep both in one frame.", choose: "Which world does he need right now?", edge: "The ground is fading", lost: "Bring him back into frame", focusAim: "Center the outlined platform.", focusHold: "Hold the view until the ring fills.", focusWait: "Center and hold the outlined platform", memoryStart: "Frame the near platform first.", memoryLook: "Frame the far landing. The near platform lasts 2.5s.", memoryWait: "Frame the far landing", fall: "The ground disappeared. He fell.", time: "Time is up. Create the world again.", keys: "Drag to move your view / or use the arrow keys", sensorHint: "Small turns left, right, up and down.", secure: "Camera and orientation need an HTTPS connection.", sensor: "No orientation data. Retry on a phone or try the demo.", permission: "Orientation permission was denied. Check settings or try the demo.", error: "Camera unavailable. Check permission or try the demo.", tryAgain: "RETRY CAMERA", tryDemo: "TRY DEMO", paused: "Take a moment.", sensorLost: "Orientation data stopped. Hold your phone and resume.", board: "Only the platforms you frame exist. Move the view to guide the automatic walker to the exit.", stages: "Stages", plain: "Plain", live: "Live", resultDemo: "Demo", resultCamera: "Camera", cleared: "CLEAR", failed: "RETRY", stageRetry: "Retry this stage" },
};

export function createView(root, locale) { return new CameraView(root, locale); }
class CameraView {
  constructor(root, locale = "ja") {
    this.root = root; this.locale = locale; this.listeners = new Set(); this.game = new CameraIsItGame(); this.phase = "idle"; this.source = "demo"; this.generation = 0; this.keys = new Set(); this.background = false;
    root.innerHTML = `<div class="ci-view"><div class="ci-topline"><span class="ci-source"></span><span>EXP–043</span></div><div class="ci-heading"><div><span class="ci-stage-number">STAGE 001 / 010</span><h2 class="ci-title"></h2></div><span class="ci-time">0.0s</span></div><div class="ci-stage" tabindex="0" role="group"><video muted playsinline></video><canvas width="800" height="1000" aria-hidden="true"></canvas><div class="ci-frame-label" aria-hidden="true">EXISTENCE FIELD</div><div class="ci-warning" role="status"></div><div class="ci-overlay"><p class="ci-overlay-kicker"></p><h3></h3><p class="ci-overlay-detail"></p><div class="ci-overlay-actions"><button type="button" class="ci-next"></button><button type="button" class="ci-resume"></button><button type="button" class="ci-retry"></button><button type="button" class="ci-demo"></button></div></div></div><div class="ci-progress"></div><p class="ci-instruction"></p><div class="ci-controls"><button type="button" class="ci-background" aria-pressed="false"></button><button type="button" class="ci-center"></button><button type="button" class="ci-pause"></button></div><p class="ci-hint"></p><div class="ci-receipt" hidden></div></div>`;
    this.$ = (s) => root.querySelector(s); this.input = new CameraOrientation(this.$("video"), (look) => {
      if (!this.active || this.source !== "camera" || this.game.paused || this.phase === "stage-clear") return;
      this.game.setCamera({ x: this.baseCamera.x + look.yaw * 80, y: this.baseCamera.y - look.pitch * 32 });
    });
    this.input.onError = () => { if (this.active && this.source === "camera") this.fail("camera"); };
    if (import.meta.env.DEV && new URLSearchParams(location.search).get('debug') === '1') {
      this.debug = document.createElement('pre'); this.debug.className = 'ci-debug'; root.querySelector('.ci-view').append(this.debug);
    }
    this.reducedMotion = matchMedia("(prefers-reduced-motion: reduce)"); this.render();
  }
  get t() { return messages[this.locale === "ja" ? "ja" : "en"]; }
  subscribe(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  notify() { this.listeners.forEach((fn) => fn(this.snapshot())); }
  snapshot() {
    const r = this.game.result;
    return { phase: this.phase, source: this.source, result: this.phase === "result" && r ? { ...r, scored: false,
      titleJa: r.clear ? "CLEAR" : "RETRY", titleEn: r.clear ? "CLEAR" : "RETRY",
      summaryJa: `${r.source === "demo" ? "デモ" : "カメラ"} · ${r.clear ? "クリア" : "RETRY"} · ${r.completed}/${stages.length}ステージ · ${r.seconds.toFixed(1)}秒`,
      summaryEn: `${r.source === "demo" ? "Demo" : "Camera"} · ${r.clear ? "CLEAR" : "RETRY"} · ${r.completed}/${stages.length} stages · ${r.seconds.toFixed(1)}s` } : null };
  }
  setLocale(locale) { this.locale = locale; this.render(); }
  activate() { this.active = true; this.phase = "idle"; this.render(); }
  bind() {
    this.abort?.abort(); this.abort = new AbortController(); const signal = this.abort.signal, stage = this.$(".ci-stage");
    stage.addEventListener("pointerdown", (e) => {
      if (this.source !== "demo" || !["ready", "playing"].includes(this.phase) || e.button > 0 || e.target.closest("button")) return;
      e.preventDefault(); stage.focus({ preventScroll: true }); stage.setPointerCapture(e.pointerId);
      this.drag = { id: e.pointerId, x: e.clientX, y: e.clientY, camera: { ...this.game.targetCamera } };
    }, { signal });
    stage.addEventListener("pointermove", (e) => {
      if (!this.drag || e.pointerId !== this.drag.id) return;
      const scale = VIEW.width / stage.getBoundingClientRect().width;
      this.game.setCamera({ x: this.drag.camera.x + (e.clientX - this.drag.x) * scale * 1.9, y: this.drag.camera.y + (e.clientY - this.drag.y) * scale * 1.9 });
    }, { signal });
    for (const name of ["pointerup", "pointercancel", "lostpointercapture"]) stage.addEventListener(name, () => { this.drag = null; }, { signal });
    window.addEventListener("keydown", (e) => {
      if (this.source !== "demo" || !["ready", "playing"].includes(this.phase) || !e.code.startsWith("Arrow") || e.target.closest("button,a,input,textarea,summary")) return;
      e.preventDefault(); this.keys.add(e.code);
    }, { signal });
    window.addEventListener("keyup", (e) => { this.keys.delete(e.code); }, { signal });
    const pause = () => { if (["playing", "ready"].includes(this.phase)) this.pause(); };
    window.addEventListener("blur", pause, { signal }); document.addEventListener("visibilitychange", () => { if (document.hidden) pause(); }, { signal });
    this.$(".ci-background").addEventListener("click", () => { this.background = !this.background; this.game.background = this.background; this.render(); }, { signal });
    this.$(".ci-center").addEventListener("click", () => this.recenter(), { signal });
    this.$(".ci-pause").addEventListener("click", () => this.pause(), { signal });
    this.$(".ci-resume").addEventListener("click", () => {
      if (this.source === "camera" && performance.now() - this.input.lastFrame > 1500) return;
      this.game.paused = false; this.phase = this.game.phase; this.pauseReason = null; this.recenter(); this.render(); this.notify();
    }, { signal });
    this.$(".ci-next").addEventListener("click", () => { this.game.nextStage(); this.recenter(); this.phase = this.game.phase; this.render(); this.notify(); stage.focus({ preventScroll: true }); }, { signal });
    this.$(".ci-retry").addEventListener("click", () => void this.startCamera(), { signal });
    this.$(".ci-demo").addEventListener("click", () => this.startDemo(), { signal });
  }
  recenter() { this.baseCamera = { ...this.game.targetCamera }; this.input.recenter(); }
  pause(reason = null) { this.keys.clear(); this.drag = null; this.game.paused = true; this.pauseReason = reason; this.phase = "paused"; this.render(); this.notify(); }
  setup(source) {
    const Audio = window.AudioContext ?? window.webkitAudioContext;
    if (Audio) { this.audio ??= new Audio(); void this.audio.resume().catch(() => {}); }
    const previous = this.game.result;
    this.releaseInputs(); this.active = true; this.source = source; this.phase = "loading"; this.error = null; this.pauseReason = null;
    this.background = source === "camera"; this.game.start(source, this.background);
    if (previous && !previous.clear) {
      this.game.completed = previous.completed; this.game.receipts = [...previous.receipts];
      this.game.elapsed = previous.receipts.reduce((sum, row) => sum + row.seconds * 1000, 0); this.game.loadStage(previous.stage - 1);
    }
    this.game.paused = false; this.baseCamera = { ...this.game.camera };
    this.bind(); this.render(); this.notify(); return this.generation;
  }
  async startCamera() {
    const token = this.setup("camera");
    try { await this.input.start(); if (token !== this.generation || !this.active) return; this.begin(); }
    catch (error) { if (token !== this.generation || error.name === "AbortError") return; this.fail(error.message); }
  }
  fail(reason) { this.error = reason; this.releaseInputs(); this.phase = "error"; this.bind(); this.render(); this.notify(); }
  startDemo() { this.setup("demo"); this.begin(); this.$(".ci-stage").focus({ preventScroll: true }); }
  chime() {
    if (!this.audio || this.audio.state !== 'running') return;
    const tone = this.audio.createOscillator(), gain = this.audio.createGain(), at = this.audio.currentTime;
    tone.frequency.setValueAtTime(720, at); tone.frequency.exponentialRampToValueAtTime(1080, at + .06);
    gain.gain.setValueAtTime(.035, at); gain.gain.exponentialRampToValueAtTime(.001, at + .1);
    tone.connect(gain); gain.connect(this.audio.destination); tone.start(at); tone.stop(at + .1);
  }
  begin() { this.phase = "ready"; this.lastTick = performance.now(); this.render(); this.notify(); this.raf = requestAnimationFrame(this.tick); }
  tick = (now) => {
    if (!this.active) return;
    const dt = Math.min(64, Math.max(0, now - this.lastTick)); this.lastTick = now;
    if (["ready", "playing"].includes(this.phase) && this.source === "camera" && now - this.input.lastFrame > 1500) this.pause("sensorLost");
    if (this.source === "demo" && !this.game.paused) {
      const x = Number(this.keys.has("ArrowRight")) - Number(this.keys.has("ArrowLeft")), y = Number(this.keys.has("ArrowDown")) - Number(this.keys.has("ArrowUp"));
      if (x || y) this.game.setCamera({ x: this.game.targetCamera.x + x * dt * .65, y: this.game.targetCamera.y + y * dt * .65 });
    }
    this.fps = dt ? Math.round(1000 / dt) : 0;
    this.game.step(dt);
    if (this.lastActivation !== this.game.activationCount) { if (this.game.activationCount > 0) this.chime(); this.lastActivation = this.game.activationCount; }
    if (this.game.phase === "result") {
      this.phase = "result"; this.render(now); this.saveReceipt(); this.releaseInputs(); this.notify(); return;
    }
    const oldPhase = this.phase; if (!this.game.paused) this.phase = this.game.phase;
    this.render(now); if (oldPhase !== this.phase) this.notify(); this.raf = requestAnimationFrame(this.tick);
  };
  saveReceipt() {
    try {
      const key = "camera-game-lab-camera-is-it-rounds", rows = JSON.parse(localStorage.getItem(key) ?? "[]");
      localStorage.setItem(key, JSON.stringify([...(Array.isArray(rows) ? rows : []), { ...this.game.result, at: new Date().toISOString() }].slice(-50)));
    } catch { /* Play remains available if local storage is blocked. */ }
  }
  releaseInputs() { ++this.generation; cancelAnimationFrame(this.raf); this.raf = null; this.abort?.abort(); this.input?.stop(); this.keys.clear(); this.drag = null; }
  deactivate() { if (this.audio) void this.audio.close(); this.audio = null; this.active = false; this.releaseInputs(); this.phase = "idle"; }
  render(now = performance.now()) {
    const t = this.t, g = this.game, r = g.result, stage = this.$(".ci-stage");
    stage.setAttribute("aria-label", t.board); stage.classList.toggle("has-feed", this.background && this.source === "camera" && this.phase !== "result");
    this.$(".ci-source").textContent = t[this.source === "demo" ? "demo" : "camera"];
    this.$(".ci-stage-number").textContent = `STAGE ${String(g.index + 1).padStart(3, "0")} / ${String(stages.length).padStart(3, "0")}`; this.$(".ci-title").textContent = g.stage.title;
    this.$(".ci-time").textContent = `${(g.stageElapsed / 1000).toFixed(1)}s`;
    this.$(".ci-progress").innerHTML = Array.from({ length: stages.length }, (_, i) => `<span class="${i < g.completed ? "is-complete" : i === g.index ? "is-current" : ""}">${String(i + 1).padStart(2, "0")}</span>`).join("");
    this.$(".ci-progress").setAttribute("aria-label", `${t.stages}: ${g.completed}/${stages.length}`);
    const tutorial = g.index === 5 && !g.platforms[1].active
      ? t[g.platforms[1].ruleState.focusMs > 0 ? 'focusHold' : 'focusAim']
      : g.index === 6
        ? t[g.runner.support === 0 ? 'memoryStart' : 'memoryLook']
        : '';
    this.$(".ci-instruction").textContent = g.index < 5 ? t[g.stage.hint] : tutorial;
    this.$(".ci-hint").textContent = t[this.source === "demo" ? "keys" : "sensorHint"];
    const lesson = { focus: ["見つづけろ", "KEEP LOOKING"], memory: ["少しだけ残る", "IT REMEMBERS"], stare: ["見すぎるな", "DON'T STARE"], linked: ["ふたつ見ろ", "SEE BOTH"] };
    this.$(".ci-warning").textContent = this.phase === 'failing' ? (['lost', 'time'].includes(g.failure) ? t[g.failure] : (this.locale === 'ja' ? (g.failure === 'overexpose' ? '見すぎて消えた' : '足場がまだ存在しない') : (g.failure === 'overexpose' ? 'OVEREXPOSED' : 'NO GROUND'))) : this.phase === 'playing' && g.stageElapsed < 800 && lesson[g.stage.hint] ? lesson[g.stage.hint][this.locale === 'ja' ? 0 : 1] : this.phase === "playing" && g.warning ? t[g.warning] : "";
    if (this.debug) {
      this.debug.textContent = `FPS ${this.fps ?? 0} · ${this.phase} · camera ${g.camera.x.toFixed(0)},${g.camera.y.toFixed(0)}\n` + g.platforms.map(p => `${p.objectId} ${p.rule ?? 'VISIBLE'} visible=${p.rule ? p.ruleState.visible : p.opacity > 0} focusMs=${p.ruleState.focusMs.toFixed(0)} memoryMs=${p.ruleState.memoryMs.toFixed(0)} overexposeMs=${p.ruleState.overexposeMs.toFixed(0)} group=${p.linkedGroup ?? '-'} solid=${p.active}`).join('\n') + '\n' + g.anchors.map(a => `${a.id} LINKED visible=${a.visible} group=${a.linkedGroup}`).join('\n');
    }
    const background = this.$(".ci-background"); background.textContent = `${t.background} ${t[this.background ? "on" : "off"]}`; background.setAttribute("aria-pressed", String(this.background));
    background.disabled = this.source !== "camera" || !["ready", "playing", "paused", "stage-clear"].includes(this.phase);
    this.$(".ci-center").textContent = t.center; this.$(".ci-pause").textContent = t.pause;
    this.$(".ci-center").disabled = this.source !== "camera" || !["ready", "playing", "paused"].includes(this.phase); this.$(".ci-pause").disabled = !["ready", "playing"].includes(this.phase);
    const overlay = this.$(".ci-overlay"); overlay.hidden = !["loading", "ready", "stage-clear", "paused", "error", "result"].includes(this.phase);
    this.$(".ci-overlay-kicker").textContent = this.phase === "stage-clear" ? t.stageClear : this.phase === "result" ? (r.clear ? "ALL WORLDS EXIST" : `STAGE ${g.index + 1}`) : "THE CAMERA IS IT";
    this.$(".ci-overlay h3").textContent = this.phase === "ready" ? t.ready : this.phase === "loading" ? t.loading : this.phase === "stage-clear" ? "CLEAR" : this.phase === "paused" ? t.paused : this.phase === "error" ? t[this.error] ?? t.error : this.phase === "result" ? t[r.clear ? "clear" : "retry"] : "";
    this.$(".ci-overlay-detail").textContent = this.phase === "ready" ? t.readyDetail : this.phase === "paused" && this.pauseReason ? t[this.pauseReason] : this.phase === "result" && g.failure ? t[g.failure] : "";
    this.$(".ci-next").hidden = this.phase !== "stage-clear"; this.$(".ci-next").textContent = t.next;
    this.$(".ci-resume").hidden = this.phase !== "paused"; this.$(".ci-resume").textContent = t.resume;
    this.$(".ci-retry").hidden = this.phase !== "error"; this.$(".ci-retry").textContent = t.tryAgain;
    this.$(".ci-demo").hidden = this.phase !== "error"; this.$(".ci-demo").textContent = t.tryDemo;
    this.$(".ci-receipt").hidden = this.phase !== "result"; this.$(".ci-receipt").textContent = r ? `${t[this.source === "demo" ? "resultDemo" : "resultCamera"]} · ${r.completed}/${stages.length} · ${r.seconds.toFixed(1)}s` : "";
    drawWorld(this.$("canvas"), g, now, this.reducedMotion.matches);
  }
}
