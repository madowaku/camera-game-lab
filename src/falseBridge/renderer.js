import { WIDTH as W, HEIGHT as H, traceShape } from "./shapes.js";

function polygon(c, points, fill) {
  c.beginPath(); points.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.closePath(); c.fillStyle = fill; c.fill();
}
function cliff(c, x, y, w, h) {
  polygon(c, [[x, y], [x + w, y], [x + w - 9, y + h * .56], [x + w * .64, y + h], [x + w * .22, y + h * .86], [x, y + h * .32]], "#365650");
  polygon(c, [[x + w * .52, y + 5], [x + w - 3, y + 5], [x + w - 12, y + h * .55], [x + w * .64, y + h]], "#294440");
  polygon(c, [[x - 2, y], [x + 8, y - 8], [x + w - 4, y - 8], [x + w + 2, y + 2], [x + w - 9, y + 8], [x + 2, y + 8]], "#bdcba5");
  c.strokeStyle = "#769085"; c.lineWidth = 1;
  for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(x + 10, y + 29 + i * 27); c.lineTo(x + w - 22, y + 23 + i * 27); c.stroke(); }
  c.fillStyle = "#dde3b9"; c.fillRect(x + 16, y - 13, 3, 8); c.fillRect(x + 22, y - 11, 3, 6);
}
function traveller(c, x, y, scale = 1, stride = 0, celebrate = false) {
  c.save(); c.translate(x, y); c.scale(scale, scale);
  c.fillStyle = "#152b2e45"; c.beginPath(); c.ellipse(0, 2, 11, 3, 0, 0, Math.PI * 2); c.fill();
  c.strokeStyle = "#102c30"; c.lineWidth = 3; c.lineCap = "round";
  c.beginPath(); c.moveTo(-4, -11); c.lineTo(-5 - stride, 0); c.moveTo(4, -11); c.lineTo(5 + stride, 0); c.stroke();
  c.fillStyle = "#c87542"; c.fillRect(-11, -26, 8, 16);
  polygon(c, [[-7, -27], [7, -27], [9, -9], [-8, -9]], "#f5bf65");
  c.fillStyle = "#ffe7b2"; c.beginPath(); c.arc(0, -32, 8, 0, Math.PI * 2); c.fill();
  c.fillStyle = "#24423e"; c.fillRect(3, -34, 2, 3);
  polygon(c, [[-10, -36], [-5, -43], [5, -42], [10, -36]], "#e9a950");
  c.strokeStyle = "#ffe7b2"; c.beginPath(); c.moveTo(5, -22); c.lineTo(12, celebrate ? -36 : -16); c.stroke(); c.restore();
}
export function drawDemoObject(c, shape) {
  c.save(); c.translate(shape.x, shape.y); c.rotate(shape.angle * Math.PI / 180);
  const w = shape.w, h = shape.h;
  c.shadowColor = "#081d2466"; c.shadowBlur = 9; c.shadowOffsetY = 5;
  if (shape.kind === "bar") {
    polygon(c, [[-w / 2, 0], [-w / 2 + h, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2 + h, h / 2]], "#dfb351"); c.shadowColor = "transparent";
    c.fillStyle = "#f8d67e"; c.fillRect(-w / 2 + h, -h / 2, w - h - 10, h * .32);
    c.fillStyle = "#a66d35"; c.fillRect(-w / 2 + h, h * .2, w - h - 10, h * .3);
    polygon(c, [[-w / 2, 0], [-w / 2 + h, -h / 2], [-w / 2 + h, h / 2]], "#e8cfaa");
    polygon(c, [[-w / 2, 0], [-w / 2 + 8, -4], [-w / 2 + 8, 4]], "#273f3b");
    c.fillStyle = "#cbd8cc"; c.fillRect(w / 2 - 17, -h / 2, 7, h); c.fillStyle = "#d88670"; c.fillRect(w / 2 - 10, -h / 2, 10, h);
  } else if (shape.kind === "circle") {
    c.fillStyle = "#d7b677"; c.beginPath(); c.ellipse(0, 0, w / 2, h / 2, 0, 0, Math.PI * 2); c.fill(); c.shadowColor = "transparent";
    c.strokeStyle = "#f1d59c"; c.lineWidth = 4; c.beginPath(); c.arc(0, 0, w * .41, 0, Math.PI * 2); c.stroke();
    c.fillStyle = "#b6955d"; c.font = `${w * .38}px Georgia`; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText("✦", 0, 2);
  } else {
    polygon(c, [[-w * .325, -h / 2], [w * .325, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]], "#c97657"); c.shadowColor = "transparent";
    c.fillStyle = "#e0a17c"; c.fillRect(-w / 2, h * .32, w, h * .18);
    c.strokeStyle = "#e7b28e"; c.lineWidth = 2; c.beginPath(); c.moveTo(-w * .22, -h * .36); c.lineTo(-w * .3, h * .15); c.stroke();
  }
  c.restore();
}
export function renderWorld(c, { game: g, raw, frozen, pending, sample, now, reducedMotion = false }) {
  c.clearRect(0, 0, W, H); c.fillStyle = "#193b40"; c.fillRect(0, 0, W, H);
  if (raw) c.drawImage(raw, 0, 0, W, H);
  const camera = g.source === "camera";
  const shade = c.createLinearGradient(0, 0, 0, H); shade.addColorStop(0, camera ? "#112e3b38" : "#142e39"); shade.addColorStop(1, camera ? "#17332a12" : "#3c6260"); c.fillStyle = shade; c.fillRect(0, 0, W, H);
  // A sparse, floating paper world leaves the missing silhouette unobstructed.
  c.fillStyle = "#d8e7cf55";
  for (let i = 0; i < 17; i++) { const x = (i * 83 + 25) % W, y = (i * 47 + 48) % 310; c.fillRect(x, y, i % 4 === 0 ? 3 : 1.5, 1.5); }
  if (g.source === "demo" && ["playing", "calibration"].includes(g.phase) && !g.paused) drawDemoObject(c, g.demoShape);
  const id = g.stage.id;
  if (id === "bridge" || id === "two") {
    const y = id === "two" ? 207 : 232; cliff(c, -9, y, 111, 130); cliff(c, 258, y, 111, 143);
    if (id === "two") cliff(c, 218, 340, 55, 44);
    c.fillStyle = "#e3d99b"; c.fillRect(307, y - 50, 2, 42); polygon(c, [[309, y - 50], [333, y - 43], [309, y - 34]], "#e7a77b");
  } else if (id === "ladder") { cliff(c, -7, 302, 207, 106); cliff(c, 229, 145, 140, 110); }
  else if (id === "moon") {
    polygon(c, [[0, 385], [46, 303], [102, 366], [159, 316], [232, 390], [292, 309], [360, 354], [360, 440], [0, 440]], "#26473f");
    cliff(c, 116, 341, 128, 101);
  } else {
    c.fillStyle = "#d5ac77"; c.beginPath(); c.roundRect(112, 216, 136, 127, 49); c.fill();
    c.fillStyle = "#203d3a"; c.beginPath(); c.roundRect(131, 344, 99, 110, [28, 28, 0, 0]); c.fill();
    c.fillStyle = "#253e37"; c.fillRect(145, 265, 8, 13); c.fillRect(207, 265, 8, 13);
    c.strokeStyle = "#865c46"; c.lineWidth = 3; c.beginPath(); c.arc(180, 287, 18, 0, Math.PI); c.stroke();
    c.fillStyle = "#efcba055"; c.beginPath(); c.ellipse(134, 293, 12, 6, 0, 0, Math.PI * 2); c.fill();
  }
  for (const image of frozen) if (image) c.drawImage(image, 0, 0, W, H);
  if (pending) c.drawImage(pending, 0, 0, W, H);
  const active = ["playing", "background", "calibration"].includes(g.phase), guide = g.guide;
  if (active) {
    const feedback = !sample?.reason && sample?.fit >= .65 ? "ready" : !sample?.reason && sample?.coverage >= .22 ? "almost" : "find";
    c.strokeStyle = feedback === "ready" ? "#d7ffad" : feedback === "almost" ? "#ffdb86" : "#fff8e3";
    c.lineWidth = feedback === "ready" ? 3 : 2; c.setLineDash(feedback === "ready" ? [] : [6, 6]);
    traceShape(c, guide); c.stroke(); c.setLineDash([]);
    c.fillStyle = "#fff8e3";
    for (const p of g.stage.parts.slice(g.partIndex + 1)) { c.globalAlpha = .25; c.setLineDash([3, 7]); traceShape(c, p); c.stroke(); c.setLineDash([]); c.globalAlpha = 1; }
  }
  const complete = g.phase === "clear" || g.phase === "result", walking = g.phase === "locked" && g.partIndex === g.stage.parts.length - 1;
  let progress = complete ? 1 : walking ? Math.min(1, Math.max(0, (g.timer - 300) / 1750)) : 0;
  if (reducedMotion && walking) progress = 1;
  const stride = walking && !reducedMotion ? Math.sin(now / 75) * 3 : 0;
  if (id === "bridge" || id === "two") traveller(c, 76 + progress * 211, (id === "two" ? 205 : 230) - (walking ? Math.abs(stride) : 0), 1, stride, complete);
  if (id === "ladder") {
    const p = progress * 3, x = p < 1 ? 171 + p * 42 : p < 2 ? 213 : 213 + (p - 2) * 63, y = p < 1 ? 295 : p < 2 ? 295 - (p - 1) * 158 : 137;
    traveller(c, x, y, 1, stride, complete);
  }
  if (id === "moon") traveller(c, 177, 334, 1.15, 0, progress > .2);
  if (id === "hat" && progress > 0) { c.fillStyle = "#ffe7bd"; c.font = "25px Georgia"; c.fillText("✦", 75, 226); c.fillText("✦", 271, 234); }
  if ((walking || complete) && !reducedMotion) {
    c.fillStyle = "#ffe4a7";
    for (let i = 0; i < 10; i++) { const angle = i * 2.4, radius = 40 + ((now / 22 + i * 11) % 65); c.fillRect(guide.x + Math.cos(angle) * radius, guide.y + Math.sin(angle) * radius, 3, 3); }
  }
  c.strokeStyle = "#f5ead66b"; c.lineWidth = 1;
  for (const [x, y, dx, dy] of [[14, 14, 1, 1], [346, 14, -1, 1], [14, 426, 1, -1], [346, 426, -1, -1]]) { c.beginPath(); c.moveTo(x + dx * 14, y); c.lineTo(x, y); c.lineTo(x, y + dy * 14); c.stroke(); }
}
