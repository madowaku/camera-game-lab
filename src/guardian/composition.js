const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

// Fit the entire sensor frame first; a portrait stage must not crop wide arms.
// Then place the segmented person below the guardian's face, at a bounded size.
export function playerTransform(pose, sourceWidth, sourceHeight, width, height, size = 0.55) {
  const head = pose?.head ?? { x: 0.5, y: 0.3 };
  const center = pose?.center ?? { x: 0.5, y: 0.5 };
  const shoulderWidth = Math.max(0.06, pose?.shoulderWidth ?? 0.25);
  const amount = clamp(size, 0.35, 0.75);
  const scale = Math.min(width / sourceWidth, height / sourceHeight,
    width * 0.24 * (amount / 0.55) / (sourceWidth * shoulderWidth),
    height * amount / sourceHeight,
    height * 0.43 / (sourceHeight * Math.max(0.15, 1 - head.y)));
  return {
    width: sourceWidth * scale, height: sourceHeight * scale,
    x: width * (0.5 + (center.x - 0.5) * 0.36) - head.x * sourceWidth * scale,
    y: height * 0.53 - head.y * sourceHeight * scale,
  };
}

export function guardianFraming(pose) {
  if (!pose) return "findBody";
  if (pose.head.y < 0.035 || pose.shoulderWidth > 0.62 ||
    pose.arms.some((arm) => arm.shoulder.x < 0.025 || arm.shoulder.x > 0.975)) return "bodyCropped";
  return pose.arms.every((arm) => arm.elbow && arm.wrist) ? "bodyReady" : "showHands";
}

// Direction-only, fixed-length limbs amplify tiny gestures without stretching art.
export function followGuardianArm(arm, aspect, side, shoulder = { x: side * 72, y: 60 }) {
  if (!arm?.elbow || !arm?.wrist) return { shoulder,
    elbow: { x: side * 128, y: 162 }, wrist: { x: side * 128, y: 245 } };
  const joint = (from, to, origin, length) => {
    const dx = (to.x - from.x) * aspect, dy = to.y - from.y;
    const distance = Math.hypot(dx, dy);
    return distance < 0.015 ? { x: origin.x, y: origin.y + length } :
      { x: origin.x + dx / distance * length, y: origin.y + dy / distance * length };
  };
  const elbow = joint(arm.shoulder, arm.elbow, shoulder, 90);
  return { shoulder, elbow, wrist: joint(arm.elbow, arm.wrist, elbow, 93) };
}
