// Shared edge detection operates on normalized states, never in a game scene.
export class CameraGestureEvents {
  constructor() { this.reset(); }
  reset() { this.previous = {}; this.swipes = {}; }
  update(snapshot) {
    const events = [], timestamp = snapshot.timestamp;
    for (const side of ['leftHand', 'rightHand']) {
      const next = snapshot[side], old = this.previous[side];
      const visible = next?.visible, wasVisible = old?.visible;
      if (visible && next.pinch && !(wasVisible && old.pinch)) events.push({ type: 'pinch-start', hand: side });
      if (wasVisible && old.pinch && !(visible && next.pinch)) events.push({ type: 'pinch-end', hand: side });
      if (visible && next.fist && !(wasVisible && old.fist)) events.push({ type: 'fist', hand: side });
      if (visible && wasVisible && next.continuous !== false && Math.abs(next.velocityX ?? 0) >= 1.2 && timestamp - (this.swipes[side] ?? -Infinity) >= 300) {
        events.push({ type: 'swipe', hand: side, direction: next.velocityX < 0 ? 'left' : 'right' }); this.swipes[side] = timestamp;
      }
    }
    const face = snapshot.face, old = this.previous.face;
    if (face?.visible) {
      for (const eye of ['blinkLeft', 'blinkRight']) if (face[eye] && !(old?.visible && old[eye])) events.push({ type: 'blink', eye: eye === 'blinkLeft' ? 'left' : 'right' });
      if (face.mouthOpen >= .6 && !(old?.visible && old.mouthOpen >= .6)) events.push({ type: 'mouth-open' });
    }
    this.previous = snapshot;
    return events;
  }
}

// PalmTracker has already mirrored, cover-cropped and interpolated the input.
// These names mean stable screen/player slots, not anatomical handedness.
export function palmPongSnapshot(points, timestamp, previous) {
  const dt = previous ? (timestamp - previous.timestamp) / 1000 : 0;
  const result = { timestamp };
  ['leftHand', 'rightHand'].forEach((side, i) => {
    const p = points[i], old = previous?.[side];
    const x = (p?.x ?? 0) / 16, y = (p?.y ?? 0) / 9;
    const continuous = !!p?.continuous && !!old?.visible && dt > 0 && dt < .15;
    result[side] = { visible: !!p?.present, confidence: p?.present ? 1 : 0, x, y, continuous,
      velocityX: continuous ? (x - old.x) / dt : 0, velocityY: continuous ? (y - old.y) / dt : 0,
      pinch: false, fist: false, palm: false, pointing: false };
  });
  return result;
}
