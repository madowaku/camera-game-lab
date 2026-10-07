import { CameraGameScene } from '../game-runtime/phaser/PhaserGameScene.js';
import aquarium from './assets/aquarium-v1.webp';
import fish from './assets/fish-v1.webp';
import { drawFishFace } from './face.js';

export class HumanFishScene extends CameraGameScene {
  constructor(view, services) { super('human-fish', services); this.view = view; }
  preload() { this.load.image('hf-aquarium', aquarium); this.load.image('hf-fish', fish); }
  create() {
    super.create();
    this.bg = this.add.image(0, 0, 'hf-aquarium').setOrigin(0);
    if (this.textures.exists('hf-avatar')) this.textures.remove('hf-avatar');
    this.faceTexture = this.textures.createCanvas('hf-avatar', 300, 200);
    this.fish = this.add.image(0, 0, 'hf-avatar').setDepth(8);
    this.water = this.add.graphics().setDepth(9); this.bubbles = this.add.graphics().setDepth(2);
    this.decor = this.add.graphics().setDepth(3); this.items = new Map(); this.text = this.add.text(0, 0, '', {
      fontFamily: 'Trebuchet MS, sans-serif', fontSize: '19px', fontStyle: 'bold', color: '#fff9de', stroke: '#07454b', strokeThickness: 5, align: 'center',
    }).setOrigin(.5).setDepth(12);
    this.lastFaceAt = -Infinity; this.view.sceneReady = true;
    const postRender = () => this.view.afterRender();
    this.game.events.on('postrender', postRender);
    this.cleanup.push(() => { this.game.events.off('postrender', postRender); this.view.sceneReady = false; });
    this.listen(this.gameEvents, 'HIT', e => this.fx.hit(e.x * this.scale.width, e.y * this.scale.height));
    this.listen(this.gameEvents, 'HIGHLIGHT', e => {
      if (e.kind === 'BREATH') { this.fx.shake('medium'); this.fx.hit(e.x * this.scale.width, this.scale.height * .16, { count: 14, color: 0xc3ffeb }); }
      if (e.kind === 'CAT_HIT') this.fx.shake('big');
    });
  }
  update(time, delta) {
    this.view.loop(time, Math.min(delta / 1000, .05));
    if (!this.view.active) return;
    const v = this.view, g = v.game, { width: w, height: h } = this.scale;
    this.fx.reducedMotion = this.reducedMotion = v.reducedMotion;
    this.tweens.timeScale = v.isPaused ? 0 : 1;
    const clock = g.elapsed + (v.ending || 0), anim = this.reducedMotion ? 0 : clock;
    this.bg.setDisplaySize(w, h * .935);
    const risk = g.oxygen <= 5 && g.phase === 'playing';
    this.bg.setScale(w / this.bg.width * (risk && !this.reducedMotion ? 1.035 : 1), h * .935 / this.bg.height * (risk && !this.reducedMotion ? 1.035 : 1));
    this.bg.setPosition(risk && !this.reducedMotion ? -w * .0175 : 0, h * .065 - (risk && !this.reducedMotion ? h * .0175 : 0));
    if (time - this.lastFaceAt > 65) {
      this.lastFaceAt = time;
      drawFishFace(this.faceTexture.context, this.textures.get('hf-fish').getSourceImage(), {
        video: v.video, face: v.inputLost ? null : v.packet?.face, mode: v.options.faceMode,
        oxygen: g.oxygen, open: v.open || clock - g.lastBite < .22, hide: v.source !== 'camera',
      }); this.faceTexture.refresh();
    }
    const float = !this.reducedMotion ? Math.sin(anim * 3) * h * .004 : 0;
    const breathAge = clock - g.lastBreath;
    const shake = !this.reducedMotion && breathAge < .45 ? Math.sin(breathAge * 95) * 4 : 0;
    const dead = g.phase === 'over';
    // The face, rather than the tail, is the collision/control anchor.
    const faceX = g.player.x * w, faceY = (dead ? Math.max(.17, g.player.y - v.ending * .32) : g.player.y) * h + float;
    const fw = w * .47, fh = fw * 2 / 3;
    this.fish.setDisplaySize(fw, fh).setPosition(faceX - fw * .335 + shake, faceY - fh * .025);
    this.fish.setRotation(dead && !this.reducedMotion ? -.18 : !this.reducedMotion ? Math.sin(anim * 2) * .025 : 0);
    this.bubbles.clear().lineStyle(Math.max(1, w * .003), 0xc1ffff, .55);
    for (let i = 0; i < 21; i++) {
      const x = ((i * .173 + .05) % 1) * w;
      const y = (.96 - ((anim * .07 + i * .149) % .79)) * h;
      this.bubbles.strokeCircle(x, y, (2 + i % 5) * w / 480);
    }
    // Small ambient fish make the tank feel alive without competing for input.
    this.decor.clear();
    for (let i = 0; i < 6; i++) {
      const x = ((anim * (i % 2 ? -.018 : .014) + i * .177 + 2) % 1) * w, y = (.32 + i * .073) * h;
      this.decor.fillStyle([0xf8b05e, 0xef7694, 0x92d9b0][i % 3], .55);
      this.decor.fillEllipse(x, y, 18 * w / 480, 9 * w / 480);
      this.decor.fillTriangle(x - 8 * w / 480, y, x - 15 * w / 480, y - 5 * w / 480, x - 15 * w / 480, y + 5 * w / 480);
    }
    const ids = new Set(g.items.map(item => item.id));
    for (const [id, group] of this.items) if (!ids.has(id)) { group.destroy(true); this.items.delete(id); }
    for (const item of g.items) {
      let group = this.items.get(item.id);
      if (!group) {
        const radius = item.kind === 'giant' ? 16 : item.kind === 'pearl' ? 12 : 10;
        const color = item.kind === 'shrimp' ? 0xff987d : item.kind === 'flake' ? 0xf6c770 : item.kind === 'gold' ? 0xffd24b : 0xfff5e4;
        const ring = this.add.circle(0, 0, radius + 7, color, .13).setStrokeStyle(1.5, color, .6);
        const bead = this.add.circle(0, 0, radius, color, 1).setStrokeStyle(2, 0xfff9e4, .7);
        const glint = this.add.circle(-radius * .27, -radius * .3, radius * .28, 0xffffff, .85);
        const label = this.add.text(0, radius + 11, item.kind === 'shrimp' ? '+3 SHRIMP' : item.kind === 'flake' ? '+1' : `+${item.kind === 'giant' ? 20 : item.kind === 'gold' ? 15 : 10}`, {
          fontFamily: 'Trebuchet MS, sans-serif', fontSize: '12px', fontStyle: 'bold', color: '#fff8de', stroke: '#0a434a', strokeThickness: 4,
        }).setOrigin(.5, 0);
        if (item.kind === 'shrimp') { bead.setScale(1.25, .6); bead.setRotation(-.5); }
        group = this.add.container(0, 0, [ring, bead, glint, label]).setDepth(5); this.items.set(item.id, group);
      }
      group.setPosition(item.x * w, item.y * h + Math.sin(anim * 2 + item.id) * (this.reducedMotion ? 0 : 3)).setScale(w / 480);
      group.setAlpha(v.game.phase === 'over' ? .4 : 1);
    }
    this.water.clear();
    const surfaceY = h * .125, splash = breathAge < 1 ? 1 - breathAge : 0;
    this.water.lineStyle(2, 0xd8ffff, .8);
    for (let i = 1; i <= 32; i++) {
      const px = (i - 1) / 32 * w, nx = i / 32 * w;
      const wave = x => surfaceY + (this.reducedMotion ? 0 : Math.sin(x / w * 17 + anim * 2) * 2 + Math.sin(x / w * 35 - anim * 9) * splash * 12);
      this.water.lineBetween(px, wave(px), nx, wave(nx));
    }
    if (splash > 0 && !this.reducedMotion) for (let i = 0; i < 9; i++) {
      this.water.fillStyle(0xdbffff, splash * .6).fillEllipse((g.player.x + Math.sin(i * 2.4) * .35 * (1 - splash)) * w, h * (.08 + (1 - splash) * .3 * Math.abs(Math.cos(i))), 4 + i % 3 * 3, 8 + i % 3 * 5);
    }
    if (g.cat) {
      const age = g.elapsed - g.cat.at, x = g.cat.x * w;
      if (age < 1) {
        this.water.fillStyle(0xffbd9e, .22).fillRoundedRect(x - w * .14, h * .11, w * .28, h * .19, 12);
        this.water.lineStyle(2, 0xffb193, .8).strokeRoundedRect(x - w * .14, h * .11, w * .28, h * .19, 12);
      } else {
        const reach = Math.sin(Math.min(1, (age - 1) / .85) * Math.PI);
        const y = h * (-.06 + reach * .30);
        this.water.fillStyle(0xe9c098, 1).fillRoundedRect(x - w * .05, -20, w * .1, y + 20, 15);
        this.water.fillEllipse(x, y, w * .17, h * .074);
        for (let i = -1; i <= 1; i++) this.water.fillEllipse(x + i * w * .047, y + h * .024, w * .057, h * .039);
        this.water.fillStyle(0xbe866d, 1).fillEllipse(x, y, w * .068, h * .026);
      }
    }
    const notice = v.notice && clock - v.notice.at < v.notice.duration ? v.notice.text : '';
    this.text.setText(notice).setPosition(w / 2, h * .40).setFontSize(Math.round(w * .045));
    if (risk) { this.water.fillStyle(0x022d40, .20).fillRect(0, 0, w, h); this.water.lineStyle(w * .025, 0x071f32, .35).strokeEllipse(w / 2, h / 2, w * 1.08, h * 1.07); }
  }
}
