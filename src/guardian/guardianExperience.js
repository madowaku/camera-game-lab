import "./guardian.css";
import { GuardianInput } from "../input/guardianInput.js";
import { demoGuardianPose } from "../input/guardianGestures.js";
import { GuardianSpiritGame } from "../games/guardianSpirit.js";
import { GuardianRenderer } from "./renderer.js";
import { GuardianAudio } from "./audio.js";
import { guardianCopy } from "./messages.js";
import { GUARDIAN_SPIRITS, guardianSpirit } from "./spirits.js";
import { guardianFraming } from "./composition.js";

const RECORD_KEY = "camera-game-lab-guardian-rounds";
const icon = (name) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">${{
  spark: '<path d="m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3Z"/>',
  camera: '<path d="M3 7h5l2-3h4l2 3h5v13H3Z"/><circle cx="12" cy="13" r="4"/>',
  punch: '<path d="M5 10V5h4v5-7h4v7-6h4v7-4h3v10l-5 4H9l-6-8 2-3 4 4V9"/>',
  shot: '<path d="m3 21 9-9m-5 0h5v5m3-9 6-6m-7 1 3 7 7 3"/>',
  shield: '<path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6Z"/><path d="m8 12 3 3 5-6"/>',
  ascend: '<path d="M12 21V3m-6 6 6-6 6 6M4 17V9m16 8V9"/>',
}[name]}</svg>`;

export class GuardianExperience {
  constructor(root, locale = "ja") {
    this.root = root; this.locale = locale; this.active = false; this.source = "preview";
    this.status = "OFF"; this.photoMode = false; this.photoPose = 0; this.includeUi = true;
    this.manualPause = false; this.demoPresent = true; this.photoCount = 0; this.photoMs = 0;
    this.lastTimestamp = null; this.frameId = null; this.lastRenderAt = 0; this.photoUrl = null;
    this.spiritId = "warden";
    root.innerHTML = `
      <div class="guardian-layout">
        <aside class="guardian-brief">
          <p class="gs-kicker" data-copy="eyebrow"></p>
          <h2 class="guardian-statement" data-copy="title"></h2>
          <p class="guardian-intro" data-copy="intro"></p>
          <div class="guardian-identity"><span class="guardian-sigil">${icon("spark")}</span><div><small>YOUR GUARDIAN</small><strong class="gs-spirit-name">WARDEN</strong><span class="gs-spirit-description"></span></div></div>
          <div class="guardian-guide">
            ${[["punch", "GUARDIAN PUNCH", "punch"], ["shot", "SPIRIT SHOT", "shotHelp"], ["shield", "GUARDIAN SHIELD", "shield"], ["ascend", "ASCENSION", "ascendHelp"]].map(([name, title, copy], i) => `<div class="gs-guide-row"><span class="gs-guide-icon">${icon(name)}</span><div><strong>${title}</strong><p data-copy="${copy}"></p></div><small>0${i + 1}</small></div>`).join("")}
          </div>
          <p class="guardian-duration"><span>30 SEC</span><i></i><span>ONE GUARDIAN</span><i></i><span>YOU</span></p>
        </aside>
        <div class="guardian-camera-area">
          <div class="gs-spirit-picker" role="group"><p data-copy="chooseSpirit"></p><div>${GUARDIAN_SPIRITS.map((spirit) => `<button type="button" class="gs-spirit-choice" data-spirit="${spirit.id}" aria-pressed="${spirit.id === this.spiritId}"><span class="gs-spirit-portrait" style="background-image:url('${spirit.atlas}')" aria-hidden="true"></span><strong>${spirit.name}</strong><small></small></button>`).join("")}</div></div>
          <div class="guardian-stage">
            <video class="guardian-video" autoplay muted playsinline hidden></video>
            <canvas class="guardian-canvas" role="img" aria-label="WARDEN behind the player, battling demons"></canvas>
            <div class="gs-stage-top"><span class="gs-source"></span><div class="gs-stage-buttons"><button type="button" class="gs-sound"></button><button type="button" class="gs-pause" hidden></button></div></div>
            <div class="gs-combat-hud" hidden><div class="gs-timer"><small>TIME</small><strong>30</strong></div><div class="gs-battle-stats"><span>DEMONS <b class="gs-kills">00</b></span><span>COMBO <b class="gs-combo">00</b></span></div></div>
            <div class="gs-alignment" hidden aria-hidden="true"><span></span><span></span><span></span><span></span></div>
            <div class="gs-overlay"><p class="gs-overlay-kicker"></p><strong class="gs-overlay-title"></strong><p class="gs-overlay-detail"></p></div>
            <div class="gs-feedback" role="status" aria-live="polite"></div>
            <div class="gs-stage-bottom"><div class="gs-warden-tag"><span>WARDEN</span><small>BOUND TO YOU</small></div><div class="gs-gauge" hidden><div><span>SPIRIT GAUGE</span><strong>0%</strong></div><progress max="1" value="0" aria-label="Spirit gauge"></progress></div><div class="gs-photo-tag" hidden></div></div>
          </div>
          <p class="gs-framing" role="status" aria-live="polite"></p>
          <div class="gs-actions"><button type="button" class="gs-button gs-button--primary gs-camera">${icon("spark")}<span data-copy="summon"></span></button><button type="button" class="gs-button gs-demo" data-copy="demo"></button><button type="button" class="gs-button gs-retry" data-copy="retry" hidden></button><button type="button" class="gs-button gs-enter-photo" data-copy="selfie" hidden></button><button type="button" class="gs-button gs-cancel" data-copy="cancel" hidden></button></div>
          <details class="gs-composition-settings"><summary data-copy="compositionSettings"></summary><label><span data-copy="playerSize"></span><input class="gs-player-size" type="range" min="35" max="75" value="55" step="5"><output>55%</output></label><p data-copy="compactHelp"></p></details>
          <div class="gs-photo-controls" hidden><button type="button" class="gs-button gs-change-pose" data-copy="poseButton"></button><button type="button" class="gs-button gs-button--primary gs-shot">${icon("camera")}<span data-copy="shot"></span></button><button type="button" class="gs-button gs-ui-toggle"></button></div>
          <div class="gs-demo-controls" hidden>${[["punch-left", "A / PUNCH L"], ["punch-right", "D / PUNCH R"], ["shot", "S / SHOT"], ["shield", "F / SHIELD"], ["ascend", "W / POSE"]].map(([action, label]) => `<button type="button" class="gs-button" data-guardian-action="${action}">${label}</button>`).join("")}<button type="button" class="gs-button gs-test-loss"></button><p data-copy="demoHelp"></p></div>
          <p class="gs-message" role="status" aria-live="polite"></p>
          <p class="gs-privacy" data-copy="privacy"></p>
        </div>
      </div>
      <div class="gs-result" hidden><p class="gs-kicker">ROUND MEMORY</p><div class="gs-result-stats"><div><small>DEMONS</small><strong class="gs-result-demons"></strong></div><div><small>COMBO</small><strong class="gs-result-combo"></strong></div><div><small>BLOCK</small><strong class="gs-result-block"></strong></div><div><small>SCORE</small><strong class="gs-result-score"></strong></div></div><button type="button" class="gs-button gs-export" data-copy="export"></button><p class="gs-privacy" data-copy="storage"></p></div>
      <figure class="gs-photo-preview" hidden><figcaption data-copy="gallery"></figcaption><img alt="Your portrait together with WARDEN"><a class="gs-button gs-button--primary gs-download" download="guardian-spirit.png" data-copy="download"></a></figure>
    `;
    this.$ = (selector) => root.querySelector(selector); this.video = this.$("video");
    this.input = new GuardianInput(this.video, { onStatus: (status) => {
      this.status = status;
      if (status === "ERROR") { this.errorKey = "unavailable"; this.manualPause = true; }
      this.render();
    } });
    this.audio = new GuardianAudio();
    this.game = new GuardianSpiritGame({ onEffect: (event) => this.onEffect(event) });
    this.renderer = new GuardianRenderer(this.$("canvas"), this.video, this.input);
    for (const button of root.querySelectorAll("[data-spirit]")) button.addEventListener("click", () => {
      this.spiritId = button.dataset.spirit; this.renderer.setSpirit(this.spiritId); this.render();
    });
    this.$(".gs-player-size").addEventListener("input", (event) => {
      this.renderer.playerSize = Number(event.target.value) / 100;
      this.$(".gs-composition-settings output").textContent = `${event.target.value}%`;
    });
    this.$(".gs-camera").addEventListener("click", () => this.startCamera());
    this.$(".gs-demo").addEventListener("click", () => this.startDemo());
    this.$(".gs-retry").addEventListener("click", () => this.beginRound());
    this.$(".gs-enter-photo").addEventListener("click", () => this.enterPhoto());
    this.$(".gs-cancel").addEventListener("click", () => this.cancelRound());
    this.$(".gs-pause").addEventListener("click", () => {
      this.manualPause = !this.manualPause; this.input.clearActions(); this.lastTimestamp = null;
      if (!this.manualPause) this.audio.unlock(); else this.audio.suspend(); this.render();
    });
    this.$(".gs-sound").addEventListener("click", () => {
      this.audio.muted = !this.audio.muted;
      if (this.audio.muted) this.audio.suspend(); else this.audio.unlock(); this.render();
    });
    this.$(".gs-change-pose").addEventListener("click", () => { this.photoPose = (this.photoPose + 1) % 4; this.render(); });
    this.$(".gs-shot").addEventListener("click", () => this.takePhoto());
    this.$(".gs-ui-toggle").addEventListener("click", () => { this.includeUi = !this.includeUi; this.render(); });
    this.$(".gs-test-loss").addEventListener("click", () => { this.demoPresent = !this.demoPresent; this.render(); });
    this.$(".gs-export").addEventListener("click", () => this.exportRecords());
    for (const button of root.querySelectorAll("[data-guardian-action]")) button.addEventListener("click", () => this.demoAction(button.dataset.guardianAction));
    window.addEventListener("keydown", (event) => {
      if (!this.active || this.source !== "demo" || event.repeat || event.ctrlKey || event.metaKey || event.altKey ||
        event.target?.matches("input,textarea,select")) return;
      const action = { KeyA: "punch-left", KeyD: "punch-right", KeyS: "shot", KeyF: "shield", KeyW: "ascend" }[event.code];
      if (action) { event.preventDefault(); this.demoAction(action); }
    });
    window.addEventListener("blur", () => this.suspend());
    document.addEventListener("visibilitychange", () => { if (document.hidden) this.suspend(); });
    window.addEventListener("pagehide", () => this.deactivate());
    this.render();
  }
  t(key) { return guardianCopy(this.locale, key); }
  setLocale(locale) { this.locale = locale; this.render(); }
  activate() {
    if (this.active) return;
    this.active = true; this.root.hidden = false; this.lastTimestamp = null;
    this.renderer.resize(); this.render(); this.frameId = requestAnimationFrame(this.tick);
  }
  deactivate() {
    this.flushPhotoMetrics(); this.active = false;
    if (this.frameId !== null) cancelAnimationFrame(this.frameId);
    this.frameId = null; this.input.stop(); this.audio.suspend(); this.game.reset();
    this.photoMode = false; this.source = "preview"; this.status = "OFF"; this.manualPause = false;
    this.errorKey = null; this.renderer.reset(); this.root.hidden = true;
    this.root.closest(".lab")?.classList.remove("lab--guardian-playing");
    this.clearPhoto();
  }
  suspend() {
    if (this.active && this.game.running) { this.manualPause = true; this.input.clearActions(); this.audio.suspend(); this.render(); }
    this.lastTimestamp = null;
  }
  async startCamera() {
    if (["LOADING_MODEL", "REQUESTING_CAMERA"].includes(this.status)) return;
    this.flushPhotoMetrics(); this.input.stop(); this.game.reset(); this.renderer.reset();
    this.source = "camera"; this.photoMode = false; this.errorKey = null; this.manualPause = false;
    this.status = "LOADING_MODEL"; this.clearPhoto(); this.render(); this.audio.unlock();
    try {
      await this.input.start();
      if (this.active && this.source === "camera") this.beginRound();
    } catch (error) {
      if (error.name === "AbortError" || !this.active || this.source !== "camera") return;
      this.input.stop(); this.status = "ERROR"; this.errorKey = error.name === "NotAllowedError" ? "denied" : "error";
      this.render();
    }
  }
  startDemo() {
    this.input.stop(); this.status = "OFF"; this.source = "demo"; this.errorKey = null;
    this.demoPresent = true; this.audio.unlock(); this.beginRound();
  }
  beginRound() {
    this.flushPhotoMetrics(); this.photoCount = 0; this.photoMs = 0; this.roundReceipt = null;
    this.photoMode = false; this.photoPose = 0; this.manualPause = false; this.lastCount = null;
    this.clearPhoto(); this.input.clearActions(); this.renderer.reset(); this.audio.unlock();
    this.game.start(); this.lastTimestamp = null; this.render();
    if (window.innerWidth < 850) this.$(".gs-spirit-picker").scrollIntoView({ block: "start", behavior: "instant" });
  }
  cancelRound() {
    this.flushPhotoMetrics(); this.input.stop(); this.audio.suspend(); this.game.reset(); this.renderer.reset();
    this.photoMode = false; this.source = "preview"; this.status = "OFF"; this.errorKey = null;
    this.manualPause = false; this.render();
  }
  demoAction(name) {
    if (this.source !== "demo" || !this.demoPresent || this.manualPause || this.game.paused) return;
    const action = name.startsWith("punch") ? { type: "punch", side: name.endsWith("left") ? "left" : "right" }
      : { type: name, side: "right", direction: { x: 0.75, y: 0.45 } };
    this.audio.unlock(); this.game.act(action); this.render();
  }
  onEffect(event) {
    this.renderer?.effect(event); this.audio.play(event.type);
    if (event.hit) this.audio.play("impact");
    const labels = { punch: "GUARDIAN PUNCH", shot: "SPIRIT SHOT", shield: "GUARDIAN SHIELD", block: "BLOCK! +200", damage: "HIT −100", boss: "DEMON LORD" };
    if (labels[event.type]) {
      this.$(".gs-feedback").textContent = event.hit ?
        `${event.targets.length > 1 ? this.t("multiHit") + " ×" + event.targets.length : this.t("smash")}  +${event.scoreGain}  / ${event.combo} COMBO` : labels[event.type];
      this.feedbackUntil = this.renderer.time + 850;
      this.$(".gs-feedback").dataset.kind = event.type;
    }
  }
  tick = (timestamp) => {
    if (!this.active) return;
    const dt = Math.max(0, Math.min(100, this.lastTimestamp === null ? 0 : timestamp - this.lastTimestamp));
    this.lastTimestamp = timestamp;
    const demo = this.source !== "camera";
    const sample = demo ? { present: this.source === "preview" || this.demoPresent, pose: demoGuardianPose(timestamp), actions: [] } : this.input.sample(timestamp);
    this.latestPose = sample.pose;
    if (!this.manualPause && !document.hidden) {
      const actions = sample.actions.map((action) => {
        if (!action.direction) return action;
        const point = this.renderer.toStage(action.direction);
        return { ...action, direction: { x: point.x / this.renderer.width, y: point.y / this.renderer.height } };
      });
      const recovering = this.game.paused;
      this.game.step(dt, { ...sample, actions });
      if (recovering && !this.game.paused) this.input.clearActions();
      if (this.photoMode) this.photoMs += dt;
    }
    this.renderer.draw({ game: this.game, pose: sample.pose, demo, photo: this.photoMode || this.game.phase === "result", photoPose: this.photoPose, dt: this.manualPause ? 0 : dt });
    if (this.game.phase === "result" && !this.roundReceipt) {
      this.roundReceipt = { ...this.game.result, spirit: this.spiritId, source: this.source, recordedAt: new Date().toISOString(), photos: 0, photoModeMs: 0 };
      this.saveReceipt();
      if (this.game.captureRequested) this.takePhoto();
      this.render();
    }
    if (timestamp - this.lastRenderAt > 100) { this.render(); this.lastRenderAt = timestamp; }
    this.frameId = requestAnimationFrame(this.tick);
  };
  render() {
    for (const element of this.root.querySelectorAll("[data-copy]")) {
      const copy = this.t(element.dataset.copy);
      if (element.textContent !== copy) element.textContent = copy;
    }
    const game = this.game, phase = game?.phase ?? "idle", running = game?.running ?? false;
    const spirit = guardianSpirit(this.spiritId);
    this.root.style.setProperty("--gs-spirit", spirit.color);
    this.$(".gs-spirit-name").textContent = spirit.name;
    this.$(".gs-spirit-description").textContent = spirit[this.locale] ?? spirit.en;
    this.$(".gs-warden-tag span").textContent = spirit.name;
    this.$(".guardian-canvas").setAttribute("aria-label", `${spirit.name} / ${this.t("canvasLabel")}`);
    this.$(".gs-spirit-picker").setAttribute("aria-label", this.t("chooseSpirit"));
    this.$(".gs-player-size").setAttribute("aria-label", this.t("playerSize"));
    for (const button of this.root.querySelectorAll("[data-spirit]")) {
      const choice = guardianSpirit(button.dataset.spirit);
      button.setAttribute("aria-pressed", String(choice.id === spirit.id));
      button.querySelector("small").textContent = choice[this.locale] ?? choice.en;
    }
    const framing = this.source === "camera" ? guardianFraming(this.latestPose) : "bodyReady";
    this.$(".gs-framing").hidden = this.photoMode;
    this.$(".gs-framing").dataset.state = framing;
    const framingText = this.t(framing);
    if (this.$(".gs-framing").textContent !== framingText) this.$(".gs-framing").textContent = framingText;
    const loading = ["LOADING_MODEL", "REQUESTING_CAMERA"].includes(this.status);
    const result = phase === "result", combat = phase === "playing" && !this.photoMode;
    this.root.closest(".lab")?.classList.toggle("lab--guardian-playing", running || this.photoMode);
    this.$(".gs-camera").hidden = !this.errorKey && (running || this.photoMode || result);
    this.$(".gs-camera").disabled = loading;
    this.$(".gs-camera span").textContent = this.t(loading ? this.status === "LOADING_MODEL" ? "model" : "permission" : "summon");
    this.$(".gs-demo").hidden = running || this.photoMode || result;
    this.$(".gs-demo").disabled = false;
    this.$(".gs-cancel").hidden = !running && !this.photoMode && !loading && !result;
    this.$(".gs-retry").hidden = !result;
    this.$(".gs-retry").disabled = this.source === "camera" && this.status !== "READY";
    this.$(".gs-enter-photo").hidden = !result || this.photoMode;
    this.$(".gs-enter-photo").disabled = this.source === "camera" && this.status !== "READY";
    this.$(".gs-pause").hidden = !running;
    this.$(".gs-pause").textContent = this.t(this.manualPause ? "resume" : "pause");
    this.$(".gs-pause").setAttribute("aria-pressed", String(this.manualPause));
    this.$(".gs-sound").textContent = `${this.t("sound")} ${this.t(this.audio?.muted ? "off" : "on")}`;
    this.$(".gs-sound").setAttribute("aria-pressed", String(!this.audio?.muted));
    this.$(".gs-source").textContent = this.t(this.source === "demo" ? "demoLabel" : this.status === "READY" ? "live" : "preview");
    this.$(".gs-source").dataset.live = String(this.status === "READY");
    this.$(".gs-combat-hud").hidden = !combat;
    this.$(".gs-alignment").hidden = !["align", "countdown"].includes(phase);
    this.$(".gs-gauge").hidden = !combat;
    this.$(".gs-warden-tag").hidden = this.photoMode;
    if (game) {
      this.$(".gs-timer strong").textContent = String(game.remainingSeconds).padStart(2, "0");
      this.$(".gs-kills").textContent = String(game.defeated).padStart(2, "0");
      this.$(".gs-combo").textContent = String(game.combo).padStart(2, "0");
      this.$(".gs-gauge progress").value = game.gauge;
      this.$(".gs-gauge strong").textContent = game.gauge === 1 ? this.t("ready") : `${Math.round(game.gauge * 100)}%`;
    }
    let title = "", detail = "", kicker = "";
    if (this.errorKey) { title = "CAMERA OFFLINE"; detail = this.t(this.errorKey); }
    else if (this.manualPause) { title = this.t("paused"); detail = this.t("resume"); }
    else if (game?.paused) {
      title = !game.wasPresent ? "COME BACK" : String(Math.max(1, Math.ceil(game.resumeMs / 1000)));
      detail = this.t(!game.wasPresent ? "comeback" : "recovery");
    } else if (this.photoMode) { kicker = this.t("photo"); detail = this.t("photoLead"); }
    else if (phase === "align") { title = "STAND HERE"; detail = this.t("align"); }
    else if (phase === "countdown") { title = String(Math.max(1, Math.ceil((3000 - game.phaseMs) / 1000))); detail = this.t("count"); }
    else if (phase === "awakening") { kicker = "YOUR GUARDIAN"; title = "HAS AWAKENED"; detail = this.t("awakened"); }
    else if (phase === "playing" && game.boss && game.gauge === 1) { title = "POSE!"; detail = this.t("pose"); }
    else if (phase === "ascension") { kicker = "GUARDIAN"; title = "ASCENSION"; detail = this.t("ascend"); }
    else if (phase === "victory") { kicker = "VICTORY PHOTO"; title = String(Math.max(1, Math.min(3, Math.ceil((4000 - game.phaseMs) / 1000)))); detail = this.t("victory"); }
    else if (result) { title = game.result.victory ? "VICTORY" : "TIME UP"; detail = this.t(game.result.victory ? "finish" : "timeout"); }
    else if (phase === "idle" && loading) { kicker = "AWAKENING SEQUENCE"; detail = this.t(this.status === "LOADING_MODEL" ? "model" : "permission"); }
    this.$(".gs-overlay").hidden = !title && !detail && !kicker || this.photoMode && !this.includeUi && !this.errorKey;
    this.$(".gs-overlay").classList.toggle("gs-overlay--photo", this.photoMode);
    this.$(".gs-overlay-title").textContent = title; this.$(".gs-overlay-detail").textContent = detail;
    this.$(".gs-overlay-kicker").textContent = kicker;
    this.$(".gs-stage-bottom").hidden = this.photoMode && !this.includeUi;
    this.$(".gs-stage-top").hidden = this.photoMode && !this.includeUi;
    this.$(".gs-photo-tag").hidden = !this.photoMode;
    this.$(".gs-photo-tag").textContent = this.t("poseNames")[this.photoPose];
    this.$(".gs-photo-controls").hidden = !this.photoMode;
    this.$(".gs-ui-toggle").textContent = `${this.t("hide")} ${this.t(this.includeUi ? "on" : "off")}`;
    this.$(".gs-ui-toggle").setAttribute("aria-pressed", String(this.includeUi));
    this.$(".gs-shot").disabled = this.source === "camera" && (!this.latestPose || this.status !== "READY");
    this.$(".gs-demo-controls").hidden = this.source !== "demo" || !running;
    for (const button of this.root.querySelectorAll("[data-guardian-action]")) {
      const name = button.dataset.guardianAction;
      button.disabled = phase !== "playing" || this.manualPause || game.paused || !this.demoPresent ||
        name === "ascend" && (!game.boss || game.gauge < 1);
    }
    this.$(".gs-test-loss").textContent = this.t(this.demoPresent ? "lossHelp" : "returnHelp");
    const message = this.photoMessage ? this.t(this.photoMessage) : this.errorKey ? this.t(this.errorKey) :
      combat ? this.t(game.boss ? game.gauge === 1 ? "pose" : "boss" : "battle") : "";
    if (this.$(".gs-message").textContent !== message) this.$(".gs-message").textContent = message;
    this.$(".gs-result").hidden = !result;
    if (result) for (const [name, value] of Object.entries({ demons: game.defeated, combo: game.maxCombo, block: game.blocks, score: game.score })) this.$(`.gs-result-${name}`).textContent = String(value);
    if ((this.renderer?.time > this.feedbackUntil || !combat) && this.$(".gs-feedback").textContent) this.$(".gs-feedback").textContent = "";
    const count = ["countdown", "victory"].includes(phase) ? `${phase}-${title}` : game?.paused && game.wasPresent ? `return-${title}` : null;
    if (count && count !== this.lastCount) { this.audio?.play("countdown"); this.lastCount = count; }
  }
  enterPhoto() { this.photoMode = true; this.photoPose = 0; this.manualPause = false; this.input.clearActions(); this.renderer.effects.length = 0; this.render(); }
  takePhoto() {
    if (!this.active || this.source === "camera" && (!this.latestPose || this.status !== "READY")) return;
    const canvas = this.renderer.photograph({ game: this.game, pose: this.latestPose, demo: this.source !== "camera", photoPose: this.photoPose, includeUi: this.includeUi });
    // The blob is created locally and only this latest photo remains in memory.
    const source = this.source, receipt = this.roundReceipt;
    canvas.toBlob((blob) => {
      if (!this.active || source !== this.source || receipt !== this.roundReceipt) return;
      if (!blob) { this.photoMessage = "captureError"; this.render(); return; }
      if (this.photoUrl) URL.revokeObjectURL(this.photoUrl);
      this.photoUrl = URL.createObjectURL(blob); this.photoCount++;
      this.$(".gs-photo-preview img").src = this.photoUrl;
      this.$(".gs-photo-preview img").alt = `GUARDIAN SPIRIT / ${guardianSpirit(this.spiritId).name}`;
      this.$(".gs-download").href = this.photoUrl; this.$(".gs-photo-preview").hidden = false;
      this.audio.play("shutter"); this.photoMessage = "captured"; this.saveReceipt(); this.render();
    }, "image/png");
  }
  clearPhoto() {
    if (this.photoUrl) URL.revokeObjectURL(this.photoUrl);
    this.photoUrl = null; this.photoMessage = null;
    this.$(".gs-photo-preview").hidden = true; this.$(".gs-photo-preview img").removeAttribute("src");
    this.$(".gs-download").removeAttribute("href");
  }
  readRecords() {
    try { const records = JSON.parse(localStorage.getItem(RECORD_KEY) || "[]"); return Array.isArray(records) ? records.filter((record) => record && typeof record === "object") : []; }
    catch { return []; }
  }
  flushPhotoMetrics() { if (this.roundReceipt) this.saveReceipt(); }
  saveReceipt() {
    if (!this.roundReceipt) return;
    Object.assign(this.roundReceipt, { photos: this.photoCount, photoModeMs: Math.round(this.photoMs) });
    try {
      const records = this.readRecords().filter((record) => record.recordedAt !== this.roundReceipt.recordedAt);
      localStorage.setItem(RECORD_KEY, JSON.stringify([...records, this.roundReceipt].slice(-50)));
    } catch { /* Current receipt is still included in export. */ }
  }
  exportRecords() {
    this.flushPhotoMetrics(); const rounds = this.readRecords();
    if (this.roundReceipt && !rounds.some((record) => record.recordedAt === this.roundReceipt.recordedAt)) rounds.push(this.roundReceipt);
    const blob = new Blob([JSON.stringify({ format: "guardian-spirit-playtest-v1", humanVerdict: "NOT_RECORDED", rounds }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob), anchor = document.createElement("a");
    anchor.href = url; anchor.download = "guardian-spirit-playtest.json"; anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
