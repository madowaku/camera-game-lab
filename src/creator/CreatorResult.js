import { ClipComposer } from "./ClipComposer.js";
import { exportClip, exportCapability } from "./Export.js";
import { shareVideo, downloadVideo } from "./Share.js";
import { creatorMetric } from "./metrics.js";

export class CreatorResult {
  constructor(root, result, copy) {
    this.root = root; this.result = result; this.copy = copy; this.format = "15";
    this.abort = new AbortController(); this.generation = 0;
    this.canvas = root.querySelector("canvas"); this.video = root.querySelector("video");
    this.canvas.width = 540; this.canvas.height = 960;
    this.composers = Object.fromEntries(Object.entries(result.plans).filter(([, plan]) => plan).map(([key, plan]) => [key, new ClipComposer(result.frames, plan, result)]));
    root.addEventListener("click", event => {
      const button = event.target.closest("[data-creator-action]"), action = button?.dataset.creatorAction;
      if (action === "15" || action === "7") { this.format = action; this.play(); this.update(); }
      else if (action === "replay") { creatorMetric("clip_replayed", { format: this.format }); this.play(); }
      else if (action === "share" && result.files[this.format]) {
        creatorMetric("share_pressed", { format: this.format });
        void shareVideo(result.files[this.format]).then(method => { if (method !== "cancelled") this.status(copy[method]); });
      } else if (action === "save" && result.files[this.format]) downloadVideo(result.files[this.format]);
      else if (action === "encode") void this.encode();
      if (event.target.closest('[data-result-action="retry"]')) creatorMetric("retry_pressed");
    }, { signal: this.abort.signal });
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) { this.stop(); this.video.pause(); }
      else if (!this.result.files[this.format]) this.play();
    }, { signal: this.abort.signal });
    this.play(); this.update(); void this.encode();
  }
  status(text) {
    const status=this.root.querySelector(".creator-export-status");
    if (!this.abort.signal.aborted&&status.textContent!==text) status.textContent=text;
  }
  update() {
    this.root.querySelectorAll('[data-creator-action="15"],[data-creator-action="7"]').forEach(button => button.setAttribute("aria-pressed", String(button.dataset.creatorAction === this.format)));
    for (const action of ["share", "save"]) this.root.querySelector(`[data-creator-action="${action}"]`).disabled = !this.result.files[this.format];
  }
  stop() { ++this.generation; cancelAnimationFrame(this.raf); this.raf = null; }
  play() {
    this.stop(); this.video.pause(); this.video.removeAttribute("src"); this.video.load();
    if (this.url) { URL.revokeObjectURL(this.url); this.url = null; }
    const file = this.result.files[this.format];
    this.canvas.hidden = !!file; this.video.hidden = !file;
    if (file) {
      this.url = URL.createObjectURL(file); this.video.src = this.url;
      this.video.muted = true; void this.video.play().catch(() => {}); return;
    }
    const composer = this.composers[this.format];
    if (!composer) { this.status(this.copy.noFrames); return; }
    let elapsed = 0, last = performance.now(); const token = this.generation;
    const tick = now => {
      if (token !== this.generation) return;
      elapsed += Math.min(100, now - last); last = now;
      void composer.paint(this.canvas, elapsed).catch(() => this.status(this.copy.failed));
      if (elapsed < composer.plan.duration) this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  }
  async encode() {
    if (this.encoding || this.abort.signal.aborted) return;
    if (!exportCapability().available) { this.status(this.copy.unsupported); return; }
    this.encoding = true;
    const retry = this.root.querySelector('[data-creator-action="encode"]'); retry.hidden = true;
    try {
      for (const format of ["15", "7"]) {
        if (this.result.files[format] || !this.result.plans[format]) continue;
        // Encoding and preview have independent decoding caches and clocks.
        const composer = new ClipComposer(this.result.frames, this.result.plans[format], this.result);
        try {
          this.result.files[format] = await exportClip(composer, {
            signal: this.abort.signal, sound: this.result.sound,
            onProgress: fraction => this.status(`${this.copy.generating} ${format} SEC · ${Math.floor(fraction * 10) * 10}%`),
          });
          creatorMetric("clip_generated", { format, faceMode: this.result.faceMode });
        } finally { composer.dispose(); }
        this.update();
        if (this.format === format) this.play();
      }
      this.status(this.copy.ready);
    } catch (error) {
      if (error.name !== "AbortError") { this.status(this.copy.failed); retry.hidden = false; }
    } finally { this.encoding = false; }
  }
  dispose() {
    this.abort.abort(); this.stop(); this.video.pause(); this.video.removeAttribute("src"); this.video.load();
    if (this.url) URL.revokeObjectURL(this.url);
    Object.values(this.composers).forEach(composer => composer.dispose()); this.canvas.width = 0;
  }
}
