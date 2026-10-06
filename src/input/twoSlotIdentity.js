const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

/**
 * Assigns up to two observed points to stable player/hand slots.
 *
 * This layer owns identity only. It deliberately does not decide gesture
 * state, game-space projection, rendering smoothing, or collision behavior.
 * Consumers keep those policies locally.
 */
export class TwoSlotIdentity {
  constructor({
    anchors = [{ x: .28, y: .5 }, { x: .72, y: .5 }],
    missingCost = 4,
    labelPenalty = 0,
    predictSeconds = .15,
    continuousMs = 150,
    jumpWindowMs = 100,
    jumpDistance = Infinity,
    velocityLimit = 3,
    ambiguityMargin = 0,
    farDistance = Infinity,
    farPenalty = 0,
  } = {}) {
    this.anchors = anchors;
    this.missingCost = missingCost;
    this.labelPenalty = labelPenalty;
    this.predictSeconds = predictSeconds;
    this.continuousMs = continuousMs;
    this.jumpWindowMs = jumpWindowMs;
    this.jumpDistance = jumpDistance;
    this.velocityLimit = velocityLimit;
    this.ambiguityMargin = ambiguityMargin;
    this.farDistance = farDistance;
    this.farPenalty = farPenalty;
    this.reset();
  }

  reset() {
    this.slots = [null, null];
  }

  prediction(side, now) {
    const slot = this.slots[side];
    if (!slot) return this.anchors[side];
    const dt = Math.min(this.predictSeconds, Math.max(0, now - slot.seenAt) / 1000);
    return { x: slot.x + slot.vx * dt, y: slot.y + slot.vy * dt };
  }

  candidateCost(candidate, side, now) {
    const predicted = this.prediction(side, now);
    const d = distance(candidate, predicted);
    let cost = d + (d > this.farDistance ? this.farPenalty : 0);
    const old = this.slots[side];
    if (this.labelPenalty && old?.label && candidate.label && old.label !== candidate.label) {
      cost += this.labelPenalty;
    }
    return cost;
  }

  update(candidates, now) {
    const valid = (candidates ?? []).filter(point =>
      point && Number.isFinite(point.x) && Number.isFinite(point.y)
    );

    const assignments = [];
    for (let a = -1; a < valid.length; a++) {
      for (let b = -1; b < valid.length; b++) {
        if (a >= 0 && a === b) continue;
        const pair = [a, b];
        const cost = pair.reduce((sum, index, side) =>
          sum + (index < 0 ? this.missingCost : this.candidateCost(valid[index], side, now)), 0);
        assignments.push({ pair, cost });
      }
    }
    assignments.sort((left, right) => left.cost - right.cost);

    const best = assignments[0] ?? { pair: [-1, -1], cost: Infinity };
    const ambiguous = this.ambiguityMargin > 0 &&
      assignments[1] &&
      assignments[1].cost - best.cost < this.ambiguityMargin &&
      best.pair.some(index => index >= 0);

    return best.pair.map((index, side) => {
      const point = index >= 0 ? valid[index] : null;
      const old = this.slots[side];
      const age = old ? now - old.seenAt : Infinity;
      const jumped = old && point && age <= this.jumpWindowMs &&
        distance(point, old) >= this.jumpDistance;

      if (!point || ambiguous || jumped) {
        if (old) old.present = false;
        return {
          ...(old ?? this.anchors[side]),
          slot: side,
          present: false,
          continuous: false,
          uncertain: Boolean(ambiguous || jumped),
        };
      }

      const continuous = Boolean(old && old.present && age >= 0 && age < this.continuousMs);
      const dt = continuous ? Math.max(.016, age / 1000) : 0;
      const vx = continuous
        ? clamp((point.x - old.x) / dt, -this.velocityLimit, this.velocityLimit)
        : 0;
      const vy = continuous
        ? clamp((point.y - old.y) / dt, -this.velocityLimit, this.velocityLimit)
        : 0;

      const slot = {
        ...point,
        label: point.label ?? old?.label ?? null,
        slot: side,
        seenAt: now,
        present: true,
        continuous,
        vx,
        vy,
      };
      this.slots[side] = slot;
      return { ...slot };
    });
  }
}
