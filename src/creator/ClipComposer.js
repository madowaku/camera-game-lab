export class ClipComposer {
  constructor(frames, plan, { faceMode = "ORIGINAL", source = "camera", reducedMotion = false } = {}) {
    this.frames = frames; this.plan = plan; this.faceMode = faceMode; this.source = source; this.reducedMotion = reducedMotion;
    this.cache = new Map(); this.generation = 0;
  }
  async decode(frame) {
    if (!this.cache.has(frame)) {
      const token = this.generation;
      const pending = (async () => {
        let bitmap;
        if (typeof createImageBitmap === "function") bitmap = await createImageBitmap(frame.blob);
        else {
          const url = URL.createObjectURL(frame.blob);
          try { bitmap = new Image(); bitmap.src = url; await bitmap.decode(); }
          finally { URL.revokeObjectURL(url); }
        }
        if (token !== this.generation) { bitmap.close?.(); return null; }
        return bitmap;
      })();
      this.cache.set(frame, pending);
      if (this.cache.size > 6) {
        const key = this.cache.keys().next().value, old = this.cache.get(key);
        this.cache.delete(key); void old.then(bitmap => bitmap?.close?.()).catch(() => {});
      }
    }
    return this.cache.get(frame);
  }
  async paint(canvas, elapsed) {
    const plan = this.plan, token = this.generation, request = this.request = (this.request ?? 0) + 1;
    const segment = plan.segments.find(s => elapsed < s.start + s.duration) ?? plan.segments.at(-1);
    const c = canvas.getContext("2d"), w = canvas.width, h = canvas.height;
    if (segment.kind === "END_CARD") { this.endCard(c, w, h); return; }
    const at = segment.from + Math.max(0, elapsed - segment.start);
    // Each source span plays at its recorded speed, including the full reaction.
    const frame = this.frames.reduce((a, b) => Math.abs(b.at - at) < Math.abs(a.at - at) ? b : a);
    const bitmap = await this.decode(frame);
    if (!bitmap || token !== this.generation || request !== this.request) return;
    c.save(); c.fillStyle = "#fff7eb"; c.fillRect(0, 0, w, h);
    const heroAge = at - plan.heroTimestamp;
    const zoom = plan.heroTimestamp !== null && heroAge >= 0 && heroAge < 450 && !this.reducedMotion ? 1.025 : 1;
    c.translate(w / 2, h / 2); c.scale(zoom, zoom); c.drawImage(bitmap, -w / 2, -h / 2, w, h); c.restore();
    c.textAlign = "center";
    if (segment.kind === "HOOK" || segment.kind === "UNDERSTAND") this.label(c, plan.profile.gameplayText, w / 2, h * .2, w * .082);
    if (plan.heroTimestamp !== null && heroAge >= 0 && heroAge < 700) {
      this.label(c, plan.profile.heroLabel, w / 2, h * .22, w * .088);
      if (!this.reducedMotion) for (let i = 0; i < 12; i++) {
        const a = i * 2.4, r = w * (.12 + heroAge / 4000);
        c.fillStyle = ["#f57682", "#a9be88", "#f6c561"][i % 3];
        c.fillRect(w * .5 + Math.cos(a) * r, h * .24 + Math.sin(a) * r, w * .012, w * .02);
      }
    }
  }
  label(c, text, x, y, size) {
    c.font = `900 ${size}px sans-serif`; c.strokeStyle = "#583a2d"; c.lineWidth = size * .12; c.fillStyle = "#fff7eb";
    c.strokeText(text, x, y); c.fillText(text, x, y);
  }
  endCard(c, w, h) {
    c.fillStyle = "#fff7eb"; c.fillRect(0, 0, w, h); c.textAlign = "center";
    c.fillStyle = "#a9404d"; c.font = `900 ${w * .105}px sans-serif`; c.fillText(`${this.plan.profile.brand} 🍦`, w / 2, h * .43);
    c.fillStyle = "#583a2d"; c.font = `800 ${w * .048}px sans-serif`; c.fillText(`CAMERA GAME #${String(this.plan.profile.gameNumber).padStart(3, "0")}`, w / 2, h * .51);
    c.font = `900 ${w * .07}px sans-serif`; c.fillText("PLAY", w / 2, h * .61);
    if (this.source === "demo") { c.font = `${w * .034}px sans-serif`; c.fillText("CAMERA-FREE PRACTICE", w / 2, h * .69); }
  }
  dispose() {
    ++this.generation;
    for (const bitmap of this.cache.values()) void bitmap.then(image => image?.close?.()).catch(() => {});
    this.cache.clear(); this.frames = [];
  }
}
