import { GripInput } from "../input/gripInput.js";
import { projectGrip } from "../input/gripState.js";
import { PinchWorldGame } from "../games/pinchWorld.js";
import { PinchAudio } from "./audio.js";
import "./pinch.css";

const messages = {
  en: { demo: "DEMO · TOUCH / KEYS", camera: "CAMERA · PALM / FIST", sound: "SOUND", muted: "MUTED", tasks: ["PICK", "CARRY", "PLACE"], instruction: ["Palm over the circle, fist to grab. Open in its socket.", "Carry the square through the gap.", "A little precision. Place the triangle."], reopen: "Open your palm, then make a fresh fist to grab.", held: "Open your palm in the matching socket.", blocked: "Move your hand around the wall, through the gap.", wait: "Show an open hand", countdown: "Ready your hand", pause: "PAUSED", missing: "Bring your whole hand back into the frame 👋", loading: "Preparing camera…", error: "Camera unavailable. Retry or try the demo.", retry: "RETRY CAMERA", tryDemo: "TRY DEMO", keys: "Drag with a finger · or arrows + hold Space", cameraHint: "Palm to move · Fist to grab · Open to drop", clear: "WORLD COMPLETE", clean: "CLEAN RUN", grabs: "grabs", misses: "missed grabs", releases: "early releases", tracking: "tracking drops", resultDemo: "Demo result", resultCamera: "Camera result", debug: "Debug input", board: "Tiny world. Move your palm over a shape, close your fist to grab, then open to place.", gap: "GAP", socket: "DROP HERE" },
  ja: { demo: "デモ · タッチ / キー操作", camera: "カメラ · 手のひら / グー", sound: "音あり", muted: "消音", tasks: ["掴む", "運ぶ", "置く"], instruction: ["丸に手を重ねてグー。くぼみで開こう。", "四角を、壁のすき間から運ぼう。", "最後は三角。そっと置こう。"], reopen: "一度手を開いて、重ねてからグーにしよう。", held: "同じ形のくぼみで、手を開こう。", blocked: "手を壁の下のすき間へ動かそう。", wait: "手のひらを開いて、枠の中へ 👋", countdown: "手を準備して", pause: "一時停止", missing: "手全体を枠の中へ戻してね 👋", loading: "カメラを準備中…", error: "カメラを使えません。再試行かデモを選べます。", retry: "カメラを再試行", tryDemo: "デモで試す", keys: "指でドラッグ · または矢印キー + Space長押し", cameraHint: "手のひらで移動 · グーで掴む · 開いて置く", clear: "クリア", clean: "きれいにできた！", grabs: "回 つかんだ", misses: "回 つかみ損ねた", releases: "回 途中で離した", tracking: "回 追跡切れで解放", resultDemo: "デモの結果", resultCamera: "カメラの結果", debug: "入力デバッグ", board: "小さな世界。手を形に重ね、グーで掴んで、開いて置こう。", gap: "すき間", socket: "ここへ" },
};
const clamp = (n) => Math.max(.02, Math.min(.98, n));
function shapeMarkup(shape) {
  return shape === "circle" ? '<circle r="1"/><circle class="pw-pattern" r=".34"/>'
    : shape === "square" ? '<rect x="-1" y="-1" width="2" height="2" rx=".12"/><path class="pw-pattern" d="M-.3-.3h.6v.6h-.6Z"/>'
      : '<path d="M0-1.15 1 0.9H-1Z"/><path class="pw-pattern" d="M0-.36 .32.3H-.32Z"/>';
}

