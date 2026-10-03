import "./duo.css";
import { DuoFaceInput } from "../input/duoFaceInput.js";
import { DuoEmulator } from "../input/duoEmulator.js";
import { DUO_CONFIG } from "../input/duoConfig.js";
import { TinyBotDuel, TINY_BOT_RULES } from "../games/tinyBotDuel.js";
import { DuoAudio } from "./audio.js";
import { recordDuoRound, createDuoPlaytestReport } from "./telemetry.js";
import { translateDuo } from "./messages.js";

export class DuoArcade {
  constructor(root, locale = "ja", { onExit = () => {} } = {}) {
    this.root = root;
    this.locale = locale;
    this.active = false;
    this.botArt = new Image(); this.botArt.src = "/artwork/sprites/bot-sprites-v1.webp";
    this.botArt.onload = () => this.draw();
    this.source = "camera";
    this.status = "OFF";
    this.phase = "idle";
    this.manualPause = false;
    this.lastTimestamp = null;
    this.frameId = null;
    this.countdownMs = 3000;
    this.lastCount = null;
    this.rematch = 0;
    this.result = null;
    this.metricsBaseline = null;
    this.lowestInferenceFps = null;
    this.root.innerHTML = `
      <div class="duo-catalog" aria-label="DUO ARCADE">
        <div class="duo-catalog__current"><span>EXP-020</span><strong>TINY BOT DUEL</strong><p data-copy="tinyBotLead"></p></div>
        ${["faceRacer", "zombieDuo", "skyDuel"].map((name, i) => `<div class="duo-catalog__soon"><span>EXP-0${21 + i}</span><strong data-copy="${name}"></strong><p data-copy="${name}Lead"></p><small data-copy="gate"></small></div>`).join("")}
      </div>
      <p class="duo-rotate" data-copy="rotate"></p>
      <div class="duo-stage">
        <video class="duo-camera" autoplay muted playsinline></video>
        <div class="duo-shade"></div>
        <canvas class="duo-canvas" width="1000" height="400" role="img"></canvas>
        <div class="duo-hud"><span class="duo-source"></span><strong class="duo-clock"></strong></div>
        <div class="duo-player duo-player--1"><strong data-copy="left"></strong><span class="duo-player__state"></span><span class="duo-lean" aria-hidden="true"><i></i></span></div>
        <div class="duo-player duo-player--2"><strong data-copy="right"></strong><span class="duo-player__state"></span><span class="duo-lean" aria-hidden="true"><i></i></span></div>
        <div class="duo-overlay" hidden><p class="duo-overlay__label"></p><strong class="duo-overlay__title"></strong><p class="duo-overlay__detail"></p></div>
        <div class="duo-box duo-box--1" hidden></div><div class="duo-box duo-box--2" hidden></div>
        <pre class="duo-debug" hidden></pre>
      </div>
      <div class="duo-controls" hidden>
        ${[1, 2].map((id) => `<div class="duo-pad" data-player="${id}" role="group"><strong>P${id}</strong><button type="button" data-action="left">◀</button><button type="button" data-action="right">▶</button><button class="duo-pad__fire" type="button" data-action="fire">●</button></div>`).join("")}
      </div>
      <p class="duo-privacy" data-copy="privacy"></p>
      <div class="duo-actions">
        <button class="button button--primary duo-camera-button" type="button"></button>
        <button class="button duo-fallback-button" type="button" data-copy="fallback"></button>
        <button class="button duo-start-button" type="button" data-copy="start" disabled></button>
        <button class="button duo-pause-button" type="button" hidden></button>
        <button class="button duo-recalibrate-button" type="button" data-copy="recalibrate" hidden></button>
        <button class="button duo-exit-button" type="button" data-copy="exit" hidden></button>
      </div>
      <p class="duo-message" role="status"></p>
      <p class="duo-keyboard" data-copy="keyboard" hidden></p>
      <details class="duo-metrics" hidden><summary data-copy="metrics"></summary><p class="duo-metrics__value"></p><p class="duo-playtest-stats"></p><p data-copy="localOnly"></p><button class="button duo-export-button" type="button" data-copy="exportRecords"></button></details>
      ${import.meta.env.DEV ? '<label class="duo-debug-toggle"><input type="checkbox"> <span data-copy="debug"></span></label>' : ""}
    `;
    this.$ = (selector) => root.querySelector(selector);
    this.video = this.$("video");
    this.canvas = this.$("canvas");
    this.ctx = this.canvas.getContext("2d");
    this.input = new DuoFaceInput(this.video, { onStatus: (status) => {
      this.status = status;
      if (status === "ERROR") {
        // The shared lifecycle has already released/reset the tracker. Keep
        // the last round counters so an error cannot erase or invert metrics.
        this.failedMetrics = this.metricsBaseline ? this.roundMetrics() : null;
        this.error = true;
        this.cameraErrorKey = "error";
      }
      this.render();
    } });
    this.emulator = new DuoEmulator();
    this.audio = new DuoAudio();
    this.game = new TinyBotDuel({ onFeedback: (type) => this.audio.play(type) });
    this.snapshot = this.input.sample(performance.now());
    this.$(".duo-camera-button").addEventListener("click", () => this.startCamera());
    this.$(".duo-fallback-button").addEventListener("click", () => this.useFallback());
    this.$(".duo-start-button").addEventListener("click", () => this.beginRound());
    this.$(".duo-pause-button").addEventListener("click", () => {
      this.manualPause = !this.manualPause;
      this.emulator.clear();
      this.lastTimestamp = null;
      this.render();
    });
    this.$(".duo-recalibrate-button").addEventListener("click", () => this.recalibrate());
    this.$(".duo-exit-button").addEventListener("click", onExit);
    this.$(".duo-export-button").addEventListener("click", () => this.exportRecords());
    this.$(".duo-debug-toggle input")?.addEventListener("change", () => this.render());
    this.onKeyDown = (event) => this.handleKey(event, true);
    this.onKeyUp = (event) => this.handleKey(event, false);
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    window.addEventListener("blur", () => this.suspend());
    document.addEventListener("visibilitychange", () => { if (document.hidden) this.suspend(); });
    window.addEventListener("pagehide", () => this.deactivate());
    for (const pad of root.querySelectorAll(".duo-pad")) {
      for (const button of pad.querySelectorAll("button")) {
        button.addEventListener("pointerdown", (event) => {
          if (!this.active || this.source !== "fallback") return;
          event.preventDefault();
          button.setPointerCapture(event.pointerId);
          button.classList.add("is-held");
          this.emulator.pointer(event.pointerId, Number(pad.dataset.player), button.dataset.action, true);
        });
        const release = (event) => {
          button.classList.remove("is-held");
          this.emulator.pointer(event.pointerId, Number(pad.dataset.player), button.dataset.action, false);
        };
        button.addEventListener("pointerup", release);
        button.addEventListener("pointercancel", release);
        button.addEventListener("lostpointercapture", release);
      }
    }
    this.resizeObserver = new ResizeObserver(() => this.draw());
    this.resizeObserver.observe(this.canvas);
    this.render();
  }

