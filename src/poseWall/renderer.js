import { W, H, projectPose, targetForPlayer } from './poses.js';
export { W, H } from './poses.js';
const TAU = Math.PI * 2;
const circle = (c, x, y, r) => { c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); };
const line = (c, points, width, color) => { c.beginPath(); points.forEach((p, i) => i ? c.lineTo(p.x * W, p.y * H) : c.moveTo(p.x * W, p.y * H)); c.lineWidth = width; c.strokeStyle = color; c.lineCap = c.lineJoin = 'round'; c.stroke(); };
export class PoseWallRenderer {
  constructor(canvas) { this.canvas = canvas; this.c = canvas.getContext('2d'); this.wall = document.createElement('canvas'); this.wall.width = W; this.wall.height = H; this.wc = this.wall.getContext('2d'); }
  draw(game, { pose, video, source, reducedMotion = false, ready = false }) {
    const c = this.c, p = projectPose(pose), target = targetForPlayer(p, game.target.angles);
    c.clearRect(0, 0, W, H); this.studio(c);
    if (source === 'camera' && video.readyState >= 2) {
      const scale = Math.max(W / video.videoWidth, H / video.videoHeight), width = video.videoWidth * scale, height = video.videoHeight * scale;
      c.save(); c.translate(W, 0); c.scale(-1, 1); c.drawImage(video, (W - width) / 2, (H - height) / 2, width, height); c.restore();
      c.fillStyle = '#fff7e311'; c.fillRect(0, 0, W, H);
    } else this.avatar(c, p ?? target);
    if (game.phase !== 'playing') {
      this.frameGuide(c); if (p && source === 'camera') this.skeleton(c, p);
      return;
    }
    const age = game.wallTime, verdict = game.walls[game.wallIndex], judged = !!verdict;
    if (verdict?.rank === 'CRASH') {
      c.save();
      if (p?.nose) { const face = new Path2D(); face.rect(0, 0, W, H); face.arc(p.nose.x * W, p.nose.y * H, 45, 0, TAU); c.clip(face, 'evenodd'); }
      this.crash(c, game.target.color, age - 2, reducedMotion); c.restore(); return;
    }
    this.paintWall(target, game.target.color, verdict?.rank === 'SQUEEZE' ? 1 + Math.sin((age - 2) * Math.PI / .8) * .4 : 1);
    const approach = Math.max(0, Math.min(1, (age - .5) / 1.5));
    let scale = 1 / (3 - 2 * approach), alpha = 1;
    if (age >= 2.4) { const pass = (age - 2.4) / .6; scale = 1 + pass * (verdict?.rank === 'PERFECT' ? 3.5 : 2.5); alpha = 1 - pass; }
    if (reducedMotion) scale = age < 2 ? .7 + approach * .3 : 1;
    const anchorY = (target.arms[0].shoulder.y + target.arms[1].shoulder.y) / 2 * H;
    c.save(); c.globalAlpha = alpha; c.translate(W / 2, anchorY);
    if (verdict?.rank === 'SQUEEZE' && !reducedMotion) { const wobble = Math.sin((age - 2) * 22) * .07; c.scale(1 + wobble, 1 - wobble); }
    if (verdict?.rank === 'PERFECT' && !reducedMotion && age < 2.15) c.translate(Math.sin(age * 90) * 2, 0);
    c.scale(scale, scale); c.drawImage(this.wall, -W / 2, -anchorY); c.restore();
    if (p && (age < 1.65 || source === 'demo' && age < 2)) this.skeleton(c, p, source === 'demo');
    if (judged) this.sparkles(c, verdict, age - 2, reducedMotion);
    if (ready) { c.fillStyle = '#fff8e5'; c.font = '900 13px Trebuchet MS'; c.textAlign = 'center'; c.fillText('HOLD IT!', W / 2, H - 32); }
  }
  studio(c) {
    const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#ffdf65'); g.addColorStop(.65, '#fff1ba'); g.addColorStop(1, '#fff9e9'); c.fillStyle = g; c.fillRect(0, 0, W, H);
    c.strokeStyle = '#4585c8'; c.lineWidth = 25; c.beginPath(); c.roundRect(28, 92, 304, 355, 145); c.stroke();
    c.fillStyle = '#fff7d0'; for (let i = 0; i < 9; i++) { const a = Math.PI + i * Math.PI / 8; circle(c, 180 + Math.cos(a) * 145, 250 + Math.sin(a) * 145, 5); }
    c.fillStyle = '#67cabb'; c.fillRect(0, 400, W, 23); c.fillStyle = '#fff9e9'; c.fillRect(0, 430, W, H - 430);
    c.strokeStyle = '#eadcbb'; c.lineWidth = 1.5;
    for (let i = -3; i <= 3; i++) { c.beginPath(); c.moveTo(180 + i * 30, 430); c.lineTo(180 + i * 140, H); c.stroke(); }
    [448, 480, 530, 596].forEach(y => { c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); });
  }
  avatar(c, pose) {
    const [l, r] = pose.arms.map(a => a.shoulder), cy = (l.y + r.y) / 2 * H, x = (l.x + r.x) / 2 * W, width = (r.x - l.x) * W;
    c.fillStyle = '#4075be'; c.beginPath(); c.roundRect(x - width * .6, cy - 8, width * 1.2, H - cy + 25, 25); c.fill();
    pose.arms.forEach(a => { if (a.elbow && a.wrist) line(c, [a.shoulder, a.elbow, a.wrist], 24, '#eec29b'); });
    c.fillStyle = '#eec29b'; c.fillRect(x - 11, cy - 48, 22, 50); circle(c, pose.nose.x * W, pose.nose.y * H, 31);
    c.fillStyle = '#303332'; circle(c, pose.nose.x * W - 10, pose.nose.y * H - 3, 2.5); circle(c, pose.nose.x * W + 10, pose.nose.y * H - 3, 2.5);
    c.strokeStyle = '#303332'; c.lineWidth = 2; c.beginPath(); c.arc(pose.nose.x * W, pose.nose.y * H + 6, 9, 0, Math.PI); c.stroke();
    c.fillStyle = '#ffdf65'; c.font = '900 20px Trebuchet MS'; c.textAlign = 'center'; c.fillText('YOU', x, cy + 70);
  }
  skeleton(c, pose, handles = false) {
    for (const a of pose.arms) {
      if (a.elbow) line(c, [a.shoulder, a.elbow], 3, '#ffffe8cc');
      if (a.elbow && a.wrist) line(c, [a.elbow, a.wrist], 3, '#ffffe8cc');
      [a.elbow, a.wrist].filter(Boolean).forEach(p => { c.fillStyle = handles ? '#fff7d0' : '#60ddbb'; circle(c, p.x * W, p.y * H, handles ? 8 : 4); if (handles) { c.strokeStyle = '#314a46'; c.lineWidth = 2; c.stroke(); } });
    }
  }
  paintWall(pose, color, squeeze) {
    const c = this.wc; c.clearRect(0, 0, W, H);
    c.fillStyle = '#253e4622'; c.beginPath(); c.roundRect(10, 64, W - 12, H - 75, 18); c.fill();
    c.fillStyle = color; c.beginPath(); c.roundRect(3, 52, W - 6, H - 69, 16); c.fill();
    c.strokeStyle = '#ffffff75'; c.lineWidth = 3; c.stroke();
    c.fillStyle = '#ffffff1b'; for (let y = 78; y < H - 20; y += 23) for (let x = 18; x < W; x += 23) circle(c, x, y, 1.5);
    const [l, r] = pose.arms.map(a => a.shoulder), span = (r.x - l.x) * W, cx = (l.x + r.x) / 2 * W, cy = (l.y + r.y) / 2 * H;
    c.globalCompositeOperation = 'destination-out'; c.fillStyle = '#000';
    circle(c, pose.nose.x * W, pose.nose.y * H, span * .44 * squeeze);
    line(c, [pose.nose, { x: cx / W, y: (cy + 14) / H }, { x: cx / W, y: .97 }], span * .8 * squeeze, '#000');
    line(c, [l, r], 32 * squeeze, '#000');
    pose.arms.forEach(a => line(c, [a.shoulder, a.elbow, a.wrist], 32 * squeeze, '#000'));
    c.globalCompositeOperation = 'source-over';
    c.fillStyle = '#ffffffbb'; c.font = '900 12px Trebuchet MS'; c.textAlign = 'center'; c.fillText('MAKE THE SHAPE', W / 2, 92);
    // A thick bevel gives the cutout its toy-foam look without a hard silhouette.
    c.globalCompositeOperation = 'source-atop'; c.strokeStyle = '#00000012'; c.lineWidth = 5; c.beginPath(); c.arc(pose.nose.x * W, pose.nose.y * H, span * .44 * squeeze + 2, 0, TAU); c.stroke(); c.globalCompositeOperation = 'source-over';
  }
  sparkles(c, verdict, age, reduced) {
    const n = verdict.rank === 'PERFECT' ? 22 : 10;
    c.save(); c.globalAlpha = Math.max(0, 1 - age);
    if (verdict.rank === 'PERFECT') { c.strokeStyle = '#fff5aa'; c.lineWidth = 4; c.beginPath(); c.arc(W / 2, H * .6, 35 + age * 170, 0, TAU); c.stroke(); }
    for (let i = 0; i < n; i++) { const a = i * 2.399, radius = reduced ? 110 : 70 + age * 190; const x = W / 2 + Math.cos(a) * radius, y = H * .6 + Math.sin(a) * radius; c.save(); c.translate(x, y); c.rotate(a + age); c.fillStyle = ['#fff9df', '#ffd52d', '#5cd7bb'][i % 3]; c.fillRect(-3, -7, 6, 14); c.fillRect(-7, -3, 14, 6); c.restore(); }
    c.restore();
  }
  crash(c, color, age, reduced) {
    c.save(); c.globalAlpha = Math.max(0, 1 - age * 1.1);
    for (let i = 0; i < 12; i++) { const x = (i % 4) * 110 - 20, y = Math.floor(i / 4) * 150 + 80, dx = (x - W / 2) * age * 1.6, dy = (y - H / 2) * age * 1.5 + age * age * 180; c.save(); c.translate(x + (reduced ? 0 : dx), y + (reduced ? 0 : dy)); c.rotate(reduced ? 0 : (i % 2 ? -1 : 1) * age * 2); c.fillStyle = color; c.beginPath(); c.moveTo(0, 0); c.lineTo(80, -12); c.lineTo(95, 55); c.lineTo(35, 92); c.closePath(); c.fill(); c.restore(); }
    c.restore();
  }
  frameGuide(c) {
    c.save(); c.strokeStyle = '#fffaf0'; c.lineWidth = 3; c.setLineDash([7, 7]); c.beginPath(); c.ellipse(W / 2, H * .53, 37, 43, 0, 0, TAU); c.stroke(); c.restore();
  }
}
