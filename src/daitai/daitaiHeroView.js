import "./daitai.css";
import { translate } from "../i18n.js";
import { FaceZoneInput } from "../input/faceZoneInput.js";
import { DaitaiHeroGame } from "../games/daitaiHero.js";

const mage = `<svg viewBox="0 0 120 120" fill="none" aria-hidden="true"><path d="M27 92 45 57h30l19 35-16 11H42Z" fill="currentColor"/><path d="m30 51 25-37 11 25 19 8-8 8H35Z" fill="currentColor"/><path d="M43 56h35v25H43Z" fill="#172922"/><path d="M48 63h8v5h-8m11-5h8v5h-8" stroke="#eff2ce" stroke-width="3"/><path d="M85 66v39m-7-42 7-9 8 9-8 9Z" stroke="#e9c66a" stroke-width="4"/><path d="m28 17 3 6 6 2-6 3-3 6-2-6-6-3 6-2Z" fill="#e9c66a"/></svg>`;

export class DaitaiHeroView {
  constructor(root, locale = "ja") {
    this.root = root;
    this.locale = locale;
    this.active = false;
    this.status = "OFF";
    this.screen = "IDLE";
    this.control = "TAP";
    this.cameraGeneration = 0;
    this.game = new DaitaiHeroGame();
    root.classList.add("daitai");
    root.innerHTML = `
      <div class="dh-frame">
        <div class="dh-hud"><div><span data-copy="dhTime"></span><strong class="dh-time">30<span>s</span></strong></div><div><span data-copy="dhScore"></span><strong class="dh-score">0</strong></div><div><span data-copy="dhCombo"></span><strong class="dh-combo">0</strong></div></div>
        <div class="dh-arena">
          <video class="dh-camera" autoplay muted playsinline></video><div class="dh-scrim" aria-hidden="true"></div>
          <div class="dh-arena-top"><span class="dh-source"></span><span class="dh-round" data-copy="dhRound"></span></div>
          <div class="dh-intro"><div class="dh-mage">${mage}</div><span class="dh-tag">ESTIMATION QUEST</span><h2 data-copy="dhConcept"></h2><p data-copy="dhIntro"></p><div class="dh-intro-rule"><span>30s</span><i></i><span>3 CHOICES</span><i></i><span>12 QUESTIONS</span></div></div>
          <div class="dh-setup" hidden><div class="dh-face-guide" aria-hidden="true">＋</div><h2 class="dh-setup-title"></h2><strong class="dh-count"></strong><p class="dh-setup-detail"></p><div class="dh-calibration-bar"><i></i></div></div>
          <div class="dh-play" hidden><div class="dh-question-meta"><span class="dh-category"></span><span class="dh-question-number"></span></div><h2 class="dh-question"></h2><div class="dh-enemy">${mage}</div><div class="dh-feedback" role="status"><strong></strong><p></p></div><div class="dh-position"><div class="dh-position-track"><i></i><b></b></div><span class="dh-input-status"></span></div></div>
          <div class="dh-result" hidden><span class="dh-tag" data-copy="dhFinish"></span><h2 class="dh-result-title"></h2><strong class="dh-result-score"></strong><span data-copy="dhScore"></span><dl>${["Accuracy", "Answers", "Average", "Fastest", "MaxCombo"].map((key) => `<div><dt data-copy="dh${key}"></dt><dd data-result="${key}"></dd></div>`).join("")}</dl></div>
        </div>
        <div class="dh-answers" role="group">${["Left", "Center", "Right"].map((key, index) => `<button class="dh-answer" type="button" data-answer="${index}" disabled><span class="dh-direction"><i aria-hidden="true">${["←", "·", "→"][index]}</i><span data-copy="dh${key}"></span><kbd>${index + 1}</kbd></span><strong class="dh-choice">—</strong><span class="dh-verdict"></span><span class="dh-hold" aria-hidden="true"></span></button>`).join("")}</div>
      </div>
      <p class="dh-message" role="status"></p>
      <div class="dh-actions"><button class="dh-primary dh-camera-button" type="button" data-copy="dhCamera"></button><button class="dh-secondary dh-tap-button" type="button" data-copy="dhTap"></button><button class="dh-primary dh-start-button" type="button" data-copy="dhStart" hidden></button><button class="dh-secondary dh-recalibrate" type="button" data-copy="dhRecalibrate" hidden></button></div>
      <p class="dh-privacy" data-copy="dhPrivacy"></p><details class="dh-how"><summary data-copy="dhHow"></summary><p data-copy="dhCenterHint"></p><p data-copy="dhTapHint"></p></details>
    `;
    this.$ = (selector) => root.querySelector(selector);
    this.video = this.$("video");
    this.input = new FaceZoneInput(this.video, { onStatus: (status) => {
      this.status = status;
      if (status === "ERROR") this.error = true;
    } });
    this.$(".dh-camera-button").addEventListener("click", () => this.startCamera());
    this.$(".dh-tap-button").addEventListener("click", () => this.useTap());
    this.$(".dh-start-button").addEventListener("click", () => this.beginRound());
    this.$(".dh-recalibrate").addEventListener("click", () => this.recalibrate());
    for (const button of root.querySelectorAll("[data-answer]")) {
      let pointerType = "mouse";
      button.addEventListener("pointerdown", (event) => { pointerType = event.pointerType; });
      button.addEventListener("click", (event) => {
        if (event.detail === 0) pointerType = "mouse";
        this.answer(Number(button.dataset.answer), pointerType === "touch" || pointerType === "pen" ? "TOUCH" : "MOUSE");
      });
    }
    window.addEventListener("keydown", (event) => {
      if (!this.active || event.repeat || event.ctrlKey || event.altKey || event.metaKey || !["1", "2", "3"].includes(event.key) ||
        /INPUT|TEXTAREA|SELECT/.test(event.target.tagName)) return;
      event.preventDefault();
      this.answer(Number(event.key) - 1, "MOUSE");
    });
    window.addEventListener("pagehide", () => this.deactivate());
    document.addEventListener("visibilitychange", () => {
      if (this.active) {
        // rAF stops in background tabs. Exclude that gap from play/hold time.
        this.game.lastAt = performance.now();
        this.game.tick(this.game.lastAt, this.input.sample(this.game.lastAt), true);
      }
    });
    this.setLocale(locale);
  }

