import { NOTE_TYPES } from "../games/noteEater.js";

export function drawNote(c, type, x, y, radius, angle = 0) {
  const note = NOTE_TYPES[type]; c.save(); c.translate(x, y); c.rotate(angle); c.fillStyle = note.color;
  c.beginPath();
  if (note.shape === "circle") c.arc(0, 0, radius * .8, 0, Math.PI * 2);
  else if (note.shape === "heart") {
    c.moveTo(0, radius * .9); c.bezierCurveTo(-radius * 1.6, -.15 * radius, -radius * .7, -radius * 1.4, 0, -radius * .5);
    c.bezierCurveTo(radius * .7, -radius * 1.4, radius * 1.6, -.15 * radius, 0, radius * .9);
  } else {
    const count = note.shape === "diamond" ? 4 : note.shape === "star" ? 10 : 8;
    for (let i = 0; i < count; i++) {
      const r = i % 2 && count > 4 ? radius * (count === 10 ? .48 : .26) : radius;
      const a = i / count * Math.PI * 2 - Math.PI / 2;
      if (i) c.lineTo(Math.cos(a) * r, Math.sin(a) * r); else c.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    }
  }
  c.closePath(); c.fill(); c.strokeStyle = "rgba(64,40,28,.18)"; c.lineWidth = 1.4; c.stroke();
  c.restore();
}

export function drawNoteEater(canvas, game, { demo, sample, effects = [], reducedMotion, overlay = false } = {}) {
  const box = canvas.parentElement.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 2), w = box.width, h = box.height;
  if (!w || !h) return;
  if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) { canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); }
  const c = canvas.getContext("2d"); c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, w, h);
  const m = game.mouth, mx = m.x * w, my = m.y * h, open = sample?.state === "OPEN";
  if (demo && !overlay) {
    c.fillStyle = "#fff4df"; c.fillRect(0, 0, w, h);
    c.fillStyle = "#eadfcb"; for (let x = 18; x < w; x += 28) for (let y = 18; y < h; y += 28) { c.beginPath(); c.arc(x, y, 1, 0, Math.PI * 2); c.fill(); }
  }
  if (demo) {
    c.fillStyle = "#f4c8a0"; c.beginPath(); c.ellipse(mx, my - w * .055, w * .17, w * .21, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = "#54372b"; for (const dx of [-.065, .065]) { c.beginPath(); c.ellipse(mx + dx * w, my - w * .105, w * .013, w * .02, 0, 0, Math.PI * 2); c.fill(); }
  }
  if (sample?.state !== "UNKNOWN") {
    c.save(); c.strokeStyle = game.armed ? "#fff9e9" : "#e9d5b7"; c.lineWidth = 3;
    // A small mouth reticle shows aim; the forgiving hit zone stays invisible.
    c.fillStyle = "#61392e"; c.beginPath(); c.ellipse(mx, my, Math.max(w * m.width * .5, 14), open ? 19 : 4, 0, 0, Math.PI * 2); c.fill(); c.stroke(); c.restore();
  }
  for (const n of game.notes) {
    const pulse = reducedMotion ? 1 : 1 + Math.sin(game.time / 300 + n.id) * .035;
    const radius = w * .044 * n.size * pulse * (n.magnet ? 1.2 : 1);
    c.save(); c.shadowColor = NOTE_TYPES[n.type].color; c.shadowBlur = n.magnet ? 24 : 4;
    if (n.magnet) { c.fillStyle = "rgba(255,250,230,.75)"; c.beginPath(); c.arc(n.x * w, n.y * h, radius + 5, 0, Math.PI * 2); c.fill(); }
    drawNote(c, n.type, n.x * w, n.y * h, radius, reducedMotion ? 0 : Math.sin(game.time / 1000 + n.id) * .12); c.restore();
  }
  for (const e of effects) {
    const age = game.time - e.at, t = Math.min(1, age / 150), color = NOTE_TYPES[e.note.type].color;
    if (age < 150 && !reducedMotion) drawNote(c, e.note.type, (e.note.x + (e.mouth.x - e.note.x) * t) * w,
      (e.note.y + (e.mouth.y - e.note.y) * t) * h, w * .045 * (1 - t));
    c.save(); c.globalAlpha = Math.max(0, 1 - age / 650); c.strokeStyle = color; c.lineWidth = 3;
    c.beginPath(); c.arc(e.mouth.x * w, e.mouth.y * h, 12 + age / 650 * (reducedMotion ? 16 : 68), 0, Math.PI * 2); c.stroke();
    if (!reducedMotion) for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2, r = 18 + age / 650 * 70;
      c.fillStyle = color; c.beginPath(); c.arc(e.mouth.x * w + Math.cos(a) * r, e.mouth.y * h + Math.sin(a) * r, 3, 0, Math.PI * 2); c.fill(); }
    c.restore();
  }
  if (game.phase === "playing" && overlay) {
    c.fillStyle = "#fff7eb"; c.font = "bold 15px sans-serif"; c.textAlign = "left"; c.fillText("NOTE EATER", 12, 24);
    c.textAlign = "right"; c.fillText(`${Math.ceil((30000 - game.elapsed) / 1000)}s`, w - 12, 24);
    c.fillStyle = "#e96f51"; c.fillRect(12, h - 18, (w - 24) * game.groove / 100, 5);
  }
}
