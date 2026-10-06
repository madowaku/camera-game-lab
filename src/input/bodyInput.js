import {
  FilesetResolver,
  GestureRecognizer
} from "@mediapipe/tasks-vision";
import { openFrontCamera } from "./frontCamera.js";
import { cameraInputDebug } from "./debugStore.js";

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
  constructor(video, { onStatus, onResult, debugLabel } = {}) {
    this.video = video;
    this.onStatus = onStatus ?? (() => {});
    this.onResult = onResult ?? (() => {});
    this.debugLabel = debugLabel ?? this.constructor.name.replace(/Input$/, "") || "CAMERA";
    this.delegate = null;
    this.scheduler = "—";
    this.running = false;
    this.starting = null;
    this.session = null;
    this.generation = 0;
    this.frameId = null;
    this.frameKind = null;
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
      video: { facingMode: { exact: "user" }, width: { ideal: 720 }, height: { ideal: 1280 } }
    };
  }

  openCamera(mediaDevices, constraints, checkActive) {
    return openFrontCamera(mediaDevices, constraints, checkActive);
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

      this.reportStatus("LOADING_MODEL");
      const vision = await FilesetResolver.forVisionTasks(WASM_ROOT);
      checkActive();

      try {
        session.recognizer = await this.createRecognizer(vision, "GPU");
        this.delegate = "GPU";
      } catch (gpuError) {
        checkActive();
        console.warn("MediaPipe GPU delegate failed; falling back to CPU.", gpuError);
        session.recognizer = await this.createRecognizer(vision, "CPU");
        this.delegate = "CPU";
      }
      checkActive();

      this.reportStatus("REQUESTING_CAMERA");
      session.stream = await this.openCamera(navigator.mediaDevices, this.cameraConstraints, checkActive);
      checkActive();

      this.video.srcObject = session.stream;
      await this.video.play();
      checkActive();

      for (const track of session.stream.getVideoTracks()) {
        track.addEventListener("ended", () => {
          if (this.session === session) {
            this.stop();
            this.reportStatus("ERROR", new Error("Camera stream ended."));
          }
        }, { once: true });
      }

      this.running = true;
      this.reportStatus("READY");
      this.scheduleFrame();
    } catch (error) {
      if (this.session === session) this.running = false;
      this.releaseSession(session);
      throw error;
    }
  }

  reportStatus(status, error = null) {
    cameraInputDebug.status(this.debugLabel, status, error);
    this.onStatus(status, error);
  }

  processResult(result, timestamp) {
    this.onResult(result, timestamp);
  }

  scheduleFrame() {
    if (!this.running) return;
    if (typeof this.video.requestVideoFrameCallback === "function") {
      this.frameKind = "video";
      this.scheduler = "video-frame";
      this.frameId = this.video.requestVideoFrameCallback(this.loop);
      return;
    }
    this.frameKind = "animation";
    this.scheduler = "animation-frame";
    this.frameId = requestAnimationFrame(this.loop);
  }

  cancelFrame() {
    if (this.frameId === null) return;
    if (
      this.frameKind === "video" &&
      typeof this.video.cancelVideoFrameCallback === "function"
    ) {
      this.video.cancelVideoFrameCallback(this.frameId);
    } else {
      cancelAnimationFrame(this.frameId);
    }
    this.frameId = null;
    this.frameKind = null;
  }

  loop = (scheduledAt) => {
    this.frameId = null;
    this.frameKind = null;
    if (!this.running || !this.recognizer) return;

    try {
      if (
        this.video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
        this.video.currentTime !== this.lastVideoTime
      ) {
        this.lastVideoTime = this.video.currentTime;
        const timestamp = Number.isFinite(scheduledAt) ? scheduledAt : performance.now();
        const startedAt = performance.now();
        const result = this.inferFrame(timestamp);
        const durationMs = performance.now() - startedAt;
        if (result !== null && result !== undefined) {
          cameraInputDebug.status(this.debugLabel, "READY");
          cameraInputDebug.inference(this.debugLabel, { at: timestamp, durationMs, scheduler: this.scheduler });
          cameraInputDebug.metric(this.debugLabel, "delegate", this.delegate ?? "unknown", timestamp);
          this.processResult(result, timestamp);
        }
      }
    } catch (error) {
      this.stop();
      this.reportStatus("ERROR", error);
      return;
    }

    this.scheduleFrame();
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
    this.cancelFrame();
    if (this.session) this.releaseSession(this.session);
    this.lastVideoTime = -1;
    this.delegate = null;
    cameraInputDebug.status(this.debugLabel, "OFF");
  }
}
