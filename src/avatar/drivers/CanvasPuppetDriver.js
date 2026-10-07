import { idleMotionFrame } from '../motion/MotionFrame.js';
import { HUMAN } from '../profiles/index.js';
import { interpretMotion } from './interpretMotion.js';
// Same MotionFrame contract for a lightweight 2D/WebGL-unavailable path.
export class CanvasPuppetDriver {
  constructor(host) { this.host = host; }
  async load(config = {}) {
    this.config = { profile: HUMAN, cameraMode: 'MIRROR', ...config };
    this.canvas = document.createElement('canvas'); this.canvas.className = 'avatar-canvas-fallback';
    Object.assign(this.canvas.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', pointerEvents: 'none' });
    this.canvas.setAttribute('aria-hidden', 'true'); this.host.append(this.canvas); this.reset();
  }
  update(frame) {
    if (!this.canvas) return;
    const { width, height } = this.host.getBoundingClientRect();
    const w = Math.max(1, Math.round(width)), h = Math.max(1, Math.round(height));
    if (this.canvas.width !== w || this.canvas.height !== h) { this.canvas.width = w; this.canvas.height = h; }
    const c = this.canvas.getContext('2d'), m = interpretMotion(frame, this.config.profile, this.config.cameraMode), size = Math.min(w, h * .6) * (m.miniature ? .28 : .65);
    const positionScale = this.config.positionScale ?? 1;
    c.clearRect(0, 0, w, h); c.save(); c.translate(w * (m.miniature ? .82 : .5) + m.x * size * .4 * positionScale, h * (m.miniature ? .82 : .55) - m.y * size * positionScale); c.scale(size, size); c.rotate(-m.lean);
    const oval = (x, y, rx, ry, color) => { c.fillStyle = color; c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); c.fill(); };
    const color = this.config.profile.id === 'monster' ? '#8dcab0' : this.config.profile.id === 'bird' ? '#ffd26e' : '#abd5ff';
    oval(0, .05, .22, .3, color);
    const arm = (x, z, elbow) => { c.save(); c.translate(x, -.13); c.rotate(-z); c.strokeStyle = color; c.lineWidth = .06; c.lineCap = 'round'; c.beginPath(); c.moveTo(0, 0); c.lineTo(0, .25); c.stroke(); c.translate(0, .25); c.rotate(-elbow); c.beginPath(); c.moveTo(0, 0); c.lineTo(0, .2); c.stroke(); c.restore(); };
    const bird = this.config.profile.id === 'bird';
    if (bird) {
      for (const sign of [-1, 1]) {
        const angle = sign < 0 ? (m.mirror ? m.leftArm : m.rightArm) : (m.mirror ? m.rightArm : m.leftArm);
        c.save(); c.translate(sign * .18, -.1); c.rotate(sign * (Math.PI / 2 - Math.min(Math.PI, Math.abs(angle)))); oval(sign * .18, 0, .25, .105, '#e9a656'); c.restore();
      }
      oval(-.1, .36, .07, .035, '#ed8344'); oval(.1, .36, .07, .035, '#ed8344');
    } else {
      arm(m.mirror ? -.24 : .24, m.leftArm, m.leftElbow); arm(m.mirror ? .24 : -.24, m.rightArm, m.rightElbow);
      oval(-.11, .4, .065, .15, color); oval(.11, .4, .065, .15, color);
    }
    c.save(); c.translate(0, -.36); c.rotate(-m.roll); oval(0, 0, .23, .22, color);
    if (this.config.profile.id === 'bird') { c.fillStyle = '#ed8344'; c.beginPath(); c.moveTo(-.08, .07); c.lineTo(.08, .07); c.lineTo(0, .17 + m.mouth * .08); c.fill(); }
    oval(-.085 + m.yaw * .04, -.03, .026, Math.max(.004, .035 * (1 - (m.mirror ? m.blinkLeft : m.blinkRight))), '#213343');
    oval(.085 + m.yaw * .04, -.03, .026, Math.max(.004, .035 * (1 - (m.mirror ? m.blinkRight : m.blinkLeft))), '#213343');
    oval(m.yaw * .02, .09, .055, .008 + m.mouth * .08, '#213343'); c.restore(); c.restore();
  }
  setVisible(value) { if (this.canvas) this.canvas.hidden = !value; }
  reset() { this.update(idleMotionFrame()); }
  dispose() { this.canvas?.remove(); if (this.canvas) this.canvas.width = this.canvas.height = 0; this.canvas = null; }
}
