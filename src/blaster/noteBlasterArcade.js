import "./blaster.css";
import { VoiceInput } from "../input/voiceInput.js";
import { MouthPositionInput } from "../input/mouthPositionInput.js";
import { projectMouth } from "../input/mouthPosition.js";
import { NOTE_STEPS } from "../input/pitchAnalysis.js";
import { NoteBlasterGame, BLASTER_RULES } from "../games/noteBlaster.js";
import { blasterText } from "./messages.js";
import { drawBlaster, NOTE_COLORS, CAMERA_TILE } from "./draw.js";

export class NoteBlasterArcade {
  constructor(root, locale) {
    this.root = root;
    this.locale = locale;
    this.active = false;
    this.phase = "idle";
    this.source = "voice";
    this.generation = 0;
    this.signal = { voiced: false, note: null };
    this.demoLane = null;
    this.manualPause = false;
    this.sound = false;
    this.best = this.readBest();
    this.root.innerHTML = `
      <div class="nb-intro"><div><span class="nb-kicker">VOICE SHOOTER / EXP-019</span><h2><span data-nb-copy="title"></span><br><em data-nb-copy="subtitle"></em></h2></div><p data-nb-copy="intro"></p></div>
      <div class="nb-game">
        <div class="nb-scorebar"><div><span data-nb-copy="score"></span><strong class="nb-score">00000</strong></div><div><span data-nb-copy="combo"></span><strong class="nb-combo">0</strong></div><div class="nb-best-stat"><span data-nb-copy="best"></span><strong class="nb-best">0</strong></div><div class="nb-clock-stat"><span data-nb-copy="time"></span><strong class="nb-clock">30<span>s</span></strong></div></div>
        <div class="nb-stage">
          <div class="nb-stage-top"><span class="nb-mode" data-nb-copy="mode"></span><span class="nb-life" role="img"></span></div>
          <div class="nb-camera-tile"><video class="nb-camera" autoplay muted playsinline></video><svg class="nb-avatar" viewBox="0 0 100 100" aria-hidden="true"><path d="M20 100v-9c0-16 60-16 60 0v9" fill="#30473d"/><rect x="20" y="12" width="60" height="62" rx="26" fill="#8da89c"/><path d="M32 36h7m22 0h7" stroke="#12251b" stroke-width="5"/><ellipse cx="50" cy="57" rx="8" ry="6" fill="#12251b"/></svg><span class="nb-camera-caption">YOU</span></div>
          <canvas class="nb-canvas" role="img"></canvas>
          <div class="nb-overlay"><span class="nb-overlay-tag">01 / FIND YOUR DO</span><h3 class="nb-overlay-title"></h3><p class="nb-overlay-detail"></p><div class="nb-calibration" hidden><i></i></div></div>
          <div class="nb-result" hidden><span data-nb-copy="result"></span><h3 class="nb-result-title"></h3><strong class="nb-result-score"></strong><div class="nb-result-stats"></div></div>
          <div class="nb-stage-bottom"><span class="nb-source"></span><span class="nb-feedback"></span><span class="nb-level"></span></div>
        </div>
        <div class="nb-pitch"><div><span data-nb-copy="pitch"></span><strong class="nb-current">—</strong><span class="nb-frequency"></span></div><div class="nb-tuning" aria-hidden="true"><span>−</span><div><i></i></div><span>+</span></div><span class="nb-pitch-hint"></span></div>
        <div class="nb-notes" role="group">${NOTE_COLORS.map((color, index) => `<button type="button" data-nb-note="${index}" style="--note-color:${color}"><span class="nb-note-key">${index + 1}</span><strong></strong><span class="nb-note-symbol" aria-hidden="true">♪</span></button>`).join("")}</div>
      </div>
      <p class="nb-message" role="status"></p>
      <div class="nb-actions"><button class="nb-button nb-button--primary nb-enable" type="button" data-nb-copy="camera"></button><button class="nb-button nb-start" type="button" hidden></button><button class="nb-button nb-pause" type="button" hidden></button><button class="nb-button nb-end" type="button" data-nb-copy="stop" hidden></button><button class="nb-button nb-demo" type="button" data-nb-copy="demo"></button></div>
      <div class="nb-options"><button class="nb-link nb-recalibrate" type="button" data-nb-copy="recalibrate" hidden></button><button class="nb-link nb-disconnect" type="button" data-nb-copy="disconnect" hidden></button><button class="nb-link nb-sound" type="button" aria-pressed="false"></button><span class="nb-reference"></span></div>
      <p class="nb-privacy" data-nb-copy="privacy"></p>
      <details class="nb-howto" open><summary data-nb-copy="howto"></summary><div class="nb-howto-grid">${[1, 2, 3].map((n) => `<div><span>0${n}</span><strong data-nb-copy="step${n}"></strong><p data-nb-copy="step${n}detail"></p></div>`).join("")}</div><p class="nb-progression" data-nb-copy="hint"></p></details>
    `;
    this.$ = (selector) => root.querySelector(selector);
    this.video = this.$("video");
    this.canvas = this.$("canvas");
    this.ctx = this.canvas.getContext("2d");
    this.reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    this.game = new NoteBlasterGame({ onFeedback: (event) => {
      if (this.sound && event.type === "hit") this.playTone(event.lane, 0.07);
    } });
    this.voice = new VoiceInput({ onSample: (sample) => { this.signal = sample; }, onError: () => this.deviceError() });
    this.face = new MouthPositionInput(this.video, { onStatus: (status) => {
      this.status = status;
      if (status === "ERROR") this.deviceError();
      else if (this.active) this.render();
    } });
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(this.canvas);
    this.$(".nb-enable").addEventListener("click", () => this.enable());
    this.$(".nb-demo").addEventListener("click", () => this.useDemo());
    this.$(".nb-start").addEventListener("click", () => this.beginRound());
    this.$(".nb-recalibrate").addEventListener("click", () => this.calibrate());
    this.$(".nb-disconnect").addEventListener("click", () => this.disconnect());
    this.$(".nb-pause").addEventListener("click", async () => {
      const resuming = this.manualPause || this.source === "voice" && this.voice.context?.state !== "running";
      if (resuming) await this.voice.resume();
      this.manualPause = !resuming;
      this.demoLane = null; this.lastTimestamp = null; this.render();
    });
    this.$(".nb-end").addEventListener("click", () => { this.game.finish("STOPPED"); this.finishRound(); });
    this.$(".nb-sound").addEventListener("click", () => {
      this.sound = !this.sound;
      if (this.sound) this.ensureAudio();
      this.render();
    });
    for (const button of root.querySelectorAll("[data-nb-note]")) {
      const lane = Number(button.dataset.nbNote);
      button.addEventListener("pointerdown", (event) => {
        if (!this.active || button.disabled) return;
        if (this.source === "demo") {
          button.setPointerCapture(event.pointerId);
          this.demoLane = lane;
        }
      });
      const release = () => { if (this.demoLane === lane) this.demoLane = null; };
      button.addEventListener("pointerup", release);
      button.addEventListener("pointercancel", release);
      button.addEventListener("lostpointercapture", release);
      button.addEventListener("keydown", (event) => {
        if (this.source !== "demo" || !["Enter", " "].includes(event.key)) return;
        event.preventDefault(); this.demoLane = lane;
      });
      button.addEventListener("keyup", (event) => {
        if (this.source !== "demo" || !["Enter", " "].includes(event.key)) return;
        event.preventDefault(); release();
      });
      button.addEventListener("click", () => { if (this.source === "voice") this.playTone(lane, 0.35); });
    }
    window.addEventListener("keydown", (event) => this.handleKey(event, true));
    window.addEventListener("keyup", (event) => this.handleKey(event, false));
    window.addEventListener("blur", () => this.suspend());
    document.addEventListener("visibilitychange", () => { if (document.hidden) this.suspend(); });
    window.addEventListener("pagehide", () => this.deactivate());
    this.setLocale(locale);
  }
  t(key) { return blasterText(this.locale, key); }
  readBest() {
    try { return Math.max(0, Number(localStorage.getItem("camera-game-lab-note-blaster-best-voice")) || 0); } catch { return 0; }
  }
  setLocale(locale) {
    this.locale = locale;
    for (const node of this.root.querySelectorAll("[data-nb-copy]")) node.textContent = this.t(node.dataset.nbCopy);
    this.canvas.setAttribute("aria-label", this.t("canvasLabel"));
    this.video.setAttribute("aria-label", this.t("cameraLabel"));
    this.$(".nb-notes").setAttribute("aria-label", this.t("notes"));
    this.render();
  }
  activate() {
    this.active = true; this.root.hidden = false; this.lastTimestamp = null;
    this.resize(); this.render();
    this.frameId = requestAnimationFrame(this.loop);
  }
  deactivate() {
    this.active = false; ++this.generation;
    if (this.frameId) cancelAnimationFrame(this.frameId);
    this.frameId = null;
    this.voice.stop(); this.face.stop();
    this.game.reset();
    this.demoLane = null; this.phase = "idle"; this.manualPause = false;
    this.source = "voice";
    this.signal = { voiced: false, note: null };
    if (this.audio && this.audio.state !== "closed") void this.audio.close();
    this.audio = null; this.errorKey = null;
    this.root.hidden = true;
  }
  disconnect() {
    ++this.generation;
    this.voice.stop(); this.face.stop(); this.game.reset();
    this.phase = "idle"; this.demoLane = null; this.signal = { voiced: false, note: null };
    this.errorKey = null; this.manualPause = false; this.render();
  }
  async enable() {
    this.disconnect();
    this.source = "voice"; this.phase = "connecting"; this.errorKey = null;
    const generation = this.generation;
    this.render();
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      this.phase = "idle"; this.errorKey = "unsupported"; this.render(); return;
    }
    try {
      // Acquire both in parallel; VoiceInput unlocks AudioContext in this gesture.
      // A failed input cancels its partner and releases any later permission result.
      await Promise.all([this.voice.start(), this.face.start()]);
      if (!this.active || generation !== this.generation) return;
      this.calibrate();
    } catch (error) {
      if (generation !== this.generation) return;
      this.disconnect();
      this.errorKey = "error";
      this.render();
    }
  }
  deviceError() {
    if (!this.active || this.phase === "idle") return;
    this.disconnect(); this.errorKey = "deviceLost"; this.render();
  }
  calibrate() {
    if (!this.voice.running) return;
    this.phase = "calibrating"; this.game.reset(); this.manualPause = false;
    this.voice.calibrate(); this.signal = { voiced: false, note: null }; this.render();
  }
  useDemo() {
    this.disconnect(); this.source = "demo"; this.phase = "ready";
    this.game.reset(); this.render();
  }
  async beginRound() {
    if (!["ready", "result"].includes(this.phase) || !this.active) return;
    if (this.source === "voice" && (!this.voice.tracker.reference || !this.voice.running || !this.face.running)) return;
    await this.voice.resume();
    if (!this.active || !["ready", "result"].includes(this.phase)) return;
    this.ensureAudio();
    this.game.reset(); this.demoLane = null; this.manualPause = false;
    this.countdown = 3000; this.phase = "countdown"; this.lastTimestamp = null;
    this.render();
  }
  suspend() {
    this.demoLane = null; this.lastTimestamp = null;
    if (["playing", "countdown"].includes(this.phase)) this.manualPause = true;
    this.voice.tracker.clearSignal(); this.signal = { voiced: false, note: null };
    this.render();
  }
  handleKey(event, down) {
    if (!this.active || this.source !== "demo" || !["ready", "playing", "countdown"].includes(this.phase) ||
        event.ctrlKey || event.metaKey || event.altKey || /INPUT|TEXTAREA|SELECT/.test(event.target?.tagName)) return;
    const lane = Number(event.key) - 1;
    if (!/^[1-5]$/.test(event.key)) return;
    event.preventDefault();
    if (down) this.demoLane = lane;
    else if (this.demoLane === lane) this.demoLane = null;
  }
  getMouth(timestamp) {
    const tile = CAMERA_TILE;
    if (this.source === "demo") return { x: tile.x + tile.width * 0.5, y: tile.y + tile.height * 0.57 };
    const point = this.face.position;
    if (!point || timestamp - point.timestamp > 300) return null;
    const local = projectMouth(point, this.video.videoWidth, this.video.videoHeight, this.width * tile.width, this.height * tile.height);
    return local ? { x: tile.x + local.x * tile.width, y: tile.y + local.y * tile.height } : null;
  }
  getSignal(timestamp) {
    if (this.source === "demo") return this.demoLane === null ? { voiced: false, note: null } :
      { voiced: true, note: { lane: this.demoLane, grade: "PERFECT", cents: 0 } };
    if (timestamp < (this.toneMuteUntil ?? 0) || timestamp - (this.signal.timestamp ?? 0) > 180) return { voiced: false, note: null };
    return this.signal;
  }
  loop = (timestamp) => {
    if (!this.active) return;
    const delta = this.lastTimestamp === null ? 0 : Math.min(100, timestamp - this.lastTimestamp);
    this.lastTimestamp = timestamp;
    const mouth = this.getMouth(timestamp);
    const signal = this.getSignal(timestamp);
    this.audioInterrupted = this.source === "voice" && this.voice.running && this.voice.context?.state !== "running";
    this.inputLost = this.source === "voice" && (!mouth || this.audioInterrupted);
    if (this.phase === "calibrating" && this.voice.tracker.reference) { this.phase = "ready"; this.render(); }
    const paused = this.manualPause || this.inputLost || document.hidden;
    if (this.phase === "countdown" && !paused) {
      this.countdown -= delta;
      if (this.countdown <= 0) { this.game.start(); this.phase = "playing"; this.render(); }
    }
    if (this.phase === "playing" && !paused) {
      this.game.step(delta, { voiced: signal.voiced, note: signal.note, mouth });
      if (!this.game.running) this.finishRound();
    }
    if (timestamp - (this.lastRender ?? 0) > 80) { this.render(timestamp, signal); this.lastRender = timestamp; }
    drawBlaster(this.ctx, this.width, this.height, { game: this.game, mouth, signal,
      preview: ["idle", "connecting", "calibrating", "ready"].includes(this.phase), names: this.t("noteNames"), timestamp,
      reducedMotion: this.reducedMotion.matches });
    this.frameId = requestAnimationFrame(this.loop);
  };
  finishRound() {
    this.phase = "result"; this.manualPause = false; this.demoLane = null;
    if (this.source === "voice" && this.game.result.reason !== "STOPPED" && this.game.score > this.best) {
      this.best = this.game.score;
      try { localStorage.setItem("camera-game-lab-note-blaster-best-voice", String(this.best)); } catch { /* Session score still works. */ }
    }
    this.render();
  }
  resize() {
    const rect = this.canvas.getBoundingClientRect();
    this.width = rect.width || 1000; this.height = rect.height || 560;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(this.width * dpr); this.canvas.height = Math.round(this.height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  ensureAudio() {
    const Context = window.AudioContext || window.webkitAudioContext;
    if (!Context) return;
    this.audio ??= new Context();
    if (this.audio.state === "suspended") void this.audio.resume().catch(() => {});
  }
  playTone(lane, duration) {
    this.ensureAudio();
    if (!this.audio || (this.source === "voice" && !this.voice.tracker.reference)) return;
    const oscillator = this.audio.createOscillator(); const gain = this.audio.createGain();
    const at = this.audio.currentTime;
    oscillator.frequency.value = (this.voice.tracker.reference || 220) * 2 ** (NOTE_STEPS[lane] / 12);
    gain.gain.setValueAtTime(0, at); gain.gain.linearRampToValueAtTime(0.06, at + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, at + duration);
    oscillator.connect(gain); gain.connect(this.audio.destination);
    oscillator.start(at); oscillator.stop(at + duration + 0.03);
    oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
    this.toneMuteUntil = performance.now() + (duration + 0.12) * 1000;
  }
  render(timestamp = performance.now(), signal = this.getSignal(timestamp)) {
    const round = ["playing", "countdown"].includes(this.phase);
    const connected = this.source === "voice" && this.voice.running;
    const canStart = ["ready", "result"].includes(this.phase);
    this.$(".nb-score").textContent = String(this.game.score).padStart(5, "0");
    this.$(".nb-combo").textContent = String(this.game.combo);
    this.$(".nb-best").textContent = String(this.best);
    this.$(".nb-best-stat").hidden = this.source === "demo";
    this.$(".nb-clock").textContent = `${Math.ceil((BLASTER_RULES.duration - this.game.elapsed) / 1000)}s`;
    this.$(".nb-life").textContent = "♥".repeat(this.game.hp) + "♡".repeat(3 - this.game.hp);
    this.$(".nb-life").setAttribute("aria-label", `${this.t("hp")}: ${this.game.hp} / 3`);
    this.$(".nb-source").textContent = this.t(this.source === "voice" ? "voiceMode" : "demoMode");
    this.$(".nb-level").textContent = `${this.t("level")} ${this.game.level}`;
    const feedback = this.game.feedback;
    this.$(".nb-feedback").textContent = this.game.fever ? this.t("fever") : feedback?.until > this.game.elapsed && round ? feedback.grade : "";
    this.$(".nb-feedback").dataset.grade = feedback?.grade ?? "";
    this.root.classList.toggle("nb--fever", this.game.fever);
    this.$(".nb-avatar").hidden = connected;
    this.video.hidden = !connected;
    const overlay = this.$(".nb-overlay");
    const blocked = round && (this.manualPause || this.inputLost);
    overlay.hidden = this.phase === "result" || (this.phase === "playing" && !blocked);
    let title = this.phase === "idle" ? "idle" : this.phase === "calibrating" ? "calibrate" : this.phase === "connecting" ? "loading" : "ready";
    let detail = `${title}Detail`;
    if (this.source === "demo" && this.phase === "ready") { title = "demoReady"; detail = "demoReadyDetail"; }
    if (blocked) { title = this.manualPause ? "paused" : this.audioInterrupted ? "audioPaused" : "noFace"; detail = this.manualPause || this.audioInterrupted ? "pauseDetail" : "count"; }
    else if (this.phase === "countdown") { title = null; detail = "countdown"; }
    this.$(".nb-overlay-title").textContent = title ? this.t(title) : String(Math.max(1, Math.ceil(this.countdown / 1000)));
    this.$(".nb-overlay-detail").textContent = ["idle", "calibrating", "ready", "countdown"].includes(this.phase) || blocked ? this.t(detail) : this.t("permission");
    this.$(".nb-overlay-tag").textContent = this.phase === "calibrating" ? "01 / FIND YOUR DO" : this.phase === "ready" ? "02 / SING TO SHOOT" : "SING. AIM. BLAST.";
    this.$(".nb-calibration").hidden = this.phase !== "calibrating";
    this.$(".nb-calibration i").style.transform = `scaleX(${this.voice.tracker.progress})`;
    this.$(".nb-enable").hidden = connected || round || this.source === "demo" && this.phase === "connecting";
    this.$(".nb-enable").disabled = this.phase === "connecting";
    this.$(".nb-enable").classList.toggle("nb-button--primary", !canStart);
    this.$(".nb-enable").textContent = this.t(this.phase === "connecting" ? "loading" : "camera");
    this.$(".nb-demo").hidden = this.source === "demo" || round;
    this.$(".nb-start").hidden = !canStart;
    this.$(".nb-start").textContent = this.t(this.phase === "result" ? "again" : "start");
    this.$(".nb-start").classList.toggle("nb-button--primary", connected || this.source === "demo");
    this.$(".nb-pause").hidden = !round;
    this.$(".nb-pause").textContent = this.t(this.manualPause || this.audioInterrupted ? "resume" : "pause");
    this.$(".nb-end").hidden = !round;
    this.$(".nb-recalibrate").hidden = !connected || round;
    this.$(".nb-disconnect").hidden = !connected && this.phase !== "connecting";
    this.$(".nb-sound").textContent = this.t(this.sound ? "soundOn" : "soundOff");
    this.$(".nb-sound").setAttribute("aria-pressed", String(this.sound));
    this.$(".nb-reference").textContent = connected && this.voice.tracker.reference ? `${this.t("base")} ${Math.round(this.voice.tracker.reference)} Hz` : "";
    this.$(".nb-message").textContent = this.errorKey ? this.t(this.errorKey) : this.source === "demo" ? this.t("demoNotice") : round && this.inputLost ? this.t(this.audioInterrupted ? "audioPaused" : "noFace") : "";
    this.$(".nb-message").classList.toggle("nb-message--error", Boolean(this.errorKey));
    const valid = signal.voiced && signal.note;
    this.$(".nb-current").textContent = valid ? this.t("noteNames")[signal.note.lane] : "—";
    this.$(".nb-current").style.color = valid ? NOTE_COLORS[signal.note.lane] : "";
    this.$(".nb-frequency").textContent = signal.frequency ? `${Math.round(signal.frequency)} Hz` : "";
    this.$(".nb-pitch-hint").textContent = valid ? signal.note.grade === "MISS" ? this.t("offPitch") : signal.note.grade : this.t("silence");
    this.$(".nb-tuning i").style.left = `${50 + Math.max(-1, Math.min(1, (signal.note?.cents || 0) / 100)) * 45}%`;
    for (const button of this.root.querySelectorAll("[data-nb-note]")) {
      const lane = Number(button.dataset.nbNote);
      button.querySelector("strong").textContent = this.t("noteNames")[lane];
      button.querySelector(".nb-note-key").textContent = this.source === "demo" ? String(lane + 1) : this.t("listen");
      button.setAttribute("aria-label", this.source === "demo" ? this.t("noteNames")[lane] + this.t("playNote") : `${this.t("listen")} ${this.t("noteNames")[lane]}`);
      button.setAttribute("aria-pressed", String(Boolean(valid && signal.note.lane === lane && signal.note.grade !== "MISS")));
      button.disabled = this.source === "voice" && !this.voice.tracker.reference;
    }
    this.$(".nb-result").hidden = this.phase !== "result";
    if (this.phase === "result") {
      const result = this.game.result;
      this.$(".nb-result-title").textContent = this.t(result.reason === "TIME" ? "finish" : result.reason === "STOPPED" ? "stopped" : "gameOver");
      this.$(".nb-result-score").textContent = String(result.score).padStart(5, "0");
      const stats = [["accuracy", `${result.accuracy}%`], ["perfect", `${result.perfectRate}%`], ["maxCombo", result.maxCombo]];
      const signature = `${this.locale}:${JSON.stringify(stats)}`;
      if (this.resultSignature !== signature) {
        this.$(".nb-result-stats").innerHTML = stats.map(([label, value]) => `<div><span>${this.t(label)}</span><strong>${value}</strong></div>`).join("");
        this.resultSignature = signature;
      }
    }
  }
}
