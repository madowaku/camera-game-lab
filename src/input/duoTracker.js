import { DUO_CONFIG, clamp } from "./duoConfig.js";

const emptyPlayer = (id) => ({
  id, trackId: id, present: false, lost: false, lostMs: 0,
  calibrated: false, faceX: 0, faceY: 0, faceScale: 1, tilt: 0,
  mouthOpen: false, mouthValue: 0, eyesClosed: false, confidence: 0,
  center: null, box: null, neutral: null
});
const average = (samples, key) => samples.reduce((sum, sample) => sum + sample[key], 0) / samples.length;
const validDetection = (d) => d && [d.x, d.y, d.scale, d.tilt, d.mouth].every(Number.isFinite) &&
  d.x >= 0 && d.x <= 1 && d.y >= 0 && d.y <= 1 && d.scale > 0;

// Position/velocity matching owns identity. Slots stay reserved until explicit
// recalibration; detector array order and crossing the center never rename P1/P2.
export class DuoTracker {
  constructor(config = DUO_CONFIG) {
    this.config = config;
    this.reset();
  }

  reset() {
    this.tracks = [1, 2].map((id) => ({
      player: emptyPlayer(id), detection: null, seenAt: null,
      vx: 0, vy: 0, wasMissing: false, mouthArmed: false,
      pendingMouth: null, pendingAt: 0
    }));
    this.samples = [];
    this.events = [];
    this.lastFrameAt = null;
    this.firstFrameAt = null;
    this.frameCount = 0;
    this.frameTimes = [];
    this.fpsTimestamp = null;
    this.calibrationProgress = 0;
    this.ambiguous = false;
    this.metrics = { playerLossCount: 0, successfulRecoveryCount: 0, identitySwapSuspicionCount: 0, inputEvents: [0, 0] };
  }

  recalibrate() {
    // Preserve existing identities when recalibrating from pause/result.
    for (const track of this.tracks) {
      track.player.neutral = null;
      track.player.calibrated = false;
      track.player.mouthOpen = false;
      track.mouthArmed = false;
      track.pendingMouth = null;
    }
    this.samples = [];
    this.calibrationProgress = 0;
    this.events = [];
  }

  cost(track, detection, timestamp) {
    if (!track.detection) return Infinity;
    const elapsed = Math.min(0.2, Math.max(0, timestamp - track.seenAt) / 1000);
    const predictedX = track.detection.x + track.vx * elapsed;
    const predictedY = track.detection.y + track.vy * elapsed;
    const distance = Math.hypot(detection.x - predictedX, detection.y - predictedY);
    const ratio = detection.scale / track.detection.scale;
    if (distance > this.config.maxMatchDistance || ratio > this.config.maxScaleRatio ||
      ratio < 1 / this.config.maxScaleRatio) return Infinity;
    return distance + Math.abs(Math.log(ratio)) * 0.055;
  }

  match(detections, timestamp) {
    if (this.tracks.every((track) => !track.detection)) {
      // Initial assignment needs BOTH faces. A lone face cannot claim a slot.
      if (detections.length !== 2) return [null, null];
      return [...detections].sort((a, b) => a.x - b.x);
    }
    const choices = [];
    const indices = [-1, ...detections.map((_, index) => index)];
    for (const a of indices) for (const b of indices) {
      if (a >= 0 && a === b) continue;
      const pair = [a, b];
      const costs = pair.map((index, player) => index < 0 ? 0.35 : this.cost(this.tracks[player], detections[index], timestamp));
      if (costs.some((cost) => !Number.isFinite(cost))) continue;
      choices.push({ pair, cost: costs[0] + costs[1] });
    }
    choices.sort((a, b) => a.cost - b.cost);
    const close = choices.length > 1 && choices[1].cost - choices[0].cost < this.config.ambiguousMatchMargin;
    if (close && !this.ambiguous) this.metrics.identitySwapSuspicionCount += 1;
    this.ambiguous = close;
    // Ambiguous one-face overlap must not silently give one person's controls
    // to the other. Freeze until matching is distinguishable again.
    if (close) return [null, null];
    return choices[0]?.pair.map((index) => detections[index] ?? null) ?? [null, null];
  }

