// Pure camera rules: milliseconds in, state out. New rules never alter legacy floors.
export const CameraRule = Object.freeze(Object.fromEntries([
  'VISIBLE', 'FOCUS_HOLD', 'AFTERIMAGE', 'OVEREXPOSE', 'LINKED', 'EXCLUDE',
  'CENTER_ONLY', 'SNAPSHOT', 'MOVE_WHEN_VISIBLE', 'MOVE_WHEN_HIDDEN', 'NO_PHOTOBOMB', 'PANORAMA',
].map((name) => [name, name])));

export function createRuleState() {
  return { solid: false, visible: false, seen: false, focusMs: 0, outsideMs: 0, memoryMs: 0,
    overexposeMs: 0, recoveryMs: 0, broken: false, opacity: 0, pulseMs: 0, status: 'GONE' };
}

export function updateRule(object, state, visible, dt, linkedCount = 0, conditionMet = false) {
  const wasSolid = state.solid;
  state.visible = visible; state.pulseMs = Math.max(0, state.pulseMs - dt);
  state.seen ||= visible;
  state.outsideMs = visible ? 0 : state.outsideMs + dt;
  switch (object.rule ?? CameraRule.VISIBLE) {
    case CameraRule.VISIBLE:
      state.solid = visible; state.opacity = visible ? 1 : 0; break;
    case CameraRule.FOCUS_HOLD: {
      const hold = object.holdMs ?? 500;
      if (visible) state.focusMs = Math.min(hold, state.focusMs + dt);
      else if (state.outsideMs > (object.graceMs ?? 180)) state.focusMs = 0;
      state.solid = state.focusMs >= hold;
      state.opacity = visible || state.solid ? .2 + .8 * state.focusMs / hold : 0;
      // Optional focus + memory composition for the chapter finale.
      if (state.solid && visible) state.memoryMs = object.memoryMs ?? 0;
      if (!visible && object.memoryMs) {
        state.memoryMs = Math.max(0, state.memoryMs - dt);
        state.solid = state.memoryMs > 0;
        state.opacity = state.memoryMs / object.memoryMs;
      }
      break;
    }
    case CameraRule.AFTERIMAGE:
      state.memoryMs = visible ? (object.memoryMs ?? 1500) : Math.max(0, state.memoryMs - dt);
      state.solid = visible || state.memoryMs > 0;
      state.opacity = visible ? 1 : state.memoryMs / (object.memoryMs ?? 1500); break;
    case CameraRule.OVEREXPOSE: {
      const max = object.maxVisibleMs ?? 1200;
      if (visible) {
        state.recoveryMs = 0;
        if (!state.broken) state.overexposeMs = Math.min(max, state.overexposeMs + dt);
        if (state.overexposeMs >= max) state.broken = true;
      } else {
        state.recoveryMs += dt;
        state.overexposeMs = Math.max(0, state.overexposeMs - max * dt / (object.recoveryMs ?? 700));
        if (state.recoveryMs >= (object.recoveryMs ?? 700)) state.broken = false;
      }
      // Looking away recovers the surface; it remains traversable during recovery.
      state.solid = state.seen && !state.broken;
      state.opacity = state.solid ? 1 : (visible ? .08 : 0); break;
    }
    case CameraRule.LINKED:
      state.solid = linkedCount >= (object.requiredVisible ?? 2);
      state.opacity = state.solid ? 1 : visible ? .2 : 0; break;
    case CameraRule.EXCLUDE:
      // No deadline: a bridge exists if it is framed, and its red blocker is not.
      state.solid = visible && conditionMet;
      state.opacity = state.solid ? 1 : visible ? .24 : 0; break;
    default: // Reserved rules are deliberately inert until implemented.
      state.solid = false; state.opacity = visible ? .15 : 0;
  }
  state.status = state.solid ? (!visible && state.memoryMs > 0 ? 'MEMORY' : 'SOLID') : visible ? 'OUTLINE' : 'GONE';
  if (!wasSolid && state.solid) state.pulseMs = 180;
  return state;
}

export function anchorVisible(object, camera, view) {
  const x = object.anchor?.x ?? object.x + object.width / 2;
  const y = object.anchor?.y ?? object.y;
  const margin = .07;
  const horizontalLimit = object.centerHold ? (object.holdRadius ?? 96) : view.width * (.5 + margin);
  return Math.abs(x - camera.x) <= horizontalLimit
    && Math.abs(y - camera.y) <= view.height * (.5 + margin);
}
