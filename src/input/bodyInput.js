import {
  FilesetResolver,
  GestureRecognizer
} from "@mediapipe/tasks-vision";

const WASM_ROOT =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm";
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task";

function createRecognizer(vision, delegate) {
  return GestureRecognizer.createFromOptions(vision, {
    baseOptions: { modelAssetPath: MODEL_URL, delegate },
    runningMode: "VIDEO",
    numHands: 1,
    minHandDetectionConfidence: 0.5,
    minHandPresenceConfidence: 0.5,
    minTrackingConfidence: 0.5
  });
}

// Shared camera/model lifecycle. Experiments consume frames in processResult()
// and keep gesture rules outside this layer.
export class BodyInput {
  constructor(video, { onStatus, onResult } = {}) {
    this.video = video;
    this.onStatus = onStatus ?? (() => {});
    this.onResult = onResult ?? (() => {});
    this.running = false;
    this.starting = null;
    this.session = null;
    this.generation = 0;
    this.frameId = null;
    this.lastVideoTime = -1;
  }

  get recognizer() {
    return this.session?.recognizer ?? null;
  }

  get stream() {
    return this.session?.stream ?? null;
  }

  createRecognizer(vision, delegate) {
    return createRecognizer(vision, delegate);
  }

  inferFrame(timestamp) {
    return this.recognizer.recognizeForVideo(this.video, timestamp);
  }

  get cameraConstraints() {
    return {
      audio: false,
      video: { facingMode: "user", width: { ideal: 720 }, height: { ideal: 1280 } }
    };
  }

  start() {
    if (this.running) return Promise.resolve();
    if (this.starting) return this.starting;

    const generation = ++this.generation;
    const pending = this.initialize(generation).finally(() => {
      if (this.starting === pending) this.starting = null;
    });
    this.starting = pending;
    return pending;
  }

  async initialize(generation) {
    const session = { recognizer: null, stream: null };
    this.session = session;
    const checkActive = () => {
      if (generation !== this.generation) {
        throw new DOMException("Camera start was cancelled.", "AbortError");
      }
    };

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Camera API is not available in this browser.");
      }

      this.onStatus("LOADING_MODEL");
      const vision = await FilesetResolver.forVisionTasks(WASM_ROOT);
      checkActive();

      try {
        session.recognizer = await this.createRecognizer(vision, "GPU");
      } catch (gpuError) {
        checkActive();
        console.warn("MediaPipe GPU delegate failed; falling back to CPU.", gpuError);
        session.recognizer = await this.createRecognizer(vision, "CPU");
      }
      checkActive();

      this.onStatus("REQUESTING_CAMERA");
      session.stream = await navigator.mediaDevices.getUserMedia(this.cameraConstraints);
      checkActive();

      this.video.srcObject = session.stream;
      await this.video.play();
      checkActive();

      for (const track of session.stream.getVideoTracks()) {
        track.addEventListener("ended", () => {
          if (this.session === session) {
            this.stop();
            this.onStatus("ERROR", new Error("Camera stream ended."));
          }
        }, { once: true });
      }

      this.running = true;
      this.onStatus("READY");
      this.frameId = requestAnimationFrame(this.loop);
    } catch (error) {
      if (this.session === session) this.running = false;
      this.releaseSession(session);
      throw error;
    }
  }

  processResult(result, timestamp) {
    this.onResult(result, timestamp);
  }

  loop = () => {
    if (!this.running || !this.recognizer) return;

    try {
      if (
        this.video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
        this.video.currentTime !== this.lastVideoTime
      ) {
        this.lastVideoTime = this.video.currentTime;
        const timestamp = performance.now();
        const result = this.inferFrame(timestamp);
        this.processResult(result, timestamp);
      }
    } catch (error) {
      this.stop();
      this.onStatus("ERROR", error);
      return;
    }

    if (this.running) this.frameId = requestAnimationFrame(this.loop);
  };

  releaseSession(session) {
    session.stream?.getTracks().forEach((track) => track.stop());
    if (session.stream && this.video.srcObject === session.stream) {
      this.video.srcObject = null;
    }
    session.stream = null;
    session.recognizer?.close?.();
    session.recognizer = null;
    if (this.session === session) this.session = null;
  }

  stop() {
    ++this.generation;
    this.running = false;
    this.starting = null;
    if (this.frameId !== null) cancelAnimationFrame(this.frameId);
    this.frameId = null;
    if (this.session) this.releaseSession(this.session);
    this.lastVideoTime = -1;
  }
}
