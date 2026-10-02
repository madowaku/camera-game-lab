import { RearHandInput } from "./rearHandInput.js";
import { WATERMELON_RULES, createWatermelonTarget, gradeStrike } from "./watermelonRules.js";
import { translate } from "../i18n.js";
import "./watermelonGuide.css";

export class WatermelonGuide {
  constructor(root, locale = "ja", { onExit } = {}) {
    this.root = root;
    this.locale = locale;
    this.onExit = onExit ?? (() => {});
    this.active = false;
    this.status = "OFF";
    this.phase = "idle";
    this.target = null;
    this.hand = null;
    this.score = 0;
    this.hits = 0;
    this.attempts = 0;
    this.remainingMs = WATERMELON_RULES.durationMs;
    this.lastTickAt = null;
    this.lastStrikeAt = -Infinity;
    this.feedbackTimer = null;
    this.raf = null;

    root.innerHTML = `
      <div class="outcam-shell">
        <section class="outcam-stage" aria-label="WATERMELON GUIDE camera stage">
          <video class="outcam-video" autoplay muted playsinline></video>
          <div class="outcam-vignette" aria-hidden="true"></div>
          <div class="outcam-topbar"><span class="outcam-chip outcam-camera-state"></span><span class="outcam-chip outcam-hand-state"></span></div>
          <div class="outcam-watermelon" hidden aria-hidden="true"><span>🍉</span><i></i></div>
          <div class="outcam-hand" hidden aria-hidden="true"></div>
          <div class="outcam-feedback" hidden aria-live="assertive"></div>
          <div class="outcam-center-card"><small class="outcam-center-label"></small><strong class="outcam-center-title"></strong><p class="outcam-center-detail"></p></div>
          <button class="outcam-tap-layer" type="button"></button>
        </section>
        <section class="outcam-stats" aria-live="polite">
          <div><span data-copy="wmTime"></span><strong class="outcam-time">30.0</strong></div>
          <div><span data-copy="wmScore"></span><strong class="outcam-score">0</strong></div>
          <div><span data-copy="wmFruit"></span><strong class="outcam-fruit">0 / 3</strong></div>
        </section>
        <div class="outcam-actions">
          <button class="button button--primary outcam-camera-button" type="button"></button>
          <button class="button outcam-start-button" type="button" disabled></button>
          <button class="button outcam-exit-button" type="button"></button>
        </div>
        <p class="outcam-message" role="status"></p>
        <details class="howto outcam-howto"><summary></summary><p data-copy="wmGuide"></p><p data-copy="wmFallback"></p><p data-copy="wmPrivacy"></p></details>
      </div>`;

    this.$ = (selector) => root.querySelector(selector);
    this.video = this.$(".outcam-video");
    this.stage = this.$(".outcam-stage");
    this.input = new RearHandInput(this.video, this.stage, {
      onStatus: (status) => { this.status = status; if (status === "ERROR") this.phase = "idle"; this.render(); },
      onHand: (point) => { this.hand = point; this.renderHand(); },
      onSwing: (point) => this.strike(point)
    });

    this.$(".outcam-camera-button").addEventListener("click", () => this.startCamera());
    this.$(".outcam-start-button").addEventListener("click", () => this.beginRound());
    this.$(".outcam-exit-button").addEventListener("click", this.onExit);
    this.$(".outcam-tap-layer").addEventListener("pointerdown", (event) => {
      if (this.phase !== "playing") return;
      const rect = this.stage.getBoundingClientRect();
      this.strike({ x: (event.clientX - rect.left) / rect.width, y: (event.clientY - rect.top) / rect.height });
    });
    this.onKeyDown = (event) => {
      if (!this.active || this.phase !== "playing" || event.code !== "Space") return;
      event.preventDefault();
      this.strike(this.hand ?? { x: 0.5, y: 0.66 });
    };
    window.addEventListener("keydown", this.onKeyDown);
    this.render();
  }

  t(key, values) { return translate(this.locale, key, values); }
  setLocale(locale) { this.locale = locale; this.render(); }
  activate() { this.active = true; this.root.hidden = false; this.render(); }

  deactivate() {
    this.active = false;
    this.cancelRound();
    this.input.stop();
    this.status = "OFF";
    this.phase = "idle";
    this.target = null;
    this.root.hidden = true;
  }

  async startCamera() {
    if (["LOADING_MODEL", "REQUESTING_CAMERA", "READY"].includes(this.status)) return;
    try {
      await this.input.start();
      this.status = "READY";
      this.phase = "ready";
    } catch (error) {
      console.error(error);
      this.input.stop();
      this.status = "ERROR";
      this.phase = "idle";
    }
    this.render();
  }

  beginRound() {
    if (this.status !== "READY" || this.phase === "playing") return;
    clearTimeout(this.feedbackTimer);
    this.score = this.hits = this.attempts = 0;
    this.remainingMs = WATERMELON_RULES.durationMs;
    this.lastTickAt = performance.now();
    this.lastStrikeAt = -Infinity;
    this.phase = "playing";
    this.spawnTarget();
    this.render();
    this.raf = requestAnimationFrame(this.tick);
  }

  tick = (timestamp) => {
    if (!this.active || this.phase !== "playing") return;
    const delta = this.lastTickAt === null ? 0 : Math.max(0, Math.min(250, timestamp - this.lastTickAt));
    this.lastTickAt = timestamp;
    this.remainingMs = Math.max(0, this.remainingMs - delta);
    if (this.remainingMs <= 0) return this.finishRound();
    this.renderStats();
    this.raf = requestAnimationFrame(this.tick);
  };

