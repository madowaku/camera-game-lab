import { BodyInput } from "./bodyInput.js";
import { AimLock } from "./aimLock.js";

const clamp = (value) => Math.max(0, Math.min(1, value));
const distance = (a, b) =>
  Math.hypot(a.x - b.x, a.y - b.y, (a.z ?? 0) - (b.z ?? 0));

function fingerIsExtended(points, base) {
  const mcp = points[base];
  const pip = points[base + 1];
  const dip = points[base + 2];
  const tip = points[base + 3];
  const length = distance(mcp, pip) + distance(pip, dip) + distance(dip, tip);
  return length > 0.0001 &&
    distance(mcp, tip) / length > 0.84 &&
    distance(points[0], tip) > distance(points[0], pip) * 1.08;
}

function getPose(result, video) {
  const landmarks = result?.landmarks?.[0];
  if (landmarks?.length !== 21 || !landmarks.every(p => p && Number.isFinite(p.x) && Number.isFinite(p.y))) return null;

  // World coordinates remove camera aspect-ratio distortion from finger curls.
  // Fall back to aspect-corrected landmarks when world points are unavailable.
  const aspect = (video.videoWidth || 1) / (video.videoHeight || 1);
  const world = result?.worldLandmarks?.[0];
  const points = world?.length === 21 ? world : landmarks.map((point) => ({
    x: point.x * aspect,
    y: point.y,
    z: (point.z ?? 0) * aspect
  }));
  const indexExtended = fingerIsExtended(points, 5);
  const palmSize = distance(points[0], points[9]);
  if (!indexExtended || palmSize < 0.0001) {
    return null;
  }

  return { landmarks };
}

function projectAim(landmarks, video) {
  const base = landmarks[5];
  const tip = landmarks[8];
  // Extend the visible index-finger line slightly past the fingertip.
  const x = tip.x + (tip.x - base.x) * 0.65;
  const y = tip.y + (tip.y - base.y) * 0.65;
  const width = video.clientWidth || video.videoWidth || 1;
  const height = video.clientHeight || video.videoHeight || 1;
  const sourceWidth = video.videoWidth || width;
  const sourceHeight = video.videoHeight || height;
  const cover = Math.max(width / sourceWidth, height / sourceHeight);
  const renderedWidth = sourceWidth * cover;
  const renderedHeight = sourceHeight * cover;

  // Match centered object-fit:cover and the camera's CSS scaleX(-1).
  return {
    x: clamp(1 - (x * renderedWidth - (renderedWidth - width) / 2) / width),
    y: clamp((y * renderedHeight - (renderedHeight - height) / 2) / height)
  };
}

export class FingerGunInput extends BodyInput {
  constructor(video, { onStatus, onAim, onShot, getTarget } = {}) {
    super(video, { onStatus });
    this.onAim = onAim ?? (() => {});
    this.onShot = onShot ?? (() => {});
    this.getTarget = getTarget ?? (() => null);
    this.lock = new AimLock();
    this.currentAim = { x: 0.5, y: 0.5, visible: false, lockProgress: 0 };
    this.lastFrameAt = null;
  }

  processResult(result, timestamp) {
    const elapsed = this.lastFrameAt === null ? Infinity : timestamp - this.lastFrameAt;
    this.lastFrameAt = timestamp;
    if (elapsed > 250) this.resetTracking();

    const pose = getPose(result, this.video);
    if (!pose) {
      this.resetTracking();
      this.onAim({ ...this.currentAim });
      return;
    }

    const aim = projectAim(pose.landmarks, this.video);
    const blend = this.currentAim.visible ? 1 - Math.exp(-elapsed / 55) : 1;
    this.currentAim.x += (aim.x - this.currentAim.x) * blend;
    this.currentAim.y += (aim.y - this.currentAim.y) * blend;
    this.currentAim.visible = true;

    const target = this.getTarget();
    // Both raw and smoothed aim must overlap: a fast sweep cannot charge a lock.
    const rawInside = target && Math.hypot(aim.x - target.x, aim.y - target.y) <= target.radius;
    const { progress, fire } = this.lock.update({ ...this.currentAim, visible: !!rawInside }, target, timestamp);
    this.currentAim.lockProgress = progress;
    this.onAim({ ...this.currentAim });
    if (fire) this.onShot({ x: this.currentAim.x, y: this.currentAim.y });
  }

  resetTracking() {
    this.lock.reset();
    this.currentAim.visible = false;
    this.currentAim.lockProgress = 0;
  }

  stop() {
    super.stop();
    this.resetTracking();
    this.lastFrameAt = null;
    this.onAim({ ...this.currentAim });
  }
}
