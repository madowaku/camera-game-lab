import { CameraGameScene } from '../game-runtime/phaser/PhaserGameScene.js';
import atlas from './assets/weapons.webp';
import { SIGNS, impactTime } from './core.js';
const clamp = v => Math.max(0, Math.min(1, v));
const ease = v => 1 - (1 - clamp(v)) ** 3;
const colors = { ROCK: 0xff9545, SCISSORS: 0x5aeeff, PAPER: 0xffda63 };
export class BoomScene extends CameraGameScene {
  constructor(view, services) { super('rock-paper-boom', services); this.view = view; }
  preload() { this.load.image('rpb-weapons', atlas); }
  create() {
    super.create();
    const texture = this.textures.get('rpb-weapons'), image = texture.getSourceImage(), size = image.width / 3;
    SIGNS.forEach((sign, i) => { if (!texture.has(sign)) texture.add(sign, 0, i * size, 0, size, image.height); });
    this.art = [0, 1].map(() => this.add.image(0, 0, 'rpb-weapons', 'ROCK').setDepth(5).setVisible(false));
    this.lines = this.add.graphics().setDepth(6); this.background = this.add.graphics().setDepth(1);
    this.lastRound = 0; this.hit = false;
  }
  update(time) {
    this.view.loop(time);
    if (!this.view.active) return;
    const g = this.view.game, r = g.result, { width: w, height: h } = this.scale, reduced = this.view.reducedMotion;
    this.fx.reducedMotion = reduced; this.tweens.timeScale = g.paused ? 0 : 1;
    const lines = this.lines.clear(), bg = this.background.clear();
    this.art.forEach(o => o.setVisible(false));
    if (!r || !['freeze', 'boom', 'result', 'again'].includes(g.phase)) { this.hit = false; return; }
    const winnerX = r.winner === 2 ? .75 : .25, cy = h * .5, color = colors[r.sign];
    if (g.phase === 'freeze') {
      const pulse = .10 + .12 * clamp(g.age / .5);
      bg.fillStyle(0xffd66a, pulse).fillCircle(w * winnerX, cy, w * .4);
      if (!r.winner) bg.fillCircle(w * .75, cy, w * .4);
      return;
    }
    const t = g.phase === 'boom' ? g.age : 2.2;
    if (r.round !== this.lastRound) { this.lastRound = r.round; this.hit = false; }
    const impact = impactTime(r);
    const attack = ease((t - .1) / impact), damage = clamp((t - impact) / .65);
    bg.fillStyle(color, .05 + .06 * (1 - damage)).fillRect(0, 0, w, h);
    for (const side of [0, 1]) {
      const sign = side ? r.p2 : r.p1, sprite = this.art[side], wins = r.winner === side + 1, start = side ? .78 : .22;
      let x = start, y = .50, size = .44, alpha = 1, angle = side ? -12 : 12;
      if (!r.winner) {
        x = start + ((side ? .57 : .43) - start) * attack;
        if (t > impact) { x += (side ? 1 : -1) * damage * .4; y += damage * .23; angle += (side ? 1 : -1) * damage * 75; alpha = 1 - damage; }
      } else if (wins) {
        x = start + ((side ? .30 : .70) - start) * attack;
        size += r.sign === 'PAPER' ? attack * .38 : attack * .2;
        if (r.sign === 'SCISSORS') { angle += (side ? 1 : -1) * attack * 65; y -= .08 * attack; }
        if (t > 1.6) alpha = 1 - clamp((t - 1.6) / .6);
      } else {
        if (r.sign === 'PAPER') { size *= 1 - damage; alpha = 1 - damage; }
        else { x += (side ? 1 : -1) * damage * .3; y += damage * .22; angle += (side ? 1 : -1) * damage * 110; alpha = 1 - damage; }
      }
      if (reduced) { x = start; y = .5; size = .47; angle = 0; alpha = wins || !r.winner ? 1 : .4; }
      sprite.setFrame(sign).setVisible(alpha > .01).setPosition(x * w, y * h).setDisplaySize(size * w, size * w).setAngle(angle).setAlpha(alpha);
    }
    if (t >= impact && !this.hit) {
      this.hit = true;
      this.fx.hit(w * .5, cy, { count: reduced ? 0 : 22, color }); this.fx.shake('big');
      if (!reduced) this.cameras.main.flash(110, 255, 230, 172);
    }
    if (t < impact || reduced) return;
    const burst = clamp((t - impact) / .8), fade = 1 - clamp((t - impact) / 1.3);
    // Deterministic particles: no unbounded allocation or second animation clock.
    for (let i = 0; i < 38; i++) {
      const a = i * 2.39996, radius = w * (.08 + burst * (.6 + (i % 5) / 10));
      const x = w * .5 + Math.cos(a) * radius, y = cy + Math.sin(a) * radius * 1.3;
      lines.lineStyle(i % 3 ? 2 : 5, i % 4 ? color : 0xffffff, fade);
      lines.lineBetween(x, y, x + Math.cos(a) * w * .09, y + Math.sin(a) * w * .09);
    }
    lines.lineStyle(4, color, fade).strokeCircle(w * .5, cy, w * (.07 + burst * .8));
    if (r.sign === 'ROCK') {
      for (let i = 0; i < 7; i++) {
        const a = i * .8976, x = w * .5 + Math.cos(a) * w * .48, y = cy + Math.sin(a) * h * .36;
        lines.lineStyle(2, 0xfdf4df, fade * .7); lines.beginPath(); lines.moveTo(w * .5, cy);
        lines.lineTo(w * .5 + Math.cos(a + .13) * w * .26, cy + Math.sin(a + .13) * h * .17); lines.lineTo(x, y); lines.strokePath();
      }
    } else if (r.sign === 'SCISSORS') {
      for (let i = 0; i < (r.winner ? 1 : 5); i++) {
        const offset = (i - (r.winner ? 0 : 2)) * h * .10;
        lines.lineStyle(17, 0x3ce2f5, fade * .2).lineBetween(0, h * .70 + offset, w, h * .30 + offset);
        lines.lineStyle(4, 0xebffff, fade).lineBetween(0, h * .70 + offset, w, h * .30 + offset);
      }
      if (!r.winner && t > 1.05 && t < 1.18) lines.fillStyle(0x070b11, .97).fillRect(0, 0, w, h);
    } else {
      for (let i = 0; i < 52; i++) {
        const x = ((i * .618 + burst * (i % 2 ? .14 : -.14)) % 1 + 1) % 1;
        const y = ((i * .371 + (t - impact) * (.27 + i % 4 * .08)) % 1 + 1) % 1;
        lines.fillStyle([0xffd35a, 0x62eff5, 0xff8557, 0xffffff][i % 4], fade).fillRect(x * w, y * h, 4 + i % 5, 9 + i % 7);
      }
    }
  }
}
