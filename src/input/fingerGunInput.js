import { BodyInput } from "./bodyInput.js";
import { FaceInput } from "./faceInput.js";
import { OneEuroFilter2D } from "./oneEuroFilter.js";
import { cameraInputDebug } from "./debugStore.js";

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
  constructor(video, { onStatus, onAim, onMouth, onShot, getTarget } = {}) {
    super(video, { onStatus });
    this.onAim = onAim ?? (() => {});
    this.onShot = onShot ?? (() => {});
    this.onMouth = onMouth ?? (() => {});
    this.getTarget = getTarget ?? (() => null);
    // FaceInput processes mouth signals only; this owner opens one camera for
    // both models and closes both recognizers on cancellation or failure.
    this.mouthInput = new FaceInput(video, { onMouth: (mouth) => this.processMouth(mouth) });
    this.aimFilter = new OneEuroFilter2D({ minCutoff: 1.5, beta: 0.02, dCutoff: 1 });
    this.mouthArmed = false;
    this.currentAim = { x: 0.5, y: 0.5, visible: false, onTarget: false };
    this.lastFrameAt = null;
    this.lastInferenceAt = -Infinity;
    this.debugPointing = false;
  }

  async createRecognizer(vision, delegate) {
    const hand = await super.createRecognizer(vision, delegate);
    try {
      const face = await this.mouthInput.createRecognizer(vision, delegate);
      return {
        recognizeForVideo: (video, timestamp) => ({
          hand: hand.recognizeForVideo(video, timestamp),
          face: face.detectForVideo(video, timestamp)
        }),
        close: () => { try { hand.close(); } finally { face.close(); } }
      };
    } catch (error) {
      hand.close();
      throw error;
    }
  }

  inferFrame(timestamp) {
    if (timestamp - this.lastInferenceAt < 50) return null;
    this.lastInferenceAt = timestamp;
    return super.inferFrame(timestamp);
  }

  processResult(result, timestamp) {
    if (!result) return;
    const elapsed = this.lastFrameAt === null ? Infinity : timestamp - this.lastFrameAt;
    this.lastFrameAt = timestamp;
    if (elapsed > 250 || elapsed < 0) {
      this.resetTracking();
      this.mouthInput.resetTracking();
    }

    const pose = getPose(result.hand, this.video);
    if (!pose) {
      if (this.debugPointing) cameraInputDebug.event("FingerGun", "TRACK_LOST", {}, timestamp);
      this.debugPointing = false;
      this.resetTracking();
    } else {
      const aim = projectAim(pose.landmarks, this.video);
      if (!this.debugPointing) cameraInputDebug.event("FingerGun", "TRACK_FOUND", {}, timestamp);
      this.debugPointing = true;
      cameraInputDebug.point("FingerGun", "raw-aim", { ...aim, present: true }, { at: timestamp });
      const filtered = this.aimFilter.filter(aim.x, aim.y, timestamp);
      cameraInputDebug.point("FingerGun", "filtered-aim", { ...filtered, present: true }, { at: timestamp });
      this.currentAim.x = filtered.x;
      this.currentAim.y = filtered.y;
      this.currentAim.visible = true;
      const target = this.getTarget();
      this.currentAim.onTarget = Boolean(target && Math.hypot(this.currentAim.x - target.x, this.currentAim.y - target.y) <= target.radius);
      cameraInputDebug.metric("FingerGun", "onTarget", this.currentAim.onTarget, timestamp);
    }
    // Update pointing first so the mouth edge uses this frame's aim. Off-target
    // shots still count as misses; only missing inputs suppress a shot.
    this.mouthInput.processResult(result.face, timestamp);
    this.onAim({ ...this.currentAim });
  }

  processMouth(mouth) {
    const available = mouth.ready && this.currentAim.visible && this.getTarget();
    cameraInputDebug.metric("FingerGun", "mouthOpen", !!mouth.open);
    cameraInputDebug.metric("FingerGun", "mouthReady", !!mouth.ready);
    if (!available) this.mouthArmed = false;
    else if (!mouth.open) this.mouthArmed = true;
    else if (this.mouthArmed) {
      this.mouthArmed = false;
      cameraInputDebug.event("FingerGun", "SHOT", { onTarget: this.currentAim.onTarget });
      this.onShot({ x: this.currentAim.x, y: this.currentAim.y });
    }
    this.onMouth({ ...mouth });
  }

  resetTracking() {
    this.mouthArmed = false;
    this.currentAim.visible = false;
    this.currentAim.onTarget = false;
    this.aimFilter.reset();
  }

  stop() {
    super.stop();
    this.resetTracking();
    this.lastFrameAt = null;
    this.lastInferenceAt = -Infinity;
    this.debugPointing = false;
    this.mouthInput.stop();
    this.onAim({ ...this.currentAim });
  }
}