  t(key, values) { return translateDuo(this.locale, key, values); }
  setLocale(locale) { this.locale = locale; this.render(); this.draw(); }
  activate() {
    if (this.active) return;
    this.active = true;
    this.root.hidden = false;
    this.lastTimestamp = null;
    this.render();
    this.frameId = requestAnimationFrame(this.tick);
  }
  deactivate() {
    if (!this.active) return;
    this.abortRound("MODE_CHANGE");
    this.active = false;
    if (this.frameId !== null) cancelAnimationFrame(this.frameId);
    this.frameId = null;
    this.input.stop();
    this.emulator.clear();
    this.game.reset();
    this.phase = "idle";
    this.status = "OFF";
    this.error = false;
    this.manualPause = false;
    this.root.hidden = true;
    this.root.closest(".lab")?.classList.remove("lab--duo-playing");
  }
  suspend() {
    this.emulator.clear();
    this.root.querySelectorAll(".is-held").forEach((button) => button.classList.remove("is-held"));
    if (this.active && ["playing", "countdown"].includes(this.phase)) this.manualPause = true;
    this.lastTimestamp = null;
  }
  handleKey(event, down) {
    if (!this.active || this.source !== "fallback") return;
    if (event.target?.matches("input, textarea, select")) return;
    // Let focused UI buttons keep their normal Space/Enter activation.
    if (event.target?.matches("button") && ["Space", "Enter"].includes(event.code)) return;
    if (this.emulator.key(event.code, down)) event.preventDefault();
  }

