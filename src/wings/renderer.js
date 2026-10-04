import wingsUrl from "./assets/wings-v1.webp";
import { clamp } from "../input/bodyWingsPose.js";
import { projectFlightRing } from "./visualLayout.js";

const oval = (c, x, y, rx, ry) => { c.beginPath(); c.ellipse(x, y, Math.max(.01, rx), Math.max(.01, ry), 0, 0, Math.PI * 2); c.fill(); };
export class WingsRenderer {
  constructor(canvas) {
    this.canvas = canvas; this.person = document.createElement("canvas");
    this.wings = new Image(); this.wings.src = wingsUrl;
  }
  draw(game, { video, input, pose, demo, faceMode = "ORIGINAL", reducedMotion, landing = 0, locale = "ja", hybrid = false, width, height } = {}) {
    const canvas = this.canvas, w = width ?? Math.max(240, canvas.clientWidth), h = height ?? Math.max(400, canvas.clientHeight);
    const dpr = Math.min(devicePixelRatio || 1, 2);
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) { canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); }
    const c = canvas.getContext("2d"); c.setTransform(dpr, 0, 0, dpr, 0, 0);
    const time = game.time, boost = game.boosted, flying = !["ready", "transform"].includes(game.phase);
    c.clearRect(0, 0, w, h);
    if (!hybrid) {
    const sky = c.createLinearGradient(0, 0, 0, h); sky.addColorStop(0, "#199ce7"); sky.addColorStop(.55, "#80d5f7"); sky.addColorStop(1, "#e6f8fa");
    c.fillStyle = sky; c.fillRect(0, 0, w, h);
    const sun = c.createRadialGradient(w * .84, h * .12, 1, w * .84, h * .12, w * .7); sun.addColorStop(0, "#fff5c388"); sun.addColorStop(1, "#ffffff00"); c.fillStyle = sun; c.fillRect(0, 0, w, h);
    c.fillStyle = "#ffffffc9";
    for (let i = 0; i < 10; i++) {
      const p = ((i * .113 + (reducedMotion ? 0 : time / (boost ? 3300 : 11000))) % 1);
      const side = i % 2 ? 1 : -1, x = w * .5 + side * w * (.3 + p * .34), y = h * (.14 + p * .83), size = w * (.09 + p * .13);
      oval(c, x, y, size, size * .4); oval(c, x - size * .4, y - size * .25, size * .53, size * .5); oval(c, x + size * .28, y - size * .28, size * .62, size * .58);
    }
    if (flying && !reducedMotion) {
      c.strokeStyle = boost ? "#fffde5b3" : "#ffffff50"; c.lineWidth = boost ? 2 : 1;
      for (let i = 0; i < (boost ? 24 : 12); i++) {
        const p = (i * .071 + time / (boost ? 800 : 2500)) % 1, a = i * 2.4;
        const x = w * .5 + Math.cos(a) * w * p, y = h * .25 + Math.sin(a) * h * .8 * p;
        c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(a) * p * 18, y + Math.sin(a) * p * 28); c.stroke();
      }
    }
    // Draw far rings first. Their X converges toward the vanishing point;
    // the near ring reaches exactly the player's shoulder plane for grading.
    for (const ring of [...game.ringsAhead].reverse()) {
      const p = ring.progress, projected = projectFlightRing(ring);
      const x = w * projected.x, y = h * projected.y, r = w * projected.radius;
      c.save(); c.shadowColor = "#ffdc63"; c.shadowBlur = reducedMotion ? 0 : 8 + 8 * p;
      c.strokeStyle = ring.id % 3 === 1 ? "#fff4ac" : "#ffcb44"; c.lineWidth = 3 + p * 6;
      c.beginPath(); c.ellipse(x, y, r, r * .86, 0, 0, Math.PI * 2); c.stroke(); c.shadowBlur = 0;
      c.strokeStyle = "#fffde5"; c.lineWidth = 1 + p * 2; c.beginPath(); c.ellipse(x - 1, y - 2, r - 2, r * .86 - 2, 0, Math.PI * 1.08, Math.PI * 1.8); c.stroke();
      c.setLineDash([3, 5]); c.strokeStyle = "#ffffffa0"; c.lineWidth = 1;
      if (p > .7) { c.beginPath(); c.moveTo(x, y + r); c.lineTo(x, h * .85); c.stroke(); }
      c.restore();
    }
    }
    const playerX = w * (game.x + (.5 - game.x) * landing * .3), shoulderY = h * .69;
    const last = game.effect, age = last ? game.time - last.at : Infinity;
    const wobble = last?.type === "MISS" && age < 500 && !reducedMotion ? Math.sin(age / 32) * .07 * (1 - age / 500) : 0;
    const deploy = game.phase === "ready" ? 0 : game.phase === "transform" ? clamp(game.phaseMs / 650) : 1 - landing * .75;
    let body;
    const cameraZoom = game.phase === "ready" ? 1.1 : game.phase === "transform" ? 1.1 - deploy * .1 : 1;
    if (!demo && pose && video?.readyState >= 2) body = this.drawPerson(c, video, input, pose, faceMode, w, h, playerX, shoulderY, cameraZoom, boost);
    if (demo || (!body && game.phase !== "ready")) this.drawPilot(c, playerX, shoulderY, game.tilt + wobble, w, !demo);
    if (deploy > 0) {
      const angle = Math.atan(game.tilt) + wobble;
      const wingWidth = (body?.span ?? w * .86) * deploy;
      c.save(); c.translate(playerX, shoulderY); c.rotate(angle); c.globalAlpha = Math.min(1, deploy * 2);
      if (boost && !reducedMotion && !hybrid) { c.strokeStyle = "#bfffff"; c.lineWidth = 3; for (const x of [-.4, .4]) { c.beginPath(); c.moveTo(wingWidth * x, 10); c.lineTo(wingWidth * x * 1.1, 95); c.stroke(); } }
      if (this.wings.complete && this.wings.naturalWidth) c.drawImage(this.wings, -wingWidth * .5, -wingWidth * .333, wingWidth, wingWidth * .667);
      else { c.fillStyle = "#fff2d3"; c.beginPath(); c.moveTo(-wingWidth / 2, -5); c.lineTo(wingWidth / 2, -5); c.lineTo(wingWidth * .35, 20); c.lineTo(-wingWidth * .35, 20); c.fill(); }
      c.fillStyle = "#fb7620"; c.fillRect(-w * .024, 4, w * .048, w * .12);
      if (flying && landing < .9) {
        const flame = w * (boost ? .25 : .12) * (1 - landing) + (reducedMotion ? 0 : Math.sin(time / 32) * 4);
        c.fillStyle = "#19beffbb"; c.beginPath(); c.moveTo(-w * .035, w * .1); c.quadraticCurveTo(-w * .07, w * .18, 0, w * .12 + flame); c.quadraticCurveTo(w * .07, w * .18, w * .035, w * .1); c.fill();
        c.fillStyle = "#edffff"; oval(c, 0, w * .13, w * .015, flame * .4);
      }
      c.restore();
    }
    if (game.phase === "ready") {
      c.strokeStyle = "#ffffff70"; c.lineWidth = 3; c.setLineDash([7, 7]);
      c.beginPath(); c.moveTo(w * .1, shoulderY); c.lineTo(w * .9, shoulderY); c.stroke(); c.setLineDash([]);
      c.strokeStyle = "#ffcf51"; c.lineWidth = 5; c.beginPath(); c.arc(playerX, h * .55, w * .12, -Math.PI / 2, -Math.PI / 2 + clamp(game.holdMs / 500) * Math.PI * 2); c.stroke();
    }
    if (game.phase === "transform" && !reducedMotion) { c.strokeStyle = "#ffffed"; c.lineWidth = 3; c.beginPath(); c.moveTo(playerX - w * .4 * deploy, shoulderY); c.lineTo(playerX + w * .4 * deploy, shoulderY); c.stroke(); }
    if (game.phase === "tutorial") {
      c.save(); c.globalAlpha = .3; this.drawPilot(c, w * .39, h * .49, -.24, w * .6); c.restore();
      c.fillStyle = "#075783"; c.font = `700 ${Math.max(13, w * .04)}px 'Yu Gothic', sans-serif`; c.textAlign = "center";
      c.fillText(locale === "ja" ? "← 左へかたむいて！" : "← LEAN LEFT!", w * .5, h * .39);
    }
    if (last && age < 650 && ["PERFECT", "GOOD", "BOOST"].includes(last.type) && !reducedMotion && !hybrid) {
      for (let i = 0; i < 16; i++) { const a = i * 2.4, r = age * .13 + 15; c.fillStyle = i % 2 ? "#fff8a0" : "#ffffff"; oval(c, playerX + Math.cos(a) * r, shoulderY + Math.sin(a) * r, 2, 2); }
    }
    if (boost) { c.strokeStyle = "#ffda5c"; c.lineWidth = 5; c.strokeRect(2, 2, w - 4, h - 4); }
  }
  drawPerson(c, video, input, pose, faceMode, w, h, x, y, zoom, wind) {
    // Never expose a raw face in HIDE if its bounds cannot be established.
    if (faceMode === "HIDE" && !pose.face) return null;
    if (!input?.maskReady) return null;
    const vw = video.videoWidth, vh = video.videoHeight;
    const scale = Math.min(w * .25 / (pose.width * vw), w * 1.35 / vw) * zoom;
    const width = vw * scale, height = vh * scale;
    const ox = x - pose.center.x * width, oy = y - pose.center.y * height;
    const p = this.person; if (p.width !== Math.round(w) || p.height !== Math.round(h)) { p.width = Math.round(w); p.height = Math.round(h); }
    const pc = p.getContext("2d"); pc.clearRect(0, 0, w, h); pc.save(); pc.translate(ox + width, oy); pc.scale(-1, 1); pc.drawImage(video, 0, 0, width, height); pc.restore();
    pc.globalCompositeOperation = "destination-in"; pc.save(); pc.translate(ox + width, oy); pc.scale(-1, 1); pc.drawImage(input.mask, 0, 0, width, height); pc.restore(); pc.globalCompositeOperation = "source-over";
    if (pose.face) {
      const f = pose.face, fx = ox + f.x * width, fy = oy + f.y * height, fw = f.width * width;
      if (faceMode === "HIDE") { pc.fillStyle = "#fff2d3"; oval(pc, fx, fy - fw * .18, fw * .9, fw * 1.12); pc.fillStyle = "#123c55"; oval(pc, fx - fw * .2, fy - fw * .08, 2.5, 3); oval(pc, fx + fw * .2, fy - fw * .08, 2.5, 3); }
      if (faceMode === "EFFECT" || faceMode === "HIDE") this.goggles(pc, fx, fy - fw * .16, fw);
      if (wind) { pc.strokeStyle = "#f1ffff"; pc.lineWidth = 2; for (const side of [-1, 1]) for (let i = 0; i < 3; i++) { pc.beginPath(); pc.moveTo(fx + side * fw * .7, fy + i * fw * .15); pc.lineTo(fx + side * fw * 1.12, fy + i * fw * .15 + fw * .07); pc.stroke(); } }
    }
    c.drawImage(p, 0, 0, w, h);
    return { span: clamp(pose.width * width * 3.6, w * .68, w * .96) };
  }
  goggles(c, x, y, width) {
    c.fillStyle = "#ffb53680"; c.strokeStyle = "#ff781f"; c.lineWidth = 3;
    c.beginPath(); c.roundRect(x - width * .48, y - width * .15, width * .96, width * .30, width * .1); c.fill(); c.stroke();
    c.strokeStyle = "#fffde9"; c.lineWidth = 2; c.beginPath(); c.moveTo(x - width * .35, y - width * .08); c.lineTo(x - width * .13, y - width * .08); c.stroke();
  }
  drawPilot(c, x, y, angle, w, ghost = false) {
    c.save(); c.translate(x, y); c.rotate(Math.atan(angle)); c.globalAlpha *= ghost ? .22 : 1;
    c.strokeStyle = "#e9f3ec"; c.lineWidth = w * .048; c.lineCap = "round"; c.beginPath(); c.moveTo(-w * .34, 3); c.lineTo(-w * .12, 0); c.lineTo(0, w * .025); c.lineTo(w * .12, 0); c.lineTo(w * .34, 3); c.stroke();
    c.fillStyle = "#efefdb"; c.beginPath(); c.roundRect(-w * .07, -w * .02, w * .14, w * .2, w * .035); c.fill();
    c.fillStyle = "#d79b65"; oval(c, 0, -w * .125, w * .071, w * .084);
    c.fillStyle = "#254856"; oval(c, 0, -w * .185, w * .073, w * .04);
    this.goggles(c, 0, -w * .137, w * .12);
    c.strokeStyle = "#783e31"; c.lineWidth = 2; c.beginPath(); c.arc(0, -w * .10, w * .026, .1, Math.PI - .1); c.stroke(); c.restore();
  }
}
