import { idleMotionFrame, clamp } from '../motion/MotionFrame.js';
// Camera-free controls produce the same contract as recognition.
export function demoMotion(values, timestamp, lost = false) {
  const f = idleMotionFrame(timestamp);
  if (lost) return f;
  f.tracking = { face: true, pose: true, leftHand: true, rightHand: true };
  for (const k of ['yaw', 'pitch', 'roll']) f.head[k] = clamp(Number(values[k] ?? 0));
  f.face.mouthOpen = clamp(Number(values.mouth ?? 0), 0, 1);
  f.face.blinkLeft = f.face.blinkRight = clamp(Number(values.blink ?? 0), 0, 1);
  f.body.leanX = clamp(Number(values.lean ?? 0));
  f.body.leftShoulder.z = clamp(Number(values.leftArm ?? 0), 0, 1);
  f.body.rightShoulder.z = -clamp(Number(values.rightArm ?? 0), 0, 1);
  f.hands.left.source = f.hands.right.source = 'pose';
  return f;
}
