import { zoneColors } from '../../camera/instrument/InstrumentPresets.js';
export class InstrumentFX {
  constructor(canvas) { this.canvas = canvas; this.effects = []; }
  hit(event) { this.effects.push(event); if (this.effects.length > 35) this.effects.shift(); }
  draw(instrument, at, debug = false) {
    const canvas = this.canvas, width = canvas.clientWidth, height = canvas.clientHeight, short = Math.min(width, height);
    const dpr = Math.min(1.5, window.devicePixelRatio || 1);
    if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) { canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr); }
    const ctx = canvas.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, width, height);
    this.effects = this.effects.filter(e => at - e.at < 700);
    instrument.zones.forEach((zone, i) => {
      const x = zone.x * width, y = zone.y * height, age = at - zone.lastHit, pulse = age < 250 ? Math.sin(age / 250 * Math.PI) * .25 : 0;
      ctx.beginPath(); ctx.arc(x, y, zone.radius * short * (1 + pulse), 0, Math.PI * 2);
      ctx.fillStyle = `${zoneColors[i]}33`; ctx.fill(); ctx.strokeStyle = zoneColors[i]; ctx.lineWidth = zone.state === 'HOVER' ? 4 : 2; ctx.stroke();
      ctx.fillStyle = '#fff8df'; ctx.font = `700 ${Math.max(13, zone.radius * short * .65)}px Georgia`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(zone.label.replace('4', '').toUpperCase(), x, y);
      ctx.font = '10px sans-serif'; ctx.fillText(`${i + 1}`, x, y + zone.radius * short * .65);
      if (debug) { ctx.beginPath(); ctx.setLineDash([4, 4]); ctx.arc(x, y, zone.radius * short * 1.2, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]); }
    });
    for (const effect of this.effects) {
      const progress = (at - effect.at) / 700, index = instrument.zones.findIndex(z => z.id === effect.zoneId);
      ctx.globalAlpha = 1 - progress; ctx.strokeStyle = zoneColors[Math.max(0, index)]; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(effect.x * width, effect.y * height, short * (.08 + progress * .12) * (.7 + effect.velocity * .6), 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = ctx.strokeStyle; ctx.font = '26px Georgia'; ctx.fillText('♪', effect.x * width + 10, effect.y * height - progress * 65);
      for (let i = 0; i < 6; i++) { const angle = i * Math.PI / 3, radius = progress * short * .12; ctx.fillRect(effect.x * width + Math.cos(angle) * radius, effect.y * height + Math.sin(angle) * radius, 3, 3); }
    }
    ctx.globalAlpha = 1;
    const point = instrument.detector.point;
    if (point) { ctx.beginPath(); ctx.arc(point.x * width, point.y * height, 7, 0, Math.PI * 2); ctx.fillStyle = '#fff4d3'; ctx.fill(); ctx.strokeStyle = '#12352f'; ctx.lineWidth = 2; ctx.stroke(); }
  }
}