  spawnTarget() { this.target = createWatermelonTarget(); this.renderTarget(); }

  strike(point) {
    if (this.phase !== "playing" || !this.target) return;
    const now = performance.now();
    if (now - this.lastStrikeAt < WATERMELON_RULES.swingCooldownMs) return;
    this.lastStrikeAt = now;
    const result = gradeStrike(this.target, point);
    this.attempts += 1;
    this.score += result.points;
    if (result.grade === "HIT") { this.hits += 1; navigator.vibrate?.(35); }
    this.showFeedback(result.grade, point);
    this.target = null;
    this.renderTarget();
    this.renderStats();
    clearTimeout(this.feedbackTimer);
    this.feedbackTimer = setTimeout(() => {
      if (this.phase !== "playing") return;
      if (this.attempts >= WATERMELON_RULES.targetCount) this.finishRound();
      else { this.spawnTarget(); this.$(".outcam-message").textContent = this.t("wmNext"); }
    }, 650);
  }

  showFeedback(grade, point) {
    const feedback = this.$(".outcam-feedback");
    feedback.hidden = false;
    feedback.dataset.grade = grade;
    feedback.textContent = this.t(`wm${grade[0]}${grade.slice(1).toLowerCase()}`);
    feedback.style.left = `${Math.max(8, Math.min(92, point.x * 100))}%`;
    feedback.style.top = `${Math.max(14, Math.min(86, point.y * 100))}%`;
  }

  finishRound() { if (this.phase === "playing") { this.cancelAnimation(); this.phase = "result"; this.target = null; this.render(); } }
  cancelAnimation() { if (this.raf !== null) cancelAnimationFrame(this.raf); this.raf = null; clearTimeout(this.feedbackTimer); this.feedbackTimer = null; }
  cancelRound() { this.cancelAnimation(); if (this.phase === "playing") this.phase = this.status === "READY" ? "ready" : "idle"; }

  render() {
    for (const element of this.root.querySelectorAll("[data-copy]")) element.textContent = this.t(element.dataset.copy);
    this.$(".outcam-howto summary").textContent = this.t("howToPlay");
    this.$(".outcam-exit-button").textContent = this.t("wmExit");
    const loading = ["LOADING_MODEL", "REQUESTING_CAMERA"].includes(this.status);
    this.$(".outcam-camera-button").textContent = this.t(loading ? "wmLoading" : this.status === "READY" ? "wmCameraReady" : "wmCamera");
    this.$(".outcam-camera-button").disabled = loading || this.status === "READY";
    const start = this.$(".outcam-start-button");
    start.textContent = this.t(this.phase === "result" ? "wmRetry" : "wmStart");
    start.disabled = this.status !== "READY" || this.phase === "playing";
    this.$(".outcam-camera-state").textContent = this.status === "READY" ? "REAR CAM · LIVE" : this.status === "ERROR" ? "CAMERA ERROR" : loading ? "CAMERA…" : "REAR CAM · OFF";
    this.$(".outcam-hand-state").textContent = this.hand ? this.t("wmHand") : this.t("wmNoHand");
    this.$(".outcam-hand-state").classList.toggle("is-live", Boolean(this.hand));

    const card = this.$(".outcam-center-card");
    card.hidden = this.phase === "playing";
    this.$(".outcam-center-label").textContent = this.t(this.phase === "result" ? "wmResult" : "eyebrowWatermelonGuide");
    this.$(".outcam-center-title").textContent = this.phase === "result" ? `${this.hits} / ${WATERMELON_RULES.targetCount}` : "WATERMELON GUIDE";
    this.$(".outcam-center-detail").textContent = this.phase === "result"
      ? this.t("wmResultLine", { hits: this.hits, total: WATERMELON_RULES.targetCount, score: this.score })
      : this.status === "ERROR" ? this.t("wmCameraError") : this.status === "READY" ? this.t("wmReady") : this.t("wmIntro");
    this.$(".outcam-message").textContent = this.status === "ERROR" ? this.t("wmCameraError") : this.phase === "playing" ? this.t("wmPlaying") : this.status === "READY" ? this.t("wmReady") : this.t("wmPrivacy");
    this.$(".outcam-tap-layer").setAttribute("aria-label", this.t("wmTapTest"));
    this.renderStats(); this.renderTarget(); this.renderHand();
    if (this.phase !== "playing") this.$(".outcam-feedback").hidden = true;
  }

  renderStats() {
    this.$(".outcam-time").textContent = (this.remainingMs / 1000).toFixed(1);
    this.$(".outcam-score").textContent = String(this.score);
    this.$(".outcam-fruit").textContent = `${Math.min(this.attempts, WATERMELON_RULES.targetCount)} / ${WATERMELON_RULES.targetCount}`;
  }

  renderTarget() {
    const element = this.$(".outcam-watermelon");
    const visible = this.phase === "playing" && Boolean(this.target);
    element.hidden = !visible;
    if (visible) { element.style.left = `${this.target.x * 100}%`; element.style.top = `${this.target.y * 100}%`; }
  }

  renderHand() {
    const element = this.$(".outcam-hand");
    element.hidden = !this.hand;
    if (this.hand) { element.style.left = `${this.hand.x * 100}%`; element.style.top = `${this.hand.y * 100}%`; }
  }
}
