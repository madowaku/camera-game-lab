/**
 * Renderer-independent contract. Timestamps are monotonic milliseconds (same
 * clock as inference); dt in drivers is seconds. Coordinates are camera-space,
 * BEFORE mirroring: x right, y up, z toward camera. Left/right are anatomical.
 * Rotations are normalized: head ±1 = ±60°, joints ±1 = ±180°.
 * Position/depth is relative, never meters. Finger signals are experimental.
 * @typedef {{x:number,y:number,z:number}} JointRotation
 * @typedef {{position:JointRotation,direction:JointRotation,open:number,pinch:number,source:'none'|'pose'|'hand'}} HandMotion
 * @typedef {{timestamp:number,tracking:{face:boolean,pose:boolean,leftHand:boolean,rightHand:boolean},head:{yaw:number,pitch:number,roll:number},face:{mouthOpen:number,smile:number,blinkLeft:number,blinkRight:number},body:{leanX:number,leanY:number,leftShoulder:JointRotation,rightShoulder:JointRotation,leftElbow:JointRotation,rightElbow:JointRotation},hands:{left:HandMotion,right:HandMotion},energy:{movement:number,speed:number}}} MotionFrame
 */
export const clamp = (n, min = -1, max = 1) => Math.max(min, Math.min(max, Number.isFinite(n) ? n : 0));
export const unit = n => clamp(n, 0, 1);
const joint = () => ({ x: 0, y: 0, z: 0 });
const hand = () => ({ position: joint(), direction: joint(), open: 0, pinch: 0, source: 'none' });
export function idleMotionFrame(timestamp = 0) {
  return { timestamp, tracking: { face: false, pose: false, leftHand: false, rightHand: false },
    head: { yaw: 0, pitch: 0, roll: 0 }, face: { mouthOpen: 0, smile: 0, blinkLeft: 0, blinkRight: 0 },
    body: { leanX: 0, leanY: 0, leftShoulder: joint(), rightShoulder: joint(), leftElbow: joint(), rightElbow: joint() },
    hands: { left: hand(), right: hand() }, energy: { movement: 0, speed: 0 } };
}
export function cloneFrame(frame) { return structuredClone(frame); }
export function blendValues(a, b, alpha, angles = false) {
  if (typeof b === 'number') {
    let delta = b - a;
    // Joint z uses ±pi, so interpolate over the shorter arc at the wrap.
    if (angles) delta = ((delta + 3) % 2) - 1;
    const value = a + delta * alpha;
    return angles ? ((value + 3) % 2) - 1 : value;
  }
  if (typeof b !== 'object' || b === null) return b;
  return Object.fromEntries(Object.entries(b).map(([key, value]) => [key,
    blendValues(a[key], value, alpha, /Shoulder$|Elbow$/.test(key) || (angles && key === 'z'))]));
}
