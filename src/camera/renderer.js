import { VIEW } from "./stages.js";

export function drawWorld(canvas, game, now, reducedMotion = false) {
  const ctx = canvas.getContext("2d"), w = VIEW.width, h = VIEW.height;
  ctx.clearRect(0, 0, w, h);
  const left = game.camera.x - w / 2, top = game.camera.y - h / 2;
  ctx.save(); ctx.translate(-left, -top);
  const pulse = game.platforms.some(p => p.ruleState?.pulseMs > 0);
  if (pulse && !reducedMotion) ctx.translate(Math.sin(now / 17) * 1.5, 0);
  ctx.fillStyle = "#dcebc519";
  for (let x = Math.floor(left / 80) * 80; x < left + w; x += 80) for (let y = Math.floor(top / 80) * 80; y < top + h; y += 80) {
    ctx.beginPath(); ctx.arc(x, y, 1.6, 0, Math.PI * 2); ctx.fill();
  }
  for (const p of game.platforms) {
    if (p.opacity < .008) continue;
    ctx.globalAlpha = p.opacity;
    const state = p.ruleState;
    const heat = p.rule === 'OVEREXPOSE' ? state.overexposeMs / (p.maxVisibleMs ?? 1200) : 0;
    if (heat > .72 && !reducedMotion) ctx.globalAlpha *= .65 + .35 * Math.sin(now / 38);
    ctx.save();
    if (state?.pulseMs > 0 && !reducedMotion) {
      const scale = 1 - .03 * state.pulseMs / 180;
      ctx.translate(p.x + p.width / 2, p.y); ctx.scale(scale, scale); ctx.translate(-p.x - p.width / 2, -p.y);
    }
    if (state?.pulseMs > 0) { ctx.shadowColor = '#e4ffc1'; ctx.shadowBlur = reducedMotion ? 8 : 22; }
    if (p.rule === 'FOCUS_HOLD' && !p.active) { ctx.shadowColor = '#c7edac'; ctx.shadowBlur = 18 * state.focusMs / (p.holdMs ?? 500); }
    ctx.strokeStyle = heat > .45 ? '#ffffff' : '#bddc99';
    if (p.rule && !p.active) {
      ctx.setLineDash([7, 6]); ctx.strokeRect(p.x, p.y, p.width, p.height);
      if (p.rule === 'FOCUS_HOLD' && p.centerHold) {
        // Persistent target + filling ring makes the hold action legible.
        ctx.globalAlpha = 1; ctx.setLineDash([]); ctx.lineWidth = 4;
        const cx = p.x + p.width / 2, cy = p.y - 28;
        ctx.strokeStyle = '#829e79'; ctx.beginPath(); ctx.arc(cx, cy, 16, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = '#ecffc0'; ctx.beginPath();
        ctx.arc(cx, cy, 16, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * state.focusMs / (p.holdMs ?? 500));
        ctx.stroke();
      }
      ctx.restore(); continue;
    }
    if (p.rule === 'AFTERIMAGE' && !state.visible) {
      ctx.strokeStyle = '#dceac77f'; ctx.strokeRect(p.x - 3, p.y + 4, p.width + 6, p.height);
    }
    ctx.fillStyle = "#bddc99"; ctx.fillRect(p.x, p.y, p.width, 5);
    ctx.fillStyle = "#bedc992b"; ctx.fillRect(p.x, p.y + 5, p.width, p.height - 5);
    ctx.strokeStyle = "#bddc9970"; ctx.lineWidth = 1.5; ctx.strokeRect(p.x, p.y, p.width, p.height);
    ctx.fillStyle = "#d7ff9e";
    if (heat > .45) { ctx.fillStyle = `rgba(255,255,255,${heat})`; ctx.fillRect(p.x, p.y, p.width, p.height); }
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
    ctx.restore();
  }
  ctx.globalAlpha = 1;
  // Exclusion is a framing puzzle, not a reaction timer. Make the red subject unmissable.
  for (const p of game.platforms) {
    if (p.rule !== 'EXCLUDE' || !p.blocker) continue;
    const { x, y } = p.blocker;
    ctx.save();
    ctx.lineWidth = 4; ctx.strokeStyle = '#ff9e9b';
    ctx.fillStyle = 'rgba(255,90,90,.16)';
    ctx.beginPath(); ctx.arc(x, y, 28, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x - 12, y - 12); ctx.lineTo(x + 12, y + 12);
    ctx.moveTo(x + 12, y - 12); ctx.lineTo(x - 12, y + 12); ctx.stroke();
    ctx.fillStyle = '#ffe1db'; ctx.font = 'bold 17px sans-serif';
    ctx.textAlign = 'center'; ctx.fillText('OUT!', x, y - 42);
    ctx.restore();
  }
  for (const a of game.anchors ?? []) {
    ctx.strokeStyle = a.visible ? '#d7ff9e' : '#8c9f8b'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(a.x, a.y, 14, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#d7ff9e'; ctx.font = '18px monospace'; ctx.textAlign = 'center'; ctx.fillText(a.id, a.x, a.y - 26);
  }
  for (const p of game.platforms.filter(p => p.rule === 'LINKED' && p.ruleState.pulseMs > 0)) {
    const anchors = game.anchors.filter(a => a.linkedGroup === p.linkedGroup);
    if (anchors.length > 1) { ctx.globalAlpha = .3 * p.ruleState.pulseMs / 180; ctx.beginPath(); ctx.moveTo(anchors[0].x, anchors[0].y); for (const a of anchors.slice(1)) ctx.lineTo(a.x, a.y); ctx.stroke(); }
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
  // A memory timer stays near the walker even when the remembered platform leaves frame.
  const remembered = game.index === 6 ? game.platforms[1] : null;
  if (remembered && r.support === 1 && !remembered.ruleState.visible && remembered.ruleState.memoryMs > 0) {
    const seconds = remembered.ruleState.memoryMs / (remembered.memoryMs ?? 2500);
    ctx.save(); ctx.strokeStyle = '#d9ffaf'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(r.x, r.y - 51, 17, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * seconds); ctx.stroke();
    ctx.font = '13px monospace'; ctx.fillStyle = '#e8ffbe'; ctx.textAlign = 'center';
    ctx.fillText('MEMORY', r.x, r.y - 80); ctx.restore();
  }
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
