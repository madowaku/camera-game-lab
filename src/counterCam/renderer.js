import rookieUrl from './assets/rookie-v1.webp';
import { drawFaceMode } from '../creator/FaceMode.js';
import { ENEMY_HP, ROUND_MS } from './core.js';
import { clamp } from './pose.js';
export const W = 360, H = 640;
const circle = (c, x, y, r) => { c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); };
const text = (c, value, x, y, size, color = '#fff7db', align = 'center') => {
  c.textAlign = align; c.font = `${size >= 18 ? '900' : '700'} ${size}px ${size >= 18 ? 'Impact, Haettenschweiler' : 'Trebuchet MS'}, sans-serif`;
  c.strokeStyle = '#11191a'; c.lineWidth = size >= 24 ? 4 : 2; c.strokeText(value, x, y); c.fillStyle = color; c.fillText(value, x, y);
};
export class CounterCamRenderer {
  constructor(canvas) { this.canvas = canvas; canvas.width = W; canvas.height = H; this.c = canvas.getContext('2d'); this.robot = new Image(); this.robot.src = rookieUrl; }
  glove(c, x, y, size, side) {
    c.save(); c.translate(x, y); c.rotate(side * .18);
    c.beginPath(); c.ellipse(0, 0, size * .53, size * .48, 0, 0, Math.PI * 2); c.clip();
    if (this.robot.complete && this.robot.naturalWidth) {
      const iw = this.robot.naturalWidth, ih = this.robot.naturalHeight;
      // The generated glove is enlarged from the same robot sprite.
      const crop = side > 0 ? [.69, .47, .27, .28] : [.15, .37, .27, .28];
      c.drawImage(this.robot, iw * crop[0], ih * crop[1], iw * crop[2], ih * crop[3], -size * .53, -size * .48, size * 1.06, size * .96);
    }
    c.restore();
  }
  draw(g, { video, pose, motion = {}, source = 'demo', faceMode = 'ORIGINAL', reducedMotion = false, phase, calibration, hint, endingTime = 0 } = {}) {
    const c = this.c, time = g.elapsed + endingTime, effect = g.effect, age = effect ? time - effect.at : Infinity;
    const impact = [...g.history].reverse().find(e => ['PUNCH', 'COUNTER', 'PERFECT COUNTER', 'MEGA PUNCH'].includes(e.type));
    const impactAge = impact ? time - impact.at : Infinity, mega = impact?.type === 'MEGA PUNCH';
    c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, W, H);
    c.fillStyle = '#162629'; c.fillRect(0, 0, W, H);
    if (source === 'camera') {
      drawFaceMode(c, video, faceMode, pose?.face, { width: W, height: H, effect: (ctx, f) => {
        ctx.strokeStyle = '#ffdb4a'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(f.x - f.width * .5, f.eyeY - f.height * .24); ctx.lineTo(f.x + f.width * .5, f.eyeY - f.height * .24); ctx.stroke();
        ctx.fillStyle = '#e9523a'; for (const sign of [-1, 1]) { ctx.beginPath(); ctx.ellipse(f.x + sign * f.width * .3, f.y + f.height * .2, f.width * .1, f.height * .1, 0, 0, Math.PI * 2); ctx.fill(); }
      } });
      c.fillStyle = '#08151533'; c.fillRect(0, 0, W, H);
    } else {
      const x = W * (.5 + (motion.head ?? 0) * .24), y = 214;
      const bg = c.createRadialGradient(180, 220, 20, 180, 220, 320); bg.addColorStop(0, '#39595b'); bg.addColorStop(1, '#102123'); c.fillStyle = bg; c.fillRect(0, 0, W, H);
      c.strokeStyle = '#547270'; c.lineWidth = 1; for (let i = 0; i < 8; i++) { c.beginPath(); c.moveTo(i * 60 - 40, 70); c.lineTo(i * 60 - 40, H); c.stroke(); }
      c.fillStyle = '#a4c1b1'; c.beginPath(); c.ellipse(x, y + 150, 95, 105, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#e9bc91'; circle(c, x, y, 40); c.fill(); c.fillStyle = '#172f30';
      for (const sign of [-1, 1]) { circle(c, x + sign * 13, y - 4, 3); c.fill(); }
      c.lineWidth = 3; c.strokeStyle = '#172f30'; c.beginPath(); c.arc(x, y + 9, 12, 0, Math.PI); c.stroke();
      text(c, 'YOU', x, y - 55, 12, '#c6e8dc');
      if (motion.guard) { c.strokeStyle = '#84e9e6'; c.lineWidth = 5; circle(c, x, y, 65); c.stroke(); }
      for (const sign of [-1, 1]) this.glove(c, x + sign * (motion.guard ? 45 : 65), y + (motion.guard ? 0 : 85), 45, sign);
    }
    const shade = c.createLinearGradient(0, 0, 0, H); shade.addColorStop(0, '#08191be8'); shade.addColorStop(.2, '#08191b00'); shade.addColorStop(.75, '#08191b00'); shade.addColorStop(1, '#08191bf2'); c.fillStyle = shade; c.fillRect(0, 0, W, H);
    c.strokeStyle = '#f1d58944'; c.lineWidth = 2; for (const y of [490, 525]) { c.beginPath(); c.moveTo(0, y); c.lineTo(W, y + 9); c.stroke(); }
    const wind = g.stage === 'telegraph', counter = g.stage === 'counter';
    c.save();
    if (!reducedMotion && impactAge < 260) c.translate(Math.sin(impactAge / 13) * (mega ? 14 : 3 + impact.data.strength * 5) * (1 - impactAge / 260), 0);
    const bob = reducedMotion ? 0 : Math.sin(g.combatTime / 230) * 3;
    const robotW = 290, robotH = 245, rx = 35 + (wind ? -g.side * 10 * g.stageTime / 900 : 0), ry = 350 + bob;
    c.save(); c.translate(180, 475);
    if (wind && !reducedMotion) c.rotate(-g.side * .07 * g.stageTime / 900);
    if (impactAge < 450 && !reducedMotion) { const p = clamp(impactAge / 450, 0, 1); c.translate(mega ? p * 200 : Math.sin(p * Math.PI) * -18, mega ? -p * 200 : Math.sin(p * Math.PI) * 12); c.rotate((mega ? 1.8 : .1) * p); }
    c.globalAlpha = source === 'camera' ? .86 : 1;
    if (this.robot.complete && this.robot.naturalWidth) c.drawImage(this.robot, rx - 180, ry - 475, robotW, robotH);
    c.restore();
    const targetX = pose && this.baseline ? W * (.5 + ((this.baseline.x + g.targetHead * this.baseline.width) - .5) * Math.max(1, pose.aspect / (W / H))) : W * (.5 + g.targetHead * .24);
    const faceY = pose ? clamp(H * (.5 + (pose.nose.y - .5) * Math.max(1, (W / H) / pose.aspect)), 115, 290) : 214;
    if (wind) {
      const progress = g.stageTime / 900, shoulderX = 180 + g.side * 98;
      c.strokeStyle = '#ff523e'; c.lineWidth = 3; c.setLineDash([8, 8]); c.beginPath(); c.moveTo(shoulderX, 457); c.lineTo(targetX, faceY); c.stroke(); c.setLineDash([]);
      c.fillStyle = '#ff523e'; circle(c, shoulderX, 449, 7 + Math.sin(progress * 35) * 3); c.fill();
      c.strokeStyle = '#ff6b50'; c.lineWidth = 3; circle(c, targetX, faceY, 51 - progress * 12); c.stroke();
      if (g.attacks <= 2) text(c, g.side > 0 ? '← DODGE' : 'DODGE →', 180, 130, 26, '#ffdb4a');
    }
    if (g.stage === 'strike' || counter && g.stageTime < 280) {
      const p = clamp(g.stageTime / 250, 0, 1), sx = 180 + g.side * 95;
      const fistX = sx + (targetX + g.side * 35 - sx) * Math.sin(p * Math.PI / 2), fistY = 470 + (faceY - 470) * Math.sin(p * Math.PI / 2);
      if (!reducedMotion) { c.strokeStyle = '#fff5d677'; c.lineWidth = 6; for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(sx + i * 10, 450); c.lineTo(fistX + i * 8, fistY + 40); c.stroke(); } }
      this.glove(c, fistX, fistY, 65 + p * 55, g.side);
    }
    if (counter) {
      c.strokeStyle = '#ffdb4a'; c.lineWidth = 3; circle(c, 180, 412, 33 + (reducedMotion ? 0 : Math.sin(time / 80) * 3)); c.stroke();
      c.beginPath(); c.moveTo(135, 412); c.lineTo(152, 412); c.moveTo(208, 412); c.lineTo(225, 412); c.moveTo(180, 367); c.lineTo(180, 384); c.stroke();
      text(c, 'COUNTER!', 180, 345, 34, '#ffdb4a'); text(c, g.stageTime <= 300 ? '80 DAMAGE' : '40 DAMAGE', 180, 375, 15, '#ffdb4a');
    }
    if (impactAge < (mega ? 900 : 450)) {
      const p = clamp(impactAge / 450, 0, 1); c.strokeStyle = '#ffdb4a'; c.lineWidth = mega ? 6 : 3;
      if (!reducedMotion) for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; c.beginPath(); c.moveTo(180 + Math.cos(a) * (25 + p * 60), 420 + Math.sin(a) * (25 + p * 60)); c.lineTo(180 + Math.cos(a) * (45 + p * 100), 420 + Math.sin(a) * (45 + p * 100)); c.stroke(); }
      const label = mega ? 'MEGA PUNCH' : impact.data.strength > .75 ? 'BOOOOM!!' : impact.data.strength > .35 ? 'BAM!' : 'PON!';
      text(c, label, 180, mega ? 265 : 300, mega ? 42 : 36, '#ffdb4a'); text(c, `${impact.type} · ${impact.data.damage}`, 180, mega ? 305 : 329, 15, '#fff7db');
      if (mega) { c.strokeStyle = '#fff7db'; c.lineWidth = 2; for (let i = 0; i < 6; i++) { const a = i * 1.1; c.beginPath(); c.moveTo(180, 410); c.lineTo(180 + Math.cos(a) * 65, 410 + Math.sin(a) * 85); c.lineTo(180 + Math.cos(a + .17) * 180, 410 + Math.sin(a + .17) * 250); c.stroke(); } }
    }
    if (age < 650 && ['JUST DODGE', 'GUARD', 'HIT'].includes(effect?.type)) text(c, effect.type, 180, counter ? 110 : 130, 30, effect.type === 'HIT' ? '#ff735d' : '#84e9e6');
    c.restore();
    // All HUD elements are on the canvas so the best clip includes the round.
    text(c, 'YOU', 20, 30, 13, '#fff7db', 'left'); text(c, 'ROOKIE ROBOT', 340, 30, 12, '#fff7db', 'right');
    text(c, '♥'.repeat(g.lives) + '♡'.repeat(3 - g.lives), 20, 55, 22, '#ff6b50', 'left');
    c.fillStyle = '#fff7db33'; c.fillRect(224, 42, 116, 10); c.fillStyle = '#ffdb4a'; c.fillRect(224, 42, 116 * g.enemyHp / ENEMY_HP, 10);
    text(c, `${Math.ceil((ROUND_MS - g.elapsed) / 1000)}`, 180, 45, 29, '#ffdb4a');
    text(c, `COUNTER ×${g.counters}`, 20, 572, 21, '#ffdb4a', 'left');
    text(c, motion.guard ? 'GUARD ✓' : source === 'demo' ? 'PRACTICE' : motion.tracked ? 'FACE ✓' : 'FACE ?', 340, 572, 11, motion.tracked || source === 'demo' ? '#c7e9dc' : '#ffdb4a', 'right');
    if (source === 'camera') text(c, motion.hands ? 'HANDS ✓' : 'HANDS ? · MOVE BACK', 340, 589, 10, motion.hands ? '#c7e9dc' : '#ffdb4a', 'right');
    for (let i = 0; i < 8; i++) { c.fillStyle = g.special >= (i + 1) * 12.5 ? '#ffdb4a' : '#ffdb4a33'; c.fillRect(20 + i * 20, 606, 16, 13); }
    text(c, g.special >= 100 ? g.chargeMs >= 500 ? 'PUNCH!' : 'FINISH! HOLD…' : 'SPECIAL', 340, 618, 16, '#ffdb4a', 'right');
    if (g.special >= 100) { c.strokeStyle = '#ffdb4a'; c.lineWidth = 4; c.beginPath(); c.arc(180, 415, 53, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, g.chargeMs / 500)); c.stroke(); }
    if (phase === 'calibration') {
      text(c, ['01 / READY', '02 / PUNCH', '03 / DODGE', 'FIGHT!'][calibration], 180, 118, 30, '#ffdb4a');
      if (calibration === 2) text(c, hint, 180, 155, 22, '#84e9e6');
    }
    if (phase === 'ending') {
      text(c, g.result.title, 180, 200, 82, '#ffdb4a'); text(c, `${(g.elapsed / 1000).toFixed(2)} SEC · PERFECT COUNTER ×${g.perfectCounters}`, 180, 239, 12);
    }
  }
}
