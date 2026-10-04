import atlasUrl from "./assets/drums-v1.webp";
import { DRUMS, BIG_DRUM } from "../games/toyDrum.js";
export const W = 720, H = 1280;
export function loadAtlas() { return new Promise((resolve, reject) => { const i = new Image(); i.onload = () => resolve(i); i.onerror = () => reject(Error("TOY DRUM artwork could not load")); i.src = atlasUrl; }); }
export class ToyDrumRenderer {
  constructor(canvas) { this.canvas = canvas; this.ctx = canvas.getContext("2d"); this.particles = []; this.shakeAt = -Infinity; this.feedback = null; }
  reset() { this.particles = []; this.feedback = null; this.shakeAt = -Infinity; }
  burst(drum, now, count = 18, full = false) {
    const d = DRUMS[drum] ?? BIG_DRUM;
    for (let i = 0; i < count; i++) {
      const colorDrum = full ? DRUMS[i % 4] : d;
      this.particles.push({ x: full ? Math.random() * W : d.x * W, y: full ? H * (.15 + Math.random() * .7) : d.y * H, vx: (Math.random() - .5) * (full ? 480 : 390), vy: -170 - Math.random() * 420, at: now, life: .65 + Math.random() * .7, color: colorDrum.color, shape: colorDrum.shape, size: 5 + Math.random() * 9, spin: Math.random() * 6 });
    }
    this.particles = this.particles.slice(-280); this.shakeAt = now;
  }
  event(e) {
    if (e.type === "hit") this.burst(e.drum, e.at);
    if (["double", "perfect", "finish"].includes(e.type)) this.feedback = { type: e.type, at: e.at };
    if (e.type === "double") this.burst(1, e.at, 38, true);
    if (e.type === "finish") this.burst(4, e.at, 170, true);
  }
  draw(game, { atlas, video, source, hands = [], reducedMotion = false } = {}) {
    const c = this.ctx, now = game.elapsed; c.save(); c.clearRect(0, 0, W, H);
    if (!reducedMotion && now - this.shakeAt < .1) c.translate(Math.sin((now - this.shakeAt) * 140) * 2, 0);
    c.fillStyle = "#fff0d7"; c.fillRect(0, 0, W, H);
    if (source === "camera" && video?.readyState >= 2) {
      const scale = Math.max(W / video.videoWidth, H / video.videoHeight), width = video.videoWidth * scale, height = video.videoHeight * scale;
      c.save(); c.translate(W, 0); c.scale(-1, 1); c.drawImage(video, (W - width) / 2, (H - height) / 2, width, height); c.restore();
      const fade = c.createLinearGradient(0, H * .46, 0, H); fade.addColorStop(0, "#fff0d700"); fade.addColorStop(.45, "#fff0d7a8"); fade.addColorStop(1, "#fff0d7ee"); c.fillStyle = fade; c.fillRect(0, H * .46, W, H * .54);
    } else {
      c.fillStyle = "#f9dbb5";
      for (let y = 40; y < H; y += 56) for (let x = 28; x < W; x += 56) { c.beginPath(); c.arc(x, y, 2, 0, Math.PI * 2); c.fill(); }
      c.fillStyle = "#f4bc82"; c.fillRect(0, H * .47, W, 4);
      c.save(); c.translate(W / 2, H * .34); c.strokeStyle = "#d59665"; c.lineWidth = 12; c.lineCap = "round";
      c.beginPath(); c.arc(0, -58, 42, 0, Math.PI * 2); c.stroke(); c.beginPath(); c.moveTo(-106, 86); c.quadraticCurveTo(-102, 4, 0, 4); c.quadraticCurveTo(102, 4, 106, 86); c.stroke();
      c.font = "900 16px 'Trebuchet MS'"; c.fillStyle = "#996348"; c.textAlign = "center"; c.fillText("YOUR HANDS. YOUR LITTLE BAND.", 0, 138); c.restore();
    }
    const floor = c.createLinearGradient(0, H * .51, 0, H); floor.addColorStop(0, "#ffcf9500"); floor.addColorStop(1, "#efa75366"); c.fillStyle = floor; c.fillRect(0, H * .51, W, H * .49);
    const cue = game.cue;
    for (const d of DRUMS) {
      const active = game.phase === "fever" || game.phase === "free" && Math.floor(now * 1.6) % 4 === d.id || cue?.drums.includes(d.id);
      this.drum(d, game, atlas, active, reducedMotion, game.phase === "finish" ? .22 : 1);
    }
    if (game.phase === "finish") { this.drum(BIG_DRUM, game, atlas, !game.finishSuccess, reducedMotion); c.textAlign = "center"; c.font = "900 32px 'Trebuchet MS'"; c.fillStyle = "#704431"; c.fillText("★", W * .5, H * .69); }
    for (const hand of hands.filter(h => h.present)) {
      c.save(); c.translate(hand.x * W, hand.y * H); c.fillStyle = hand.slot ? "#ffffffcc" : "#fffbdccc"; c.strokeStyle = hand.slot ? "#4cbcff" : "#ff6659"; c.lineWidth = 4;
      c.beginPath(); c.arc(0, 0, 22, 0, Math.PI * 2); c.fill(); c.stroke(); c.restore();
    }
    this.particles = this.particles.filter(p => now - p.at < p.life);
    for (const p of this.particles) {
      const age = now - p.at; c.save(); c.globalAlpha = Math.max(0, 1 - age / p.life); c.translate(p.x + p.vx * age, p.y + p.vy * age + 260 * age * age); c.rotate(p.spin + age * 3); c.fillStyle = p.color; c.strokeStyle = p.color; c.lineWidth = 3;
      if (p.shape === "star") { c.beginPath(); for (let k = 0; k < 10; k++) { const a = k * Math.PI / 5, r = k % 2 ? p.size * .4 : p.size; c.lineTo(Math.cos(a) * r, Math.sin(a) * r); } c.closePath(); c.fill(); }
      else if (p.shape === "confetti") c.fillRect(-p.size / 2, -p.size, p.size, p.size * 1.5);
      else { c.beginPath(); c.arc(0, 0, p.size, 0, Math.PI * 2); if (p.shape === "bubble") c.stroke(); else c.fill(); }
      c.restore();
    }
    const f = this.feedback;
    if (f && now - f.at < (f.type === "finish" ? 2.4 : .75)) {
      c.save(); c.textAlign = "center"; c.translate(W * .5, H * .46); c.rotate(-.04); c.font = `900 ${f.type === "finish" ? 87 : 52}px 'Trebuchet MS'`;
      c.lineWidth = 12; c.strokeStyle = "#fff5d7"; c.fillStyle = f.type === "perfect" ? "#d78b00" : "#ed594b";
      const label = f.type === "finish" ? "BAAAN!!" : f.type === "double" ? "DOUBLE!" : "PERFECT!"; c.strokeText(label, 0, 0); c.fillText(label, 0, 0); c.restore();
    }
    c.restore();
  }
  drum(d, game, atlas, active, reduced, opacity = 1) {
    const c = this.ctx, now = game.elapsed, age = now - game.hitAt[d.id], big = d.id === 4;
    const size = W * (big ? .72 : .39), pulse = active && !reduced ? 1 + Math.sin(now * 7) * .025 : 1;
    let squash = 0; if (!reduced && age >= 0 && age < .2) squash = age < .08 ? age / .08 : 1 - (age - .08) / .12;
    c.save(); c.globalAlpha = opacity;
    if (active) { c.fillStyle = d.color + "5e"; c.strokeStyle = "#fff9df"; c.lineWidth = 5; c.beginPath(); c.ellipse(d.x * W, d.y * H, d.rx * W * 1.13 * pulse, d.ry * H * 1.18 * pulse, 0, 0, Math.PI * 2); c.fill(); c.stroke(); }
    c.translate(d.x * W, d.y * H); c.scale(pulse * (1 + squash * .09), pulse * (1 - squash * .18));
    if (atlas) { const sw = atlas.naturalWidth / 2, sh = atlas.naturalHeight / 2, tile = big ? 1 : d.id; c.drawImage(atlas, tile % 2 * sw, Math.floor(tile / 2) * sh, sw, sh, -size / 2, -size * .42, size, size); }
    else { c.fillStyle = d.color; c.beginPath(); c.ellipse(0, 0, d.rx * W, d.ry * H, 0, 0, Math.PI * 2); c.fill(); }
    c.textAlign = "center"; c.font = `900 ${big ? 24 : 20}px 'Trebuchet MS'`; c.fillStyle = "#704431"; c.fillText(big ? "BIG DRUM" : d.name, 0, size * .54); c.restore();
  }
}
