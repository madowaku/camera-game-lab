import { NOTE_TYPES, grooveStage, NOTE_EATER_BPM } from "../games/noteEater.js";

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
  if (radius > 8) {
    c.fillStyle = "rgba(255,255,245,.65)"; c.beginPath();
    c.ellipse(-radius * .2, -radius * .3, radius * .19, radius * .09, -.5, 0, Math.PI * 2); c.fill();
  }
  c.restore();
}

function drawAtmosphere(c, game, w, h, reducedMotion) {
  if (game.phase !== "playing") return;
  const stage = grooveStage(game.groove), beat = game.time / (60000 / NOTE_EATER_BPM);
  c.save();
  for (let i = 0; i < 5; i++) {
    const x = w * (.12 + i * .19), y = h * (.2 + i % 3 * .28);
    const glow = c.createRadialGradient(x, y, 0, x, y, w * .5);
    glow.addColorStop(0, NOTE_TYPES[i].color); glow.addColorStop(1, "transparent");
    c.globalAlpha = .035 + stage * .02; c.fillStyle = glow; c.fillRect(0, 0, w, h);
  }
  if (!reducedMotion) {
    c.lineWidth = 1.5;
    for (let i = 0; i < 8 + stage; i++) {
      const x = w * (.08 + (i * .173) % .84), y = h * (1 - ((game.time / (13000 - stage * 900) + i * .137) % 1));
      c.globalAlpha = .13 + stage * .025; c.fillStyle = NOTE_TYPES[i % 5].color;
      c.font = `${Math.round(w * (.042 + i % 3 * .008))}px Georgia, serif`;
      c.fillText(i % 2 ? "♪" : "♫", x + Math.sin(beat * .6 + i) * w * .025, y);
    }
    if (stage >= 3) {
      c.translate(w / 2, h / 2); c.rotate(beat * .045); c.globalAlpha = .035;
      for (let i = 0; i < 12; i++) {
        c.rotate(Math.PI / 6); c.fillStyle = NOTE_TYPES[i % 5].color;
        c.beginPath(); c.moveTo(0, 0); c.lineTo(-w * .08, -h); c.lineTo(w * .08, -h); c.closePath(); c.fill();
      }
    }
  }
  c.restore();
}

