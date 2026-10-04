import { W, H, R, HALF, THICKNESS, predictGuide } from "./core.js";
const MINT = "#2c9b7a", CORAL = "#d85440";
function line(c, x1, y1, x2, y2, color, width) { c.strokeStyle = color; c.lineWidth = width; c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke(); }
export function renderCourt(canvas, game, { video, source, guide = true, reducedMotion = false } = {}) {
  const c = canvas.getContext("2d"); c.setTransform(canvas.width / W, 0, 0, canvas.height / H, 0, 0);
  c.fillStyle = "#fbf3e4"; c.fillRect(0, 0, W, H);
  if (source === "camera" && video?.readyState >= 2 && video.videoWidth) {
    const scale = Math.max(W / video.videoWidth, H / video.videoHeight), width = video.videoWidth * scale, height = video.videoHeight * scale;
    c.save(); c.translate(W, 0); c.scale(-1, 1); c.drawImage(video, (W - width) / 2, (H - height) / 2, width, height); c.restore();
  }
  c.fillStyle = source === "camera" ? "#c3ecd52e" : "#e0eddf"; c.fillRect(0, 0, W / 2, H);
  c.fillStyle = source === "camera" ? "#f8c4ae2e" : "#f9e1d3"; c.fillRect(W / 2, 0, W / 2, H);
  // Operating zones are a hint; upper/lower white court rails really bounce.
  for (const side of [0, 1]) {
    c.strokeStyle = side ? "#d854403d" : "#2c9b7a3d"; c.lineWidth = .025; c.setLineDash([.09, .12]);
    c.strokeRect((side ? .58 : .10) * W, .17 * H, .32 * W, .66 * H);
  }
  c.setLineDash([]); line(c, .02, .03, W - .02, .03, "#fffdf4", .08); line(c, .02, H - .03, W - .02, H - .03, "#fffdf4", .08);
  c.setLineDash([.1, .12]); line(c, W / 2, .05, W / 2, H - .05, "#fffdf4aa", .035); c.setLineDash([]);
  if (guide) {
    const prediction = predictGuide(game); c.strokeStyle = "#806f563e"; c.lineWidth = .035; c.setLineDash([.055, .12]);
    c.beginPath(); prediction.points.forEach((p, i) => i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y)); c.stroke(); c.setLineDash([]);
    if (prediction.target) { c.strokeStyle = game.nextReceiver ? "#d8544080" : "#2c9b7a80"; c.lineWidth = .04; c.beginPath(); c.arc(prediction.target.x, prediction.target.y, .25, 0, Math.PI * 2); c.stroke(); }
  }
  for (const [i, p] of game.paddles.entries()) {
    const color = i ? CORAL : MINT;
    c.save(); c.globalAlpha = p.present ? 1 : .4;
    if (game.phase === "round_end" && !reducedMotion) { c.translate(p.x, p.y); c.rotate((i ? 1 : -1) * Math.sin((.35 - game.endWait) / .35 * Math.PI) * .18); c.translate(-p.x, -p.y); }
    const next = game.nextReceiver === i && ["playing", "serve_wait"].includes(game.phase);
    if (next) { c.fillStyle = i ? "#ff9e7530" : "#3ce7ad30"; c.beginPath(); c.roundRect(p.x - .5, p.y - HALF - .18, 1, HALF * 2 + .36, .35); c.fill(); }
    c.fillStyle = color; c.strokeStyle = color; c.lineWidth = .055;
    c.beginPath(); c.roundRect(p.x - THICKNESS / 2, p.y - HALF, THICKNESS, HALF * 2, THICKNESS / 2);
    if (p.active && p.present) c.fill(); else c.stroke();
    c.fillStyle = "#fffaf0";
    for (let dot = 0; dot <= i; dot++) { c.beginPath(); c.arc(p.x, p.y + (dot - i / 2) * .24, .065, 0, Math.PI * 2); c.fill(); }
    c.restore();
  }
  for (const [i, p] of game.trail.entries()) { c.globalAlpha = i / Math.max(1, game.trail.length) * .3; c.fillStyle = "#edb521"; c.beginPath(); c.arc(p.x, p.y, R * .65, 0, Math.PI * 2); c.fill(); }
  c.globalAlpha = 1;
  const age = game.clock - (game.lastHit?.at ?? -100), squash = !reducedMotion && age < .14 ? Math.sin(Math.min(1, age / .14) * Math.PI) * .25 : 0;
  c.save(); c.translate(game.ball.x, game.ball.y); c.scale(1 - squash, 1 + squash); c.fillStyle = "#ffcf3f"; c.strokeStyle = "#fffdf7"; c.lineWidth = .07; c.beginPath(); c.arc(0, 0, R, 0, Math.PI * 2); c.fill(); c.stroke();
  c.fillStyle = "#fff7c3"; c.beginPath(); c.arc(-R * .25, -R * .3, R * .26, 0, Math.PI * 2); c.fill(); c.restore();
  if (game.lastHit && age < .25 && !reducedMotion) { c.strokeStyle = (game.lastHit.side ? CORAL : MINT) + "80"; c.lineWidth = .045; c.beginPath(); c.arc(game.lastHit.x, game.lastHit.y, .25 + age * 1.3, 0, Math.PI * 2); c.stroke(); }
  if (game.phase === "serve_wait") { c.setLineDash([.05, .1]); line(c, W / 2 + (game.nextReceiver ? .4 : -.4), H / 2, W / 2 + (game.nextReceiver ? 1.4 : -1.4), H / 2, game.nextReceiver ? CORAL : MINT, .035); c.setLineDash([]); }
  if (game.milestone && game.clock - game.milestone.at < .6 && !reducedMotion) {
    const age = game.clock - game.milestone.at; c.fillStyle = "#e5af28";
    for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, radius = .8 + age * 2; c.save(); c.translate(W / 2 + Math.cos(a) * radius, H / 2 + Math.sin(a) * radius); c.rotate(a); c.fillRect(-.04, -.12, .08, .24); c.restore(); }
  }
  c.setTransform(1, 0, 0, 1, 0, 0);
}
