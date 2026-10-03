import { STAGES } from "../falseBridge/shapes.js";
export class FalseBridgeGame {
  constructor() { this.phase = "idle"; this.stageIndex = 0; this.partIndex = 0; this.source = "demo"; this.elapsedMs = 0; this.stages = []; this.parts = []; this.paused = false; }
  get stage() { return STAGES[this.stageIndex]; }
  get guide() { return this.stage.parts[this.partIndex]; }
  start(source) { this.source = source; this.stageIndex = 0; this.partIndex = 0; this.elapsedMs = 0; this.stages = []; this.parts = []; this.result = null; this.paused = false; this.prepare(); }
  prepare() { this.phase = this.source === "camera" ? "background" : "playing"; this.stageMs = 0; this.timer = 0; }
  calibrate() { if (["background", "playing"].includes(this.phase)) { this.phase = "calibration"; this.timer = 0; return true; } return false; }
  lock(sample) {
    if (this.phase !== "playing" || this.paused) return false;
    this.pending = { ...sample };
    if (sample.reason || sample.fit < .32) this.phase = "review";
    else this.accept(false);
    return true;
  }
  accept(selfJudged = true) {
    if (this.phase !== "review" && !(this.phase === "playing" && !selfJudged)) return false;
    this.parts.push({ ...this.pending, selfJudged, part: this.partIndex }); this.pending = null; this.phase = "locked"; this.timer = 0; return true;
  }
  retryLock() { if (this.phase !== "review") return false; this.pending = null; this.phase = "playing"; return true; }
  step(dt) {
    if (this.paused || !Number.isFinite(dt) || dt <= 0) return;
    if (["playing", "review"].includes(this.phase)) { this.elapsedMs += dt; this.stageMs += dt; }
    if (this.phase === "calibration" && (this.timer += dt) >= 1000) this.phase = "playing";
    if (this.phase !== "locked") return;
    this.timer += dt;
    const finalPart = this.partIndex === this.stage.parts.length - 1;
    if (this.timer < (finalPart ? 2400 : 900)) return;
    if (!finalPart) { this.partIndex++; this.phase = this.source === "camera" ? "background" : "playing"; this.timer = 0; }
    else { this.stages.push({ id: this.stage.id, seconds: this.stageMs / 1000, parts: this.parts.map(p => ({ ...p })) }); this.phase = "clear"; }
  }
  next() {
    if (this.phase !== "clear") return false;
    if (this.stageIndex < STAGES.length - 1) { this.stageIndex++; this.partIndex = 0; this.parts = []; this.prepare(); }
    else {
      const all = this.stages.flatMap(s => s.parts);
      this.result = { source: this.source, score: 5, completed: 5, seconds: this.elapsedMs / 1000, selfJudged: all.filter(p => p.selfJudged).length, stages: this.stages };
      this.phase = "result";
    }
    return true;
  }
}
