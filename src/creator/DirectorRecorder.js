const uniqueFrames = collections => [...new Map(collections.flat().map(f => [f.at, f])).values()].sort((a, b) => a.at - b.at);

// Only face-treated, composited frames enter this rolling buffer. Pinned windows
// retain interesting moments after they leave the last twelve seconds.
export class DirectorRecorder {
  constructor({ bufferDuration = 12000, maxBytes = 24 * 1024 * 1024 } = {}) {
    this.bufferDuration = bufferDuration; this.maxBytes = maxBytes;
    this.ring = []; this.windows = new Map(); this.fps = 12; this.width = 540;
    this.lastCapture = -Infinity; this.recording = true; this.generation = 0;
  }
  mark(event, profile) {
    const t = event.timestamp;
    if (event.type === "FIRST_SUCCESS" && !this.windows.has("understand")) this.pin("understand", t - 650, t + 1800, { event });
    if (profile.hookCandidates.includes(event.type)) {
      const rank = profile.hookCandidates.indexOf(event.type), previous = this.windows.get("hook");
      if (!previous || rank < previous.rank) this.pin("hook", t - 650, t + 1400, { rank, event });
    }
    if (["HERO", ...profile.fallbackEvents].includes(event.type)) {
      const rank = event.type === "HERO" ? -1 : profile.fallbackEvents.indexOf(event.type), previous = this.windows.get("moment");
      if (!previous || rank <= previous.rank) this.pin("moment", t - 5000, t + profile.reactionDuration, { rank, event });
    }
    if (event.type === "FAIL") this.pin("fail", t - 1800, t + profile.reactionDuration, { event });
  }
  pin(key, start, end, data) {
    this.windows.set(key, { start: Math.max(0, start), end, frames: this.ring.filter(f => f.at >= start && f.at <= end), ...data });
  }
  append(frame) {
    if (!this.recording) return;
    this.ring.push(frame);
    while (this.ring.length && this.ring[0].at < frame.at - this.bufferDuration) this.ring.shift();
    for (const window of this.windows.values()) if (frame.at >= window.start && frame.at <= window.end) window.frames.push(frame);
    // Under memory pressure reduce temporal sampling across the whole window,
    // keeping its time coverage instead of discarding HERO's preparation.
    if (this.bytes > this.maxBytes) {
      const kept = new Set(this.allFrames().filter((f, i, frames) => i % 2 === 0 || i === frames.length - 1));
      this.ring = this.ring.filter(f => kept.has(f));
      for (const window of this.windows.values()) window.frames = window.frames.filter(f => kept.has(f));
      this.fps = 8; this.width = 270;
    }
  }
  get bytes() { return this.allFrames().reduce((sum, f) => sum + f.blob.size, 0); }
  allFrames() { return uniqueFrames([this.ring, ...[...this.windows.values()].map(w => w.frames)]); }
  capture(canvas, at) {
    if (!this.recording || this.pending || at - this.lastCapture < 1000 / this.fps) return;
    this.lastCapture = at;
    const token = this.generation, started = performance.now();
    this.surface ??= document.createElement("canvas");
    this.surface.width = this.width; this.surface.height = this.width * 16 / 9;
    this.surface.getContext("2d").drawImage(canvas, 0, 0, this.surface.width, this.surface.height);
    this.pending = new Promise(resolve => this.surface.toBlob(blob => {
      if (token === this.generation && this.recording && blob) {
        this.append({ at, blob });
        if (performance.now() - started > 55) { this.fps = 8; this.width = 270; }
      }
      resolve();
    }, "image/webp", .75)).finally(() => { this.pending = null; });
    if (performance.now() - started > 8) { this.fps = 8; this.width = 270; }
  }
  async finish() { await this.pending; this.recording = false; return this.allFrames(); }
  dispose() { ++this.generation; this.recording = false; this.ring = []; this.windows.clear(); if (this.surface) this.surface.width = 0; }
}
