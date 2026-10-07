import { escapeHtml as esc } from '../../platform/copy.js';
import { ClipComposer } from '../../creator/ClipComposer.js';
import { exportClip, exportCapability } from '../../creator/Export.js';
import { downloadVideo } from '../../creator/Share.js';
import './style.css';
export function launchMarkup(game, locale) {
  const ja = locale === 'ja';
  return `<section class="puppet-entry" data-mode="play"><p class="puppet-kicker">TECH-AVATAR-001 · PUPPET LAB</p><h1>YOU BECOME<br>ANYTHING.</h1><div class="puppet-mark" aria-hidden="true">◉<br>╱┃╲</div>
    <p>${ja ? '首をかしげる。腕を上げる。口を開ける。<br>あなたの身体が、小さな人形になる。' : 'Tilt your head. Raise your arms. Open your mouth.<br>Your body becomes a little puppet.'}</p>
    <label>${ja ? '最初のキャラクター' : 'START AS'} <select class="puppet-entry-driver"><option value="simple">SIMPLE PUPPET</option><option value="mascot">LITTLE MONSTER</option><option value="vrm">VRM TEST</option></select></label>
    <div class="puppet-mode-options" role="group" aria-label="PLAY / CREATOR"><button type="button" data-puppet-mode="play" aria-pressed="true">PLAY</button><button type="button" data-puppet-mode="creator" aria-pressed="false">CREATOR</button></div>
    <p>${ja ? 'AVATAR：カメラ映像を見せずに遊べます。CREATORでは動きを短い動画に。' : 'AVATAR keeps your camera image hidden. CREATOR turns your movement into a short clip.'}</p>
    <div class="launch-controls"><button type="button" class="launch-camera" disabled>PLAY ↗</button><button type="button" class="launch-demo" disabled>${ja ? 'カメラなしの練習' : 'CAMERA-FREE PRACTICE'}</button><button type="button" class="launch-howto">${ja ? '遊び方' : 'HOW TO PLAY'}</button></div><p class="launch-status" role="status"></p><details><summary>${ja ? 'カメラとプライバシー' : 'CAMERA & PRIVACY'}</summary><p>${esc(game[ja ? 'privacyJa' : 'privacyEn'])}</p></details></section>`;
}
export function howtoMarkup(game, locale) {
  const ja = locale === 'ja';
  return `<h2 id="sheet-title">CAMERA PUPPET TEST</h2><ol><li>${ja ? '顔と肩を映して、首・腕・口を動かしてみよう。' : 'Show your face and shoulders. Move your head, arms and mouth.'}</li><li>${ja ? '設定を開くと、人形・怪獣・VRMを切り替えられます。' : 'Open settings to switch between puppet, monster and VRM.'}</li><li>${ja ? '練習ではスライダーで操作。追跡ロストと復帰も試せます。' : 'In practice, use sliders and try tracking loss and recovery.'}</li><li>${ja ? 'CREATORのリプレイから、音声なしの動画を端末へ保存。' : 'Replay in CREATOR, then save a silent video on your device.'}</li></ol><p>${esc(game[ja ? 'privacyJa' : 'privacyEn'])}</p>`;
}
export function handleLaunchClick(root, event) {
  const button = event.target.closest('[data-puppet-mode]'); if (!button) return false;
  const entry = root.querySelector('.puppet-entry'); entry.dataset.mode = button.dataset.puppetMode;
  entry.querySelectorAll('[data-puppet-mode]').forEach(b => b.setAttribute('aria-pressed', String(b === button))); return true;
}
export function readOptions(root) { const e = root.querySelector('.puppet-entry'); return { creator: e?.dataset.mode === 'creator', faceMode: 'AVATAR', driver: e?.querySelector('select')?.value ?? 'simple' }; }
export function resultMarkup(game, result, locale) {
  const ja = locale === 'ja';
  return `<section class="puppet-result"><p class="puppet-kicker">TECH-AVATAR-001</p><h2>${ja ? 'きみの動き。別の姿。' : 'YOUR MOVES. ANOTHER SHAPE.'}</h2><p>${result.source === 'demo' ? ja ? 'カメラなしの練習' : 'CAMERA-FREE PRACTICE' : 'CAMERA'} · ${esc(result.creator?.faceModes?.join(' → ') ?? result.creator?.faceMode ?? 'AVATAR')}</p>
    ${result.creator?.frames.length ? `<canvas role="img" aria-label="Puppet replay"></canvas><div class="puppet-result-actions"><button type="button" class="puppet-replay">REPLAY ↻</button><button type="button" class="puppet-save">${ja ? '動画を保存' : 'SAVE VIDEO'} ↓</button></div><p class="puppet-export-status" role="status">${ja ? '音声なし。映像は端末内で処理。' : 'Silent. Video stays on your device.'}</p>` : `<p>${ja ? '短い動画を作るには、CREATORで遊んでね。' : 'Choose CREATOR to make a short clip.'}</p>`}
    <div class="result-actions"><button type="button" data-result-action="retry">${ja ? 'もう一度' : 'TRY AGAIN'}</button><button type="button" data-result-action="next">${ja ? '次のゲーム' : 'NEXT GAME'}</button></div></section>`;
}
export function paint() {}
class PuppetComposer extends ClipComposer {
  endCard(c, w, h) {
    c.fillStyle = '#f2f4e9'; c.fillRect(0, 0, w, h); c.textAlign = 'center'; c.fillStyle = '#203d39';
    c.font = `900 ${w * .1}px system-ui`; c.fillText('PUPPET LAB', w / 2, h * .46);
    c.font = `800 ${w * .037}px system-ui`; c.fillText('YOU → MOTION → ANYTHING', w / 2, h * .54);
    if (this.source === 'demo') c.fillText('CAMERA-FREE PRACTICE', w / 2, h * .64);
  }
}
export function mountResult(root, result, locale) {
  const frames = result.creator?.frames; if (!frames?.length) return;
  const start = Math.max(frames[0].at, frames.at(-1).at - 6000), duration = Math.max(125, frames.at(-1).at - start);
  const plan = { duration: duration + 1000, heroTimestamp: null, format: 7, profile: { brand: 'PUPPET LAB', gameNumber: 'AVATAR-001' },
    segments: [{ kind: 'LIVE', start: 0, from: start, duration }, { kind: 'END_CARD', start: duration, duration: 1000 }] };
  const composer = new PuppetComposer(frames, plan, { faceMode: result.creator.faceMode, source: result.source });
  const abort = new AbortController(), canvas = root.querySelector('canvas'), save = root.querySelector('.puppet-save'), status = root.querySelector('.puppet-export-status');
  canvas.width = 270; canvas.height = 480; let raf, disposed = false;
  const stop = () => { cancelAnimationFrame(raf); raf = null; };
  const play = () => { stop(); const started = performance.now(); const tick = now => { if (disposed) return; void composer.paint(canvas, now - started); if (now - started < plan.duration) raf = requestAnimationFrame(tick); }; raf = requestAnimationFrame(tick); };
  root.querySelector('.puppet-replay').addEventListener('click', play, { signal: abort.signal });
  save.addEventListener('click', async () => {
    stop(); save.disabled = true;
    try { status.textContent = locale === 'ja' ? '動画を作っています…' : 'Preparing video…'; const file = await exportClip(composer, { signal: abort.signal, sound: false }); if (!disposed) { downloadVideo(file); status.textContent = locale === 'ja' ? '動画を保存しました。' : 'Video saved.'; } }
    catch (error) { if (!disposed && error.name !== 'AbortError') status.textContent = locale === 'ja' ? 'このブラウザでは動画を保存できません。リプレイは見られます。' : 'Video saving is unavailable here. Replay is still available.'; }
    finally { if (!disposed) save.disabled = false; }
  }, { signal: abort.signal });
  if (!exportCapability().available) { save.disabled = true; status.textContent = locale === 'ja' ? 'このブラウザはリプレイのみ対応しています。' : 'This browser supports replay only.'; }
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); }, { signal: abort.signal });
  play(); return () => { disposed = true; stop(); abort.abort(); composer.dispose(); canvas.width = 0; };
}
export function discardResult(result) { if (result?.creator) result.creator.frames = []; }
