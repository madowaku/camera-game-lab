import { CameraGameScene } from '../../game-runtime/phaser/PhaserGameScene.js';
import { W, H, R, HALF, THICKNESS, predictGuide } from '../../palmPong/core.js';

// Compatibility migration: tested swept front-face rules remain in core.js.
// Phaser owns the render clock, game objects, animation, FX and scene resources.
export class PalmPongScene extends CameraGameScene {
  constructor(view, services) { super('palm-pong', services); this.view = view; }
  create() {
    super.create();
    const { width, height } = this.scale; this.sx = width / W; this.sy = height / H;
    this.court = this.add.graphics(); this.guide = this.add.graphics(); this.trail = this.add.graphics();
    this.paddles = [0x2c9b7a, 0xd85440].map(color => this.add.rectangle(0, 0, THICKNESS * this.sx, HALF * 2 * this.sy, color).setStrokeStyle(2, 0xfffaf0));
    this.ball = this.add.circle(width / 2, height / 2, R * this.sx, 0xffcf3f).setStrokeStyle(3, 0xfffdf7);
    this.debugGraphics = this.add.graphics().setDepth(40);
    this.debugText = this.add.text(12, 12, '', { fontFamily: 'monospace', fontSize: '15px', color: '#ffffff', backgroundColor: '#14251fe6', padding: { x: 8, y: 6 } }).setDepth(41);
    this.debugEnabled = new URLSearchParams(location.search).get('debug') === '1';
    const key = event => { if (import.meta.env.DEV && event.code === 'KeyD' && !event.repeat && !/INPUT|TEXTAREA|SELECT/.test(event.target.tagName) && !event.ctrlKey && !event.metaKey && !event.altKey) this.debugEnabled = !this.debugEnabled; };
    window.addEventListener('keydown', key); this.cleanup.push(() => window.removeEventListener('keydown', key));
    this.started = false; this.ended = false;
    this.stablePoints = [{}, {}];
    this.listen(this.gameEvents, 'HIT', e => { this.fx.hit(e.x, e.y); this.fx.score(e.x, e.y - 25, 1); this.fx.shake(); });
    this.listen(this.gameEvents, 'COMBO', e => { this.fx.combo(this.scale.width / 2, this.scale.height * .3, e.count); if (e.count >= 10) { this.fx.confetti(this.scale.width / 2, this.scale.height / 2); this.fx.flash(); } });
    this.listen(this.gameEvents, 'WALL_BOUNCE', e => this.fx.hit(e.x, e.y, { count: 3 }));
  }
  update(time) {
    this.view.loop(time);
    if (!this.view.active) return;
    const game = this.view.game, { width, height } = this.scale;
    this.sx = width / W; this.sy = height / H;
    this.fx.reducedMotion = this.reducedMotion = this.view.reducedMotion;
    this.tweens.timeScale = game.paused ? 0 : 1;
    if (!this.started && game.elapsed > 0) { this.started = true; this.startGame({ roundId: game.roundId }); }
    if (!this.ended && game.result) { this.ended = true; this.endGame({ result: game.result, roundId: game.roundId }); }
    const c = this.court.clear(), camera = this.view.source === 'camera';
    c.fillStyle(0xe0eddf, camera ? .10 : 1).fillRect(0, 0, width / 2, height);
    c.fillStyle(0xf9e1d3, camera ? .10 : 1).fillRect(width / 2, 0, width / 2, height);
    c.lineStyle(2, 0xfffdf4, .85).strokeRect(1, 1, width - 2, height - 2);
    c.lineBetween(width / 2, 0, width / 2, height);
    for (const side of [0, 1]) c.lineStyle(1, side ? 0xd85440 : 0x2c9b7a, .3).strokeRect((side ? .58 : .10) * width, .17 * height, .32 * width, .66 * height);
    const input = this.inputBridge.sample(time);
    const stable = this.stablePoints;
    for (let i = 0; i < 2; i++) {
      const p = i ? input.rightHand : input.leftHand, point = stable[i];
      point.x = p?.visible ? p.x * W : game.paddles[i].x;
      point.y = p?.visible ? p.y * H : game.paddles[i].y;
      point.present = !!p?.visible; point.continuous = p?.continuous;
    }
    const visual = this.view.paddleFeel.update(stable, game.paused ? 0 : this.view.renderDt);
    this.view.feelDebug = this.debugEnabled ? {
      raw: this.view.source === 'camera' ? this.view.input.tracker.debugSample(time).raw : stable,
      stable, feel: visual, variant: this.view.paddleFeel.variant,
    } : null;
    this.paddles.forEach((object, i) => {
      const p = visual[i], fallback = game.paddles[i];
      object.setSize(THICKNESS * this.sx, HALF * 2 * this.sy);
      object.setPosition(p?.present ? p.x * this.sx : fallback.x * this.sx, p?.present ? p.y * this.sy : fallback.y * this.sy).setAlpha(p?.present ? fallback.active ? 1 : .55 : .25);
    });
    this.ball.setRadius(R * this.sx).setPosition(game.ball.x * this.sx, game.ball.y * this.sy);
    const age = game.clock - (game.lastHit?.at ?? -100), squash = !this.reducedMotion && age < .14 ? Math.sin(Math.max(0, age) / .14 * Math.PI) * .25 : 0;
    this.ball.setScale(1 - squash, 1 + squash);
    this.trail.clear();
    if (!this.reducedMotion) game.trail.forEach((p, i) => this.trail.fillStyle(0xedb521, i / game.trail.length * .3).fillCircle(p.x * this.sx, p.y * this.sy, R * this.sx * .65));
    this.guide.clear();
    if (this.view.guide) {
      const prediction = predictGuide(game); this.guide.lineStyle(2, 0x806f56, .3);
      prediction.points.forEach((p, i, points) => { if (i) this.guide.lineBetween(points[i - 1].x * this.sx, points[i - 1].y * this.sy, p.x * this.sx, p.y * this.sy); });
      if (prediction.target) this.guide.strokeCircle(prediction.target.x * this.sx, prediction.target.y * this.sy, 15);
    }
    this.debugText.setVisible(this.debugEnabled); this.debugGraphics.clear();
    if (this.debugEnabled) {
      const { raw, stable, feel, variant } = this.view.feelDebug;
      const coordinates = points => points.map(p => p?.present ? `${p.x.toFixed(2)},${p.y.toFixed(2)}` : 'LOST').join(' | ');
      this.debugText.setText(`FPS ${Math.round(this.game.loop.actualFps)}  INFERENCE ${this.view.input.tracker.fps.toFixed(1)}\nINPUT ${this.view.source.toUpperCase()}  FEEL ${variant}\nRAW    ${coordinates(raw)}\nSTABLE ${coordinates(stable)}\nFEEL   ${coordinates(feel)}\nOBJECTS ${this.children.length}  FX ${this.fx.pool.activeCount}/${this.fx.pool.size}`);
      for (const [points, color, radius] of [[raw, 0xffaa55, 6], [stable, 0x00ffff, 9], [feel, 0xff77dd, 12]]) {
        this.debugGraphics.lineStyle(2, color, .9);
        for (const p of points) if (p?.present) this.debugGraphics.strokeCircle(p.x * this.sx, p.y * this.sy, radius);
      }
      this.debugGraphics.lineStyle(1, 0x00ffff, .8).strokeRect(width * .1, height * .17, width * .8, height * .66);
      for (const hand of [input.leftHand, input.rightHand]) if (hand?.visible) {
        this.debugGraphics.strokeCircle(hand.x * width, hand.y * height, 8);
        this.debugGraphics.lineBetween(hand.x * width, hand.y * height, (hand.x + hand.velocityX * .1) * width, (hand.y + hand.velocityY * .1) * height);
      }
      for (const p of this.paddles) this.debugGraphics.strokeRect(p.x - p.width / 2, p.y - p.height / 2, p.width, p.height);
      this.debugGraphics.strokeCircle(this.ball.x, this.ball.y, R * this.sx);
    }
  }
}