export function createView(root, locale = "ja") { return new PinchView(root, locale); }
class PinchView {
  constructor(root, locale) {
    this.root = root; this.locale = locale; this.listeners = new Set(); this.generation = 0; this.phase = "idle"; this.source = "camera"; this.active = false;
    this.audio = new PinchAudio(); this.game = this.newGame(); this.game.start(); this.game.phase = "idle";
    this.frame = null; this.lastInput = -Infinity; this.pending = []; this.keys = new Set(); this.cursor = { x: .5, y: .84 }; this.grabbing = false;
    root.innerHTML = `<div class="pw-view"><div class="pw-toolbar"><span class="pw-source"></span><button type="button" class="pw-sound"></button></div><div class="pw-heading"><div class="pw-steps" aria-label="Progress"><span>01</span><i></i><span>02</span><i></i><span>03</span></div><span class="pw-time">0.0s</span></div>
      <div class="pw-stage" tabindex="0" role="group"><video muted playsinline></video><svg class="pw-world" viewBox="0 0 1000 1000" aria-hidden="true"><defs><pattern id="pw-grid" width="50" height="50" patternUnits="userSpaceOnUse"><circle cx="25" cy="25" r="1.8" fill="#394d4640"/></pattern><pattern id="pw-stripe" width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><rect width="4" height="12" fill="#16352c22"/></pattern></defs><rect width="1000" height="1000" fill="url(#pw-grid)"/>
      <g class="pw-barriers"></g><g class="pw-socket"></g><text class="pw-socket-label" text-anchor="middle"></text><text class="pw-gap" x="500" y="865" text-anchor="middle"></text><g class="pw-object-shadow"></g><g class="pw-object"></g><circle class="pw-grab-radius" fill="none" stroke="#19382c" stroke-dasharray="10 10" stroke-width="3"/><circle class="pw-snap" fill="none" stroke="#247a63" stroke-width="6"/>
      <g class="pw-hand-cursor"><circle class="pw-palm-ring" r="52" fill="#fff3daaa" stroke="#183a31" stroke-width="5"/><text class="pw-palm-icon" text-anchor="middle" y="18">✋</text></g></svg><div class="pw-message" role="status" aria-live="polite"></div><div class="pw-receipt" hidden></div></div>
      <div class="pw-caption"><span class="pw-task-number">01</span><div><h2 class="pw-task"></h2><p class="pw-instruction"></p></div></div><p class="pw-hint"></p><div class="pw-recovery" hidden><button type="button" class="pw-retry"></button><button type="button" class="pw-demo"></button></div><details class="pw-debug"><summary></summary><pre></pre></details></div>`;
    this.$ = (s) => root.querySelector(s);
    // Diagnostic only: ?debug=1&gesture=AB. Gameplay always uses legacy GripState.
    this.gestureABEnabled = new URLSearchParams(window.location.search).get("debug") === "1"
      && new URLSearchParams(window.location.search).get("gesture") === "AB";
    this.input = new GripInput(this.$("video"), { compareGestures: this.gestureABEnabled, onFrame: (frame) => {
      if (!this.active || this.source !== "camera") return;
      this.frame = frame; this.pending.push(...frame.events.filter((event) => event !== "GRIP_MOVE")); this.lastInput = performance.now();
    }, onStatus: (status) => { if (status === "ERROR" && this.active) this.fail(); } });
    this.render();
  }
  newGame() { return new PinchWorldGame({ onEffect: (type) => {
    this.audio?.play(type, this.game?.completed === 3);
    if (type === "place") this.effect = { at: performance.now(), ...this.game.socket };
  } }); }
  get t() { return messages[this.locale === "ja" ? "ja" : "en"]; }
  subscribe(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  notify() { this.listeners.forEach((fn) => fn(this.snapshot())); }
  snapshot() {
    const r = this.game.result;
    return { phase: this.phase, source: this.source, result: this.phase === "result" && r ? { ...r,
      summaryJa: `${r.source === "demo" ? "デモ" : "カメラ"} · クリア · ${r.seconds.toFixed(1)}秒 · ${r.successfulGrabs}回 つかんだ`,
      summaryEn: `${r.source === "demo" ? "Demo" : "Camera"} · CLEAR · ${r.seconds.toFixed(1)}s · ${r.successfulGrabs} grabs` } : null };
  }
  setLocale(locale) { this.locale = locale; this.render(); }
  activate() { this.active = true; this.phase = "idle"; this.render(); }
  setGrip(value) {
    if (value === this.grabbing) return;
    this.grabbing = value; this.pending.push(value ? "GRIP_START" : "GRIP_END");
  }
  bind() {
    this.abort?.abort(); this.abort = new AbortController(); const signal = this.abort.signal, stage = this.$(".pw-stage");
    const position = (e) => { const bounds = stage.getBoundingClientRect(); this.cursor = { x: clamp((e.clientX - bounds.left) / bounds.width), y: clamp((e.clientY - bounds.top) / bounds.height) }; };
    stage.addEventListener("pointerdown", (e) => {
      if (this.source !== "demo" || this.pointerId != null || e.button > 0) return;
      e.preventDefault(); stage.focus({ preventScroll: true }); this.pointerId = e.pointerId; stage.setPointerCapture(e.pointerId); position(e); this.setGrip(true);
    }, { signal });
    stage.addEventListener("pointermove", (e) => { if (this.source === "demo" && (this.pointerId === e.pointerId || (this.pointerId == null && e.pointerType === "mouse"))) position(e); }, { signal });
    for (const name of ["pointerup", "pointercancel", "lostpointercapture"]) stage.addEventListener(name, (e) => { if (e.pointerId === this.pointerId) { this.pointerId = null; this.setGrip(false); } }, { signal });
    window.addEventListener("keydown", (e) => {
      if (this.source !== "demo" || !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Space"].includes(e.code) || e.target.closest("button,a,input,textarea,summary")) return;
      e.preventDefault(); this.keys.add(e.code); if (e.code === "Space") this.setGrip(true);
    }, { signal });
    window.addEventListener("keyup", (e) => { if (this.source === "demo" && this.keys.has(e.code)) { e.preventDefault(); this.keys.delete(e.code); if (e.code === "Space") this.setGrip(false); } }, { signal });
    const pause = (value) => {
      if (this.pointerId != null && stage.hasPointerCapture(this.pointerId)) stage.releasePointerCapture(this.pointerId);
      this.pointerId = null;
      this.keys.clear(); this.setGrip(false); this.pending.length = 0;
      // A release during a paused render loop must be delivered on recovery.
      if (!value && (this.source === "demo" || (this.frame?.present && !this.frame.grabbing))) this.pending.push("GRIP_END");
      this.game.setPaused(value); this.lastTick = performance.now();
    };
    window.addEventListener("blur", () => pause(true), { signal }); window.addEventListener("focus", () => pause(false), { signal });
    document.addEventListener("visibilitychange", () => pause(document.hidden), { signal });
    this.$(".pw-sound").addEventListener("click", () => { this.audio.muted = !this.audio.muted; this.render(); }, { signal });
    this.$(".pw-retry").addEventListener("click", () => void this.startCamera(), { signal }); this.$(".pw-demo").addEventListener("click", () => this.startDemo(), { signal });
  }
  setup(source) {
    this.releaseInputs(); this.active = true; this.source = source; this.phase = "loading"; this.game = this.newGame(); this.game.start(source);
    this.frame = null; this.displayInput = null; this.lastInput = -Infinity; this.pending = []; this.keys.clear(); this.cursor = { x: .5, y: .84 }; this.grabbing = false; this.effect = null;
    this.bind(); this.audio.start(); this.render(); this.notify(); return this.generation;
  }
  async startCamera() {
    const token = this.setup("camera");
    try { await this.input.start(); if (!this.active || token !== this.generation) return; this.beginLoop(); }
    catch (error) { if (token === this.generation && error.name !== "AbortError") this.fail(); }
  }
  startDemo() { this.setup("demo"); this.beginLoop(); this.$(".pw-stage").focus({ preventScroll: true }); }
  beginLoop() { this.phase = this.game.phase; this.lastTick = performance.now(); this.notify(); this.raf = requestAnimationFrame(this.tick); }
  sample(now, dt) {
    const events = this.pending.splice(0);
    if (this.source === "camera") {
      if (now - this.lastInput > 300 || !this.frame) return { present: false, events: [] };
      const video = this.$("video"), bounds = this.$(".pw-stage").getBoundingClientRect();
      return projectGrip({ ...this.frame, events }, video.videoWidth, video.videoHeight, bounds.width, bounds.height);
    }
    const speed = dt / 1000 * .55;
    this.cursor.x = clamp(this.cursor.x + (Number(this.keys.has("ArrowRight")) - Number(this.keys.has("ArrowLeft"))) * speed);
    this.cursor.y = clamp(this.cursor.y + (Number(this.keys.has("ArrowDown")) - Number(this.keys.has("ArrowUp"))) * speed);
    return { present: true, grabbing: this.grabbing, open: !this.grabbing, gripPosition: { ...this.cursor }, events };
  }
  tick = (now) => {
    if (!this.active) return;
    const dt = Math.min(80, Math.max(0, now - this.lastTick)); this.lastTick = now;
    this.displayInput = this.sample(now, dt); this.game.step(dt, this.displayInput);
    if (this.game.phase === "result") {
      this.phase = "resolving"; this.input.stop(); this.render(now);
      this.finishTimer = setTimeout(() => { this.releaseInputs(); this.phase = "result"; this.render(); this.notify(); }, 360); return;
    }
    const changed = this.phase !== this.game.phase; this.phase = this.game.phase; this.render(now); if (changed) this.notify();
    this.raf = requestAnimationFrame(this.tick);
  };
  fail() { this.releaseInputs(); this.phase = "error"; this.bind(); this.render(); this.notify(); }
  releaseInputs() {
    ++this.generation; cancelAnimationFrame(this.raf); this.raf = null; clearTimeout(this.finishTimer); this.finishTimer = null;
    this.abort?.abort(); this.input?.stop(); this.audio.close(); this.pending.length = 0; this.keys.clear(); this.grabbing = false; this.pointerId = null;
  }
  deactivate() { this.active = false; this.releaseInputs(); this.phase = "idle"; }
  render(now = performance.now()) {
    const t = this.t, g = this.game, r = g.result, input = this.displayInput, stage = this.$(".pw-stage");
    stage.classList.toggle("is-demo", this.source === "demo"); stage.classList.toggle("is-result", !!r); stage.setAttribute("aria-label", t.board);
    this.$(".pw-source").textContent = t[this.source === "demo" ? "demo" : "camera"];
    this.$(".pw-sound").textContent = t[this.audio.muted ? "muted" : "sound"]; this.$(".pw-sound").disabled = this.phase === "result"; this.$(".pw-sound").setAttribute("aria-pressed", String(!this.audio.muted));
    this.$(".pw-time").textContent = `${(g.elapsedMs / 1000).toFixed(1)}s`;
    this.$(".pw-steps").setAttribute("aria-label", `${g.completed} / 3`);
    this.root.querySelectorAll(".pw-steps span").forEach((el, i) => { el.classList.toggle("is-current", g.stageIndex === i); el.classList.toggle("is-done", g.completed > i); });
    this.$(".pw-task-number").textContent = `0${g.stageIndex + 1}`; this.$(".pw-task").textContent = t.tasks[g.stageIndex];
    this.$(".pw-instruction").textContent = g.blocked ? t.blocked : g.heldObjectId ? t.held : this.source === "camera" && g.phase === "playing" && !g.neutral ? t.reopen : t.instruction[g.stageIndex];
    this.$(".pw-hint").textContent = t[this.source === "demo" ? "keys" : "cameraHint"];
    this.$(".pw-caption").hidden = !!r; this.$(".pw-hint").hidden = !!r; this.$(".pw-debug").hidden = !!r;
    const { object, socket } = g;
    if (this.drawnStage !== g.stageIndex) {
      this.drawnStage = g.stageIndex;
      this.$(".pw-object").innerHTML = shapeMarkup(object.shape); this.$(".pw-object-shadow").innerHTML = shapeMarkup(object.shape);
      this.$(".pw-socket").innerHTML = shapeMarkup(socket.shape);
      this.$(".pw-barriers").innerHTML = g.barriers.map((b) => `<rect x="${b.x * 1000 + 8}" y="${b.y * 1000 + 12}" width="${b.width * 1000}" height="${b.height * 1000}" rx="8" fill="#183a3130"/><rect x="${b.x * 1000}" y="${b.y * 1000}" width="${b.width * 1000}" height="${b.height * 1000}" rx="8" fill="#405950"/><rect x="${b.x * 1000 + 14}" y="${b.y * 1000}" width="${b.width * 1000 - 28}" height="${b.height * 1000 - 18}" fill="url(#pw-stripe)"/>`).join("");
    }
    const positionShape = (selector, item, offset = 0) => this.$(selector).setAttribute("transform", `translate(${item.x * 1000 + offset} ${item.y * 1000 + offset}) scale(${item.radius * 1000})`);
    positionShape(".pw-object", object); positionShape(".pw-object-shadow", object, g.heldObjectId ? 14 : 7); positionShape(".pw-socket", socket);
    this.$(".pw-object").classList.toggle("is-held", !!g.heldObjectId);
    const eligible = input?.present && input.open && Math.hypot(input.gripPosition.x - object.x, input.gripPosition.y - object.y) < object.radius * 1.4;
    this.$(".pw-object").classList.toggle("is-eligible", !!eligible);
    this.$(".pw-socket-label").setAttribute("x", socket.x * 1000); this.$(".pw-socket-label").setAttribute("y", (socket.y + socket.radius + .065) * 1000); this.$(".pw-socket-label").textContent = t.socket;
    this.$(".pw-gap").textContent = g.barriers.length ? `↔ ${t.gap}` : "";
    const message = this.phase === "error" ? t.error : this.phase === "loading" ? t.loading : r ? "" : g.paused ? t[g.manualPause ? "pause" : "missing"] : g.phase === "wait" ? t.wait : g.phase === "countdown" ? t.countdown : "";
    if (this.$(".pw-message").textContent !== message) this.$(".pw-message").textContent = message;
    const cursor = this.$(".pw-hand-cursor"); cursor.style.display = input?.present && !r ? "" : "none";
    if (input?.present) {
      cursor.setAttribute("transform", `translate(${input.gripPosition.x * 1000} ${input.gripPosition.y * 1000})`);
      cursor.classList.toggle("is-grabbing", !!input.grabbing);
      this.$(".pw-palm-icon").textContent = input.grabbing ? "✊" : "✋";
    }
    const debug = this.$(".pw-debug").open;
    const grab = this.$(".pw-grab-radius"); grab.style.display = debug ? "" : "none"; grab.setAttribute("cx", object.x * 1000); grab.setAttribute("cy", object.y * 1000); grab.setAttribute("r", object.radius * 1400);
    const age = this.effect ? (now - this.effect.at) / 400 : 2, snap = this.$(".pw-snap"); snap.style.opacity = age < 1 ? 1 - age : 0;
    if (age < 1) { snap.setAttribute("cx", this.effect.x * 1000); snap.setAttribute("cy", this.effect.y * 1000); snap.setAttribute("r", (this.effect.radius + age * .08) * 1000); }
    this.$(".pw-recovery").hidden = this.phase !== "error"; this.$(".pw-retry").textContent = t.retry; this.$(".pw-demo").textContent = t.tryDemo;
    const receipt = this.$(".pw-receipt"); receipt.hidden = !r;
    if (r) receipt.innerHTML = `<small>${t[this.source === "demo" ? "resultDemo" : "resultCamera"]}</small><h2>${t.clear}</h2><strong>${r.seconds.toFixed(1)}s</strong>${r.clean ? `<p class="pw-clean">✦ ${t.clean}</p>` : ""}<p>${r.successfulGrabs} ${t.grabs} · ${r.failedGrabs} ${t.misses}</p><p>${r.accidentalReleases} ${t.releases} · ${r.trackingDrops} ${t.tracking}</p>`;
    this.$(".pw-debug summary").textContent = t.debug;
    if (debug) {
      // Advance B freshness without creating or reusing old detection events.
      if (this.gestureABEnabled && this.source === "camera" && this.input.comparison) {
        this.input.lastComparison = this.input.comparison.advance(now);
      }
      this.$(".pw-debug pre").textContent = JSON.stringify({
        present: input?.present, grabbing: input?.grabbing, open: input?.open,
        palm: input?.gripPosition, held: g.heldObjectId, fps: this.frame?.fps,
        ...(this.gestureABEnabled ? { gestureAB: this.input.lastComparison, note: "A controls game. B observation only." } : {}),
      }, null, 2);
    }
  }
}
