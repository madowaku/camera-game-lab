import { HandLandmarker, FaceDetector } from '@mediapipe/tasks-vision';
import { BodyInput } from './bodyInput.js';
import { cameraPoint } from '../creator/CameraLayout.js';
import { classifyHand } from '../handSpell/tracking.js';
import { W, H } from '../handSpell/core.js';

export function spellHands(result, at, vw, vh) {
  return (result?.landmarks ?? []).flatMap((p, i) => {
    const shape = classifyHand(p, result.worldLandmarks?.[i]);
    if (p?.length !== 21 || p.some(p => !Number.isFinite(p?.x) || !Number.isFinite(p?.y))) return [];
    const point = cameraPoint({ x: (p[0].x + p[9].x) / 2, y: (p[0].y + p[9].y) / 2 }, vw, vh, W, H);
    const label = result.handedness?.[i]?.[0]?.categoryName ?? `hand-${i}`;
    return point ? [{ ...shape, id: label, at, x: point.x * W, y: point.y * H }] : [];
  });
}
export class HandSpellInput extends BodyInput {
  constructor(video, options) { super(video, options); this.hands = []; this.at = -Infinity; this.fps = 0; this.face = null; }
  async createRecognizer(vision, delegate) {
    const hand = await HandLandmarker.createFromOptions(vision, { baseOptions: { modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task', delegate }, runningMode: 'VIDEO', numHands: 2, minHandDetectionConfidence: .5, minHandPresenceConfidence: .5, minTrackingConfidence: .5 });
    try {
      const face = await FaceDetector.createFromOptions(vision, { baseOptions: { modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite', delegate }, runningMode: 'VIDEO' });
      let lastFace = -Infinity, faceResult = null;
      return { detectForVideo(video, at) { if (at - lastFace >= 150) { faceResult = face.detectForVideo(video, at); lastFace = at; } return { ...hand.detectForVideo(video, at), face: faceResult }; }, close() { try { hand.close(); } finally { face.close(); } } };
    } catch (e) { hand.close(); throw e; }
  }
  inferFrame(at) { return this.recognizer.detectForVideo(this.video, at); }
  processResult(result, at) {
    const dt = at - this.at; if (dt > 0 && dt < 1000) this.fps = this.fps * .8 + 1000 / dt * .2;
    this.hands = spellHands(result, at, this.video.videoWidth, this.video.videoHeight); this.at = at;
    const box = result.face?.detections?.[0]?.boundingBox;
    if (!box) { this.face = null; return; }
    const a = cameraPoint({ x: box.originX / this.video.videoWidth, y: box.originY / this.video.videoHeight }, this.video.videoWidth, this.video.videoHeight, W, H);
    const b = cameraPoint({ x: (box.originX + box.width) / this.video.videoWidth, y: (box.originY + box.height) / this.video.videoHeight }, this.video.videoWidth, this.video.videoHeight, W, H);
    this.face = a && b ? { x: (a.x + b.x) * W / 2, y: (a.y + b.y) * H / 2, width: Math.abs(a.x - b.x) * W, height: Math.abs(a.y - b.y) * H } : null;
  }
  sample(now) { return now - this.at <= 200 ? this.hands : []; }
  stop() { super.stop(); this.hands = []; this.at = -Infinity; this.face = null; this.fps = 0; }
}
