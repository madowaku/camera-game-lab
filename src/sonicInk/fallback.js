import { INKS, W, H, noteAt } from './core.js';

// Also used for artwork-only PNGs. Input, musical timing and replay are shared.
export function paintInk(canvas, game, { tip, background = false, yaw = 0 } = {}) {
  const ctx = canvas.getContext('2d'); if (!ctx) return;
  ctx.setTransform(canvas.width / W, 0, 0, canvas.height / H, 0, 0); ctx.clearRect(0, 0, W, H);
  if (background) { const g = ctx.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#302642'); g.addColorStop(1, '#181526'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
  const project = p => ({ x: W / 2 + (p.x - .5) * W * Math.cos(yaw) + p.z * Math.sin(yaw) * 90, y: p.y * H });
  ctx.lineCap = ctx.lineJoin = 'round';
  for (const s of game.strokes) for (let i = 1; i < s.points.length; i++) {
    const a = project(s.points[i - 1]), b = project(s.points[i]), p = s.points[i];
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.strokeStyle = INKS[p.note % 5]; ctx.shadowColor = ctx.strokeStyle; ctx.shadowBlur = 14; ctx.lineWidth = 5 + Math.min(1.5, p.speed) * 3; ctx.stroke();
    ctx.shadowBlur = 0; ctx.strokeStyle = '#ffffff99'; ctx.lineWidth = 1; ctx.stroke();
  }
  const p = game.cursor ?? tip;
  if (p) { const v = project(p); ctx.beginPath(); ctx.arc(v.x, v.y, 6, 0, Math.PI * 2); ctx.fillStyle = '#fff'; ctx.shadowColor = INKS[(p.note ?? noteAt(p.y)) % 5]; ctx.shadowBlur = 20; ctx.fill(); ctx.shadowBlur = 0; }
  if (background) { ctx.fillStyle = '#fff8'; ctx.font = '16px sans-serif'; ctx.fillText('SONIC INK / DRAW = COMPOSE', 24, H - 26); }
}
