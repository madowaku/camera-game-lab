import { DirectorRecorder } from '../creator/DirectorRecorder.js';
import { DirectorEventBus } from '../creator/DirectorEventBus.js';
import { AutoDirector } from '../creator/AutoDirector.js';
import { ClipComposer } from '../creator/ClipComposer.js';
import { exportClip, exportCapability } from '../creator/Export.js';
import { downloadVideo } from '../creator/Share.js';

export const fishDirector = Object.freeze({
  gameId: 'human-fish', gameNumber: 59, brand: 'HUMAN FISH', heroEvent: 'HERO',
  hookCandidates: ['NEAR_MISS', 'BIG_SUCCESS', 'FIRST_SUCCESS'],
  fallbackEvents: ['BIG_SUCCESS', 'FAIL', 'FIRST_SUCCESS', 'FIRST_ACTION'],
  reactionDuration: 3000, endCardDuration: 1000, bufferDuration: 12000,
  gameplayText: 'JUST ONE MORE…', heroLabel: 'PUHAAAA!!',
});
export function planFishClip(frames, events) {
  const plan = new AutoDirector(fishDirector).plan(frames, events, '7');
  if (!plan) return null;
  // A late gasp has less recorded aftermath. Hold the life report for the
  // remaining time so every short is seven seconds without inventing action.
  const endCard = plan.segments.find(segment => segment.kind === 'END_CARD');
  endCard.duration += Math.max(0, 7000 - plan.duration);
  let cursor = 0;
  for (const segment of plan.segments) { segment.start = cursor; cursor += segment.duration; }
  plan.duration = cursor;
  return plan;
}
export class FishRecorder {
  constructor(faceMode) {
    this.faceMode = faceMode; this.recorder = new DirectorRecorder(fishDirector); this.events = new DirectorEventBus(fishDirector);
    this.unsubscribe = this.events.subscribe(e => this.recorder.mark(e, fishDirector));
  }
  event(e) {
    let type = { START: 'GAME_START', EAT: 'FIRST_SUCCESS', BREATH: 'HERO', CAT_HIT: 'FAIL', LOW: 'NEAR_MISS', CLEAR: 'GAME_END', DROWN: 'GAME_END' }[e.type];
    if (e.type === 'EAT' && e.points >= 10) type = 'BIG_SUCCESS';
    if (type) this.events.emit({ type, timestamp: e.at * 1000, metadata: { ...e } });
  }
  capture(canvas, at) { this.recorder.capture(canvas, at * 1000); }
  async finish(stats, source) {
    const frames = await this.recorder.finish(), events = [...this.events.events];
    return { frames, events, plan: planFishClip(frames, events), source, faceMode: this.faceMode, stats };
  }
  dispose() { this.unsubscribe(); this.recorder.dispose(); this.events.dispose(); }
}
class FishComposer extends ClipComposer {
  constructor(result) { super(result.frames, result.plan, result); this.stats = result.stats; }
  endCard(c, w, h) {
    c.fillStyle = '#063c44'; c.fillRect(0, 0, w, h); c.textAlign = 'center';
    c.fillStyle = '#f7e8b5'; c.font = `900 ${w * .10}px Trebuchet MS, sans-serif`; c.fillText('HUMAN FISH', w / 2, h * .40);
    c.font = `700 ${w * .044}px sans-serif`; c.fillText(`${this.stats.survival.toFixed(1)} SEC ALIVE`, w / 2, h * .48);
    c.fillStyle = '#90dccf'; c.fillText(`FOOD ${this.stats.foods} · BREATH ${this.stats.breaths}`, w / 2, h * .54);
    c.font = `700 ${w * .029}px sans-serif`; c.fillText(this.source === 'demo' ? 'CAMERA-FREE PRACTICE' : 'TODAY’S HUMAN FISH', w / 2, h * .64);
  }
}
export function mountFishReplay(root, result, locale) {
  const r = result.creator; if (!r?.plan || !r.frames.length) return;
  const canvas = root.querySelector('.hf-replay-canvas'), status = root.querySelector('.hf-export-status');
  const composer = new FishComposer(r), abort = new AbortController();
  let raf, token = 0, encoding = false;
  canvas.width = 540; canvas.height = 960;
  const stop = () => { token++; cancelAnimationFrame(raf); };
  const play = () => {
    stop(); const generation = token, start = performance.now();
    const tick = now => {
      if (abort.signal.aborted || generation !== token || document.hidden) return;
      const elapsed = now - start; void composer.paint(canvas, elapsed);
      if (elapsed < r.plan.duration) raf = requestAnimationFrame(tick);
    }; raf = requestAnimationFrame(tick);
  };
  root.querySelector('.hf-replay').addEventListener('click', play, { signal: abort.signal });
  root.querySelector('.hf-save-clip').addEventListener('click', async event => {
    if (encoding) return;
    if (!exportCapability().available) { status.textContent = locale === 'ja' ? 'このブラウザではリプレイをご利用ください。' : 'Replay is available; video export is unsupported.'; return; }
    encoding = true; event.target.disabled = true;
    const encoder = new FishComposer(r);
    try {
      const file = await exportClip(encoder, { sound: false, signal: abort.signal, onProgress: p => { status.textContent = `${locale === 'ja' ? '動画を準備中' : 'Preparing clip'} ${Math.round(p * 100)}%`; } });
      if (!abort.signal.aborted) { downloadVideo(file); status.textContent = locale === 'ja' ? '7秒の人面魚生活を保存しました。' : 'Your seven-second life was saved.'; }
    } catch (e) { if (e.name !== 'AbortError') status.textContent = locale === 'ja' ? '保存できませんでした。もう一度お試しください。' : 'Could not save. Please try again.'; }
    finally { encoder.dispose(); encoding = false; if (!abort.signal.aborted) event.target.disabled = false; }
  }, { signal: abort.signal });
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); }, { signal: abort.signal });
  play(); return () => { abort.abort(); stop(); composer.dispose(); };
}
