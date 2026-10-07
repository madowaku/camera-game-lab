import { clamp } from './core.js';

// Inputs are shoulder-relative screen positions. Rules have no MediaPipe dependency.
export class GestureMapper {
  constructor() { this.reset(); }
  reset() { this.previous = null; this.input = null; this.raiseSince = null; this.directionSince = null; this.direction = null; this.movingSince = null; this.cutArmed = false; this.stopSince = null; this.wideSince = null; this.lastEvent = -Infinity; this.lastCutAt = -Infinity; this.startAt = -Infinity; }
  update(frame, at, game) {
    if (!frame) { this.reset(); return []; }
    const old = this.previous, dt = old ? at - old.at : 0;
    if (old && dt <= 0) return [];
    if (!old || dt > 300) { this.reset(); this.previous = { ...frame, at }; return []; }
    const alpha = 1 - Math.exp(-dt / 70), smooth = (point, previous) => ({ x: previous.x + (point.x - previous.x) * alpha, y: previous.y + (point.y - previous.y) * alpha });
    const left = smooth(frame.left, old.left), right = smooth(frame.right, old.right), seconds = dt / 1000;
    const lv = { x: (left.x - old.left.x) / seconds, y: (left.y - old.left.y) / seconds };
    const rv = { x: (right.x - old.right.x) / seconds, y: (right.y - old.right.y) / seconds };
    const speedL = Math.hypot(lv.x, lv.y), speedR = Math.hypot(rv.x, rv.y);
    const spread = Math.abs(right.x - left.x), intensity = clamp((spread - 1) / 2.4);
    const raised = Math.min(left.y, right.y) < -.25;
    this.input = { left, right, intensity, spread, leftVelocity: speedL, rightVelocity: speedR, handsRaised: raised, handsStopped: speedL < .3 && speedR < .3 };
    this.previous = { left, right, at };
    const events = [];
    if (raised) this.raiseSince ??= at; else this.raiseSince = null;
    if (intensity > .75) this.wideSince ??= at; else this.wideSince = null;
    if (['READY', 'CUT', 'BRAVO'].includes(game.state)) {
      if (this.raiseSince !== null && at - this.raiseSince >= 150 && at - this.lastEvent > 700) { events.push('START'); this.lastEvent = at; this.startAt = at; this.cutArmed = false; }
      return events;
    }
    if (!game.playing) return events;
    // A big downstroke wins over CUT and percussion. Both hands must move down.
    if (game.finaleReady && this.wideSince !== null && at - this.wideSince >= 200 && lv.y > 2 && rv.y > 2 && at - this.lastEvent > 650) {
      events.push('FINALE'); this.lastEvent = at; this.cutArmed = false; return events;
    }
    // Opening both arms and holding the pose is a crescendo, not a CUT. Arm a
    // cut only after a shared sweep (both velocities point roughly the same way).
    const sharedSweep = lv.x * rv.x + lv.y * rv.y > .2;
    if (speedL > .9 && speedR > .9 && sharedSweep) { this.movingSince ??= at; if (at - this.movingSince >= 150) this.cutArmed = true; this.lastMovingAt = at; this.stopSince = null; }
    else this.movingSince = null;
    if (this.cutArmed && at - this.lastMovingAt > 650) this.cutArmed = false;
    if (this.cutArmed && speedL < .3 && speedR < .3) {
      this.stopSince ??= at;
      if (at - this.stopSince >= 120 && at - this.lastCutAt > 700 && at - this.startAt > 650) { events.push('CUT'); this.cutArmed = false; this.lastCutAt = at; this.lastEvent = at; return events; }
    } else this.stopSince = null;
    if (at - this.lastEvent < 450) return events;
    const middle = (left.x + right.x) / 2;
    // Both arms open -> full orchestra, so the right-hand gesture cannot override it.
    if (intensity > .8 && this.wideSince !== null && at - this.wideSince >= 200) {
      if (!game.sections.brass) events.push('BRASS');
      if (!game.sections.percussion) events.push('PERCUSSION');
    } else {
      const direction = middle < -.75 ? 'STRINGS' : middle > .75 ? 'BRASS' : null;
      if (direction !== this.direction) { this.direction = direction; this.directionSince = at; }
      if (direction && at - this.directionSince >= 160 && (direction === 'STRINGS' ? game.sections.brass || game.sections.percussion : !game.sections.brass)) events.push(direction);
      if ((lv.y > 1.3 || rv.y > 1.3) && !game.sections.percussion) events.push('PERCUSSION');
    }
    if (!events.length && Math.max(speedL, speedR) > 3) events.push('ACCENT');
    if (events.length) this.lastEvent = at;
    return events;
  }
}

export function normalizePose(points, project, aspect = 1) {
  const valid = i => points?.[i] && (points[i].visibility ?? 1) > .5;
  if (![11, 12, 15, 16].every(valid)) return null;
  const a = project(points[11]), b = project(points[12]), l = project(points[15]), r = project(points[16]);
  if (![a, b, l, r].every(Boolean)) return null;
  const width = Math.hypot(a.x - b.x, (a.y - b.y) * aspect);
  if (width < .07 || [l, r].some(p => p.x < -.12 || p.x > 1.12 || p.y < -.1 || p.y > 1.1)) return null;
  const centre = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  const relative = p => ({ x: (p.x - centre.x) / width, y: (p.y - centre.y) * aspect / width });
  return { left: relative(l), right: relative(r), screen: { left: l, right: r, centre } };
}
