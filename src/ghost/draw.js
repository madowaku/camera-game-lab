import { GHOST_SCHEDULE } from "../games/ghostTrail.js";

export function drawGhostTrail(canvas, game, { demo, locale, reducedMotion }) {
  const w = canvas.clientWidth, h = canvas.clientHeight, dpr = Math.min(devicePixelRatio || 1, 2);
  if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
  }
  const ctx = canvas.getContext("2d"); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h);
  if (demo) {
    ctx.fillStyle = "#172b32"; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "#a2c9cf12"; ctx.lineWidth = 1;
    for (let x = 0; x < w; x += w / 8) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
    for (let y = 0; y < h; y += w / 8) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
    ctx.fillStyle = "#b9d6d90b"; ctx.font = `bold ${w * .19}px Impact, sans-serif`; ctx.textAlign = "center";
    ctx.fillText("GHOST", w / 2, h * .46); ctx.fillText("TRAIL", w / 2, h * .60);
  }
  const circle = (x, y, r) => { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); };
  for (const ghost of game.ghosts) {
    const x = ghost.x * w, y = ghost.y * h, r = w * .055;
    if (!reducedMotion) {
      ctx.strokeStyle = ghost.color; ctx.globalAlpha = .25; ctx.lineWidth = 2; ctx.beginPath();
      let previous = null;
      for (let age = 650; age >= 0; age -= 50) {
        const p = game.history.at(game.elapsedMs - ghost.delay - age);
        if (!p) { previous = null; continue; }
        if (!previous || previous.segment !== p.segment) ctx.moveTo(p.x * w, p.y * h); else ctx.lineTo(p.x * w, p.y * h);
        previous = p;
      }
      ctx.stroke();
    }
    ctx.globalAlpha = ghost.solid ? .35 : .18; ctx.fillStyle = ghost.color;
    // A simple head-and-shoulders echo, centered on the recorded nose point.
    circle(x, y - r * .25, r * 1.5); ctx.fill();
    ctx.beginPath(); ctx.ellipse(x, y + r * 2.1, r * 2.2, r * .9, 0, Math.PI, 0); ctx.lineTo(x + r * 2.2, y + r * 3); ctx.lineTo(x - r * 2.2, y + r * 3); ctx.closePath(); ctx.fill();
    ctx.globalAlpha = ghost.solid ? 1 : .55; ctx.strokeStyle = ghost.color; ctx.lineWidth = 2;
    ctx.setLineDash(ghost.solid ? [] : [4, 4]); circle(x, y, r); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = "#102028"; circle(x - r * .4, y - r * .3, 2); ctx.fill(); circle(x + r * .4, y - r * .3, 2); ctx.fill();
    const labelX = Math.max(30, Math.min(w - 30, x)), labelY = y < 54 ? y + r * 3.7 : y - r * 2.15;
    ctx.font = `bold ${Math.max(10, w * .029)}px Consolas, monospace`; ctx.textAlign = "center";
    ctx.fillStyle = "#102028"; ctx.fillRect(labelX - 29, labelY - 13, 58, 19);
    ctx.fillStyle = ghost.color; ctx.fillText(`${ghost.delay / 1000}${locale === "ja" ? "秒前" : "s AGO"}`, labelX, labelY);
  }
  ctx.globalAlpha = 1;
  if (game.player) {
    const x = game.player.x * w, y = game.player.y * h, invulnerable = game.elapsedMs < game.invulnerableUntil;
    ctx.fillStyle = "#ffffff18"; circle(x, y, w * .04); ctx.fill();
    ctx.strokeStyle = invulnerable ? "#f5cf90" : "#fffef0"; ctx.lineWidth = 3;
    ctx.setLineDash(invulnerable ? [3, 5] : []); circle(x, y, w * .04); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = "#fffef0"; circle(x, y, 3); ctx.fill();
  }
  // Timeline makes each scheduled arrival visible without covering the playfield.
  const pad = 16, timelineY = h - 16;
  ctx.strokeStyle = "#ffffff38"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(pad, timelineY); ctx.lineTo(w - pad, timelineY); ctx.stroke();
  ctx.strokeStyle = "#dfecef"; ctx.beginPath(); ctx.moveTo(pad, timelineY); ctx.lineTo(pad + (w - 2 * pad) * game.elapsedMs / 30000, timelineY); ctx.stroke();
  GHOST_SCHEDULE.forEach((g) => { ctx.fillStyle = game.elapsedMs >= g.at ? g.color : "#60757d"; circle(pad + (w - 2 * pad) * g.at / 30000, timelineY, 3); ctx.fill(); });
}
