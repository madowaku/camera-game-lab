import { CameraGameScene } from '../game-runtime/phaser/PhaserGameScene.js';
import atlas from './assets/spirits-v1.webp';
import { SIZE, TAU, RULES } from './core.js';

export class MaruScene extends CameraGameScene {
  constructor(view, services) { super('maru-magic', services); this.view = view; }
  preload() { this.load.image('maru-spirits', atlas); }
  create() {
    super.create(); this.ink = this.add.graphics(); this.sparks = this.add.graphics();
    const texture = this.textures.get('maru-spirits'), img = texture.getSourceImage();
    for (let i = 0; i < 4; i++) if (!texture.has(String(i))) texture.add(String(i), 0, (i % 2) * img.width / 2, Math.floor(i / 2) * img.height / 2, img.width / 2, img.height / 2);
    this.spirit = this.add.image(0, 0, 'maru-spirits', '0').setVisible(false);
    this.listen(this.gameEvents, 'HIGHLIGHT', e => { if (e.tier >= 2) this.fx.confetti(this.scale.width / 2, this.scale.height / 2); });
    this.view.sceneReady = true; this.cleanup.push(() => { this.view.sceneReady = false; });
  }
  update(time) {
    const v = this.view; v.loop(time); if (!v.active) return;
    const g = v.game, w = this.scale.width, h = this.scale.height, sx = w / SIZE, sy = h / SIZE, reduced = v.reducedMotion;
    this.fx.reducedMotion = reduced; this.ink.clear(); this.sparks.clear();
    const ink = this.ink, points = v.visualPoints;
    const line = (color, width, alpha) => { ink.lineStyle(width, color, alpha); ink.beginPath(); points.forEach((p, i) => i ? ink.lineTo(p.x * sx, p.y * sy) : ink.moveTo(p.x * sx, p.y * sy)); ink.strokePath(); };
    if (points.length > 1) { line(0xecc276, 13 * sx, .1); line(0xf4d994, 6 * sx, .35); line(0xffebbc, 2.5 * sx, 1); }
    if (g.phase === 'ready' && !v.tip) {
      ink.lineStyle(1, 0xf1d79b, .25);
      for (let i = 0; i < 48; i++) { const a = i * TAU / 48; ink.lineBetween(w / 2 + Math.cos(a) * w * .29, h / 2 + Math.sin(a) * h * .29, w / 2 + Math.cos(a + .055) * w * .29, h / 2 + Math.sin(a + .055) * h * .29); }
    }
    if (points[0] && g.phase === 'drawing') { ink.lineStyle(1.5, 0xb3efdd, .8).strokeCircle(points[0].x * sx, points[0].y * sy, 11 * sx); }
    if (v.tip && !g.paused) {
      const x = v.tip.x * sx, y = v.tip.y * sy;
      ink.fillStyle(0xfff5d9).fillCircle(x, y, 4 * sx);
      if (g.phase === 'ready' && v.source === 'camera' && !g.startExclusion) {
        const progress = g.armed ? 1 : Math.min(1, Math.max(0, (performance.now() - (g.anchorAt ?? performance.now())) / RULES.holdMs));
        ink.lineStyle(2 * sx, 0xeecb8d, .25).strokeCircle(x, y, 24 * sx);
        if (progress > 0) { ink.lineStyle(4 * sx, g.armed ? 0xacedd0 : 0xffe4a3, 1); ink.beginPath(); ink.arc(x, y, 24 * sx, -Math.PI / 2, -Math.PI / 2 + progress * TAU, false); ink.strokePath(); }
        if (g.armed) ink.lineStyle(1, 0xacedd0, .45).strokeCircle(x, y, 31 * sx);
      } else ink.lineStyle(1, 0xeecb8d, .7).strokeCircle(x, y, 10 * sx);
    }
    const summoned = g.phase === 'summoned'; this.spirit.setVisible(summoned);
    if (summoned) {
      const age = Math.max(0, time - v.summonedAt), tier = g.result.spirit, p = reduced ? 1 : Math.min(1, age / 600);
      const circle = g.result.circle, cx = Math.max(w * .3, Math.min(w * .7, (circle?.x ?? 300) * sx)), cy = Math.max(h * .32, Math.min(h * .63, (circle?.y ?? 300) * sy));
      const scale = reduced ? 1 : 1 + Math.sin(Math.PI * p) * .1;
      this.spirit.setFrame(String(tier)).setPosition(cx, cy + (reduced || g.paused ? 0 : Math.sin(age / 500) * 5 * sx)).setDisplaySize(w * .52 * p * scale, w * .52 * p * scale).setAlpha(Math.min(1, p * 2));
      this.spirit.setRotation(reduced || g.paused ? 0 : Math.sin(age / (tier === 0 ? 140 : 800)) * (tier === 0 && age < 700 ? .10 : .035));
      if (tier >= 2) {
        const spin = reduced || g.paused ? 0 : age / 6000;
        this.sparks.lineStyle(1.3, tier === 3 ? 0xfff6d3 : 0xffd272, .6).strokeCircle(cx, cy, w * .29);
        for (let i = 0; i < (tier === 3 ? 16 : 8); i++) { const a = i * TAU / (tier === 3 ? 16 : 8) + spin; const r = w * .31; this.sparks.fillStyle(0xffe4a3, .75).fillCircle(cx + Math.cos(a) * r, cy + Math.sin(a) * r, (tier === 3 ? 3 : 2) * sx); }
      }
    }
  }
}
