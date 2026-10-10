import { clamp, TiltSignal } from './input.js';

// Front-camera video landmarks are NOT mirrored. The visible selfie/wheel
// presentation is mirrored once, so the screen-right direction has inverted X.
const ANCHORS = [0, 5, 9, 13, 17];
export function palmPosition(points) {
  if (!Array.isArray(points) || points.length !== 21) return null;
  const sampled = ANCHORS.map(i => points[i]);
  if (sampled.some(p => !p || !Number.isFinite(p.x) || !Number.isFinite(p.y) ||
    p.x < 0 || p.x > 1 || p.y < 0 || p.y > 1)) return null;
  return { x: sampled.reduce((s,p)=>s+p.x,0)/sampled.length,
    y: sampled.reduce((s,p)=>s+p.y,0)/sampled.length };
}
export function wheelRoll(hands, width=1, height=1) {
  if (!Array.isArray(hands) || hands.length !== 2 ||
      !Number.isFinite(width) || !Number.isFinite(height) || width<=0 || height<=0) return null;
  const centers = hands.map(palmPosition);
  if (centers.some(c=>!c)) return null;
  const [a,b] = centers.sort((p,q)=>p.x-q.x);
  const dx=(b.x-a.x)*width, dy=(b.y-a.y)*height;
  // A wheel is held wide with two palms. Reject overlaps/vertical ambiguity
  // instead of silently swapping hands or returning a sudden full turn.
  if(dx<width*.16 || Math.hypot(dx,dy)<Math.min(width,height)*.16) return null;
  const angle=-Math.atan2(dy,dx)*180/Math.PI;
  return Number.isFinite(angle) && Math.abs(angle)<=55 ? angle : null;
}
export class WheelSignal extends TiltSignal {
  // The existing 650ms neutral, filtering, dead zone and loss response remain
  // shared with head steering. No second smoothing pipeline is introduced.
  sample(raw, at) {
    const packet=super.sample(raw,at);
    return { ...packet, mode:'hands', hands:raw===null?0:2,
      roll:clamp(packet.roll,-45,45) };
  }
}
