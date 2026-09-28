const LABELS = {
  OPEN: { icon: "✋", text: "OPEN" },
  FIST: { icon: "✊", text: "FIST" },
  PEACE: { icon: "✌️", text: "PEACE" },
  PINCH: { icon: "🤏", text: "PINCH" }
};

const SEQUENCE = [
  "OPEN",
  "FIST",
  "PEACE",
  "PINCH",
  "FIST",
  "OPEN",
  "PINCH",
  "PEACE",
  "OPEN",
  "PEACE",
  "FIST",
  "PINCH",
  "PEACE",
  "OPEN",
  "FIST",
  "PINCH"
];

const BEAT_MS = 920;

export class HandBeat {
  constructor({
    getGesture,
    onTarget,
    onScore,
    onFeedback,
    onProgress,
    onFinish
  }) {
    this.getGesture = getGesture;
    this.onTarget = onTarget;
    this.onScore = onScore;
    this.onFeedback = onFeedback;
    this.onProgress = onProgress;
    this.onFinish = onFinish;

    this.audio = null;
    this.timer = null;
    this.poller = null;

    this.index = -1;
    this.score = 0;
    this.hits = 0;
    this.hitThisBeat = false;
    this.beatStartedAt = 0;
    this.running = false;
  }

  async start() {
    this.stopTimers();

    const AudioContextCtor =
      window.AudioContext ?? window.webkitAudioContext ?? null;

    if (!this.audio && AudioContextCtor) {
      this.audio = new AudioContextCtor();
    }

    if (this.audio?.state === "suspended") {
      await this.audio.resume();
    }

    this.index = -1;
    this.score = 0;
    this.hits = 0;
    this.hitThisBeat = false;
    this.running = true;

    this.onScore({ score: 0, hits: 0, total: SEQUENCE.length });
    this.nextBeat();

    this.timer = setInterval(() => this.nextBeat(), BEAT_MS);
    this.poller = setInterval(() => this.checkGesture(), 34);
  }

  nextBeat() {
    if (!this.running) return;

    this.index += 1;

    if (this.index >= SEQUENCE.length) {
      this.finish();
      return;
    }

    this.hitThisBeat = false;
    this.beatStartedAt = performance.now();

    const current = SEQUENCE[this.index];
    const upcoming = SEQUENCE.slice(this.index + 1, this.index + 4);

    this.onTarget({
      current,
      currentLabel: LABELS[current],
      upcoming: upcoming.map((gesture) => LABELS[gesture])
    });

    this.onProgress((this.index + 1) / SEQUENCE.length);
    this.beep(220, 0.035);
  }

  checkGesture() {
    if (!this.running || this.hitThisBeat || this.index < 0) return;

    const target = SEQUENCE[this.index];
    const gesture = this.getGesture();

    if (gesture !== target) return;

    this.hitThisBeat = true;
    this.hits += 1;

    const elapsed = performance.now() - this.beatStartedAt;
    const ideal = BEAT_MS * 0.45;
    const delta = Math.abs(elapsed - ideal);

    let grade = "HIT";
    let points = 50;

    if (delta < 130) {
      grade = "PERFECT";
      points = 100;
    } else if (delta < 280) {
      grade = "GOOD";
      points = 70;
    }

    this.score += points;

    this.onFeedback({ grade, points });
    this.onScore({
      score: this.score,
      hits: this.hits,
      total: SEQUENCE.length
    });

    this.beep(grade === "PERFECT" ? 660 : 440, 0.05);
  }

  beep(frequency, duration) {
    if (!this.audio) return;

    const oscillator = this.audio.createOscillator();
    const gain = this.audio.createGain();

    oscillator.type = "sine";
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.04, this.audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(
      0.0001,
      this.audio.currentTime + duration
    );

    oscillator.connect(gain);
    gain.connect(this.audio.destination);

    oscillator.start();
    oscillator.stop(this.audio.currentTime + duration);
  }

  finish() {
    if (!this.running) return;

    this.running = false;
    this.stopTimers();

    this.onProgress(1);
    this.onFinish({
      score: this.score,
      hits: this.hits,
      total: SEQUENCE.length,
      accuracy: Math.round((this.hits / SEQUENCE.length) * 100)
    });
  }

  stopTimers() {
    if (this.timer) clearInterval(this.timer);
    if (this.poller) clearInterval(this.poller);
    this.timer = null;
    this.poller = null;
  }

  stop() {
    this.running = false;
    this.stopTimers();
  }
}
