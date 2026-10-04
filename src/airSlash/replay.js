import { ClipComposer } from '../creator/ClipComposer.js';
import { exportClip, exportCapability } from '../creator/Export.js';
import { downloadVideo } from '../creator/Share.js';
export class AirSlashComposer extends ClipComposer {
  endCard(c, w, h) {
    c.fillStyle = '#132428'; c.fillRect(0, 0, w, h); c.textAlign = 'center'; c.fillStyle = '#d9ff75'; c.font = `900 ${w * .17}px Impact, sans-serif`; c.fillText('AIR SLASH', w / 2, h * .39);
    c.fillStyle = '#fffbe5'; c.font = `900 ${w * .2}px Impact, sans-serif`; c.fillText(this.plan.score.toLocaleString('en-US'), w / 2, h * .52);
    c.font = `800 ${w * .035}px 'Trebuchet MS', sans-serif`; c.fillText(this.plan.title, w / 2, h * .58); c.fillText('CAMERA GAME #054', w / 2, h * .63); if (this.source === 'demo') c.fillText('CAMERA-FREE PRACTICE', w / 2, h * .69);
  }
}
export function airSlashReplayPlan(result) {
  const clip = result.creator;
  return { format: '7', duration: 7000, heroTimestamp: clip.heroAt, score: result.score, title: result.title,
    profile: { brand: 'AIR SLASH', gameNumber: 54, gameplayText: 'SLASH FRUIT!', heroLabel: clip.heroLabel },
    segments: [{ kind: 'PLAY', start: 0, from: clip.from ?? 0, duration: 6000 }, { kind: 'END_CARD', start: 6000, from: 0, duration: 1000 }] };
}
export class AirSlashReplay {
  constructor(root, result, t) {
    this.root = root; this.result = result; this.t = t; this.abort = new AbortController(); this.generation = 0;
    this.canvas = root.querySelector('.as-replay canvas'); this.canvas.width = 270; this.canvas.height = 480; this.plan = airSlashReplayPlan(result); this.composer = new AirSlashComposer(result.creator.frames, this.plan, result.creator);
    root.addEventListener('click', this.click, { signal: this.abort.signal }); document.addEventListener('visibilitychange', () => { if (document.hidden) this.stop(); }, { signal: this.abort.signal }); this.update(); this.play();
  }
  status(text) { if (!this.abort.signal.aborted) this.root.querySelector('.as-export-status').textContent = text; }
  update() { for (const action of ['save', 'share']) this.root.querySelector(`[data-as-clip="${action}"]`).disabled = !this.result.creator.file; this.root.querySelector('[data-as-clip="encode"]').hidden = !!this.result.creator.file; }
  stop() { this.generation++; if (this.frameId != null) cancelAnimationFrame(this.frameId); this.frameId = null; }
  play() { this.stop(); const token = this.generation; let elapsed = 0, last = performance.now(); const tick = now => { if (token !== this.generation) return; elapsed += Math.min(100, now - last); last = now; void this.composer.paint(this.canvas, elapsed).catch(() => this.status(this.t.clipFailed)); if (elapsed < 7000) this.frameId = requestAnimationFrame(tick); else this.frameId = null; }; this.frameId = requestAnimationFrame(tick); }
  click = e => { const action = e.target.closest('[data-as-clip]')?.dataset.asClip; if (action === 'replay') this.play(); if (action === 'encode') void this.encode(); if (action === 'save' && this.result.creator.file) downloadVideo(this.result.creator.file); if (action === 'share' && this.result.creator.file) void this.share(); };
  async share() { const file = this.result.creator.file; try { if (navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file], title: 'AIR SLASH' }); return; } } catch (e) { if (e.name === 'AbortError') return; } downloadVideo(file); }
  async encode() {
    if (this.encoding || this.abort.signal.aborted) return; if (!exportCapability().available) { this.status(this.t.clipUnsupported); return; }
    this.encoding = true; this.stop(); const button = this.root.querySelector('[data-as-clip="encode"]'); button.disabled = true; this.status(this.t.generating);
    const composer = new AirSlashComposer(this.result.creator.frames, this.plan, this.result.creator);
    try { const file = await exportClip(composer, { signal: this.abort.signal, sound: false, onProgress: p => this.status(`${this.t.generating} ${Math.round(p * 100)}%`) }); if (!this.abort.signal.aborted) { this.result.creator.file = file; this.status(this.t.clipReady); this.update(); } }
    catch (e) { if (e.name !== 'AbortError') this.status(this.t.clipFailed); }
    finally { composer.dispose(); this.encoding = false; if (!this.abort.signal.aborted) button.disabled = false; }
  }
  dispose() { this.stop(); this.abort.abort(); this.composer.dispose(); }
}
