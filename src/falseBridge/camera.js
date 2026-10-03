// No inference/model dependencies. A late permission response is never attached
// after departure, and every acquired track is stopped on all failure paths.
export class BridgeCamera {
  constructor(video, onInterrupted = () => {}) { this.video = video; this.onInterrupted = onInterrupted; this.generation = 0; }
  async start(mediaDevices = globalThis.navigator?.mediaDevices) {
    this.stop(); const generation = this.generation;
    if (!mediaDevices?.getUserMedia) throw new Error("Camera unavailable");
    const stream = await mediaDevices.getUserMedia({ audio: false, video: { facingMode: { exact: "environment" }, width: { ideal: 1280 }, height: { ideal: 960 } } });
    const check = () => { if (generation !== this.generation) throw new DOMException("Cancelled", "AbortError"); };
    try {
      check();
      const track = stream.getVideoTracks()[0];
      if (!track || track.getSettings?.().facingMode === "user") throw new Error("Rear camera unavailable");
      this.stream = stream; this.abort = new AbortController();
      for (const type of ["ended", "mute"]) track.addEventListener(type, () => this.onInterrupted(), { signal: this.abort.signal });
      this.video.srcObject = stream;
      await this.video.play(); check();
    } catch (error) {
      stream.getTracks().forEach(t => t.stop());
      if (generation === this.generation) this.stop();
      throw error;
    }
  }
  get ready() { return !!this.stream?.getVideoTracks().some(t => t.readyState === "live" && !t.muted) && this.video.readyState >= 2 && this.video.videoWidth > 0; }
  stop() {
    ++this.generation; this.abort?.abort(); this.stream?.getTracks().forEach(t => t.stop()); this.stream = null;
    this.video.pause(); this.video.srcObject = null;
  }
}
