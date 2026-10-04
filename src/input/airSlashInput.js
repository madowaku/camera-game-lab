import { HandLandmarker, FaceDetector } from '@mediapipe/tasks-vision';
import { BodyInput } from './bodyInput.js';
import { cameraPoint } from '../creator/CameraLayout.js';
import { W, H } from '../airSlash/core.js';

export function handCenters(result, at, videoWidth, videoHeight) {
  const ids = new Set();
  return (result?.landmarks ?? []).flatMap((landmarks, index) => {
    const palm = [0, 5, 9, 13, 17].map(i => landmarks?.[i]);
    if (palm.some(p => !p || !Number.isFinite(p.x) || !Number.isFinite(p.y))) return [];
    const raw = { x: palm.reduce((s, p) => s + p.x, 0) / 5, y: palm.reduce((s, p) => s + p.y, 0) / 5 };
    const p = cameraPoint(raw, videoWidth, videoHeight, W, H);
    // MediaPipe handedness assumes selfie-mirrored input; the camera source is unmirrored.
    const label = result.handedness?.[index]?.[0]?.categoryName?.toLowerCase();
    const side = label === 'left' ? 'right' : label === 'right' ? 'left' : `hand-${index}`;
    if (ids.has(side)) return []; ids.add(side);
    return p ? [{ id: side, side, x: p.x * W, y: p.y * H, at }] : [];
  });
}
export function faceCenter(result, videoWidth, videoHeight) {
  const box = result?.detections?.[0]?.boundingBox;
  if (!box || ![box.originX, box.originY, box.width, box.height].every(Number.isFinite)) return null;
  const a = cameraPoint({ x: box.originX / videoWidth, y: box.originY / videoHeight }, videoWidth, videoHeight, W, H);
  const b = cameraPoint({ x: (box.originX + box.width) / videoWidth, y: (box.originY + box.height) / videoHeight }, videoWidth, videoHeight, W, H);
  return a && b ? { x: (a.x + b.x) * W / 2, y: (a.y + b.y) * H / 2, width: Math.abs(a.x - b.x) * W, height: Math.abs(a.y - b.y) * H } : null;
}
export class AirSlashInput extends BodyInput {
  constructor(video, options) { super(video, options); this.points = []; this.at = -Infinity; this.fps = 0; }
  async createRecognizer(vision, delegate) {
    const hand = await HandLandmarker.createFromOptions(vision, { baseOptions: { modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task', delegate }, runningMode: 'VIDEO', numHands: 2, minHandDetectionConfidence: .45, minHandPresenceConfidence: .45, minTrackingConfidence: .45 });
    try {
      const face = await FaceDetector.createFromOptions(vision, { baseOptions: { modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite', delegate }, runningMode: 'VIDEO', minDetectionConfidence: .5 });
      let faceAt = -Infinity, faceResult = null;
      return { detectForVideo(video, at) { if (at - faceAt >= 120) { faceResult = face.detectForVideo(video, at); faceAt = at; } return { ...hand.detectForVideo(video, at), face: faceResult }; }, close() { try { hand.close(); } finally { face.close(); } } };
    } catch (error) { hand.close(); throw error; }
  }
  inferFrame(at) { return this.recognizer.detectForVideo(this.video, at); }
  processResult(result, at) {
    const delta = at - this.at; if (delta > 0 && delta < 1000) this.fps = this.fps * .8 + 1000 / delta * .2;
    this.points = handCenters(result, at, this.video.videoWidth, this.video.videoHeight); this.at = at;
    this.face = faceCenter(result.face, this.video.videoWidth, this.video.videoHeight);
  }
  sample(now) { return now - this.at <= 160 ? this.points : []; }
  stop() { super.stop(); this.points = []; this.at = -Infinity; this.fps = 0; this.face = null; }
}
