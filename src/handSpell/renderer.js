import { W, H, GLYPHS, ALL_SPELLS, clamp } from './core.js';
import { drawCamera } from '../creator/CameraLayout.js';
import dragonUrl from './assets/dragon-v1.webp';
import enemyUrl from './assets/enemy-v1.webp';

const TAU = Math.PI * 2;
const ease = t => 1 - (1 - clamp(t, 0, 1)) ** 3;
export class HandSpellRenderer {
  constructor(canvas) {
    this.canvas = canvas; this.ctx = canvas.getContext('2d');
    this.dragon = new Image(); this.dragon.src = dragonUrl; this.enemy = new Image(); this.enemy.src = enemyUrl;
    this.fx = { glow: 0, punch: 0, lock: 0 }; this.lastLock = ''; this.wall = 0;
  }
  text(text, x, y, size = 26, color = '#fff7e7', align = 'center', weight = 900) {
    const c = this.ctx; c.save(); c.font = `${weight} ${size}px "Arial Black", "Segoe UI", sans-serif`; c.textAlign = align; c.textBaseline = 'middle'; c.fillStyle = color;
    c.shadowColor = '#070313'; c.shadowBlur = 7; c.fillText(text, x, y); c.restore();
  }
  circle(x, y, r, color, width = 2) { const c = this.ctx; c.strokeStyle = color; c.lineWidth = width; c.beginPath(); c.arc(x, y, r, 0, TAU); c.stroke(); }
  ring(x, y, r, t, color, tilt = .68, power = 1) {
    const c = this.ctx; c.save(); c.translate(x, y); c.scale(1, tilt); c.rotate(t); c.globalAlpha = power; c.shadowColor = color; c.shadowBlur = 12;
    this.circle(0, 0, r, color, 2); this.circle(0, 0, r * .88, color, 1); this.circle(0, 0, r * .7, color, 1);
    c.beginPath(); for (let i = 0; i < 6; i++) { const a = i * TAU / 6; c.moveTo(Math.cos(a) * r * .69, Math.sin(a) * r * .69); c.lineTo(Math.cos(a + TAU / 3) * r * .69, Math.sin(a + TAU / 3) * r * .69); } c.stroke();
    for (let i = 0; i < 18; i++) { const a = i * TAU / 18; c.save(); c.rotate(a); c.translate(0, -r * .79); c.beginPath(); c.moveTo(-3, -4); c.lineTo(3, 0); c.lineTo(-3, 5); c.moveTo(0, 0); c.lineTo(0, 7); c.stroke(); c.restore(); }
    c.restore();
  }
  image(img, x, y, size, rotation = 0) { if (!img.complete || !img.naturalWidth) return; const c = this.ctx; c.save(); c.translate(x, y); c.rotate(rotation); c.drawImage(img, -size / 2, -size / 2, size, size); c.restore(); }
  draw(g, { video, source, faceMode = 'ORIGINAL', face, hands = [], now = 0, reducedMotion = false, coach = '', lock = '', gateProgress = 0, tutorialLabel = '' } = {}) {
    const c = this.ctx, t = reducedMotion || g.paused ? g.elapsed / 1000 : now / 1000, scene = g.scene;
    const age = Math.max(0, g.elapsed - g.sceneAt), isCast = scene === 'cast' || scene === 'tutorial-cast';
    const outcome = ALL_SPELLS.find(s => s.id === g.outcome), color = outcome?.color ?? g.target.color;
    c.clearRect(0, 0, W, H); c.fillStyle = '#110c25'; c.fillRect(0, 0, W, H); c.save();
    if (!reducedMotion && isCast && age < 600 && g.outcome !== 'POTATO' && g.outcome !== 'SAD_SMOKE') { const a = (1 - age / 600) * 6; c.translate(Math.sin(age * .027) * a, Math.cos(age * .019) * a); }
    if (source === 'camera' && faceMode !== 'HIDE') {
      drawCamera(c, video, W, H);
      if (faceMode === 'EFFECT') {
        if (face) { c.save(); c.translate(face.x, face.y); c.fillStyle = '#1d1338'; c.beginPath(); c.ellipse(0, 0, Math.max(50, face.width * .65), Math.max(60, face.height * .72), 0, 0, TAU); c.fill(); this.text('✦', 0, 0, 70, '#d5ff78'); c.restore(); }
        else { c.fillStyle = '#110c25'; c.fillRect(0, 0, W, H); }
      }
      const shade = c.createLinearGradient(0, 0, 0, H); shade.addColorStop(0, '#110c25dd'); shade.addColorStop(.4, '#110c2528'); shade.addColorStop(1, '#110c25ef'); c.fillStyle = shade; c.fillRect(0, 0, W, H);
    } else {
      const bg = c.createRadialGradient(270, 390, 30, 270, 500, 660); bg.addColorStop(0, '#3c2353'); bg.addColorStop(.5, '#201536'); bg.addColorStop(1, '#100b21'); c.fillStyle = bg; c.fillRect(0, 0, W, H);
      c.save(); c.globalAlpha = .13; this.ring(270, 565, 256, t * .04, '#bfa0ff', 1); c.restore();
      for (let i = 0; i < 35; i++) { const x = (i * 173.7) % W, y = (i * 127.2 + (reducedMotion ? 0 : t * (8 + i % 5))) % H; c.fillStyle = i % 3 ? '#bba2ff44' : '#ffc96d66'; c.fillRect(x, y, 2, 2); }
    }
    if (scene !== 'charge' && scene !== 'tutorial-charge') {
      let enemySize = 215, enemyY = 260 + (reducedMotion ? 0 : Math.sin(t * 2) * 7), rotation = 0;
      if (scene === 'enemy') enemySize *= ease(g.elapsed / 850);
      const success = g.outcome === g.target.id || scene === 'tutorial-cast';
      const frozenEnemy = g.outcome === 'ABSOLUTE_ZERO' && (isCast || scene === 'reaction');
      if (isCast && success && !frozenEnemy) { const p = ease((age - 230) / 650); enemyY -= p * 550; enemySize *= 1 - p * .85; rotation = p * 3; }
      if (scene === 'reaction' && success && !frozenEnemy) enemySize = 0;
      if (frozenEnemy) { enemyY = 260; c.filter = 'grayscale(1) sepia(.4) hue-rotate(150deg)'; }
      this.image(this.enemy, 270, enemyY, enemySize, rotation); c.filter = 'none';
      if (frozenEnemy) { c.fillStyle = '#a6eaff33'; c.strokeStyle = '#c9f4ff'; c.lineWidth = 2; c.beginPath(); c.moveTo(179, 161); c.lineTo(356, 150); c.lineTo(366, 351); c.lineTo(188, 366); c.closePath(); c.fill(); c.stroke(); c.beginPath(); c.moveTo(179, 161); c.lineTo(220, 224); c.lineTo(196, 245); c.lineTo(237, 310); c.stroke(); }
      if (g.outcome && !success && (isCast || scene === 'reaction')) this.text('…………', 270, 360, 22, '#d5ff78');
      if (scene === 'enemy' || scene === 'memorize') { this.ring(270, 307, 96, -t * .5, '#c9ff6c', .34, .55); this.text('DARK MAGE', 270, 380, 14, '#c1b8d5'); }
    }
    const count = Math.min(3, g.signs.length), ringHands = hands.length ? hands : [{ x: 270, y: 650 }];
    for (const hand of ringHands) {
      for (let i = 0; i < count; i++) this.ring(hand.x, hand.y - i * 22, 71 + i * 23 + this.fx.lock * 10, t * (.65 + i * .2) * (i % 2 ? -1 : 1), g.target.color, .7, .7 + i * .1);
      if (!count && source === 'camera' && hand.sign) this.circle(hand.x, hand.y, 56, '#d5ff7866', 2);
      if (gateProgress > 0) { c.save(); c.strokeStyle = '#e5ff94'; c.lineWidth = 5; c.beginPath(); c.arc(hand.x, hand.y, 62, -Math.PI / 2, -Math.PI / 2 + gateProgress * TAU); c.stroke(); c.restore(); }
    }
    if (count === 3 && face) this.ring(face.x, face.y, Math.max(90, face.width), t * .4, g.target.color, 1, .35);
    if (scene === 'charge' || scene === 'tutorial-charge') {
      const p = clamp(age / 850, 0, 1); c.fillStyle = `rgba(27,10,47,${.3 + p * .5})`; c.fillRect(0, 0, W, H);
      for (let i = 0; i < 3; i++) this.ring(270, 510 - i * 35, 120 + p * 155 + i * 20 + this.fx.glow * 20, t * (i % 2 ? 3 : -3), '#ffdf99', .8, .8);
      if (!reducedMotion) { c.strokeStyle = '#ffe2a277'; c.lineWidth = 2; for (let i = 0; i < 25; i++) { const a = i * TAU / 25; c.beginPath(); c.moveTo(270 + Math.cos(a) * (280 - p * 160), 510 + Math.sin(a) * (450 - p * 200)); c.lineTo(270 + Math.cos(a) * 520, 510 + Math.sin(a) * 720); c.stroke(); } }
      this.text(`${scene === 'tutorial-charge' ? 'DRAGON' : g.target.name.split(' ')[0]}…`, 270, 495, 45, '#fff2cf');
    }
    if (isCast || scene === 'reaction') this.spell(g.outcome, isCast ? age : 2150 + age, t, reducedMotion);
    c.restore();
    c.fillStyle = '#0b071dbb'; c.fillRect(0, 0, W, 96);
    this.text('HAND SPELL', 26, 35, 18, '#f7eacb', 'left'); this.text(g.phase === 'tutorial' ? 'COPY THIS' : `${Math.ceil((15000 - g.elapsed) / 1000)} SEC`, 513, 35, 18, '#d5ff78', 'right');
    this.text(g.phase === 'tutorial' ? tutorialLabel : g.target.name, 26, 71, 13, '#c3b1d8', 'left', 700);
    this.text(`${g.signs.length} / ${g.phase === 'tutorial' ? g.tutorialSigns.length : 3}`, 513, 71, 16, '#ffdf99', 'right');
    let heading = '', sub = '';
    if (scene === 'enemy') { heading = 'CAN YOU CAST THIS?'; sub = 'THE CHALLENGE BEGINS'; }
    if (scene === 'memorize') { heading = 'REMEMBER'; sub = '3 SIGNS. ONE SPELL.'; }
    if (scene === 'tutorial') heading = 'COPY THIS';
    if (['input', 'release', 'tutorial-release'].includes(scene)) { heading = g.released ? 'SPELL ARMED' : count === 3 || scene.includes('release') ? 'RELEASE!' : 'YOUR TURN'; sub = g.released ? 'WAIT FOR THE REVEAL' : ''; }
    if (scene === 'reaction' || isCast) { heading = g.outcome === g.target.id || scene === 'tutorial-cast' ? 'PERFECT' : 'UNEXPECTED MAGIC'; sub = outcome?.name ?? ''; }
    if (!['charge', 'tutorial-charge'].includes(scene)) {
      this.text(heading, 270, 128, heading === 'RELEASE!' ? 56 : 29, '#fff1cd'); if (sub) this.text(sub, 270, 173, 15, color);
    }
    if (scene === 'memorize' && g.elapsed < 3500 || scene === 'tutorial') {
      const signs = scene === 'tutorial' ? g.tutorialSigns : g.target.signs;
      signs.forEach((s, i) => { const x = 270 + (i - (signs.length - 1) / 2) * 137; c.fillStyle = '#2a1c40e8'; c.strokeStyle = g.signs[i] ? '#d5ff78' : '#9f7bb5'; c.lineWidth = 2; c.beginPath(); c.roundRect(x - 57, 434, 114, 135, 18); c.fill(); c.stroke(); this.text(GLYPHS[s], x, 483, 48); this.text(s, x, 543, 16, '#e8d1fa'); if (i < signs.length - 1) this.text('›', x + 69, 497, 23, '#b99ad7'); });
    }
    if (['input', 'release', 'tutorial-release'].includes(scene)) {
      g.signs.forEach((s, i) => this.text(GLYPHS[s], 270 + (i - (g.signs.length - 1) / 2) * 66, 744, 33));
      if (!hands.length && source === 'camera') { c.save(); c.globalAlpha = .18; this.text('✋', 270, 590, 155); c.restore(); }
    }
    if (lock) this.text(lock, 270, 803, 24, '#e4ff9f');
    if (coach) { c.fillStyle = '#130b2abb'; c.beginPath(); c.roundRect(26, 842, 488, 76, 14); c.fill(); this.text(coach, 270, 880, 20, '#f4e6ce', 'center', 700); }
    if (source === 'demo') this.text('PRACTICE · CAMERA FREE', 270, 938, 12, '#9f94b4');
    else if (faceMode !== 'ORIGINAL') this.text(`${faceMode} · LOCAL ONLY`, 270, 938, 12, '#9f94b4');
    c.fillStyle = '#d5ff78'; c.fillRect(0, H - 4, W * (1 - g.elapsed / 15000), 4);
  }
  spell(id, age, t, reduced) {
    const c = this.ctx, power = clamp(age / 300, 0, 1), fade = clamp((4200 - age) / 1200, 0, 1), early = age < 2150;
    c.save(); c.globalAlpha = fade;
    if (id === 'DRAGON_FLAME') {
      const visualAge = age < 120 ? age : age < 195 ? 120 : age - 75;
      const p = ease(visualAge / 1300);
      const size = reduced ? 495 : 170 + p * 570;
      c.shadowColor = '#ff7b1c'; c.shadowBlur = 22;
      this.image(this.dragon, 270, 480, size, reduced ? 0 : Math.sin(age / 900) * .05);
      this.ring(270, 734, 195, reduced ? 0 : t * 2, '#ffc374', .4, .7);
    } else if (id === 'THUNDER_GOD') {
      const wash = c.createRadialGradient(270, 430, 0, 270, 430, 600); wash.addColorStop(0, '#e8ffb755'); wash.addColorStop(.6, '#bbeb7522'); wash.addColorStop(1, '#ddff7700'); c.fillStyle = wash; c.fillRect(0, 0, W, H);
      c.shadowColor = '#d5ff78'; c.shadowBlur = 30;
      for (let i = 0; i < 5; i++) { c.beginPath(); c.moveTo(180 + i * 40, 180); for (let j = 1; j < 13; j++) c.lineTo(270 + Math.sin(j * 7 + i * 5 + (reduced ? 0 : Math.floor(age / 240))) * (35 + i * 22), 180 + j * 43); c.lineWidth = i === 2 ? 9 + this.fx.punch * 3 : 3; c.strokeStyle = i === 2 ? '#ffffe8' : '#c1fa76'; c.stroke(); }
      this.ring(270, 720, 235 * power, -t, '#d5ff78', .28);
    } else if (id === 'ABSOLUTE_ZERO') {
      c.fillStyle = `rgba(81,190,232,${.1 + power * .14})`; c.fillRect(0, 0, W, H); c.shadowBlur = 10; c.shadowColor = '#b9f3ff';
      for (let i = 0; i < 24; i++) { c.save(); c.translate((i * 163) % W, 95 + (i * 97) % 820); c.rotate(i + (reduced ? 0 : t * .15)); c.strokeStyle = '#d0f5ff'; c.lineWidth = 2; const size = (16 + i % 5 * 9) * power; for (let j = 0; j < 6; j++) { c.rotate(TAU / 6); c.beginPath(); c.moveTo(0, 0); c.lineTo(size, 0); c.moveTo(size * .6, 0); c.lineTo(size * .4, size * .2); c.moveTo(size * .6, 0); c.lineTo(size * .4, -size * .2); c.stroke(); } c.restore(); }
      for (let i = 0; i < 14; i++) { const x = i % 2 ? W : 0, direction = i % 2 ? -1 : 1, y = 130 + Math.floor(i / 2) * 120; c.fillStyle = '#9cdff544'; c.strokeStyle = '#c4f5ff99'; c.beginPath(); c.moveTo(x, y - 50); c.lineTo(x + direction * (55 + i % 3 * 25) * power, y - 12); c.lineTo(x + direction * 20 * power, y + 18); c.lineTo(x + direction * 85 * power, y + 66); c.lineTo(x, y + 100); c.closePath(); c.fill(); c.stroke(); }
      this.ring(270, 630, 205, t * .2, '#92eaff', .8);
    } else if (id === 'POTATO') {
      c.save(); c.translate(270, 535 - (reduced ? 0 : Math.sin(age / 550) * 16)); c.rotate(reduced ? 0 : age / 1100); c.shadowColor = '#c89461'; c.shadowBlur = 20; c.fillStyle = '#c99e67'; c.beginPath(); c.ellipse(0, 0, 46, 65, -.3, 0, TAU); c.fill(); c.shadowBlur = 0;
      for (const [x, y] of [[-20, -18], [18, 8], [-8, 36], [8, -42]]) { c.fillStyle = '#856443'; c.beginPath(); c.ellipse(x, y, 4, 3, .5, 0, TAU); c.fill(); } c.restore(); this.text('…potato.', 270, 650, 26, '#d0b996');
    } else if (id === 'TINY_FIRE') {
      c.fillStyle = '#ece0c2'; c.fillRect(256, 559, 28, 65); c.fillStyle = '#ffb354'; c.shadowColor = '#ff8b26'; c.shadowBlur = 20; c.beginPath(); c.ellipse(270, 544, 12, reduced ? 19 : 19 + Math.sin(t * 8) * 3, 0, 0, TAU); c.fill(); c.shadowBlur = 0; this.text('tiny, tiny magic.', 270, 671, 20, '#d0b996');
    } else if (id === 'CHICK_SWARM' || id === 'FISH_STORM') {
      for (let i = 0; i < (id === 'CHICK_SWARM' ? 15 : 24); i++) { const x = reduced ? (i * 129) % W : ((i * 131 + age * .12) % (W + 100)) - 50, y = 430 + (i * 79) % 320 + (reduced ? 0 : Math.sin(t * 3 + i) * 30); c.save(); c.translate(x, y); c.rotate(reduced ? 0 : Math.sin(i + t) * .15); if (id === 'CHICK_SWARM') { c.fillStyle = '#ffdf59'; c.beginPath(); c.arc(0, 0, 26, 0, TAU); c.fill(); c.fillStyle = '#ef8c3e'; c.beginPath(); c.moveTo(17, -5); c.lineTo(36, 0); c.lineTo(17, 5); c.fill(); } else { c.fillStyle = i % 2 ? '#84dddc' : '#f4b589'; c.beginPath(); c.ellipse(0, 0, 29, 15, 0, 0, TAU); c.fill(); c.beginPath(); c.moveTo(-20, 0); c.lineTo(-39, -17); c.lineTo(-39, 17); c.fill(); } c.fillStyle = '#23162d'; c.beginPath(); c.arc(10, -6, 3, 0, TAU); c.fill(); c.restore(); }
      this.text(id === 'CHICK_SWARM' ? 'ぴよ。' : 'FISH. EVERYWHERE.', 270, 793, 25, '#eddea8');
    } else if (id === 'GIANT_HAND') {
      c.save(); c.translate(270, 575); c.scale(power * 2.3, power * 2.3); c.fillStyle = '#f2b0df'; c.shadowColor = '#ff97dc'; c.shadowBlur = 18; c.beginPath(); c.roundRect(-42, -23, 84, 91, 30); c.fill(); for (let i = 0; i < 4; i++) { c.beginPath(); c.roundRect(-42 + i * 23, -85 - (i === 1 ? 15 : 0), 19, 108, 10); c.fill(); } c.beginPath(); c.roundRect(-70, -14, 34, 55, 15); c.fill(); c.restore();
    } else if (id === 'SELF_BLAST') {
      c.save(); c.translate(270, 560); c.rotate(reduced ? 0 : age / 170); c.strokeStyle = '#d1b9ff'; c.lineWidth = 12; c.shadowColor = '#aa78ff'; c.shadowBlur = 25; c.beginPath(); for (let i = 0; i < 200; i++) { const a = i / 12, r = i * .8 * power; c.lineTo(Math.cos(a) * r, Math.sin(a) * r); } c.stroke(); c.restore(); this.text('THAT CAME BACK.', 270, 785, 23, '#b6a1db');
    } else if (id === 'SAD_SMOKE') {
      for (let i = 0; i < 8; i++) { c.fillStyle = '#b2adca22'; c.beginPath(); c.arc(270 + Math.sin(i * 3) * 35, 580 - i * 18 - (reduced ? 0 : age / 80), 28 + i * 4, 0, TAU); c.fill(); } this.text('pff…', 270, 710, 23, '#aba2bb');
    }
    if (early && !reduced && ['DRAGON_FLAME', 'THUNDER_GOD', 'ABSOLUTE_ZERO'].includes(id)) {
      c.shadowBlur = 8; c.shadowColor = '#fff1c9'; c.fillStyle = '#fff0b1'; for (let i = 0; i < 60; i++) { const a = i * 2.399, r = (age * (.08 + i % 7 * .014)) % 430; c.globalAlpha = fade * (1 - r / 430); c.fillRect(270 + Math.cos(a) * r, 490 + Math.sin(a) * r * 1.4, 3 + i % 3, 3 + i % 3); }
    }
    c.restore();
  }
}
