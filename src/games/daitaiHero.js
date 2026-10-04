import { createQuestionDeck } from "../daitai/questions.js";

export const DAITAI_RULES = Object.freeze({ roundMs: 30_000, countdownMs: 3000, answerHoldMs: 180, neutralHoldMs: 180, feedbackMs: 550 });
const MANUAL = { ready: true, neutral: true, zone: "NEUTRAL" };

export class DaitaiHeroGame {
  constructor({ random = Math.random, rules = {} } = {}) {
    this.random = random;
    this.rules = { ...DAITAI_RULES, ...rules };
    this.reset();
  }

  reset() {
    this.phase = "IDLE";
    this.answerState = "READY";
    this.control = "TAP";
    this.elapsedMs = 0;
    this.countdownMs = 0;
    this.lastAt = null;
    this.questionShownAt = 0;
    this.question = null;
    this.deck = [];
    this.logs = [];
    this.score = this.combo = this.maxCombo = 0;
    this.feedback = null;
    this.clearChoice();
    this.neutralMs = 0;
    this.paused = false;
    this.lastNodId = null;
    this.choiceReadyAt = null;
  }

  start(control = "TAP", timestamp = 0) {
    this.reset();
    this.control = control;
    this.phase = "COUNTDOWN";
    this.lastAt = timestamp;
    this.deck = createQuestionDeck(this.random);
  }

  setControl(control) {
    this.control = control;
    this.clearChoice();
    if (this.phase === "PLAYING" && !this.feedback) {
      this.answerState = control === "FACE" ? "WAITING_FOR_CENTER" : "READY";
      this.neutralMs = 0;
    }
  }

  clearChoice() { this.candidate = null; this.holdMs = 0; }

  nextQuestion() {
    if (!this.deck.length) this.deck = createQuestionDeck(this.random, this.logs.slice(-2).map((l) => l.category));
    this.question = this.deck.shift();
    this.questionShownAt = this.elapsedMs;
    this.answerState = "READY";
    this.feedback = null;
    this.clearChoice();
    this.choiceReadyAt = this.lastAt;
  }

  tick(timestamp, face = MANUAL, suspended = false) {
    const dt = this.lastAt === null ? 0 : Math.max(0, timestamp - this.lastAt);
    this.lastAt = timestamp;
    if (!["COUNTDOWN", "PLAYING"].includes(this.phase)) return;
    const input = this.control === "FACE" ? face : MANUAL;
    // Samples are also read by rendering. Consume each nod sequence only once,
    // including nods seen during countdown, feedback, pause and recovery.
    const nodId = input.nodId ?? 0;
    const freshNod = this.lastNodId !== null && nodId > this.lastNodId;
    this.lastNodId = nodId;
    this.paused = suspended || !input.ready;
    if (this.paused) {
      this.clearChoice();
      this.neutralMs = 0;
      if (this.phase === "PLAYING" && !this.feedback) this.answerState = "WAITING_FOR_CENTER";
      return;
    }
    if (this.phase === "COUNTDOWN") {
      // Starting off-center cannot arm a held answer on the first question.
      if (this.control === "FACE" && !input.neutral) { this.countdownMs = 0; return; }
      this.countdownMs += dt;
      if (this.countdownMs >= this.rules.countdownMs) {
        this.phase = "PLAYING";
        this.nextQuestion();
      }
      return;
    }
    this.elapsedMs = Math.min(this.rules.roundMs, this.elapsedMs + dt);
    if (this.elapsedMs >= this.rules.roundMs) {
      this.phase = "RESULT";
      this.clearChoice();
      return;
    }
    if (this.feedback) {
      this.answerState = "WAITING_FOR_CENTER";
      this.neutralMs = input.neutral ? this.neutralMs + dt : 0;
      if (this.elapsedMs - this.feedback.at >= this.rules.feedbackMs && this.neutralMs >= this.rules.neutralHoldMs) this.nextQuestion();
      return;
    }
    if (this.answerState === "WAITING_FOR_CENTER") {
      this.neutralMs = input.neutral ? this.neutralMs + dt : 0;
      if (this.neutralMs >= this.rules.neutralHoldMs) { this.answerState = "READY"; this.clearChoice(); this.choiceReadyAt = timestamp; }
      return;
    }
    if (this.control !== "FACE") return;
    if (freshNod && input.neutral && Number.isFinite(input.nodStartedAt) && input.nodStartedAt >= this.choiceReadyAt) {
      this.submitAnswer(1, "FACE");
      return;
    }
    if (input.zone === "NEUTRAL" && input.nodProgress > 0) {
      this.candidate = 1;
      this.holdMs = input.nodProgress * this.rules.answerHoldMs;
      this.answerState = "CHOOSING";
      return;
    }
    const candidate = input.zone === "LEFT" ? 0 : input.zone === "RIGHT" ? 2
      : null;
    if (candidate === null) {
      this.candidate = null; this.holdMs = 0; this.answerState = "READY";
      return;
    }
    if (candidate !== this.candidate) { this.candidate = candidate; this.holdMs = 0; }
    else this.holdMs += dt;
    this.answerState = "CHOOSING";
    if (this.holdMs >= this.rules.answerHoldMs) this.submitAnswer(candidate, "FACE");
  }

  submitAnswer(index, inputType = "MOUSE") {
    if (this.phase !== "PLAYING" || this.paused || this.feedback || this.answerState === "WAITING_FOR_CENTER" ||
      !Number.isInteger(index) || index < 0 || index > 2 || !["FACE", "TOUCH", "MOUSE"].includes(inputType)) return false;
    const responseTimeMs = Math.max(0, this.elapsedMs - this.questionShownAt);
    const correct = index === this.question.correctIndex;
    const speed = responseTimeMs <= 800 ? "INTUITION" : responseTimeMs <= 1500 ? "QUICK" : responseTimeMs <= 3000 ? "GOOD" : "SAFE";
    const bonus = { INTUITION: 100, QUICK: 50, GOOD: 20, SAFE: 0 }[speed];
    this.combo = correct ? this.combo + 1 : 0;
    this.maxCombo = Math.max(this.maxCombo, this.combo);
    const points = correct ? 100 + bonus : 0;
    this.score += points;
    const log = { questionId: this.question.id, category: this.question.category, correct, selectedIndex: index,
      correctIndex: this.question.correctIndex, responseTimeMs, inputType };
    this.logs.push(log);
    this.feedback = { ...log, at: this.elapsedMs, speed, points };
    this.answerState = "ANSWERED";
    this.neutralMs = 0;
    this.clearChoice();
    return true;
  }

  result() {
    const correct = this.logs.filter((l) => l.correct).length;
    const times = this.logs.map((l) => l.responseTimeMs);
    const accuracy = times.length ? correct / times.length * 100 : 0;
    return { score: this.score, correct, total: times.length, accuracy, maxCombo: this.maxCombo,
      averageResponseTimeMs: times.length ? times.reduce((a, b) => a + b, 0) / times.length : null,
      fastestResponseTimeMs: times.length ? Math.min(...times) : null,
      titleIndex: accuracy < 50 ? 0 : accuracy < 70 ? 1 : accuracy < 85 ? 2 : accuracy < 95 ? 3 : 4 };
  }
}
