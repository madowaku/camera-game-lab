import { detectPitch, PitchTracker } from "./pitchAnalysis.js";

export class VoiceInput {
  constructor({ onSample = () => {}, onError = () => {} } = {}) {
    this.onSample = onSample;
    this.onError = onError;
    this.tracker = new PitchTracker();
    this.generation = 0;
    this.running = false;
    this.frameId = null;
    this.current = { voiced: false, note: null, frequency: null };
  }
  async start() {
    this.stop();
    const generation = this.generation;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass || !navigator.mediaDevices?.getUserMedia) throw new Error("Audio API unavailable");
    // Resume while still in the click gesture; permission/model loading can outlast
    // transient user activation on Safari. Input is never connected to speakers.
    const context = new AudioContextClass();
    this.context = context;
    let stream = null;
    try {
      await context.resume();
      if (generation !== this.generation) throw new DOMException("Cancelled", "AbortError");
      stream = await navigator.mediaDevices.getUserMedia({ video: false, audio: {
        echoCancellation: true, noiseSuppression: false, autoGainControl: false, channelCount: 1
      } });
      if (generation !== this.generation) throw new DOMException("Cancelled", "AbortError");
      this.stream = stream;
      this.source = context.createMediaStreamSource(stream);
      this.analyser = context.createAnalyser();
      this.analyser.fftSize = 4096;
      this.analyser.smoothingTimeConstant = 0;
      this.source.connect(this.analyser);
      this.buffer = new Float32Array(this.analyser.fftSize);
      this.running = true;
      this.lastAnalysis = -Infinity;
      for (const track of stream.getAudioTracks()) track.addEventListener("ended", () => {
        if (this.stream === stream) { this.stop(); this.onError(); }
      }, { once: true });
      context.onstatechange = () => {
        if (this.running && context.state !== "running") {
          this.current = { voiced: false, note: null, frequency: null };
          this.onSample(this.current);
        }
      };
      this.frameId = requestAnimationFrame(this.loop);
    } catch (error) {
      stream?.getTracks().forEach((track) => track.stop());
      if (this.context === context) this.stop();
      else if (context.state !== "closed") void context.close();
      throw error;
    }
  }
  loop = (timestamp) => {
    if (!this.running) return;
    if (this.context.state === "running" && timestamp - this.lastAnalysis >= 40) {
      this.lastAnalysis = timestamp;
      this.analyser.getFloatTimeDomainData(this.buffer);
      this.current = this.tracker.update(detectPitch(this.buffer, this.context.sampleRate), timestamp);
      this.current.timestamp = timestamp;
      this.onSample(this.current);
    }
    this.frameId = requestAnimationFrame(this.loop);
  };
  calibrate() { this.tracker.beginCalibration(); }
  async resume() { if (this.context?.state === "suspended") await this.context.resume(); }
  stop() {
    this.generation += 1;
    this.running = false;
    if (this.frameId !== null) cancelAnimationFrame(this.frameId);
    this.frameId = null;
    this.source?.disconnect();
    this.stream?.getTracks().forEach((track) => track.stop());
    if (this.context && this.context.state !== "closed") void this.context.close();
    this.context = this.source = this.stream = this.analyser = null;
    this.tracker.reset();
    this.current = { voiced: false, note: null, frequency: null };
  }
}
