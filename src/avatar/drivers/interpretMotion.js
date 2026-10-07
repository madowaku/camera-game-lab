import { clamp } from '../motion/MotionFrame.js';
import { HUMAN } from '../profiles/index.js';
export function interpretMotion(frame, profile = HUMAN, cameraMode = 'MIRROR') {
  const mirror = cameraMode !== 'STAGE', sign = mirror ? -1 : 1, exaggeration = profile.style?.exaggeration ?? 1;
  const joint = value => clamp(value * (profile.arms?.scale ?? 1) * exaggeration) * Math.PI;
  const miniature = cameraMode === 'MINI';
  return { mirror, miniature, x: frame.body.leanX * sign * .65, y: frame.body.leanY * .18,
    lean: frame.body.leanX * sign * -.18,
    yaw: clamp(frame.head.yaw * (profile.head?.yawScale ?? 1) * exaggeration) * Math.PI / 3 * sign,
    pitch: clamp(frame.head.pitch * (profile.head?.pitchScale ?? 1) * exaggeration) * Math.PI / 3,
    roll: clamp(frame.head.roll * (profile.head?.rollScale ?? 1) * exaggeration) * Math.PI / 3 * sign,
    leftArm: joint(frame.body.leftShoulder.z) * sign, rightArm: joint(frame.body.rightShoulder.z) * sign,
    leftElbow: joint(frame.body.leftElbow.z) * sign, rightElbow: joint(frame.body.rightElbow.z) * sign,
    mouth: profile.face?.mouth === false ? 0 : frame.face.mouthOpen,
    blinkLeft: profile.face?.blink === false ? 0 : frame.face.blinkLeft,
    blinkRight: profile.face?.blink === false ? 0 : frame.face.blinkRight,
    smile: frame.face.smile, speed: frame.energy.speed, spring: profile.style?.spring ?? 0 };
}
