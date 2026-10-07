import { GameEventBus } from '../events/GameEventBus.js';
const unit = value => Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
const number = value => Number.isFinite(value) ? value : 0;
const hand = value => value && Object.freeze({
  visible: !!value.visible && Number.isFinite(value.x) && Number.isFinite(value.y) && value.x >= 0 && value.x <= 1 && value.y >= 0 && value.y <= 1,
  confidence: unit(value.confidence), x: unit(value.x), y: unit(value.y),
  velocityX: number(value.velocityX), velocityY: number(value.velocityY),
  pinch: !!value.pinch, fist: !!value.fist, palm: !!value.palm, pointing: !!value.pointing,
  continuous: value.continuous !== false,
});
const face = value => value && Object.freeze({ visible: !!value.visible, x: unit(value.x), y: unit(value.y),
  mouthOpen: unit(value.mouthOpen), smile: unit(value.smile), blinkLeft: !!value.blinkLeft,
  blinkRight: !!value.blinkRight, tilt: number(value.tilt) });
const body = value => value && Object.freeze({ visible: !!value.visible, centerX: unit(value.centerX),
  centerY: unit(value.centerY), tilt: number(value.tilt) });

// Accepts only screen-space states and already classified input events.
// Mirroring, crop, smoothing and gesture recognition belong to src/input.
export class CameraInputBridge {
  constructor({ staleMs = 150 } = {}) { this.staleMs = staleMs; this.events = new GameEventBus(); this.reset(); }
  reset() { this.snapshot = Object.freeze({ timestamp: -Infinity }); }
  publish(snapshot, events = []) {
    if (!Number.isFinite(snapshot.timestamp) || snapshot.timestamp <= this.snapshot.timestamp) return false;
    this.snapshot = Object.freeze({ timestamp: snapshot.timestamp,
      leftHand: hand(snapshot.leftHand), rightHand: hand(snapshot.rightHand), face: face(snapshot.face), body: body(snapshot.body) });
    for (const event of events) this.events.emit(event.type, { ...event, timestamp: snapshot.timestamp });
    return true;
  }
  sample(now = performance.now()) {
    if (now - this.snapshot.timestamp <= this.staleMs) return this.snapshot;
    return Object.freeze(Object.fromEntries(Object.entries(this.snapshot).map(([key, value]) =>
      [key, value && typeof value === 'object' ? Object.freeze({ ...value, visible: false, continuous: false, velocityX: 0, velocityY: 0 }) : value])));
  }
  get leftHand() { return this.sample().leftHand; }
  get rightHand() { return this.sample().rightHand; }
  get face() { return this.sample().face; }
  get body() { return this.sample().body; }
  destroy() { this.reset(); this.events.clear(); }
}
