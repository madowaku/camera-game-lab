import { laneY } from "../games/noteBlaster.js";

export const NOTE_COLORS = ["#ffbc64", "#f4df79", "#98e4a2", "#81c6ee", "#e7a8d5"];
export const CAMERA_TILE = { x: 0.025, y: 0.715, width: 0.22, height: 0.255 };

function enemy(ctx, x, y, size, color, time) {
  ctx.save(); ctx.translate(x, y + Math.sin(time * 0.004) * size * 0.1);
  ctx.fillStyle = color;
  const unit = size / 10;
  // A tiny eight-bit invader, drawn rather than relying on platform emoji.
  const rows = ["0010000100", "0001111000", "0011111100", "0110110110", "1111111111", "1011111101", "1010000101", "0001101100"];
  rows.forEach((row, r) => [...row].forEach((cell, c) => {
    if (cell === "1") ctx.fillRect((c - 5) * unit, (r - 4) * unit, unit + 0.3, unit + 0.3);
  }));
  ctx.restore();
}

function note(ctx, x, y, size, color) {
  ctx.fillStyle = color; ctx.strokeStyle = color; ctx.lineWidth = size * 0.16;
  ctx.beginPath(); ctx.ellipse(x, y, size * 0.35, size * 0.23, -0.35, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.moveTo(x + size * 0.3, y); ctx.lineTo(x + size * 0.3, y - size);
  ctx.bezierCurveTo(x + size * 0.8, y - size * 0.9, x + size, y - size * 0.6, x + size * 0.55, y - size * 0.3); ctx.stroke();
}

export function drawBlaster(ctx, width, height, { game, mouth, signal, preview, names, timestamp, reducedMotion }) {
  ctx.clearRect(0, 0, width, height);
  const scale = Math.max(0.62, Math.min(width / 1000, height / 560));
  const visualTime = reducedMotion ? 0 : timestamp;
  const left = width * 0.28;
  const right = width * 0.985;
  ctx.strokeStyle = "#243536"; ctx.lineWidth = 1;
  // Five real staff lines; Do gets a ledger line, Re is below the staff.
  for (let i = 0; i < 5; i += 1) {
    const y = (laneY(2) - i * 0.09) * height;
    ctx.beginPath(); ctx.moveTo(left, y); ctx.lineTo(right, y); ctx.stroke();
  }
  ctx.strokeStyle = "#df6f6650";
  ctx.setLineDash([4 * scale, 7 * scale]);
  ctx.beginPath(); ctx.moveTo(width * 0.27, height * 0.13); ctx.lineTo(width * 0.27, height * 0.70); ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = "#516b69"; ctx.font = `${60 * scale}px Georgia`; ctx.fillText("𝄞", width * 0.285, height * 0.52);
  const active = signal?.note?.grade !== "MISS" && signal?.voiced ? signal.note?.lane : null;
  if (active !== null && active !== undefined) {
    const y = laneY(active) * height;
    ctx.fillStyle = `${NOTE_COLORS[active]}12`; ctx.fillRect(left, y - height * 0.022, right - left, height * 0.044);
    ctx.strokeStyle = `${NOTE_COLORS[active]}70`; ctx.beginPath(); ctx.moveTo(left, y); ctx.lineTo(right, y); ctx.stroke();
  }
  ctx.font = `600 ${Math.max(12, 14 * scale)}px 'Trebuchet MS', sans-serif`;
  for (let lane = 0; lane < 5; lane += 1) {
    const y = laneY(lane) * height;
    ctx.fillStyle = lane === active ? NOTE_COLORS[lane] : "#89a29c";
    ctx.textAlign = "right"; ctx.fillText(names[lane], width * 0.249, y + 4 * scale);
    if (lane === 0) {
      ctx.strokeStyle = "#49615d"; ctx.beginPath(); ctx.moveTo(left, y); ctx.lineTo(left + width * 0.05, y); ctx.stroke();
    }
  }
  ctx.textAlign = "center";
  const enemies = preview ? [0, 2, 4].map((lane, i) => ({ lane, x: 0.50 + i * 0.18, y: laneY(lane), age: timestamp + i * 300 })) : game.enemies;
  for (const e of enemies) {
    const x = e.x * width; const y = e.y * height;
    enemy(ctx, x, y, 35 * scale, NOTE_COLORS[e.lane], reducedMotion ? 0 : e.age);
    if (e.lane === 0) { ctx.strokeStyle = "#49615d"; ctx.beginPath(); ctx.moveTo(x - 24 * scale, y); ctx.lineTo(x + 24 * scale, y); ctx.stroke(); }
    ctx.fillStyle = NOTE_COLORS[e.lane]; ctx.font = `700 ${Math.max(12, 13 * scale)}px 'Trebuchet MS', sans-serif`;
    ctx.fillText(names[e.lane], x, y - 28 * scale);
  }
  for (const b of game.bullets) {
    if (!reducedMotion) {
      ctx.strokeStyle = `${NOTE_COLORS[b.lane]}50`; ctx.lineWidth = 2 * scale;
      ctx.beginPath(); ctx.moveTo(b.x * width - 20 * scale, b.y * height); ctx.lineTo(b.x * width, b.y * height); ctx.stroke();
    }
    note(ctx, b.x * width, b.y * height, (b.fever ? 27 : 19) * scale, NOTE_COLORS[b.lane]);
  }
  if (mouth) {
    ctx.strokeStyle = active !== null && active !== undefined ? NOTE_COLORS[active] : "#8dbaa8";
    ctx.lineWidth = 1.5 * scale;
    ctx.beginPath(); ctx.arc(mouth.x * width, mouth.y * height, 10 * scale, 0, Math.PI * 2); ctx.stroke();
    if (preview) note(ctx, mouth.x * width + 21 * scale, mouth.y * height, 18 * scale, "#d8f59d");
  }
  for (const effect of game.effects) {
    ctx.globalAlpha = 1 - effect.age / 550;
    const distance = reducedMotion ? 10 : effect.age * 0.06;
    ctx.fillStyle = NOTE_COLORS[effect.lane];
    for (let i = 0; i < 8; i += 1) {
      const angle = i / 8 * Math.PI * 2;
      ctx.fillRect(effect.x * width + Math.cos(angle) * distance * scale, effect.y * height + Math.sin(angle) * distance * scale, 4 * scale, 4 * scale);
    }
    ctx.globalAlpha = 1;
  }
  if (game.fever) {
    ctx.strokeStyle = "#d8f59d"; ctx.lineWidth = 3 * scale;
    ctx.strokeRect(2 * scale, 2 * scale, width - 4 * scale, height - 4 * scale);
  }
  // Quiet decorative notes, kept away from the interactive staff.
  if (preview) [0.42, 0.69, 0.91].forEach((x, i) => note(ctx, x * width, height * (0.10 + Math.sin(visualTime * 0.001 + i) * 0.015), 15 * scale, "#30453d"));
}
