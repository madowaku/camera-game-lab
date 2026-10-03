import { clamp } from "../games/softServe.js";
const ellipse = (c, x, y, rx, ry) => { c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); c.fill(); };
export function drawSoftServe(canvas, game, { demo = true, mouth = null, open = false, reducedMotion = false, locale = "ja" } = {}) {
  const w = canvas.clientWidth, h = canvas.clientHeight;
  if (!w || !h) return;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) { canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); }
  const c = canvas.getContext("2d"); c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, w, h);
  if (demo) {
    c.fillStyle = "#deede3"; c.fillRect(0, 0, w, h);
    c.fillStyle = "#b4d8c5";
    for (let x = -h; x < w + h; x += 55) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x + 26, 0); c.lineTo(x + h * .3 + 26, h); c.lineTo(x + h * .3, h); c.closePath(); c.fill(); }
    c.fillStyle = "#f5f2de"; c.fillRect(0, h * .87, w, h * .13);
    c.fillStyle = "#c7b798"; c.fillRect(0, h * .87, w, 3);
  } else { c.fillStyle = "#102f2522"; c.fillRect(0, 0, w, h); }
  const x = (game.result ? .5 : game.cone.x) * w, y = (game.result ? .57 : game.cone.y) * h, size = game.result ? Math.min(w * .13, h * .2) : Math.min(w * .13, h * .17);
  const serving = game.phase === "serve", ready = game.phase === "ready", eating = game.phase === "eat";
  if (serving || ready) {
    const radius = Math.max(.025, .105 - game.amount * .007) * w;
    c.strokeStyle = "#2e635a99"; c.lineWidth = 2; c.setLineDash([5, 6]);
    c.beginPath(); c.moveTo(w * .5 - radius, h * .27); c.lineTo(w * .5 - radius, h * .81); c.moveTo(w * .5 + radius, h * .27); c.lineTo(w * .5 + radius, h * .81); c.stroke(); c.setLineDash([]);
    if (ready || game.amount < 2.2) {
      c.fillStyle = "#25483d"; c.font = `bold ${Math.max(13, w * .038)}px 'Yu Gothic', sans-serif`; c.textAlign = "center";
      c.fillText(locale === "ja" ? ready ? "手をここへ" : "← ゆっくり、左右へ →" : ready ? "MOVE HERE" : "← SWIRL SIDE TO SIDE →", w * .5, h * .34);
    }
    if (game.amount >= 2.5) {
      c.fillStyle = "#264e42b8"; c.beginPath(); c.roundRect(w * .025, h * .51, w * .19, 44, 12); c.fill();
      c.beginPath(); c.roundRect(w * .785, h * .51, w * .19, 44, 12); c.fill();
      c.fillStyle = "#fff8de"; c.font = `bold ${Math.max(12, w * .034)}px 'Yu Gothic', sans-serif`;
      c.fillText(locale === "ja" ? "← 食べる" : "← EAT", w * .12, h * .51 + 27);
      c.fillText(locale === "ja" ? "食べる →" : "EAT →", w * .88, h * .51 + 27);
    }
  }
  // Enamel toy machine, with a visible vanilla ribbon from the nozzle.
  if (!eating && game.phase !== "result") {
    c.fillStyle = "#243c34"; c.beginPath(); c.roundRect(w * .36, -8, w * .28, h * .13, [0, 0, 20, 20]); c.fill();
    c.fillStyle = "#ea9c7a"; c.beginPath(); c.roundRect(w * .395, -8, w * .21, h * .095, [0, 0, 11, 11]); c.fill();
    c.fillStyle = "#faf1d4"; c.beginPath(); c.roundRect(w * .466, h * .11, w * .068, h * .047, 5); c.fill();
    c.fillStyle = "#27483c"; c.font = `bold ${w * .024}px 'Trebuchet MS', sans-serif`; c.textAlign = "center"; c.fillText("VANILLA", w * .5, h * .06);
    if (serving && !game.paused) {
      const end = game.catching ? Math.max(h * .18, game.tip.y * h) : h * .9;
      const wave = reducedMotion ? 0 : Math.sin(game.elapsedMs / 100) * w * .008;
      c.lineCap = "round"; c.strokeStyle = "#ccb996"; c.lineWidth = w * .033;
      c.beginPath(); c.moveTo(w * .5, h * .15); c.bezierCurveTo(w * .5 + wave, end * .4, w * .5 - wave, end * .7, w * .5, end); c.stroke();
      c.strokeStyle = "#fff6dc"; c.lineWidth = w * .021; c.stroke();
    }
  }
  c.fillStyle = "#3f674630"; ellipse(c, x, y + size * 1.8, size, size * .15);
  // A waffle cone with clipped diagonal embossing, rim and a tiny face.
  c.save(); c.beginPath(); c.moveTo(x - size, y); c.quadraticCurveTo(x, y - size * .25, x + size, y); c.lineTo(x + size * .12, y + size * 1.65); c.quadraticCurveTo(x, y + size * 1.86, x - size * .12, y + size * 1.65); c.closePath();
  const coneGradient = c.createLinearGradient(x - size, y, x + size, y); coneGradient.addColorStop(0, "#bc783b"); coneGradient.addColorStop(.45, "#efc77a"); coneGradient.addColorStop(1, "#c88b47"); c.fillStyle = coneGradient; c.fill(); c.clip();
  c.strokeStyle = "#a66b3680"; c.lineWidth = 1.8;
  for (let i = -5; i <= 5; i++) { c.beginPath(); c.moveTo(x - size + i * size * .4, y); c.lineTo(x + size + i * size * .4, y + size * 2); c.stroke(); c.beginPath(); c.moveTo(x + size + i * size * .4, y); c.lineTo(x - size + i * size * .4, y + size * 2); c.stroke(); }
  c.restore(); c.fillStyle = "#f4d38e"; ellipse(c, x, y, size * 1.02, size * .22);
  c.fillStyle = "#815533"; ellipse(c, x - size * .2, y + size * .53, size * .045, size * .075); ellipse(c, x + size * .2, y + size * .53, size * .045, size * .075);
  c.strokeStyle = "#815533"; c.lineWidth = 2; c.beginPath(); c.arc(x, y + size * .72, size * .11, .15, Math.PI - .15); c.stroke();
  // Each recorded band carries its actual spread and center. Still hands make a thin tower.
  if (game.result?.outcome !== "splat") {
    for (let level = 0; level < game.amount; level++) {
      const fraction = Math.min(1, game.amount - level), band = game.segments.filter(s => s.level >= level && s.level < level + 1);
      const min = band.length ? Math.min(...band.map(s => s.x)) : -.035, max = band.length ? Math.max(...band.map(s => s.x)) : .035;
      const width = clamp((max - min) * .58 + .025, .027, .14) * w;
      const middle = band.length ? band.reduce((n, s) => n + s.x, 0) / band.length : 0;
      const cx = x + middle * w + game.lean * level * .034 * w;
      const cy = y - (level + fraction * .75) * game.rules.swirlHeight * h;
      const ry = Math.max(w * .025, game.rules.swirlHeight * h * .58);
      const gradient = c.createLinearGradient(cx - width, cy - ry, cx + width, cy + ry); gradient.addColorStop(0, "#d7c6a4"); gradient.addColorStop(.32, "#fff8e2"); gradient.addColorStop(.68, "#fff8e2"); gradient.addColorStop(1, "#decba6");
      c.fillStyle = gradient; ellipse(c, cx, cy, width, ry);
      c.strokeStyle = "#fdfaf0"; c.lineWidth = w * .009; c.beginPath(); c.ellipse(cx, cy - ry * .15, width * .84, ry * .65, 0, Math.PI, Math.PI * 1.95); c.stroke();
    }
    if (game.amount > .2) {
      const tip = game.tip; c.fillStyle = "#fff8e2"; c.beginPath(); c.moveTo(tip.x * w - w * .023, tip.y * h + h * .024); c.quadraticCurveTo(tip.x * w + w * .023, tip.y * h + h * .024, tip.x * w + w * .01, tip.y * h - h * .014); c.quadraticCurveTo(tip.x * w - w * .01, tip.y * h - h * .002, tip.x * w - w * .023, tip.y * h + h * .024); c.fill();
    }
  } else {
    c.fillStyle = "#fff0d2"; for (let i = 0; i < 7; i++) ellipse(c, x + (i - 3) * size * .45, y + size * 1.65 + Math.sin(i * 8) * 12, size * .6, size * .22);
  }
  if (game.melt > 25 && game.amount > 0) {
    c.fillStyle = "#fff4d5";
    for (let i = 0; i < 3; i++) { const dropY = (game.elapsedMs / 1700 + i * .33) % 1; ellipse(c, x + (i - 1) * size * .62, y + dropY * size * 1.3, w * .012, w * .021); }
  }
  if (eating) {
    const tip = game.tip, radius = w * .075;
    c.strokeStyle = "#e47f5f"; c.lineWidth = 2.5; c.setLineDash([4, 4]); c.beginPath(); c.arc(tip.x * w, tip.y * h, radius, 0, Math.PI * 2); c.stroke(); c.setLineDash([]);
    if (mouth) {
      c.strokeStyle = open ? "#fff8df" : "#e47f5f"; c.lineWidth = 3; c.beginPath(); c.ellipse(mouth.x * w, mouth.y * h, w * .034, open ? w * .027 : w * .008, 0, 0, Math.PI * 2); c.stroke();
    }
  }
  if (game.effect?.type === "lick" && game.elapsedMs - game.effect.at < 650) {
    c.font = `bold ${w * .055}px 'Yu Gothic', sans-serif`; c.fillStyle = "#b95d45"; c.textAlign = "center"; c.fillText(locale === "ja" ? "ペロッ！" : "LICK!", x, game.tip.y * h - h * .07);
  }
}