  update(detections, timestamp) {
    if (!Number.isFinite(timestamp)) return this.snapshot();
    if (this.lastFrameAt !== null && timestamp <= this.lastFrameAt) return this.snapshot();
    const gap = this.lastFrameAt === null ? Infinity : timestamp - this.lastFrameAt;
    if (gap > this.config.maxFrameGapMs) this.samples = [];
    this.lastFrameAt = timestamp;
    this.firstFrameAt ??= timestamp;
    this.frameCount += 1;
    this.frameTimes.push(timestamp);
    this.updateFpsWindow(timestamp);
    const matches = this.match(detections.filter(validDetection).slice(0, 2), timestamp);
    for (let index = 0; index < 2; index += 1) {
      const track = this.tracks[index];
      const detection = matches[index];
      if (!detection) {
        this.markMissing(track, timestamp);
        continue;
      }
      const elapsed = track.seenAt === null ? 0 : (timestamp - track.seenAt) / 1000;
      if (track.detection && elapsed > 0 && elapsed < 0.3) {
        track.vx = clamp((detection.x - track.detection.x) / elapsed, -0.8, 0.8);
        track.vy = clamp((detection.y - track.detection.y) / elapsed, -0.8, 0.8);
      } else {
        track.vx = track.vy = 0;
      }
      if (track.player.lost) {
        this.metrics.successfulRecoveryCount += 1;
        this.emit("PLAYER_RETURNED", index, timestamp);
      }
      if (track.wasMissing || gap > this.config.maxFrameGapMs) {
        track.mouthArmed = false;
        track.player.mouthOpen = false;
        track.pendingMouth = null;
      }
      track.wasMissing = false;
      track.detection = { ...detection };
      track.seenAt = timestamp;
      Object.assign(track.player, {
        present: true, lost: false, lostMs: 0,
        center: { x: detection.x, y: detection.y }, box: detection.box ?? null,
        confidence: detection.confidence ?? 1, eyesClosed: Boolean(detection.eyesClosed)
      });
      this.normalize(track, index, timestamp);
    }
    this.calibrate(matches, timestamp);
    return this.snapshot();
  }

  markMissing(track, timestamp) {
    const player = track.player;
    player.present = false;
    player.confidence = 0;
    player.faceX = player.faceY = player.tilt = 0;
    player.mouthOpen = false;
    track.pendingMouth = null;
    track.mouthArmed = false;
    track.wasMissing = true;
    player.lostMs = track.seenAt === null ? 0 : Math.max(0, timestamp - track.seenAt);
    if (track.seenAt !== null && player.lostMs >= this.config.playerLostGraceMs && !player.lost) {
      player.lost = true;
      this.metrics.playerLossCount += 1;
      this.emit("PLAYER_LOST", player.id - 1, timestamp);
    }
  }

  advance(timestamp) {
    this.updateFpsWindow(timestamp);
    // A stalled/ended video is loss too, even when inference stops producing frames.
    for (const track of this.tracks) {
      if (track.seenAt !== null && timestamp - track.seenAt > this.config.maxFrameGapMs) {
        this.markMissing(track, timestamp);
      }
    }
    if (this.tracks.some((track) => !track.player.present) && !this.ready) {
      this.samples = [];
      this.calibrationProgress = 0;
    }
    return this.snapshot();
  }

