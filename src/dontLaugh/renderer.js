import birdUrl from './assets/bird-v1.webp';
import { clamp } from './signals.js';
import { stageAt, moodAt } from './core.js';
export const W = 360, H = 640;
const canvas = (w = W, h = H) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const text = (c, value, x, y, size, color = '#181a19', weight = 900) => { c.fillStyle = color; c.font = `${weight} ${size}px "Arial Black", "Helvetica Neue", sans-serif`; c.fillText(value, x, y); };
export function copyCanvas(source, width = 270, height = 480) { const c = canvas(width, height); c.getContext('2d').drawImage(source, 0, 0, width, height); return c; }
export class ReplayBuffer {
  constructor() { this.frames = []; this.last = -Infinity; }
  capture(source, time, force = false) {
    if (!force && time - this.last < .075) return;
    this.last = time; this.frames.push({ time, canvas: copyCanvas(source) });
    while (this.frames.length > 24 || this.frames[0]?.time < time - 1.5) { const old = this.frames.shift(); old.canvas.width = 0; }
  }
  take() { const frames = this.frames; this.frames = []; this.last = -Infinity; return frames; }
  clear() { this.frames.forEach(f => { f.canvas.width = 0; }); this.frames = []; this.last = -Infinity; }
}
export class DontLaughRenderer {
  constructor(target) { this.canvas = target; this.c = target.getContext('2d'); this.layer = canvas(); this.pixel = canvas(28, 50); this.bird = new Image(); this.bird.src = birdUrl; this.delayed = []; this.lastDelay = -Infinity; }
  clear() { this.delayed.forEach(f => { f.canvas.width = 0; }); this.delayed = []; this.lastDelay = -Infinity; this.layer.getContext('2d').clearRect(0, 0, W, H); }
  avatar(c, score, time, face) {
    const x = face.x, y = face.y, w = face.w, h = face.h;
    c.fillStyle = '#ece5d8'; c.fillRect(0, 0, W, H);
    c.fillStyle = '#434c4a'; c.beginPath(); c.ellipse(x, y + h * .9, w * 1.4, h * .8, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#ffd36f'; c.beginPath(); c.ellipse(x, y, w / 2, h / 2, .035 * Math.sin(time), 0, Math.PI * 2); c.fill();
    c.strokeStyle = '#191d1c'; c.lineCap = 'round'; c.lineWidth = 7;
    for (const side of [-1, 1]) { const ex = x + w * .18 * side; c.beginPath(); c.moveTo(ex - 12, y - h * .12); c.lineTo(ex + 12, y - h * .12); c.stroke(); c.lineWidth = 5; c.beginPath(); c.moveTo(ex - 17, y - h * .22); c.lineTo(ex + 16, y - h * .22 - side * 4); c.stroke(); c.lineWidth = 7; }
    c.lineWidth = 5; c.beginPath(); c.moveTo(x + 2, y - 5); c.lineTo(x - 9, y + 24); c.lineTo(x + 12, y + 24); c.stroke();
    c.beginPath(); c.moveTo(x - w * .18, y + h * .24); c.quadraticCurveTo(x, y + h * (.24 + score / 650), x + w * .18, y + h * .24); c.stroke();
    if (score > 60) { c.fillStyle = '#242926'; c.beginPath(); c.ellipse(x, y + h * .3, w * .15, 15, 0, 0, Math.PI * 2); c.fill(); }
  }
  draw(game, { video, signal, source, phase, countdown = 3, faceMode = 'ORIGINAL', reducedMotion = false, locale = 'ja' } = {}) {
    const c = this.c, l = this.layer.getContext('2d'), time = game.elapsed, attack = game.attack?.type, final = attack === 'final';
    const mirrored = attack !== 'flip' && !(final && !reducedMotion && Math.floor(time * 2) % 2);
    let face = { x: W / 2 + (reducedMotion ? 0 : Math.sin(time * 1.5) * 12), y: H * .46, w: 146, h: 198 }, points = null;
    if (source === 'camera' && video?.readyState >= 2 && video.videoWidth > 0 && faceMode !== 'HIDE') {
      const scale = Math.max(W / video.videoWidth, H / video.videoHeight), ox = (W - video.videoWidth * scale) / 2, oy = (H - video.videoHeight * scale) / 2;
      l.save(); if (mirrored) { l.translate(W, 0); l.scale(-1, 1); } l.drawImage(video, ox, oy, video.videoWidth * scale, video.videoHeight * scale); l.restore();
      if (signal?.points) {
        const project = p => ({ x: mirrored ? W - (p.x * video.videoWidth * scale + ox) : p.x * video.videoWidth * scale + ox, y: p.y * video.videoHeight * scale + oy });
        points = signal.points.map(project); const a = points[234], b = points[454], top = points[10], bottom = points[152];
        face = { x: (a.x + b.x) / 2, y: (top.y + bottom.y) / 2, w: Math.abs(a.x - b.x), h: Math.abs(bottom.y - top.y) };
      }
      if (faceMode === 'EFFECT') { const p = this.pixel.getContext('2d'); p.drawImage(this.layer, 0, 0, 28, 50); l.save(); l.imageSmoothingEnabled = false; l.drawImage(this.pixel, 0, 0, W, H); l.restore(); }
    } else this.avatar(l, game.score, time, face);
    c.drawImage(this.layer, 0, 0);
    const bounds = { x: clamp(face.x - face.w * .6, 0, W - 20), y: clamp(face.y - face.h * .57, 0, H - 20) };
    bounds.w = Math.min(face.w * 1.2, W - bounds.x); bounds.h = Math.min(face.h * 1.14, H - bounds.y);
    if (phase === 'playing' && time - this.lastDelay > .075) {
      const crop = canvas(120, 160); crop.getContext('2d').drawImage(this.layer, bounds.x, bounds.y, bounds.w, bounds.h, 0, 0, 120, 160);
      this.delayed.push({ time, canvas: crop }); this.lastDelay = time;
      while (this.delayed.length > 10) { const old = this.delayed.shift(); old.canvas.width = 0; }
    }
    if (phase === 'playing') {
      if (attack === 'delay' || final) {
        const delayed = [...this.delayed].reverse().find(f => f.time <= time - .5);
        if (delayed) { c.save(); c.beginPath(); c.ellipse(face.x, face.y, face.w * .51, face.h * .51, 0, 0, Math.PI * 2); c.clip(); c.drawImage(delayed.canvas, face.x - face.w * .6, face.y - face.h * .57, face.w * 1.2, face.h * 1.14); c.restore(); }
      }
      if (attack === 'clones' || final) {
        for (let i = 0; i < (final ? 5 : 2); i++) {
          const x = final ? 45 + i * 68 : face.x + (i ? 1 : -1) * face.w * .7;
          const y = final ? 430 + (i % 2 ? -55 : 0) : Math.min(440, face.y + face.h * .65);
          c.save(); c.translate(x, y + (reducedMotion ? 0 : Math.sin(time * 7 + i) * 9)); if (!reducedMotion) c.rotate(Math.sin(time * 5 + i) * .12);
          c.beginPath(); c.ellipse(0, 0, 39, 52, 0, 0, Math.PI * 2); c.clip(); c.drawImage(this.layer, bounds.x, bounds.y, bounds.w, bounds.h, -44, -56, 88, 112); c.restore();
          c.strokeStyle = '#ffdd35'; c.lineWidth = 3; c.beginPath(); c.ellipse(x, y, 39, 52, 0, 0, Math.PI * 2); c.stroke();
        }
      }
      if (attack === 'nose' || final) {
        const n = points?.[4] ?? { x: face.x, y: face.y + 12 }, size = face.w * .29;
        c.save(); c.beginPath(); c.ellipse(n.x, n.y, size, size * .8, 0, 0, Math.PI * 2); c.clip(); c.drawImage(this.layer, n.x - size / 2.5, n.y - size / 3, size / 1.25, size / 1.5, n.x - size, n.y - size * .8, size * 2, size * 1.6); c.restore();
      }
      if (attack === 'brows' || final) {
        c.strokeStyle = '#171b19'; c.lineWidth = Math.max(7, face.w * .065); c.lineCap = 'round';
        for (const side of [-1, 1]) { const ex = face.x + side * face.w * .2, y = points?.[side < 0 ? 159 : 386]?.y ?? face.y - face.h * .12; c.beginPath(); c.moveTo(ex - face.w * .27, y - 17); c.quadraticCurveTo(ex, y - 38, ex + face.w * .27, y - 23); c.stroke(); }
      }
      if ((attack === 'bird' || final) && this.bird.complete && this.bird.naturalWidth) { const size = Math.min(100, face.w * .6); c.drawImage(this.bird, face.x - size / 2, Math.max(122, face.y - face.h / 2 - size * .83), size, size * this.bird.height / this.bird.width); }
      if (final && !reducedMotion) { c.strokeStyle = '#ffdc37'; c.lineWidth = 2; for (let i = 0; i < 14; i++) { const a = i * Math.PI / 7 + time * .15; c.beginPath(); c.moveTo(W / 2 + Math.cos(a) * 210, 300 + Math.sin(a) * 300); c.lineTo(W / 2 + Math.cos(a) * 280, 300 + Math.sin(a) * 380); c.stroke(); } }
    }
    c.textAlign = 'left'; c.fillStyle = '#ffdf3b'; c.fillRect(0, 0, W, 112);
    text(c, 'DON’T LAUGH', 18, 29, 14); c.textAlign = 'right'; text(c, source === 'demo' ? 'PRACTICE' : 'NORMAL', W - 18, 28, 10);
    c.textAlign = 'left'; text(c, Math.max(0, 15 - time).toFixed(2), 16, 86, 50); text(c, 'SEC', 172, 84, 13);
    c.textAlign = 'right'; text(c, stageAt(time), W - 18, 59, final ? 10 : 12); text(c, moodAt(game.score), W - 18, 88, 13);
    c.strokeStyle = '#ffdf3b'; c.lineWidth = 3;
    for (const [x, y, dx, dy] of [[12, 130, 1, 1], [348, 130, -1, 1], [12, 500, 1, -1], [348, 500, -1, -1]]) { c.beginPath(); c.moveTo(x, y + dy * 22); c.lineTo(x, y); c.lineTo(x + dx * 22, y); c.stroke(); }
    c.fillStyle = '#171c19'; c.fillRect(0, 530, W, 110); c.textAlign = 'center';
    const taunt = final ? 'FINAL ATTACK' : attack === 'title' ? (locale === 'ja' ? '真顔界の代表取締役' : 'CEO OF SERIOUS FACES') : attack === 'voice' ? (locale === 'ja' ? 'その口、音がします。' : 'YOUR MOUTH HAS A SOUNDTRACK.') : attack === 'taunt' ? (locale === 'ja' ? 'その顔で真面目なつもり？' : 'THAT’S YOUR SERIOUS FACE?') : time >= 10 ? (locale === 'ja' ? '……ちょっと笑った？' : '…WAS THAT A SMILE?') : time >= 5 ? 'PERFECT SERIOUS FACE' : 'KEEP A STRAIGHT FACE.';
    text(c, taunt, W / 2, 559, locale === 'ja' && attack === 'taunt' ? 17 : 15, '#ffdf3b');
    if (final) text(c, String(Math.ceil(15 - time)), W / 2, 606, 39, '#fff9e7');
    else text(c, locale === 'ja' ? '笑ったら負け。相手は自分。' : 'YOU ARE YOUR OWN WORST ENEMY.', W / 2, 590, 11, '#f4eddf', 500);
    c.fillStyle = '#424840'; c.fillRect(18, 621, 324, 3); c.fillStyle = '#ffdf3b'; c.fillRect(18, 621, 324 * time / 15, 3);
    if (phase === 'countdown') { c.fillStyle = '#14191466'; c.fillRect(0, 112, W, 418); text(c, String(Math.max(1, Math.ceil(countdown))), W / 2, 365, 112, '#ffdf3b'); }
  }
}