  t(key, values) { return translate(this.locale, key, values); }
  setLocale(locale) {
    const changed = this.locale !== locale;
    this.locale = locale;
    for (const element of this.root.querySelectorAll("[data-copy]")) element.textContent = this.t(element.dataset.copy);
    this.$(".dh-answers").setAttribute("aria-label", this.t("dhMove"));
    this.render(performance.now());
    if (changed && this.active && this.game.phase === "PLAYING") this.$(".dh-frame").scrollIntoView({ block: "start", behavior: "instant" });
  }

  activate() { this.active = true; this.root.hidden = false; this.frameId = requestAnimationFrame(this.loop); }
  deactivate() {
    this.active = false;
    ++this.cameraGeneration;
    cancelAnimationFrame(this.frameId);
    this.input.stop();
    this.status = "OFF";
    this.screen = "IDLE";
    this.error = false;
    this.game.reset();
    this.root.hidden = true;
  }

  async startCamera() {
    if (["LOADING_MODEL", "REQUESTING_CAMERA", "READY"].includes(this.status)) return;
    const generation = ++this.cameraGeneration;
    this.error = false;
    this.game.reset();
    this.control = "FACE";
    this.screen = "CALIBRATING";
    this.status = "LOADING_MODEL";
    this.render(performance.now());
    try {
      await this.input.start();
      if (generation !== this.cameraGeneration || !this.active) return;
      this.status = "READY";
    } catch (error) {
      if (generation !== this.cameraGeneration || !this.active) return;
      this.input.stop();
      this.status = "ERROR";
      this.error = true;
      this.control = "TAP";
      this.screen = "IDLE";
      this.game.setControl("TAP");
      this.render(performance.now());
    }
  }

  useTap() {
    ++this.cameraGeneration;
    this.input.stop();
    this.status = "OFF";
    this.control = "TAP";
    this.game.setControl("TAP");
    if (!["PLAYING", "COUNTDOWN"].includes(this.game.phase)) this.beginRound();
    this.render(performance.now());
  }

  beginRound() {
    if (!this.active || (this.control === "FACE" && !this.input.sample(performance.now()).ready)) return;
    this.error = false;
    this.game.start(this.control, performance.now());
    this.screen = "COUNTDOWN";
    this.render(performance.now());
    this.$(".dh-frame").scrollIntoView({ block: "start", behavior: "instant" });
  }

