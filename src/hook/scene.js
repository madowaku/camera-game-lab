import { CameraGameScene } from '../game-runtime/phaser/PhaserGameScene.js';
import { fishArt } from './assets.js';

export class HookScene extends CameraGameScene {
  constructor(view, services) { super('hook-fishing', services); this.view = view; }
  preload() { for (const [id, url] of Object.entries(fishArt)) this.load.image(`hook-${id}`, url); }
  create() {
    super.create(); this.ocean = this.add.graphics(); this.water = this.add.graphics().setDepth(5);
    this.line = this.add.graphics().setDepth(7); this.bubbles = this.add.graphics().setDepth(6);
    this.fish = this.add.image(0, 0, 'hook-AJI').setDepth(4); this.float = this.add.container(0, 0, [
      this.add.ellipse(0, 0, 14, 26, 0xff695c), this.add.ellipse(0, 4, 14, 14, 0xfff6d9), this.add.rectangle(0, -21, 2, 20, 0x123d42),
    ]).setDepth(8);
    this.hand = this.add.graphics().setDepth(9); this.ambient = [];
    for (let i = 0; i < 8; i++) this.ambient.push(this.add.image(0, 0, 'hook-AJI').setTint(0x0c6f83).setAlpha(.24).setDepth(1));
    this.view.sceneReady = true;
    const capture = () => this.view.afterRender(); this.game.events.on('postrender', capture);
    this.cleanup.push(() => { this.game.events.off('postrender', capture); this.view.sceneReady = false; });
    this.listen(this.gameEvents, 'HIT', e => this.fx.bigHit(e.x * this.scale.width, e.y * this.scale.height));
    this.listen(this.gameEvents, 'HIGHLIGHT', e => {
      if (e.kind === 'LANDING') { this.fx.hit(this.scale.width * .5, this.scale.height * .68, { count: 20, color: 0xc5ffed }); this.fx.shake('big'); }
      if (e.kind === 'CATCH') this.fx.confetti(this.scale.width * .5, this.scale.height * .4);
    });
  }
  update(time, delta) {
    const v = this.view; v.loop(time, Math.min(delta / 1000, .05)); if (!v.active) return;
    const g = v.game, { width: w, height: h } = this.scale, t = g.elapsed;
    this.fx.reducedMotion = v.reducedMotion; this.tweens.timeScale = v.isPaused ? 0 : 1;
    const anim = v.reducedMotion ? 0 : t;
    const surface = h * .65;
    this.ocean.clear().fillStyle(0x167e97, .86).fillRect(0, surface, w, h - surface);
    this.ocean.fillStyle(0x064b68, .36).fillRect(0, h * .82, w, h * .18);
    this.ocean.fillStyle(0x74dccc, .2).fillRect(0, surface, w, h * .08);
    this.water.clear();
    for (let j = 0; j < 4; j++) {
      this.water.lineStyle(j ? 1 : 3, j ? 0x9cefe7 : 0xe4ffea, j ? .24 : .95);
      for (let i = 0; i < 40; i++) {
        const wave = x => surface + j * h * .016 + Math.sin(x / w * 15 + anim * 2.1 + j) * (j ? 3 : 5);
        this.water.lineBetween(i * w / 40, wave(i * w / 40), (i + 1) * w / 40, wave((i + 1) * w / 40));
      }
    }
    for (let i = 0; i < this.ambient.length; i++) {
      this.ambient[i].setVisible(g.fever || i < 3).setPosition(((i * .24 + anim * .035 * (i % 2 ? -1 : 1) + 3) % 1) * w, h * (.75 + (i % 3) * .07));
      this.ambient[i].setDisplaySize(w * .16, w * .095).setFlipX(i % 2 === 1);
    }
    this.bubbles.clear().lineStyle(1, 0xb7ffef, .34);
    for (let i = 0; i < 12; i++) this.bubbles.strokeCircle(((i * .183) % 1) * w, h * (.97 - ((anim * .035 + i * .07) % .31)), 2 + i % 4);
    const phase = g.phase, showFish = ['wait', 'bite', 'fight', 'landing', 'catch'].includes(phase);
    const threeVisible = v.three.render({ phase, age: g.age, fish: g.fish, paused: v.isPaused, now: time });
    this.fish.setVisible(showFish && !(phase === 'landing' && threeVisible));
    if (g.fish) {
      this.fish.setTexture(`hook-${g.fish.id}`);
      const image = this.textures.get(`hook-${g.fish.id}`).getSourceImage();
      let fw = w * (g.fish.id === 'TUNA' ? .52 : .38), x = g.fishX * w, y = h * .78;
      let alpha = ['wait', 'bite'].includes(phase) ? .4 : 1, rotation = 0;
      if (phase === 'wait') { y += Math.sin(anim * 4) * h * .02; rotation = Math.sin(anim * 5) * .08; }
      if (phase === 'fight') { y += Math.sin(anim * (g.behavior === 'warning' ? 26 : 6)) * h * .01; rotation = Math.sin(anim * 10) * .1; }
      if (phase === 'landing') { const p = Math.min(1, g.age / 1.15); x = w * .5; y = h * (.72 - Math.sin(p * Math.PI) * .38); fw = w * (.35 + Math.sin(p * Math.PI) * .65); }
      if (phase === 'catch') { x = (v.source === 'camera' && v.motion?.hand ? Math.max(.25, Math.min(.75, v.motion.hand.x)) : .5) * w; y = (v.source === 'camera' && v.motion?.hand ? Math.max(.30, Math.min(.54, v.motion.hand.y)) : .43) * h; fw = Math.min(w * .73, h * .29 * image.width / image.height); }
      this.fish.setDisplaySize(fw, fw * image.height / image.width).setPosition(x, y).setRotation(v.reducedMotion ? 0 : rotation).setFlipX(phase === 'fight' && g.direction > 0).setAlpha(alpha);
    }
    const hand = v.source === 'camera' ? v.motion?.hand : { x: .5 + v.pull * .18, y: .45 };
    this.hand.clear();
    if (hand && !v.inputLost && phase !== 'catch') {
      this.hand.lineStyle(2, 0xffed9d, .85).strokeCircle(hand.x * w, hand.y * h, w * .028);
      this.hand.fillStyle(0xffed9d, .9).fillCircle(hand.x * w, hand.y * h, 3);
    }
    const castP = phase === 'cast' ? Math.min(1, g.age / .45) : 1;
    const nibbleAge = g.age - g.waitFor * .42;
    const nibble = phase === 'wait' && g.fakeDone && nibbleAge >= 0 && nibbleAge < .26 ? Math.sin(nibbleAge / .26 * Math.PI) * h * .012 : 0;
    const floatX = w * .5, floatY = phase === 'cast' ? h * (.42 + .23 * castP - Math.sin(castP * Math.PI) * .20) : surface + Math.sin(anim * 5) * 3 + nibble + (phase === 'bite' ? h * .04 : 0);
    this.float.setVisible(['cast', 'wait', 'bite'].includes(phase)).setPosition(floatX, floatY).setScale(w / 480);
    this.line.clear();
    if (hand && ['cast', 'wait', 'bite', 'fight'].includes(phase)) {
      const fishY = phase === 'fight' ? h * .78 : floatY;
      this.line.lineStyle(1.6, g.tension > .84 ? 0xff7563 : 0xfff7d5, .9);
      const hx = hand.x * w, hy = hand.y * h, fx = phase === 'fight' ? g.fishX * w : floatX;
      for (let i = 0; i < 16; i++) {
        const p = i / 16, q = (i + 1) / 16;
        const lx = s => hx + (fx - hx) * s + (v.reducedMotion ? 0 : Math.sin(s * 14 + anim * 30) * Math.sin(s * Math.PI) * (phase === 'fight' ? 3 : .7));
        this.line.lineBetween(lx(p), hy + (fishY - hy) * p, lx(q), hy + (fishY - hy) * q);
      }
    }
    if (time - (v.lastHudAt || 0) > 65) { v.lastHudAt = time; v.render(); }
  }
}
