import { VIEW } from "./stages.js";

export function drawWorld(canvas, game, now, reducedMotion = false) {
  const ctx = canvas.getContext("2d"), w = VIEW.width, h = VIEW.height;
  ctx.clearRect(0, 0, w, h);
  const left = game.camera.x - w / 2, top = game.camera.y - h / 2;
  ctx.save(); ctx.translate(-left, -top);
  ctx.fillStyle = "#dcebc519";
  for (let x = Math.floor(left / 80) * 80; x < left + w; x += 80) for (let y = Math.floor(top / 80) * 80; y < top + h; y += 80) {
    ctx.beginPath(); ctx.arc(x, y, 1.6, 0, Math.PI * 2); ctx.fill();
  }
  for (const p of game.platforms) {
    if (p.opacity < .008) continue;
    ctx.globalAlpha = p.opacity;
    ctx.fillStyle = "#bddc99"; ctx.fillRect(p.x, p.y, p.width, 5);
    ctx.fillStyle = "#bedc992b"; ctx.fillRect(p.x, p.y + 5, p.width, p.height - 5);
    ctx.strokeStyle = "#bddc9970"; ctx.lineWidth = 1.5; ctx.strokeRect(p.x, p.y, p.width, p.height);
    ctx.fillStyle = "#d7ff9e";
    if (p.jump) {
      ctx.beginPath(); ctx.moveTo(p.x + p.width - 58, p.y - 12); ctx.lineTo(p.x + p.width - 44, p.y - 26); ctx.lineTo(p.x + p.width - 30, p.y - 12); ctx.strokeStyle = "#d7ff9e"; ctx.lineWidth = 4; ctx.stroke();
      ctx.fillRect(p.x + p.width - 62, p.y + 2, 38, 5);
    }
    // Deterministic flecks gather along the top surface during reconstruction.
    if (p.opacity < .96 && !reducedMotion) for (let i = 0; i < 10; i++) {
      const phase = (now / 650 + i * .137) % 1;
      ctx.globalAlpha = p.opacity * (1 - phase); const x = p.x + (i + .5) * p.width / 10;
      ctx.fillRect(x + Math.sin(i * 2.4) * phase * 18, p.y - phase * 65, 4, 4);
    }
  }
  ctx.globalAlpha = 1;
  const goal = game.goal;
  ctx.strokeStyle = "#e7e2bc"; ctx.lineWidth = 3; ctx.strokeRect(goal.x - 24, goal.y - 92, 48, 92);
  ctx.fillStyle = "#e7e2bc"; ctx.font = "17px Consolas, monospace"; ctx.textAlign = "center"; ctx.fillText("EXIT", goal.x, goal.y - 105);
  const r = game.runner, walk = !reducedMotion && game.phase === "playing" && !game.paused ? Math.sin(now / 75) * 6 : 0;
  ctx.save(); ctx.translate(r.x, r.y);
  ctx.fillStyle = "#ede9cb"; ctx.beginPath(); ctx.roundRect(-13, -20, 26, 33, 8); ctx.fill();
  ctx.fillStyle = "#19352c"; ctx.fillRect(4, -11, 4, 5); ctx.fillRect(-5, -11, 4, 5);
  ctx.strokeStyle = "#ede9cb"; ctx.lineWidth = 5; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(-6, 10); ctx.lineTo(-6 - walk, 20); ctx.moveTo(6, 10); ctx.lineTo(6 + walk, 20); ctx.stroke(); ctx.restore();
  // The next landing point is a restrained directional clue, never auto-tracking.
  const next = game.platforms[Math.min(r.support + 1, game.platforms.length - 1)];
  if (next) {
    const tx = next.x + Math.min(80, next.width / 2), ty = next.y - 35;
    if (tx > left + w - 40 || ty < top + 40 || ty > top + h - 40) {
      const x = Math.max(left + 42, Math.min(left + w - 42, tx)), y = Math.max(top + 65, Math.min(top + h - 65, ty));
      ctx.save(); ctx.translate(x, y); ctx.rotate(Math.atan2(ty - y, tx - x));
      ctx.strokeStyle = "#d5e3b5"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-10, -9); ctx.lineTo(0, 0); ctx.lineTo(-10, 9); ctx.stroke(); ctx.restore();
    }
  }
  ctx.restore();
  // A soft existence boundary rather than a hard clipping/collision line.
  for (const [x, y, sx, sy] of [[24, 24, 1, 1], [w - 24, 24, -1, 1], [24, h - 24, 1, -1], [w - 24, h - 24, -1, -1]]) {
    ctx.strokeStyle = "#d6e3b57f"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x + sx * 34, y); ctx.lineTo(x, y); ctx.lineTo(x, y + sy * 34); ctx.stroke();
  }
}
