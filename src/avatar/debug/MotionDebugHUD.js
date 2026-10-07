// Deliberately text-only, opt-in, and throttled. Raw view is counts, not biometric
// landmarks retained by the renderer or persisted to storage.
export class MotionDebugHUD {
  constructor(element) { this.element = element; this.mode = 'SMOOTHED'; this.last = -Infinity; }
  update(layer, now) {
    if (this.element.hidden || now - this.last < 150) return; this.last = now;
    if (this.mode === 'RAW') { this.element.textContent = JSON.stringify(layer.rawDebug ?? {}, null, 2); return; }
    const f = this.mode === 'NORMALIZED' ? layer.normalized : layer.frame;
    if (!f) return;
    const fixed = n => n.toFixed(2);
    this.element.textContent = `${this.mode} · ${layer.quality.level}\nFPS ${layer.quality.fps.toFixed(0)}\n` +
      Object.entries(f.tracking).map(([k, v]) => `${k.padEnd(10)} ${v ? '✓' : '—'} ${layer.recovery.status[k] ?? 'IDLE'}`).join('\n') +
      `\nYAW   ${fixed(f.head.yaw)}\nPITCH ${fixed(f.head.pitch)}\nROLL  ${fixed(f.head.roll)}\nMOUTH ${fixed(f.face.mouthOpen)}\nBLINK ${fixed(f.face.blinkLeft)} / ${fixed(f.face.blinkRight)}\nMOTION ${fixed(f.energy.movement)} / SPEED ${fixed(f.energy.speed)}`;
  }
}
