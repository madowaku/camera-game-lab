import atlasUrl from './assets/fruit-atlas-v1.webp';
import { W, H } from './core.js';
import { drawCamera } from '../creator/CameraLayout.js';
import { OneEuroFilter2D } from '../input/oneEuroFilter.js';
import { cameraInputDebug } from '../input/debugStore.js';

const colors = ['#ff4d5a', '#ffb324', '#fb5c76', '#ffe943', '#ff476c'];
export class AirSlashRenderer {
  constructor(canvas) { this.canvas = canvas; this.c = canvas.getContext('2d'); this.atlas = new Image(); this.atlas.src = atlasUrl; this.reset(); }
  reset() { this.pieces = []; this.drops = []; this.trails = []; this.labels = []; this.shake = 0; this.soot = 0; this.flash = 0; this.bladeVisuals = new Map(); }
  visualStroke(stroke) {
    let state = this.bladeVisuals.get(stroke.id);
    if (!state || stroke.at - state.lastAt > 180 || stroke.at < state.lastAt) {
      state = { filter: new OneEuroFilter2D({ minCutoff: 1.2, beta: .035, dCutoff: 1 }), history: [], lastAt: stroke.at };
      this.bladeVisuals.set(stroke.id, state);
    }
    cameraInputDebug.point("AIR SLASH", "raw-blade", { ...stroke.b, present: true, id: stroke.id }, { at: stroke.at, width: W, height: H, slot: stroke.id });
    const point = state.filter.filter(stroke.b.x, stroke.b.y, stroke.at);
    cameraInputDebug.point("AIR SLASH", "filtered-blade", { ...point, present: true, id: stroke.id }, { at: stroke.at, width: W, height: H, slot: stroke.id });
    state.lastAt = stroke.at;
    state.history.push({ ...point, at: stroke.at });
    state.history = state.history.filter(p => stroke.at - p.at <= 130);
    return { ...stroke, a: state.history.at(-2) ?? point, b: point, trail: [...state.history] };
  }
  event(e, reduced = false) {
    if (e.type === 'trail') {
      const stroke = this.visualStroke(e.stroke);
      this.trails.push({ ...stroke, life: stroke.active ? .2 : .13 });
      if (this.trails.length > 28) this.trails.shift();
    }
    if (e.type === 'slice') {
      cameraInputDebug.event("AIR SLASH", "SLICE", { power: !!e.power, combo: e.combo });
      const f = e.fruit, nx = -Math.sin(e.angle), ny = Math.cos(e.angle);
      for (const side of [-1, 1]) this.pieces.push({ ...f, angle: e.angle, side, life: 1.05, age: 0, vx: f.vx * .25 + nx * side * (e.power ? 250 : 160), vy: -190 + ny * side * 160, twirl: side * .65 });
      this.burst(f.x, f.y, colors[f.kind], e.angle, reduced ? 6 : e.power || e.combo >= 5 ? 28 : 16);
      this.labels.push({ x: f.x, y: f.y - f.r, text: `+${e.points}`, color: '#fffbe5', life: .75 });
    }
    if (e.type === 'bomb') {
      cameraInputDebug.event("AIR SLASH", "BOMB");
      this.shake = reduced ? 0 : .42; this.flash = reduced ? 0 : .09; this.soot = 2.5;
      this.burst(e.fruit.x, e.fruit.y, '#ffb62b', e.angle, reduced ? 8 : 32);
      for (let i = 0; i < (reduced ? 7 : 16); i++) this.drops.push({ x: e.fruit.x, y: e.fruit.y, vx: (Math.random() - .5) * 220, vy: -Math.random() * 210, life: 1.2, max: 1.2, r: 15 + Math.random() * 30, color: '#252a2d', smoke: true });
      this.labels.push({ x: e.fruit.x, y: e.fruit.y, text: '-300', color: '#ff6b5b', life: 1.1 });
    }
  }
  burst(x, y, color, angle, count) {
    for (let i = 0; i < count; i++) {
      const a = angle + (i % 2 ? Math.PI : 0) + (Math.random() - .5) * 1.7, speed = 80 + Math.random() * 310;
      this.drops.push({ x, y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed - 110, r: 2 + Math.random() * 6, life: .45 + Math.random() * .4, max: .85, color });
    }
    if (this.drops.length > 200) this.drops.splice(0, this.drops.length - 200);
  }
  sprite(f) {
    const c = this.c, index = f.type === 'bomb' ? 5 : f.kind, size = f.r * 2.65;
    if (this.atlas.complete && this.atlas.naturalWidth) {
      const sw = this.atlas.naturalWidth / 3, sh = this.atlas.naturalHeight / 2;
      c.drawImage(this.atlas, index % 3 * sw, Math.floor(index / 3) * sh, sw, sh, -size / 2, -size / 2, size, size);
    } else { c.fillStyle = f.type === 'bomb' ? '#30383e' : colors[f.kind]; c.beginPath(); c.arc(0, 0, f.r, 0, Math.PI * 2); c.fill(); }
  }
  draw(game, { video, source, faceMode = 'ORIGINAL', dt = 0, reducedMotion = false, hands = [], face = null } = {}) {
    const c = this.c, d = game.paused ? 0 : Math.min(dt, 100) / 1000;
    c.save(); c.clearRect(0, 0, W, H); c.fillStyle = '#132428'; c.fillRect(0, 0, W, H);
    if (this.shake && !reducedMotion) c.translate(Math.sin(this.shake * 110) * this.shake * 22, Math.cos(this.shake * 95) * this.shake * 17);
    if (source === 'camera' && faceMode !== 'HIDE') drawCamera(c, video, W, H);
    else {
      const g = c.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#163236'); g.addColorStop(1, '#08171a'); c.fillStyle = g; c.fillRect(0, 0, W, H);
      c.strokeStyle = '#b7e9d20c'; c.lineWidth = 1;
      for (let x = 30; x < W; x += 60) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, H); c.stroke(); }
      for (let y = 0; y < H; y += 60) { c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); }
      c.fillStyle = '#a7e9d007'; c.beginPath(); c.ellipse(W / 2, H * .31, 54, 66, 0, 0, Math.PI * 2); c.fill();
      c.beginPath(); c.ellipse(W / 2, H * .66, 128, 207, 0, 0, Math.PI * 2); c.fill();
    }
    // Quiet edge scrims leave the player and hands visible.
    const scrim = c.createLinearGradient(0, 0, 0, H); scrim.addColorStop(0, '#08171adb'); scrim.addColorStop(.18, '#08171a00'); scrim.addColorStop(.75, '#08171a00'); scrim.addColorStop(1, '#08171aaa'); c.fillStyle = scrim; c.fillRect(0, 0, W, H);
    const head = face ?? { x: W / 2, y: H * .29, width: 120, height: 150 };
    if (faceMode === 'EFFECT' && source === 'camera') {
      c.save(); c.translate(head.x, head.y); c.fillStyle = '#b9f34dcc'; c.fillRect(-head.width * .52, -head.height * .12, head.width * 1.04, head.height * .14); c.fillStyle = '#173129'; c.font = '900 15px Impact'; c.textAlign = 'center'; c.fillText('JUICY', 0, head.height * .005); c.restore();
    }
    if (this.soot > 0 && faceMode !== 'HIDE') {
      c.save(); c.globalAlpha = Math.min(.65, this.soot); c.fillStyle = '#202323';
      for (let i = 0; i < 6; i++) { c.beginPath(); c.ellipse(head.x + (i % 3 - 1) * head.width * .22, head.y + (Math.floor(i / 3) - .5) * head.height * .19, 8 + i * 2, 6 + i, i, 0, Math.PI * 2); c.fill(); } c.restore();
    }
    this.shake = Math.max(0, this.shake - d); this.soot = Math.max(0, this.soot - d); this.flash = Math.max(0, this.flash - d);
    for (const f of game.fruits) { c.save(); c.translate(f.x, f.y); c.rotate(f.rotation); this.sprite(f); if (f.giant) { c.strokeStyle = '#d9ff75'; c.lineWidth = 3; c.setLineDash([5, 7]); c.beginPath(); c.arc(0, 0, f.r + 8, 0, Math.PI * 2); c.stroke(); } c.restore(); }
    for (const p of this.pieces) {
      p.age += d; p.life -= d; p.x += p.vx * d; p.y += p.vy * d; p.vy += 950 * d;
      c.save(); c.globalAlpha = Math.min(1, p.life * 3); c.translate(p.x, p.y); c.rotate(p.angle + p.twirl * p.age);
      // The clip's straight edge and the separating motion share the measured slash angle.
      c.beginPath(); c.rect(-p.r * 2, p.side > 0 ? 0 : -p.r * 2, p.r * 4, p.r * 2); c.clip();
      c.save(); c.rotate(p.rotation - p.angle); this.sprite(p); c.restore();
      c.fillStyle = p.kind === 2 ? '#ff5e72' : p.kind === 0 ? '#ffe9b8' : colors[p.kind]; c.beginPath(); c.ellipse(0, 0, p.r * .85, p.r * .14, 0, 0, Math.PI * 2); c.fill();
      c.strokeStyle = '#fff4cd'; c.lineWidth = 2; c.beginPath(); c.moveTo(-p.r * .85, 0); c.lineTo(p.r * .85, 0); c.stroke(); c.restore();
    }
    for (const p of this.drops) { p.life -= d; p.x += p.vx * d; p.y += p.vy * d; p.vy += (p.smoke ? -80 : 850) * d; c.globalAlpha = Math.max(0, p.life / p.max) * (p.smoke ? .65 : 1); c.fillStyle = p.color; c.beginPath(); c.ellipse(p.x, p.y, p.r * (p.smoke ? 1 + (1.2 - p.life) : 1), p.r, .5, 0, Math.PI * 2); c.fill(); }
    c.globalAlpha = 1;
    for (const t of this.trails) {
      t.life -= d; c.save(); c.globalAlpha = Math.max(0, t.life / .2); c.lineCap = 'round'; c.lineJoin = 'round';
      c.shadowColor = t.power ? '#dcff67' : t.id === 'left' ? '#91e8f2' : '#f6ffff'; c.shadowBlur = reducedMotion ? 0 : t.active ? 17 : 4;
      c.strokeStyle = t.active ? '#ffffef' : '#b7e3d877'; c.lineWidth = t.active ? t.power ? 10 : 6 : 2;
      c.beginPath(); t.trail.forEach((p, i) => i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y)); c.stroke(); c.restore();
    }
    for (const p of hands) { if (p.x < 0 || p.x > W || p.y < 0 || p.y > H) continue; c.strokeStyle = p.id === 'left' ? '#8de8f2' : '#dcff67'; c.lineWidth = 2; c.beginPath(); c.arc(p.x, p.y, 9, 0, Math.PI * 2); c.stroke(); }
    for (const p of this.labels) { p.life -= d; p.y -= d * 50; c.globalAlpha = Math.max(0, Math.min(1, p.life * 3)); c.font = '900 30px Impact, sans-serif'; c.textAlign = 'center'; c.lineWidth = 4; c.strokeStyle = '#132428'; c.fillStyle = p.color; c.strokeText(p.text, p.x, p.y); c.fillText(p.text, p.x, p.y); }
    c.globalAlpha = 1;
    if (this.flash > 0 && !reducedMotion) { c.fillStyle = '#ffbd4544'; c.fillRect(0, 0, W, H); }
    this.pieces = this.pieces.filter(p => p.life > 0); this.drops = this.drops.filter(p => p.life > 0); this.trails = this.trails.filter(p => p.life > 0); this.labels = this.labels.filter(p => p.life > 0); c.restore();
  }
}
