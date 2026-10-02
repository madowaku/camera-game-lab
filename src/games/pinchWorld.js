export const PINCH_STAGES = Object.freeze([
  { name: "PICK", shape: "circle", x: .23, y: .58, radius: .07, socket: { x: .77, y: .38, radius: .12, shape: "circle" }, barriers: [] },
  { name: "CARRY", shape: "square", x: .2, y: .48, radius: .067, socket: { x: .8, y: .48, radius: .115, shape: "square" }, barriers: [{ x: .455, y: 0, width: .09, height: .66 }] },
  { name: "PLACE", shape: "triangle", x: .24, y: .65, radius: .074, socket: { x: .75, y: .33, radius: .09, shape: "triangle" }, barriers: [] },
]);
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const validPosition = (p) => p && Number.isFinite(p.x) && Number.isFinite(p.y);

// Swept point vs expanded wall, so a fast finger movement cannot tunnel through.
function intersect(start, delta, wall, radius) {
  const min = { x: wall.x - radius, y: wall.y - radius }, max = { x: wall.x + wall.width + radius, y: wall.y + wall.height + radius };
  let enter = -Infinity, exit = Infinity, axis = null;
  for (const key of ["x", "y"]) {
    if (Math.abs(delta[key]) < 1e-10) { if (start[key] <= min[key] || start[key] >= max[key]) return null; }
    else {
      const a = (min[key] - start[key]) / delta[key], b = (max[key] - start[key]) / delta[key];
      if (Math.min(a, b) > enter) { enter = Math.min(a, b); axis = key; }
      exit = Math.min(exit, Math.max(a, b));
    }
  }
  return enter >= -1e-9 && enter <= 1 && exit >= Math.max(0, enter) ? { time: Math.max(0, enter), axis } : null;
}

export function moveInWorld(position, target, radius, barriers) {
  let point = { ...position }, delta = { x: clamp(target.x, radius, 1 - radius) - position.x, y: clamp(target.y, radius, 1 - radius) - position.y }, blocked = false;
  for (let i = 0; i < 3; i++) {
    const hit = barriers.map((wall) => intersect(point, delta, wall, radius)).filter(Boolean).sort((a, b) => a.time - b.time)[0];
    if (!hit) { point.x += delta.x; point.y += delta.y; break; }
    const fraction = Math.max(0, hit.time - 0.000001);
    point.x += delta.x * fraction; point.y += delta.y * fraction;
    delta = { x: delta.x * (1 - fraction), y: delta.y * (1 - fraction) }; delta[hit.axis] = 0; blocked = true;
  }
  return { ...point, blocked };
}

export function socketAccepts(object, socket) {
  return object.shape === socket.shape && distance(object, socket) <= socket.radius - object.radius * .4;
}

export class PinchWorldGame {
  constructor({ onEffect = () => {} } = {}) { this.onEffect = onEffect; this.phase = "idle"; }
  start(source = "camera") {
    Object.assign(this, { phase: "wait", source, elapsedMs: 0, readyMs: 0, countdownMs: 0, lostMs: 0, paused: false, manualPause: false,
      successfulGrabs: 0, failedPinches: 0, accidentalReleases: 0, trackingDrops: 0, completed: 0, heldObjectId: null, neutral: false, wasPinching: false, blocked: false, result: null });
    this.loadStage(0);
  }
  loadStage(index) {
    this.stageIndex = index; this.stage = PINCH_STAGES[index];
    const { x, y, radius, shape } = this.stage;
    this.object = { id: `object-${index}`, x, y, radius, shape }; this.socket = this.stage.socket; this.barriers = this.stage.barriers;
  }
  setPaused(value) { this.manualPause = value; }
  step(deltaMs, input) {
    if (!["wait", "countdown", "playing"].includes(this.phase) || !Number.isFinite(deltaMs) || deltaMs <= 0) return;
    if (this.manualPause) { this.paused = true; return; }
    const present = input?.present && validPosition(input.pinchPosition);
    if (!present) {
      this.paused = true; this.lostMs += deltaMs; this.readyMs = 0;
      if (this.phase === "countdown") { this.phase = "wait"; this.countdownMs = 0; }
      if (this.lostMs >= 300) {
        if (this.heldObjectId) this.release(true);
        this.neutral = false; this.wasPinching = true;
      }
      return;
    }
    this.paused = false; this.lostMs = 0;
    if (!input.pinching) this.neutral = true;
    if (this.phase === "wait") {
      this.readyMs = input.pinching ? 0 : this.readyMs + deltaMs;
      if (this.readyMs >= 400) this.phase = "countdown";
      this.wasPinching = !!input.pinching; return;
    }
    if (this.phase === "countdown") {
      this.countdownMs += deltaMs;
      if (this.countdownMs >= 800) { this.phase = "playing"; this.neutral = !input.pinching; }
      this.wasPinching = !!input.pinching; return;
    }
    this.elapsedMs += deltaMs;
    const events = input.events ?? [];
    if (!this.heldObjectId && input.pinching && !this.wasPinching && this.neutral && events.includes("PINCH_START")) {
      this.neutral = false;
      if (distance(input.pinchPosition, this.object) <= this.object.radius * 1.4) {
        this.heldObjectId = this.object.id; this.successfulGrabs++; this.onEffect("grab");
      } else { this.failedPinches++; this.onEffect("miss"); }
    }
    if (this.heldObjectId && input.pinching) {
      const blend = 1 - Math.exp(-18 * deltaMs / 1000);
      const target = { x: this.object.x + (input.pinchPosition.x - this.object.x) * blend, y: this.object.y + (input.pinchPosition.y - this.object.y) * blend };
      const legal = moveInWorld(this.object, target, this.object.radius, this.barriers);
      this.object.x = legal.x; this.object.y = legal.y;
      if (legal.blocked && !this.blocked) this.onEffect("blocked");
      this.blocked = legal.blocked;
    }
    // Missing tracking is handled above, never as a normal release / socket win.
    if (this.heldObjectId && !input.pinching && events.includes("PINCH_END")) this.release(false);
    this.wasPinching = !!input.pinching;
  }
  release(trackingLoss) {
    this.heldObjectId = null; this.blocked = false;
    if (trackingLoss) { this.trackingDrops++; this.neutral = false; this.onEffect("tracking-drop"); return; }
    if (socketAccepts(this.object, this.socket)) {
      this.completed++; this.onEffect("place");
      if (this.completed === PINCH_STAGES.length) {
        this.phase = "result"; this.object.x = this.socket.x; this.object.y = this.socket.y;
        this.result = { score: this.completed, seconds: this.elapsedMs / 1000, successfulGrabs: this.successfulGrabs, failedPinches: this.failedPinches,
          accidentalReleases: this.accidentalReleases, trackingDrops: this.trackingDrops, clean: this.successfulGrabs === 3 && this.failedPinches === 0 && this.accidentalReleases === 0 && this.trackingDrops === 0, source: this.source };
      } else this.loadStage(this.completed);
    } else { this.accidentalReleases++; this.onEffect("release"); }
  }
}
