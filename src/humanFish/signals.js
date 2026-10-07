import { clamp } from './core.js';

// Calibrated relative head translation avoids forcing the face out of the camera crop.
export class FishSignal {
  constructor() { this.reset(); }
  reset() { this.samples = []; this.neutral = null; this.armed = false; this.last = -Infinity; this.open = false; }
  sample(packet, now) {
    const valid = packet?.face && Number.isFinite(packet.faceX) && Number.isFinite(packet.faceY) && now - packet.at <= 200;
    if (!valid) { this.armed = false; this.open = false; this.samples = []; return { tracked: false, ready: !!this.neutral, bite: false }; }
    if (now - this.last > 250) this.armed = false;
    this.last = now;
    if (!this.neutral) {
      this.samples.push({ x: packet.faceX, y: packet.faceY, at: now });
      this.samples = this.samples.filter(p => now - p.at <= 800);
      if (this.samples.length >= 8 && now - this.samples[0].at >= 600) {
        const xs = this.samples.map(p => p.x), ys = this.samples.map(p => p.y);
        if (Math.max(...xs) - Math.min(...xs) < .045 && Math.max(...ys) - Math.min(...ys) < .045)
          this.neutral = { x: xs.reduce((a, b) => a + b) / xs.length, y: ys.reduce((a, b) => a + b) / ys.length };
      }
    }
    if (packet.state === 'CLOSED') this.armed = true;
    const open = packet.state === 'OPEN', bite = open && !this.open && this.armed;
    if (bite) this.armed = false;
    this.open = open;
    return { tracked: true, ready: !!this.neutral, open, bite,
      target: this.neutral ? { x: clamp(.5 - (packet.faceX - this.neutral.x) * 3.3, .13, .87), y: clamp(.43 + (packet.faceY - this.neutral.y) * 3.9, .155, .9) } : null };
  }
  lost() { this.armed = false; this.open = false; }
}
