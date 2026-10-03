import { clamp } from "../input/duoConfig.js";

export const TINY_BOT_RULES = Object.freeze({
  durationMs: 30_000, moveSpeed: 0.26, radius: 0.026, shotSpeed: 0.85,
  shotCooldownMs: 350, knockback: 0.5, friction: 2.5, ringLeft: 0.09, ringRight: 0.91
});

// Deterministic simulation. Rendering, camera inference, timers and DOM are
// owned by the shared shell; games only see normalized players and events.
export class TinyBotDuel {
  constructor({ onFeedback = () => {} } = {}) {
    this.onFeedback = onFeedback;
    this.reset();
  }
  reset() {
    this.elapsedMs = 0;
    this.running = false;
    this.result = null;
    this.bullets = [];
    this.bots = [0.32, 0.68].map((x, index) => ({
      id: index + 1, x, y: 0.57, velocity: 0, shots: 0, hits: 0, lastShotAt: -Infinity, hitFlash: 0
    }));
  }
  start() { this.reset(); this.running = true; }

  step(deltaMs, { players, events = [] }) {
    if (!this.running || players.length !== 2 || players.some((p) => !p.present || !p.calibrated)) return;
    // Clamp delayed frames and use substeps to keep collision/physics stable.
    const duration = Math.min(100, Math.max(0, deltaMs), TINY_BOT_RULES.durationMs - this.elapsedMs);
    for (const event of events) if (event.type === "MOUTH_OPEN_START") this.shoot(event.playerId);
    let remaining = duration;
    while (remaining > 0 && this.running) {
      const step = Math.min(remaining, 1000 / 120);
      this.simulate(step / 1000, players);
      this.elapsedMs += step;
      remaining -= step;
    }
    if (this.running && this.elapsedMs >= TINY_BOT_RULES.durationMs - 0.001) this.finish(null, "TIME");
  }

  shoot(playerId) {
    const bot = this.bots[playerId - 1];
    if (!this.running || !bot || this.elapsedMs - bot.lastShotAt < TINY_BOT_RULES.shotCooldownMs) return;
    const target = this.bots[1 - (playerId - 1)];
    const direction = target.x >= bot.x ? 1 : -1;
    bot.lastShotAt = this.elapsedMs;
    bot.shots += 1;
    this.bullets.push({ owner: playerId, x: bot.x + direction * (TINY_BOT_RULES.radius + 0.008), direction });
    this.onFeedback("shot", playerId);
  }

  simulate(seconds, players) {
    const cfg = TINY_BOT_RULES;
    this.bots.forEach((bot, index) => {
      const dx = clamp(players[index].faceX);
      bot.x += ((Math.abs(dx) > 0.08 ? dx : 0) * cfg.moveSpeed + bot.velocity) * seconds;
      bot.velocity *= Math.exp(-cfg.friction * seconds);
      bot.hitFlash = Math.max(0, bot.hitFlash - seconds);
    });
    const [a, b] = this.bots;
    const separation = b.x - a.x;
    if (Math.abs(separation) < cfg.radius * 2) {
      const direction = separation >= 0 ? 1 : -1;
      const overlap = cfg.radius * 2 - Math.abs(separation);
      a.x -= direction * overlap / 2;
      b.x += direction * overlap / 2;
    }
    this.bullets = this.bullets.filter((bullet) => {
      const previousX = bullet.x;
      bullet.x += bullet.direction * cfg.shotSpeed * seconds;
      const target = this.bots[bullet.owner === 1 ? 1 : 0];
      if (target.x >= Math.min(previousX, bullet.x) - cfg.radius && target.x <= Math.max(previousX, bullet.x) + cfg.radius) {
        target.velocity += bullet.direction * cfg.knockback;
        target.hitFlash = 0.2;
        this.bots[bullet.owner - 1].hits += 1;
        this.onFeedback("hit", target.id);
        return false;
      }
      return bullet.x > -0.1 && bullet.x < 1.1;
    });
    const out = this.bots.filter((bot) => bot.x < cfg.ringLeft || bot.x > cfg.ringRight);
    if (out.length) this.finish(out.length === 2 ? null : 3 - out[0].id, "RING_OUT");
  }

