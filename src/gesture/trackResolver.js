// Small exhaustive assignment (at most two tracks) that refuses ambiguous ownership.
const distance = (a, b, aspect) => Math.hypot((a.x - b.x) * aspect, a.y - b.y);
const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

export class TrackResolver {
  constructor({ maxHands = 1, maxDistance = 0.28, ambiguityMargin = 0.04,
    lostMs = 300 } = {}) {
    if (![1, 2].includes(maxHands) || !(maxDistance > 0) || ambiguityMargin < 0 || lostMs < 0)
      throw new RangeError('invalid TrackResolver configuration');
    Object.assign(this, { maxHands, maxDistance, ambiguityMargin, lostMs });
    this.reset();
  }
  reset() { this.tracks = []; }
  createTrack(obs, atMs) {
    const track = { id: 'hand-' + (this.tracks.length + 1), palm: { ...obs.palm },
      handScale: obs.handScale, lastSeenAt: atMs, vx: 0, vy: 0 };
    this.tracks.push(track);
    return track;
  }
  record(track, obs, atMs) {
    const elapsed = (atMs - track.lastSeenAt) / 1000;
    if (elapsed > 0 && elapsed <= .2) {
      track.vx = clamp((obs.palm.x - track.palm.x) / elapsed, -2, 2);
      track.vy = clamp((obs.palm.y - track.palm.y) / elapsed, -2, 2);
    } else track.vx = track.vy = 0;
    track.palm = { ...obs.palm };
    track.handScale = obs.handScale;
    track.lastSeenAt = atMs;
  }
  cost(track, obs, atMs) {
    const ms = Math.max(0, atMs - track.lastSeenAt);
    // A single-player gesture may rebind on reacquisition; two-player slots stay reserved.
    if (ms > this.lostMs && this.maxHands === 1) return 0.1;
    const dt = Math.min(.12, ms / 1000);
    const pred = { x: track.palm.x + track.vx * dt, y: track.palm.y + track.vy * dt };
    const d = distance(pred, obs.palm, obs.videoAspect);
    const ratio = obs.handScale / track.handScale;
    if (d > this.maxDistance || ratio > 2 || ratio < .5) return Infinity;
    return d + Math.abs(Math.log(ratio)) * .035;
  }
  resolve(observations, atMs) {
    const matches = new Map(), ambiguousIds = new Set();
    const hands = observations.slice(0, this.maxHands + 1);
    if (!this.tracks.length) {
      for (const obs of [...hands].sort((a, b) => a.palm.x - b.palm.x).slice(0, this.maxHands)) {
        const track = this.createTrack(obs, atMs);
        matches.set(track.id, obs);
      }
      return { matches, ambiguousIds, trackIds: this.tracks.map(t => t.id) };
    }
    const assignments = [];
    const walk = (index, used, pair, cost) => {
      if (index === this.tracks.length) {
        assignments.push({ pair: [...pair], cost });
        return;
      }
      pair.push(-1);
      walk(index + 1, used, pair, cost + 0.37);
      pair.pop();
      for (let j = 0; j < hands.length; j++) {
        if (used.has(j)) continue;
        const c = this.cost(this.tracks[index], hands[j], atMs);
        if (!Number.isFinite(c)) continue;
        used.add(j); pair.push(j);
        walk(index + 1, used, pair, cost + c);
        pair.pop(); used.delete(j);
      }
    };
    walk(0, new Set(), [], 0);
    assignments.sort((a, b) => a.cost - b.cost);
    const best = assignments[0];
    // If near-equivalent assignment changes an owner's candidate, abstain on that owner.
    for (const candidate of assignments.slice(1)) {
      if (candidate.cost - best.cost > this.ambiguityMargin) break;
      for (let i = 0; i < this.tracks.length; i++) {
        if (candidate.pair[i] !== best.pair[i]) ambiguousIds.add(this.tracks[i].id);
      }
    }
    const used = new Set();
    for (let i = 0; i < this.tracks.length; i++) {
      const track = this.tracks[i], choice = best.pair[i];
      if (choice < 0 || ambiguousIds.has(track.id)) continue;
      this.record(track, hands[choice], atMs);
      matches.set(track.id, hands[choice]);
      used.add(choice);
    }
    // Only fresh, unmatched observations can initialize a previously empty slot.
    if (ambiguousIds.size === 0) {
      for (let j = 0; j < hands.length && this.tracks.length < this.maxHands; j++) {
        if (used.has(j)) continue;
        const track = this.createTrack(hands[j], atMs);
        matches.set(track.id, hands[j]);
      }
    }
    return { matches, ambiguousIds, trackIds: this.tracks.map(t => t.id) };
  }
}