  async startCamera() {
    if (["LOADING_MODEL", "REQUESTING_CAMERA"].includes(this.status)) return;
    this.abortRound("INPUT_CHANGE");
    this.source = "camera";
    this.error = false;
    this.cameraErrorKey = "error";
    this.failedMetrics = null;
    this.phase = "calibrating";
    this.manualPause = false;
    this.emulator.clear();
    this.game.reset();
    this.input.recalibrate();
    this.audio.unlock();
    try {
      await this.input.start();
    } catch (error) {
      if (error.name === "AbortError" || !this.active || this.source !== "camera") return;
      this.status = "ERROR";
      this.error = true;
      this.cameraErrorKey = error.name === "FrontCameraUnavailableError" ? "frontCameraUnavailable" : "error";
      this.input.stop();
    }
    this.render();
  }
  useFallback() {
    this.abortRound("INPUT_CHANGE");
    this.input.stop();
    this.source = "fallback";
    this.status = "OFF";
    this.error = false;
    this.phase = "idle";
    this.manualPause = false;
    this.emulator.clear();
    this.game.reset();
    this.snapshot = this.emulator.sample();
    this.audio.unlock();
    this.$(".duo-start-button").blur();
    this.render();
  }
  recalibrate() {
    this.abortRound("RECALIBRATE");
    this.game.reset();
    this.manualPause = false;
    this.input.recalibrate();
    this.emulator.clear();
    this.phase = this.source === "camera" ? "calibrating" : "idle";
    this.render();
  }
  beginRound() {
    if (["playing", "countdown"].includes(this.phase) || !this.snapshot.ready || this.snapshot.players.some((p) => !p.present)) return;
    if (this.result) this.rematch += 1;
    this.result = null;
    this.failedMetrics = null;
    this.game.reset();
    this.emulator.clear();
    this.input.tracker.consumeEvents();
    this.metricsBaseline = this.snapshot.metrics;
    this.lowestInferenceFps = null;
    this.countdownMs = 3000;
    this.lastCount = null;
    this.manualPause = false;
    this.phase = "countdown";
    this.lastTimestamp = null;
    this.audio.unlock();
    this.$(".duo-start-button").blur();
    this.render();
  }
  get unavailable() {
    return this.source === "camera" && (this.status !== "READY" || !this.snapshot.ready || this.snapshot.players.some((p) => !p.present));
  }
  get paused() { return ["playing", "countdown"].includes(this.phase) && (this.manualPause || this.unavailable); }

  tick = (timestamp) => {
    if (!this.active) return;
    const delta = this.lastTimestamp === null ? 0 : Math.min(100, timestamp - this.lastTimestamp);
    this.lastTimestamp = timestamp;
    this.snapshot = this.source === "fallback" ? this.emulator.sample() : this.input.sample(timestamp);
    if (this.source === "camera" && ["countdown", "playing"].includes(this.phase) &&
      Number.isFinite(this.snapshot.metrics.currentInferenceFps)) {
      this.lowestInferenceFps = Math.min(this.lowestInferenceFps ?? Infinity, this.snapshot.metrics.currentInferenceFps);
    }
    if (!this.paused) {
      if (this.phase === "countdown") {
        this.countdownMs -= delta;
        const count = Math.ceil(this.countdownMs / 1000);
        if (count !== this.lastCount && count > 0) { this.audio.play("countdown"); this.lastCount = count; }
        if (this.countdownMs <= 0) { this.phase = "playing"; this.game.start(); }
      } else if (this.phase === "playing") {
        this.game.step(delta, this.snapshot);
        if (this.game.result) this.finishRound();
      }
    }
    if (!this.lastUiAt || timestamp - this.lastUiAt >= 100) {
      this.render();
      this.lastUiAt = timestamp;
    }
    this.draw();
    this.frameId = requestAnimationFrame(this.tick);
  };

  roundMetrics() {
    if (this.error && this.failedMetrics) return { ...this.failedMetrics };
    const metrics = this.snapshot.metrics, baseline = this.metricsBaseline ?? metrics;
    const inferenceMs = (metrics.inferenceTimestamp ?? 0) - (baseline.inferenceTimestamp ?? 0);
    const fps = inferenceMs > 0 ? (metrics.inferenceFrames - baseline.inferenceFrames) * 1000 / inferenceMs : 0;
    return {
      playerLossCount: Math.max(0, metrics.playerLossCount - baseline.playerLossCount),
      successfulRecoveryCount: Math.max(0, (metrics.successfulRecoveryCount ?? 0) - (baseline.successfulRecoveryCount ?? 0)),
      identitySwapSuspicionCount: Math.max(0, metrics.identitySwapSuspicionCount - baseline.identitySwapSuspicionCount),
      inputEvents: metrics.inputEvents.map((value, index) => Math.max(0, value - baseline.inputEvents[index])),
      averageInferenceFps: Number(fps.toFixed(1)), lowestInferenceFps: this.lowestInferenceFps,
      source: this.source, rematch: this.rematch
    };
  }
  finishRound() {
    this.result = recordDuoRound({ experiment: "EXP-020", ...this.game.result, ...this.roundMetrics() });
    this.phase = "result";
    this.metricsBaseline = null;
  }
  abortRound(reason) {
    if (this.phase !== "playing") return;
    recordDuoRound({ experiment: "EXP-020", reason, roundCompletion: false,
      durationMs: this.game.elapsedMs, ...this.roundMetrics() });
    this.metricsBaseline = null;
  }