  recalibrate() {
    if (["PLAYING", "COUNTDOWN"].includes(this.game.phase)) return;
    this.input.recalibrate();
    this.game.reset();
    this.screen = "CALIBRATING";
  }

  answer(index, source) {
    if (!this.active) return;
    const now = performance.now();
    this.game.tick(now, this.input.sample(now), document.hidden);
    this.game.submitAnswer(index, source);
    this.render(now);
  }

  loop = (timestamp) => {
    if (!this.active) return;
    const previousScreen = this.screen;
    const face = this.input.sample(timestamp);
    if (this.screen === "CALIBRATING" && face.ready) this.beginRound();
    this.game.tick(timestamp, face, document.hidden);
    if (this.game.phase !== "IDLE") this.screen = this.game.phase;
    this.render(timestamp);
    if (this.screen === "PLAYING" && previousScreen !== "PLAYING") this.$(".dh-frame").scrollIntoView({ block: "start", behavior: "instant" });
    this.frameId = requestAnimationFrame(this.loop);
  };

  render(timestamp) {
    const game = this.game;
    const face = this.input.sample(timestamp);
    const renderKey = [this.locale, this.screen, this.status, this.error, this.control,
      game.answerState, game.paused, game.score, game.combo, game.logs.length, game.question?.id,
      game.candidate, Math.floor(game.holdMs / 30), Math.ceil((game.rules.roundMs - game.elapsedMs) / 1000),
      Math.floor(game.countdownMs / 100), Math.floor(face.calibrationProgress * 30), face.visible,
      face.zone, Math.round((face.dx ?? 0) * 100)].join("|");
    // Keep input sampling at frame rate while avoiding identical DOM/live-region
    // writes on every frame, especially on Android and on the result screen.
    if (renderKey === this.lastRenderKey) return;
    this.lastRenderKey = renderKey;
    const playing = this.screen === "PLAYING";
    const result = this.screen === "RESULT";
    const calibrating = this.screen === "CALIBRATING";
    const countdown = this.screen === "COUNTDOWN";
    const loading = ["LOADING_MODEL", "REQUESTING_CAMERA"].includes(this.status);
    const suffix = this.locale === "ja" ? "Ja" : "En";
    this.$(".dh-intro").hidden = this.screen !== "IDLE";
    this.$(".dh-setup").hidden = !calibrating && !countdown;
    this.$(".dh-play").hidden = !playing;
    this.$(".dh-result").hidden = !result;
    this.$(".dh-answers").hidden = !playing;
    this.$(".dh-answers").setAttribute("aria-label", this.t(this.control === "FACE" ? "dhMove" : "dhTouch"));
    this.$(".dh-time").innerHTML = `${Math.ceil((game.rules.roundMs - game.elapsedMs) / 1000)}<span>s</span>`;
    this.$(".dh-time").classList.toggle("dh-urgent", playing && game.elapsedMs >= 25_000);
    this.$(".dh-score").textContent = game.score.toLocaleString(this.locale);
    this.$(".dh-combo").textContent = game.combo;
    this.$(".dh-source").textContent = this.t(this.control === "FACE" ? "dhFaceMode" : "dhTapMode");
    this.root.classList.toggle("dh-has-camera", this.status === "READY");
    if (calibrating || countdown) {
      this.$(".dh-setup-title").textContent = this.t(loading ? "dhLoading" : calibrating ? "dhCalibrate" : game.paused ? "dhLost" : "dhCountdown");
      this.$(".dh-setup-detail").textContent = this.t(calibrating ? "dhStill" : game.paused ? "dhRecover" : this.control === "FACE" ? "dhCenterHint" : "dhTouch");
      this.$(".dh-count").textContent = loading || (calibrating && !face.visible) ? "—" : Math.max(1, Math.ceil(3 * (1 - (calibrating ? face.calibrationProgress : game.countdownMs / game.rules.countdownMs))));
      this.$(".dh-calibration-bar i").style.transform = `scaleX(${calibrating ? face.calibrationProgress : game.countdownMs / game.rules.countdownMs})`;
    }
    const feedback = game.feedback;
    const question = game.question;
    if (question) {
      this.$(".dh-category").textContent = this.t(`dhCategory_${question.category}`);
      this.$(".dh-question-number").textContent = this.t("dhQuestion", { number: game.logs.length + (feedback ? 0 : 1) });
      this.$(".dh-question").textContent = question[`prompt${suffix}`];
      this.$(".dh-feedback strong").textContent = feedback ? this.t(feedback.correct ? "dhCorrect" : "dhWrong") + (feedback.correct ? ` ${feedback.speed}! +${feedback.points}` : "") : "";
      this.$(".dh-feedback p").textContent = feedback ? !feedback.correct ? this.t("dhCorrectAnswer", { answer: question[`choices${suffix}`][question.correctIndex] }) : question[`exactAnswer${suffix}`] ?? "" : "";
      this.$(".dh-enemy").dataset.reaction = feedback ? feedback.correct ? "hit" : "attack" : "idle";
    }
    this.$(".dh-position").hidden = this.control !== "FACE";
    this.$(".dh-position-track b").style.left = `${50 + Math.max(-1, Math.min(1, (face.dx ?? 0) / 0.24)) * 45}%`;
    const statusKey = game.paused ? "dhRecover" : game.answerState === "WAITING_FOR_CENTER" || feedback ? "dhReturn" : game.candidate !== null ? "dhHold" : "dhMove";
    this.$(".dh-input-status").textContent = this.t(statusKey);
    for (const button of this.root.querySelectorAll("[data-answer]")) {
      const index = Number(button.dataset.answer);
      button.querySelector(".dh-choice").textContent = playing && question ? question[`choices${suffix}`][index] : "—";
      button.disabled = !playing || game.paused || !!feedback || game.answerState === "WAITING_FOR_CENTER";
      button.classList.toggle("dh-answer--active", playing && game.candidate === index);
      button.classList.toggle("dh-answer--correct", playing && !!feedback && feedback.correctIndex === index);
      button.classList.toggle("dh-answer--wrong", playing && !!feedback && !feedback.correct && feedback.selectedIndex === index);
      button.setAttribute("aria-pressed", String(playing && (feedback?.selectedIndex === index || game.candidate === index)));
      button.querySelector(".dh-verdict").textContent = playing && feedback ? feedback.correctIndex === index ? `✓ ${this.t("dhCorrect")}` : feedback.selectedIndex === index ? `× ${this.t("dhWrong")}` : "" : "";
      button.querySelector(".dh-hold").style.transform = `scaleX(${game.candidate === index ? Math.min(1, game.holdMs / game.rules.answerHoldMs) : 0})`;
    }
    if (result) {
      const stats = game.result();
      this.$(".dh-result-title").textContent = this.t(`dhTitle${stats.titleIndex}`);
      this.$(".dh-result-score").textContent = stats.score.toLocaleString(this.locale);
      const seconds = (value) => value === null ? "—" : `${(value / 1000).toFixed(2)}s`;
      for (const [key, value] of Object.entries({ Accuracy: `${Math.round(stats.accuracy)}%`, Answers: `${stats.correct} / ${stats.total}`, Average: seconds(stats.averageResponseTimeMs), Fastest: seconds(stats.fastestResponseTimeMs), MaxCombo: stats.maxCombo })) this.$(`[data-result="${key}"]`).textContent = value;
    }
    this.$(".dh-camera-button").hidden = this.status === "READY" || ["PLAYING", "COUNTDOWN"].includes(game.phase);
    this.$(".dh-camera-button").disabled = loading;
    this.$(".dh-camera-button").textContent = this.t(loading ? "dhLoading" : "dhCamera");
    this.$(".dh-tap-button").hidden = this.control === "TAP" && ["PLAYING", "COUNTDOWN", "RESULT"].includes(game.phase);
    this.$(".dh-start-button").hidden = !result;
    this.$(".dh-start-button").disabled = this.control === "FACE" && !face.ready;
    this.$(".dh-start-button").textContent = this.t("dhRetry");
    this.$(".dh-recalibrate").hidden = this.control !== "FACE" || !result;
    this.$(".dh-message").textContent = this.t(this.error ? "dhError" : playing ? game.paused ? "dhRecover" : feedback ? "dhReturn" : this.control === "FACE" ? "dhCenterHint" : "dhTouch" : result ? "dhFinish" : calibrating ? "dhStill" : countdown ? "dhCountdown" : "dhTapHint");
  }
}