  calibrate(matches, timestamp) {
    if (this.ready) return;
    const cfg = this.config;
    if (matches.some((detection) => !detection || detection.mouth > cfg.closedMouthMax)) {
      this.samples = [];
      this.calibrationProgress = 0;
      return;
    }
    const initial = this.samples[0]?.matches;
    if (initial && matches.some((d, index) => Math.hypot(d.x - initial[index].x, d.y - initial[index].y) > cfg.stablePosition ||
      Math.abs(d.scale / initial[index].scale - 1) > cfg.stableScaleRatio || Math.abs(d.tilt - initial[index].tilt) > cfg.stableTilt)) {
      this.samples = [];
    }
    this.samples.push({ matches: matches.map((d) => ({ ...d })), timestamp });
    this.calibrationProgress = Math.min(1, (timestamp - this.samples[0].timestamp) / cfg.calibrationMs,
      this.samples.length / cfg.calibrationSamples);
    if (this.calibrationProgress < 1) return;
    this.tracks.forEach((track, index) => {
      const samples = this.samples.map((sample) => sample.matches[index]);
      track.player.neutral = Object.fromEntries(["x", "y", "scale", "tilt", "mouth"].map((key) => [key, average(samples, key)]));
      track.player.calibrated = true;
      track.mouthArmed = true;
    });
    this.samples = [];
  }

  normalize(track, index, timestamp) {
    const { player, detection: d } = track;
    const n = player.neutral;
    if (!n) return;
    Object.assign(player, {
      faceX: clamp((d.x - n.x) / (n.scale * this.config.faceRange)),
      faceY: clamp((d.y - n.y) / (n.scale * this.config.faceRange)),
      faceScale: d.scale / n.scale,
      tilt: clamp((d.tilt - n.tilt) / this.config.tiltRange),
      mouthValue: clamp((d.mouth - n.mouth) / 0.45, 0, 1)
    });
    const delta = d.mouth - n.mouth;
    if (delta <= this.config.mouthCloseDelta) track.mouthArmed = true;
    const candidate = delta >= this.config.mouthOpenDelta ? true : delta <= this.config.mouthCloseDelta ? false : player.mouthOpen;
    if (candidate === player.mouthOpen || (candidate && !track.mouthArmed)) {
      track.pendingMouth = null;
      return;
    }
    if (track.pendingMouth !== candidate) {
      track.pendingMouth = candidate;
      track.pendingAt = timestamp;
    } else if (timestamp - track.pendingAt >= this.config.mouthHoldMs) {
      player.mouthOpen = candidate;
      track.pendingMouth = null;
      this.emit(candidate ? "MOUTH_OPEN_START" : "MOUTH_OPEN_END", index, timestamp);
    }
  }

  emit(type, index, timestamp) {
    this.events.push({ type, playerId: index + 1, timestamp });
    if (type.startsWith("MOUTH_")) this.metrics.inputEvents[index] += 1;
    // A hidden tab must not accumulate unbounded stale actions.
    if (this.events.length > 100) this.events.shift();
  }

  get ready() { return this.tracks.every((track) => track.player.calibrated); }

  updateFpsWindow(timestamp) {
    if (!Number.isFinite(timestamp) || (this.fpsTimestamp !== null && timestamp < this.fpsTimestamp)) return;
    this.fpsTimestamp = timestamp;
    while (this.frameTimes.length && this.frameTimes[0] <= timestamp - 1000) this.frameTimes.shift();
  }

  snapshot() {
    return {
      players: this.tracks.map(({ player }) => ({ ...player })),
      ready: this.ready, calibrationProgress: this.calibrationProgress,
      metrics: { ...this.metrics, inputEvents: [...this.metrics.inputEvents],
        inferenceFrames: this.frameCount, inferenceTimestamp: this.lastFrameAt,
        currentInferenceFps: this.firstFrameAt !== null && this.fpsTimestamp - this.firstFrameAt >= 1000 ? this.frameTimes.length : null,
        averageInferenceFps: this.lastFrameAt > this.firstFrameAt ? (this.frameCount - 1) * 1000 / (this.lastFrameAt - this.firstFrameAt) : 0 }
    };
  }

  consumeEvents() { return this.events.splice(0); }
}