  exportRecords() {
    const report = createDuoPlaytestReport(this.result);
    const url = URL.createObjectURL(new Blob([JSON.stringify(report, null, 2)], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `tiny-bot-duel-playtest-${report.exportedAt.replace(/[:.]/g, "-")}.json`;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  render() {
    for (const element of this.root.querySelectorAll("[data-copy]")) element.textContent = this.t(element.dataset.copy);
    this.canvas.setAttribute("aria-label", this.t("arena"));
    const fallback = this.source === "fallback";
    const loading = ["LOADING_MODEL", "REQUESTING_CAMERA"].includes(this.status);
    const underway = ["countdown", "playing"].includes(this.phase);
    const immersive = underway || this.phase === "result";
    this.root.classList.toggle("duo--immersive", immersive);
    this.root.classList.toggle("duo--fallback", fallback);
    this.root.closest(".lab")?.classList.toggle("lab--duo-playing", immersive);
    this.$(".duo-exit-button").hidden = !immersive;
    this.$(".duo-source").textContent = this.t(fallback ? "sourceFallback" : "sourceCamera");
    this.$(".duo-clock").textContent = this.t("seconds", { seconds: Math.ceil((TINY_BOT_RULES.durationMs - this.game.elapsedMs) / 1000) });
    const cameraButton = this.$(".duo-camera-button");
    cameraButton.textContent = this.t(loading ? "loading" : fallback ? "cameraMode" : this.status === "READY" ? "ready" : "camera");
    cameraButton.disabled = loading || (!fallback && this.status === "READY");
    cameraButton.hidden = immersive && !this.error;
    this.$(".duo-fallback-button").hidden = fallback || (underway && !this.paused);
    this.$(".duo-controls").hidden = !fallback;
    this.$(".duo-keyboard").hidden = !fallback;
    const start = this.$(".duo-start-button");
    start.textContent = this.t(this.phase === "result" ? "retry" : "start");
    start.hidden = underway;
    start.disabled = !this.snapshot.ready || this.snapshot.players.some((p) => !p.present) || this.unavailable || loading;
    const pause = this.$(".duo-pause-button");
    pause.hidden = !underway;
    pause.textContent = this.t(this.manualPause ? "resume" : "pause");
    pause.disabled = this.manualPause && this.unavailable;
    this.$(".duo-recalibrate-button").hidden = !(this.phase === "result" || this.paused);
    const missing = this.snapshot.players.filter((p) => !p.present).map((p) => `P${p.id}`).join(" / ");
    const longLoss = this.snapshot.players.some((p) => p.lostMs >= DUO_CONFIG.recoveryTimeoutMs);
    const overlay = this.$(".duo-overlay");
    overlay.hidden = !(this.paused || ["idle", "calibrating", "countdown", "result"].includes(this.phase));
    let label = "", title = "", detail = "";
    if (this.phase === "result" && this.result) {
      label = this.t("result");
      title = this.result.winner ? this.t("winner", { player: this.result.winner }) : this.t("draw");
      detail = `${this.t(this.result.reason === "RING_OUT" ? "ringOut" : "time")} · ${this.t("shots", {
        p1: this.result.shots[0], p2: this.result.shots[1], h1: this.result.hits[0], h2: this.result.hits[1]
      })}`;
    } else if (this.paused) {
      label = this.t("paused"); title = this.manualPause ? this.t("paused") : this.t("lost", { players: missing || "P1 / P2" });
      detail = longLoss || this.error ? this.t("timeout") : fallback ? this.t("touch") : this.t("calibration");
    } else if (this.phase === "countdown") {
      label = this.t("countdown"); title = String(Math.max(1, Math.ceil(this.countdownMs / 1000)));
    } else if (fallback) {
      label = "EXP-020"; title = this.t("tinyBot"); detail = this.t("touch");
    } else {
      label = "EXP-020"; title = this.t(this.snapshot.ready && !this.unavailable ? "ready" : "tinyBot");
      detail = this.error ? this.t(this.cameraErrorKey ?? "error") : this.status === "READY" ? this.t("calibration") : this.t("tinyBotLead");
    }
    this.$(".duo-overlay__label").textContent = label;
    this.$(".duo-overlay__title").textContent = title;
    this.$(".duo-overlay__detail").textContent = detail;
    this.$(".duo-message").textContent = this.error ? this.t(this.cameraErrorKey ?? "error") : this.phase === "playing" && !this.paused ? this.t("playing") :
      this.snapshot.ready ? this.t("ready") : this.snapshot.calibrationProgress > 0 ? this.t("stable", { progress: Math.round(this.snapshot.calibrationProgress * 100) }) : this.t("calibration");
    this.snapshot.players.forEach((player, index) => {
      const card = this.$(`.duo-player--${index + 1}`);
      card.dataset.present = String(player.present);
      card.querySelector(".duo-lean i").style.left = `${50 + player.faceX * 45}%`;
      card.querySelector(".duo-player__state").textContent = fallback ? `← → · ●` : !player.present ? this.t(player.lost ? "missing" : "waiting") :
        !player.calibrated ? this.t("tracked") : this.t(player.mouthOpen ? "open" : "closed");
    });
    for (const pad of this.root.querySelectorAll(".duo-pad")) {
      pad.setAttribute("aria-label", this.t("controls", { player: pad.dataset.player }));
      for (const button of pad.querySelectorAll("button")) button.setAttribute("aria-label", this.t(button.dataset.action === "fire" ? "fire" : button.dataset.action === "left" ? "moveLeft" : "moveRight"));
    }
    this.$(".duo-metrics").hidden = !this.result;
    if (this.result) this.$(".duo-metrics__value").textContent = this.t("metricsText", {
      source: this.t(this.result.source === "camera" ? "sourceCamera" : "sourceFallback"), loss: this.result.playerLossCount,
      swaps: this.result.identitySwapSuspicionCount, p1: this.result.inputEvents[0], p2: this.result.inputEvents[1],
      fps: this.result.averageInferenceFps, rematch: this.result.rematch
    });
    if (this.result) this.$(".duo-playtest-stats").textContent = this.t("playtestStats", {
      duration: (this.result.durationMs / 1000).toFixed(1), recoveries: this.result.successfulRecoveryCount ?? "—",
      minimumFps: this.result.lowestInferenceFps ?? "—"
    });
    this.renderDebug();
  }

  renderDebug() {
    const enabled = Boolean(this.$(".duo-debug-toggle input")?.checked);
    const debug = this.$(".duo-debug"); debug.hidden = !enabled;
    if (enabled) debug.textContent = this.snapshot.players.map((p) =>
      `P${p.id} track=${p.trackId} x=${p.faceX.toFixed(2)} y=${p.faceY.toFixed(2)} tilt=${p.tilt.toFixed(2)} scale=${p.faceScale.toFixed(2)}\nmouth=${p.mouthValue.toFixed(2)} open=${p.mouthOpen} lost=${Math.round(p.lostMs)}ms neutral=${p.neutral ? `${p.neutral.x.toFixed(2)},${p.neutral.y.toFixed(2)}` : "—"}`
    ).join("\n") + `\nFPS=${this.snapshot.metrics.averageInferenceFps.toFixed(1)} interval=${DUO_CONFIG.inferenceIntervalMs}ms\nevents=${this.snapshot.events.map((e) => `${e.playerId}:${e.type}`).join(",") || "—"}`;
    this.snapshot.players.forEach((player, index) => {
      const box = this.$(`.duo-box--${index + 1}`);
      box.hidden = !enabled || !player.present || !player.box;
      if (!box.hidden) {
        // Account for the camera's object-fit: contain letterboxing.
        const stage = this.$(".duo-stage").getBoundingClientRect();
        const vw = this.video.videoWidth || stage.width, vh = this.video.videoHeight || stage.height;
        const scale = Math.min(stage.width / vw, stage.height / vh);
        const width = vw * scale, height = vh * scale;
        Object.assign(box.style, {
          left: `${(stage.width - width) / 2 + player.box.x * width}px`,
          top: `${(stage.height - height) / 2 + player.box.y * height}px`,
          width: `${player.box.width * width}px`, height: `${player.box.height * height}px`
        });
        box.textContent = `P${player.id} · ${player.trackId}`;
      }
    });
  }

  draw() {
    if (!this.active || !this.ctx) return;
    const rect = this.canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const ratio = Math.min(2, window.devicePixelRatio || 1);
    const width = Math.round(rect.width * ratio), height = Math.round(rect.height * ratio);
    if (this.canvas.width !== width || this.canvas.height !== height) { this.canvas.width = width; this.canvas.height = height; }
    this.ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    this.game.render(this.ctx, rect.width, rect.height, { locale: this.locale, botArt: this.botArt });
  }
}
