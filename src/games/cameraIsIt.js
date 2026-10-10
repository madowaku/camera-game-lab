import { stages, VIEW, WORLD } from "../camera/stages.js";
import { createRuleState, updateRule, anchorVisible } from '../camera/rules.js';
const WALK_SPEED = 128;

export const clamp = (n, low, high) => Math.max(low, Math.min(high, n));
export function clampCamera(camera) {
  return { x: clamp(camera.x, VIEW.width / 2, WORLD.width - VIEW.width / 2), y: clamp(camera.y, VIEW.height / 2, WORLD.height - VIEW.height / 2) };
}

// The collision surface fades only when its actual top surface leaves the frame.
// A 10% halo and 240 ms disappearance grace make recovery legible.
export function existence(platform, camera) {
  const dx = Math.max(camera.x - VIEW.width / 2 - (platform.x + platform.width), platform.x - (camera.x + VIEW.width / 2), 0);
  const dy = Math.max(camera.y - VIEW.height / 2 - platform.y, platform.y - (camera.y + VIEW.height / 2), 0);
  return clamp(1 - Math.max(dx / (VIEW.width * VIEW.margin), dy / (VIEW.height * VIEW.margin)), 0, 1);
}

export class CameraIsItGame {
  constructor() { this.start(); this.phase = "idle"; }
  start(source = "demo", background = false) {
    this.source = source; this.background = background; this.completed = 0; this.elapsed = 0; this.stageElapsed = 0;
    this.receipts = []; this.attempts = []; this.result = null; this.loadStage(0);
  }
  loadStage(index) {
    this.index = index; this.stage = stages[index]; this.phase = "ready";
    this.camera = { ...this.stage.camera }; this.targetCamera = { ...this.camera };
    this.platforms = this.stage.platforms.map((p, i) => ({ ...p, id: i, objectId: p.objectId ?? `PLATFORM_${index + 1}_${i}`, active: false, opacity: 0, outside: 0, ruleState: createRuleState() }));
    this.anchors = (this.stage.anchors ?? []).map((a) => ({ ...a, visible: false }));
    this.failTime = 0; this.activationCount = 0;
    this.runner = { ...this.stage.start, vx: WALK_SPEED, vy: 0, width: 26, height: 40, support: 0, airborne: false };
    this.goal = { x: this.platforms.at(-1).x + this.platforms.at(-1).width - 80, y: this.platforms.at(-1).y };
    this.stageElapsed = 0; this.hiddenTime = 0; this.readyTime = 0; this.warning = null; this.failure = null;
    this.updateExistence(0);
  }
  setCamera(camera, instant = false) {
    this.targetCamera = clampCamera(camera); if (instant) this.camera = { ...this.targetCamera };
  }
  updateExistence(dt) {
    const counts = {};
    for (const a of this.anchors) {
      a.visible = anchorVisible(a, this.camera, VIEW);
      if (a.visible) counts[a.linkedGroup] = (counts[a.linkedGroup] ?? 0) + 1;
    }
    for (const p of this.platforms) {
      if (p.rule === 'LINKED' && !this.anchors.some(a => a.linkedGroup === p.linkedGroup) && anchorVisible(p, this.camera, VIEW)) counts[p.linkedGroup] = (counts[p.linkedGroup] ?? 0) + 1;
    }
    for (const p of this.platforms) {
      if (p.rule) {
        const was = p.ruleState.solid;
        updateRule(p, p.ruleState, anchorVisible(p, this.camera, VIEW), dt, counts[p.linkedGroup] ?? 0,
          p.rule === 'EXCLUDE' && p.blocker ? !anchorVisible(p.blocker, this.camera, VIEW) : false);
        p.active = p.ruleState.solid;
        // The focus target must remain visible as an outline before it is centered.
        const inFrame = p.centerHold && anchorVisible({ ...p, centerHold: false }, this.camera, VIEW);
        p.opacity = inFrame && !p.active ? Math.max(.28, p.ruleState.opacity) : p.ruleState.opacity;
        if (!was && p.active) this.activationCount++;
        continue;
      }
      const amount = existence(p, this.camera);
      p.outside = amount > 0 ? 0 : p.outside + dt;
      p.active = amount > 0 || (p.active && p.outside < 240);
      p.opacity += (amount - p.opacity) * (dt ? 1 - Math.exp(-dt / 95) : 1);
    }
  }
  step(ms) {
    if (this.phase === 'failing' && !this.paused) {
      this.failTime += ms;
      if (this.failTime >= 500) { this.loadStage(this.index); this.readyTime = 800; }
      return;
    }
    if (!["ready", "playing"].includes(this.phase) || this.paused) return;
    for (let remaining = Math.max(0, ms); remaining > 0 && ["ready", "playing"].includes(this.phase);) {
      const dt = Math.min(remaining, 16); remaining -= dt; this.simulate(dt);
    }
  }
  simulate(dt) {
    const blend = 1 - Math.exp(-dt / 85);
    this.camera.x += (this.targetCamera.x - this.camera.x) * blend;
    this.camera.y += (this.targetCamera.y - this.camera.y) * blend;
    this.updateExistence(this.phase === 'ready' && this.stage.warmupRules === false ? 0 : dt);
    if (this.phase === "ready") { this.readyTime += dt; if (this.readyTime >= 1400) this.phase = "playing"; return; }
    this.elapsed += dt; this.stageElapsed += dt;
    const r = this.runner, sec = dt / 1000;
    const visible = Math.abs(r.x - this.camera.x) < VIEW.width * .6 && Math.abs(r.y - this.camera.y) < VIEW.height * .6;
    this.hiddenTime = visible ? 0 : this.hiddenTime + dt;
    if (this.hiddenTime > 1250) return this.failStage(this.platforms[r.support], 'lost');
    const support = this.platforms[r.support];
    this.warning = !visible ? "lost" : support && existence(support, this.camera) < .5 ? "edge" : null;
    if (!r.airborne && (!support?.active || r.x < support.x || r.x > support.x + support.width)) {
      if (!support?.active) return this.failStage(support);
      r.airborne = true; r.vx = 90; r.vy = 0;
    }
    if (!r.airborne) {
      r.x += WALK_SPEED * sec; r.y = support.y - r.height / 2;
      const next = this.platforms[r.support + 1];
      // Intro lessons stop before an unready route instead of forcing a blind fall.
      if (this.stage.tutorialGate && next && !next.active && r.x >= support.x + support.width - 52) {
        r.x = support.x + support.width - 52;
        this.warning = next.rule === 'FOCUS_HOLD' ? 'focusWait' : next.rule === 'EXCLUDE' ? 'excludeWait' : 'memoryWait';
        return;
      }
      if (next && r.x >= support.x + support.width - 36) {
        if (next.x <= support.x + support.width && next.y === support.y) {
          if (r.x >= next.x) { if (next.active) r.support++; else { return this.failStage(next); } }
        } else if (next.active) {
          // The launch and landing surfaces must both exist when he takes off.
          // If the player only follows him, he'll walk beyond the missing route.
          const landing = next.x + 45, delta = next.y - support.y;
          const time = Math.max(1.12, Math.abs(delta) > 500 ? 1.7 : 1.3);
          r.vx = (landing - r.x) / time; r.vy = (delta - .5 * 800 * time * time) / time; r.airborne = true;
        }
      }
    } else {
      const oldFeet = r.y + r.height / 2;
      r.x += r.vx * sec; r.y += r.vy * sec + .5 * 800 * sec * sec; r.vy += 800 * sec;
      if (r.vy > 0) {
        const hit = this.platforms.find((p) => p.active && oldFeet <= p.y + 1 && r.y + r.height / 2 >= p.y && r.x >= p.x - 10 && r.x <= p.x + p.width + 10);
        if (hit) { r.support = hit.id; r.y = hit.y - r.height / 2; r.vy = 0; r.vx = WALK_SPEED; r.airborne = false; }
      }
    }
    if (r.y > WORLD.height + 80) return this.failStage(this.platforms[r.support]);
    if (this.stage.timeLimitMs && this.stageElapsed > this.stage.timeLimitMs) return this.failStage(null, 'time');
    if (!r.airborne && r.support === this.platforms.length - 1 && r.x >= this.goal.x) {
      this.completed++; this.receipts.push({ stage: this.index + 1, seconds: this.stageElapsed / 1000, source: this.source, background: this.background });
      if (this.index === stages.length - 1) this.finish(true); else this.phase = "stage-clear";
    }
  }
  nextStage() { if (this.phase === "stage-clear") this.loadStage(this.index + 1); }
  failStage(platform, reason = null) {
    this.phase = 'failing'; this.failTime = 0;
    this.failure = reason ?? (platform?.rule === 'OVEREXPOSE' ? 'overexpose' : 'fall');
    this.failedObject = platform?.objectId;
    this.runner.y += 24; this.runner.airborne = true;
    this.attempts ??= []; this.attempts.push({ stage: this.index + 1, reason: this.failure, objectId: this.failedObject, seconds: this.stageElapsed / 1000 });
    // Keep the failed surface in frame during the brief cause freeze.
    if (platform) this.camera = clampCamera({ x: platform.x + platform.width / 2, y: platform.y - 130 });
  }
  finish(clear, reason = null) {
    this.phase = "result"; this.failure = reason;
    this.result = { clear, reason, source: this.source, completed: this.completed, totalStages: stages.length, stage: this.index + 1, seconds: this.elapsed / 1000, background: this.background, receipts: [...this.receipts], attempts: [...this.attempts] };
  }
}
