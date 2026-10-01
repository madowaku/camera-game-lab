const DURATION_MS = 15_000;
const ITEM_COUNT = 12;
const ITEM_DURATION_MS = DURATION_MS / ITEM_COUNT;
const CORRECT_HOLD_MS = 180;
const noop = () => {};

const FOODS = [
  { icon: "🍎", name: "apple", eat: true },
  { icon: "🍕", name: "pizza", eat: true },
  { icon: "🥦", name: "broccoli", eat: true },
  { icon: "🍰", name: "cake", eat: true },
  { icon: "🍣", name: "sushi", eat: true },
  { icon: "🍉", name: "watermelon", eat: true }
];

const NOT_FOODS = [
  { icon: "🧦", name: "sock", eat: false },
  { icon: "🧼", name: "soap", eat: false },
  { icon: "🔋", name: "battery", eat: false },
  { icon: "🌵", name: "cactus", eat: false },
  { icon: "👟", name: "shoe", eat: false },
  { icon: "✂️", name: "scissors", eat: false }
];

function shuffled(items) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const other = Math.floor(Math.random() * (index + 1));
    [result[index], result[other]] = [result[other], result[index]];
  }
  return result;
}

function makeSequence() {
  return shuffled([...FOODS, ...NOT_FOODS]);
}

// The round is intentionally simple: open your mouth for food and keep it
// closed for everything else. Input and rendering stay outside the game loop.
export class EatDontEatGame {
  constructor({ getMouth, onTime, onItem, onScore, onFeedback, onFinish } = {}) {
    this.getMouth = getMouth ?? (() => null);
    this.onTime = onTime ?? noop;
    this.onItem = onItem ?? noop;
    this.onScore = onScore ?? noop;
    this.onFeedback = onFeedback ?? noop;
    this.onFinish = onFinish ?? noop;
    this.running = false;
    this.timer = null;
    this.items = [];
    this.itemIndex = -1;
    this.item = null;
    this.itemHit = false;
    this.itemSettled = false;
    this.correctMs = 0;
    this.lastCheckAt = 0;
    this.startedAt = 0;
    this.score = 0;
    this.hits = 0;
  }

  start() {
    this.stop();
    this.items = makeSequence();
    this.itemIndex = -1;
    this.score = 0;
    this.hits = 0;
    this.feedbackClearAt = null;
    this.startedAt = performance.now();
    this.running = true;
    this.onScore(this.getScore());
    this.onFeedback(null);
    this.tick();
    this.timer = setInterval(() => this.tick(), 40);
  }

  getScore() {
    return { score: this.score, hits: this.hits, total: ITEM_COUNT };
  }

  tick() {
    if (!this.running) return;

    const now = performance.now();
    const elapsed = now - this.startedAt;
    const remainingMs = Math.max(0, DURATION_MS - elapsed);

    if (remainingMs === 0) {
      this.finish();
      return;
    }

    const nextIndex = Math.min(
      ITEM_COUNT - 1,
      Math.floor(elapsed / ITEM_DURATION_MS)
    );
    if (nextIndex !== this.itemIndex) this.setItem(nextIndex, now);

    const mouth = this.getMouth();
    const matches = Boolean(mouth?.ready) && mouth.open === this.item.eat;
    const sampleDelta = Math.min(100, Math.max(0, now - this.lastCheckAt));
    this.correctMs = matches ? this.correctMs + sampleDelta : 0;
    this.lastCheckAt = now;

    if (this.correctMs >= CORRECT_HOLD_MS && !this.itemHit) {
      this.itemHit = true;
      this.hits += 1;
      this.score += 100;
      this.feedbackClearAt = now + 420;
      this.onScore(this.getScore());
      this.onFeedback({ grade: "HIT", points: 100 });
    }

    if (this.feedbackClearAt !== null && now >= this.feedbackClearAt) {
      this.feedbackClearAt = null;
      this.onFeedback(null);
    }

    this.onTime({
      remainingMs,
      seconds: Math.ceil(remainingMs / 1000),
      progress: elapsed / DURATION_MS
    });
  }

  setItem(index, now) {
    if (this.item && !this.itemSettled) this.settleItem(now);

    this.itemIndex = index;
    this.item = this.items[index];
    this.itemHit = false;
    this.itemSettled = false;
    this.correctMs = 0;
    this.lastCheckAt = now;
    this.onItem({ ...this.item, index, total: ITEM_COUNT });
  }

  settleItem(now = performance.now()) {
    if (this.itemSettled) return;
    this.itemSettled = true;
    if (!this.itemHit) {
      this.feedbackClearAt = now + 420;
      this.onFeedback({ grade: "MISS", points: 0 });
    }
  }

  finish() {
    if (!this.running) return;
    this.settleItem();
    const result = {
      ...this.getScore(),
      accuracy: Math.round(this.hits / ITEM_COUNT * 100),
      durationMs: DURATION_MS
    };
    this.stop();
    this.onTime({ remainingMs: 0, seconds: 0, progress: 1 });
    this.onFinish(result);
  }

  stop() {
    this.running = false;
    if (this.timer !== null) clearInterval(this.timer);
    this.timer = null;
    this.item = null;
    this.itemIndex = -1;
    this.itemSettled = true;
    this.feedbackClearAt = null;
    this.onItem(null);
    this.onFeedback(null);
  }
}
