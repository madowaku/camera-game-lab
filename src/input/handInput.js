import {
  FilesetResolver,
  GestureRecognizer
} from "@mediapipe/tasks-vision";

const WASM_ROOT =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm";

const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task";

const GESTURE_MAP = {
  Open_Palm: "OPEN",
  Closed_Fist: "FIST",
  Victory: "PEACE"
};

function distance(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.hypot(dx, dy);
}

function normalizeGesture(result) {
  const landmarks = result?.landmarks?.[0];

  if (landmarks?.length >= 10) {
    const wrist = landmarks[0];
    const thumbTip = landmarks[4];
    const indexTip = landmarks[8];
    const middleMcp = landmarks[9];

    const handScale = distance(wrist, middleMcp);
    const pinchDistance = distance(thumbTip, indexTip);

    // Relative-to-hand-size threshold so PINCH behaves more consistently
    // when the player moves closer to or farther from the camera.
    if (handScale > 0.001 && pinchDistance / handScale < 0.3) {
      return "PINCH";
    }
  }

  const topGesture = result?.gestures?.[0]?.[0];

  if (!topGesture || topGesture.score < 0.55) {
    return "NONE";
  }

  return GESTURE_MAP[topGesture.categoryName] ?? "NONE";
}

async function createRecognizer(vision, delegate) {
  return GestureRecognizer.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: MODEL_URL,
      delegate
    },
    runningMode: "VIDEO",
    numHands: 1,
    minHandDetectionConfidence: 0.5,
    minHandPresenceConfidence: 0.5,
    minTrackingConfidence: 0.5
  });
}

export class HandInput {
  constructor(video, { onGesture, onStatus } = {}) {
    this.video = video;
    this.onGesture = onGesture ?? (() => {});
    this.onStatus = onStatus ?? (() => {});

    this.recognizer = null;
    this.stream = null;
    this.running = false;
    this.frameId = null;
    this.lastVideoTime = -1;

    this.currentGesture = "NONE";
    this.candidateGesture = "NONE";
    this.candidateFrames = 0;
  }

  async start() {
    if (this.running) return;

    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error("Camera API is not available in this browser.");
    }

    this.onStatus("LOADING_MODEL");

    const vision = await FilesetResolver.forVisionTasks(WASM_ROOT);

    try {
      this.recognizer = await createRecognizer(vision, "GPU");
    } catch (gpuError) {
      console.warn("MediaPipe GPU delegate failed; falling back to CPU.", gpuError);
      this.recognizer = await createRecognizer(vision, "CPU");
    }

    this.onStatus("REQUESTING_CAMERA");

    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        facingMode: "user",
        width: { ideal: 720 },
        height: { ideal: 1280 }
      }
    });

    this.video.srcObject = this.stream;
    await this.video.play();

    this.running = true;
    this.onStatus("READY");
    this.loop();
  }

  loop = () => {
    if (!this.running || !this.recognizer) return;

    if (
      this.video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
      this.video.currentTime !== this.lastVideoTime
    ) {
      this.lastVideoTime = this.video.currentTime;

      const result = this.recognizer.recognizeForVideo(
        this.video,
        performance.now()
      );

      const rawGesture = normalizeGesture(result);

      if (rawGesture === this.candidateGesture) {
        this.candidateFrames += 1;
      } else {
        this.candidateGesture = rawGesture;
        this.candidateFrames = 1;
      }

      // Three-frame stability removes classifier flicker without making
      // rhythm input feel too sticky.
      if (
        this.candidateFrames >= 3 &&
        this.currentGesture !== this.candidateGesture
      ) {
        this.currentGesture = this.candidateGesture;
        this.onGesture(this.currentGesture, result);
      }
    }

    this.frameId = requestAnimationFrame(this.loop);
  };

  stop() {
    this.running = false;

    if (this.frameId) {
      cancelAnimationFrame(this.frameId);
      this.frameId = null;
    }

    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = null;

    if (this.video) {
      this.video.srcObject = null;
    }

    this.recognizer?.close?.();
    this.recognizer = null;

    this.lastVideoTime = -1;
    this.currentGesture = "NONE";
    this.candidateGesture = "NONE";
    this.candidateFrames = 0;
  }
}