  finish(winner, reason) {
    if (!this.running) return;
    this.running = false;
    this.result = { winner, reason, durationMs: Math.min(this.elapsedMs, TINY_BOT_RULES.durationMs),
      shots: this.bots.map((bot) => bot.shots), hits: this.bots.map((bot) => bot.hits), roundCompletion: true };
    this.onFeedback(winner === null ? "warning" : "win", winner);
  }

  render(ctx, width, height, { locale = "en", botArt = null } = {}) {
    const text = locale === "ja" ? { ring: "押し出して勝て", fire: "口を開けて撃つ" } : { ring: "PUSH THEM OUT", fire: "OPEN MOUTH TO FIRE" };
    ctx.clearRect(0, 0, width, height);
    const baseY = height * 0.62, floorHeight = height * 0.12;
    const gradient = ctx.createLinearGradient(0, baseY, 0, baseY + floorHeight);
    gradient.addColorStop(0, "#263849"); gradient.addColorStop(1, "#0d1623");
    ctx.fillStyle = gradient;
    ctx.fillRect(width * 0.09, baseY, width * 0.82, floorHeight);
    ctx.fillStyle = "#a8b5cb";
    ctx.fillRect(width * 0.09, baseY, width * 0.82, 2);
    ctx.setLineDash([4, 7]);
    ctx.strokeStyle = "#ffce76";
    for (const x of [0.09, 0.91]) {
      ctx.beginPath(); ctx.moveTo(width * x, height * 0.38); ctx.lineTo(width * x, height * 0.8); ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.textAlign = "center";
    ctx.font = `700 ${Math.max(11, height * 0.037)}px system-ui`;
    ctx.fillStyle = "#a8b5cb";
    ctx.fillText(text.ring, width / 2, height * 0.83);
    ctx.font = `700 ${Math.max(10, height * 0.03)}px system-ui`;
    ctx.fillStyle = "#738299";
    ctx.fillText(text.fire, width / 2, height * 0.90);
    const size = Math.min(width * 0.065, height * 0.15);
    this.bots.forEach((bot, index) => {
      const x = bot.x * width, y = baseY - size;
      const color = index === 0 ? "#65f4dd" : "#ffafca";
      ctx.save(); ctx.translate(x, y);
      ctx.shadowColor = color; ctx.shadowBlur = bot.hitFlash > 0 ? 22 : 8;
      if (botArt?.complete && botArt.naturalWidth) {
        const artHeight = size * 1.1, artWidth = artHeight * (botArt.naturalWidth / 2) / botArt.naturalHeight;
        ctx.drawImage(botArt, index * botArt.naturalWidth / 2, 0, botArt.naturalWidth / 2, botArt.naturalHeight, -artWidth / 2, -size * .15, artWidth, artHeight);
      } else {
        ctx.fillStyle = bot.hitFlash > 0 ? "#fff" : color;
        ctx.fillRect(-size * 0.4, 0, size * 0.8, size * 0.65);
        ctx.shadowBlur = 0;
        ctx.fillStyle = "#152234"; ctx.fillRect(-size * 0.28, size * 0.14, size * 0.56, size * 0.23);
        ctx.fillStyle = "#fff";
        ctx.fillRect(-size * 0.19, size * 0.21, size * 0.11, size * 0.08);
        ctx.fillRect(size * 0.09, size * 0.21, size * 0.11, size * 0.08);
        ctx.fillStyle = color;
        ctx.fillRect(-size * 0.3, size * 0.68, size * 0.22, size * 0.22);
        ctx.fillRect(size * 0.08, size * 0.68, size * 0.22, size * 0.22);
        const facing = this.bots[1 - index].x >= bot.x ? 1 : -1;
        ctx.fillRect(facing * size * 0.36 - size * 0.09, size * 0.42, size * 0.3 * facing, size * 0.16);
      }
      ctx.shadowBlur = 0; ctx.fillStyle = color;
      ctx.font = `900 ${Math.max(11, size * 0.28)}px system-ui`;
      ctx.fillText(`P${bot.id}`, 0, -size * 0.22);
      ctx.restore();
    });
    this.bullets.forEach((bullet) => {
      ctx.fillStyle = bullet.owner === 1 ? "#b3fff3" : "#ffd0e0";
      ctx.fillRect(bullet.x * width - 5, baseY - size * 0.5, 10, 4);
    });
  }
}