function drawBite(c, e, time, w, h, reducedMotion, showCelebration) {
  const age = time - e.at, progress = Math.min(1, age / 900), stage = grooveStage(e.groove ?? 0);
  const x = e.mouth.x * w, y = e.mouth.y * h, color = NOTE_TYPES[e.note.type].color;
  if (age < 150 && !reducedMotion) {
    const t = age / 150;
    drawNote(c, e.note.type, (e.note.x + (e.mouth.x - e.note.x) * t) * w,
      (e.note.y + (e.mouth.y - e.note.y) * t) * h, w * .05 * (1 - t), t * 1.3);
  }
  if (age < 900) {
    c.save(); c.globalAlpha = (1 - progress) ** 1.3; c.strokeStyle = color; c.lineWidth = 3;
    const radius = reducedMotion ? 28 : 14 + (1 - (1 - progress) ** 3) * w * (.26 + stage * .025);
    for (const scale of [1, .7]) { c.beginPath(); c.arc(x, y, radius * scale, 0, Math.PI * 2); c.stroke(); c.lineWidth = 1.5; }
    const count = reducedMotion ? 5 : 18 + stage * 3;
    for (let i = 0; i < count; i++) {
      const angle = i / count * Math.PI * 2 + e.note.id * .73;
      const distance = reducedMotion ? 34 : (18 + progress * w * (.2 + i % 3 * .08));
      const px = x + Math.cos(angle) * distance, py = y + Math.sin(angle) * distance + (reducedMotion ? 0 : progress ** 2 * h * .07);
      c.save(); c.translate(px, py); c.rotate(reducedMotion ? angle : angle + progress * (i % 2 ? 5 : -4));
      c.fillStyle = NOTE_TYPES[(i + e.note.type) % 5].color;
      if (i % 4 === 0) drawNote(c, (i + e.note.type) % 5, 0, 0, w * .018);
      else c.fillRect(-2, -4, 4 + i % 3, 7 + i % 2 * 3);
      c.restore();
    }
    c.shadowColor = "#fff5df"; c.shadowBlur = 6; c.fillStyle = "#674131"; c.strokeStyle = "#fff9ed"; c.lineWidth = 4;
    c.font = `900 ${Math.max(19, w * .08)}px "Trebuchet MS", sans-serif`; c.textAlign = "center";
    const labelX = Math.max(w * .16, Math.min(w * .84, x));
    const labelY = Math.max(38, y - w * .13 - (reducedMotion ? 0 : progress * w * .1));
    c.strokeText(e.note.size > 1.2 ? "BIG PAK!" : "PAK! ♪", labelX, labelY); c.fillText(e.note.size > 1.2 ? "BIG PAK!" : "PAK! ♪", labelX, labelY);
    c.restore();
  }
  if (e.stageUp && age < 1500) {
    const t = age / 1500;
    c.save(); c.globalAlpha = Math.min(1, (1 - t) * 2);
    if (!reducedMotion) for (let i = 0; i < 28; i++) {
      const fromLeft = i % 2 === 0, speed = .3 + i % 7 * .05;
      const px = w * (fromLeft ? t * speed : 1 - t * speed), py = h * (.8 - t * (1.35 + i % 5 * .08) + t * t * 1.25);
      c.save(); c.translate(px, py); c.rotate(i + t * 9); c.fillStyle = NOTE_TYPES[i % 5].color;
      c.fillRect(-3, -5, 6, 10); c.restore();
    }
    if (showCelebration) {
      c.fillStyle = "#50382d"; c.strokeStyle = "#fff8eb"; c.lineWidth = 5; c.textAlign = "center";
      c.font = `900 ${w * .105}px "Trebuchet MS", sans-serif`;
      const label = stage === 4 ? "♪ PARTY! ♪" : "♪ GROOVE! ♪", y = h * .16;
      c.strokeText(label, w / 2, y); c.fillText(label, w / 2, y);
    }
    c.restore();
  }
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
  drawAtmosphere(c, game, w, h, reducedMotion);
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
    const pulse = reducedMotion ? 1 : 1 + Math.sin(game.time / 240 + n.id) * .065;
    const radius = w * .044 * n.size * pulse * (n.magnet ? 1.2 : 1);
    if (!reducedMotion) {
      const length = Math.hypot(n.vx, n.vy * game.aspect) || 1;
      c.save(); c.fillStyle = NOTE_TYPES[n.type].color;
      for (let i = 3; i > 0; i--) {
        c.globalAlpha = .16 / i; c.beginPath();
        c.arc(n.x * w - n.vx / length * i * radius * .65, n.y * h - n.vy * game.aspect / length * i * radius * .65,
          radius * (.38 - i * .06), 0, Math.PI * 2); c.fill();
      }
      c.restore();
    }
    c.save(); c.shadowColor = NOTE_TYPES[n.type].color; c.shadowBlur = n.magnet ? 24 : 4;
    if (n.magnet) { c.fillStyle = "rgba(255,250,230,.75)"; c.beginPath(); c.arc(n.x * w, n.y * h, radius + 5, 0, Math.PI * 2); c.fill(); }
    drawNote(c, n.type, n.x * w, n.y * h, radius, reducedMotion ? 0 : Math.sin(game.time / 1000 + n.id) * .12); c.restore();
  }
  const latestCelebration = effects.findLast(e => e.stageUp && game.time - e.at < 1500);
  for (const e of effects) {
    drawBite(c, e, game.time, w, h, reducedMotion, e === latestCelebration);
  }
  if (game.phase === "playing" && overlay) {
    c.fillStyle = "#fff7eb"; c.font = "bold 15px sans-serif"; c.textAlign = "left"; c.fillText("NOTE EATER", 12, 24);
    c.textAlign = "right"; c.fillText(`${Math.ceil((30000 - game.elapsed) / 1000)}s`, w - 12, 24);
    c.fillStyle = "#e96f51"; c.fillRect(12, h - 18, (w - 24) * game.groove / 100, 5);
  }
}
