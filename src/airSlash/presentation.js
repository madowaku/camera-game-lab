import cover from './assets/cover-v1.webp';
import { copy } from './messages.js';
import { escapeHtml as esc } from '../platform/copy.js';
import { AirSlashReplay } from './replay.js';
import './airSlash.css';

export function launchMarkup(game, locale) {
  const t = copy(locale);
  return `<section class="as-entry" data-recording="play" data-face="ORIGINAL"><div class="as-meta"><span>EXP-054 / AIR SLASH</span><span>HAND · 15 SEC</span></div>
    <div class="as-entry-grid"><div class="as-cover"><img src="${cover}" width="720" height="1080" alt="${locale === 'ja' ? '空の両手を交差し、光の軌跡でフルーツを斬るプレイヤー' : 'A player crosses empty hands, slicing fruit with trails of light'}"><h1>AIR<br><span>SLASH</span><i>↗</i></h1><span class="as-sticker">FRESH<br>CUTS ONLY.</span><div class="as-cover-bottom"><span>YOUR HANDS.<br>YOUR BLADES.</span><b>15″</b></div></div>
    <div class="as-entry-content"><p class="as-kicker">A LITTLE CHAOS. A LOT OF JUICE.</p><h2 class="as-tagline">${t.tagline}</h2><p class="as-sub">${t.sub}</p>
    <div class="as-rules"><strong>SLASH FRUIT.</strong><span>DON'T SLASH <b aria-label="bomb">💣</b></span></div>
    <ol class="as-steps">${t.steps.map(([title, body], i) => `<li><b>0${i + 1}</b><div><strong>${title}</strong><span>${body}</span></div></li>`).join('')}</ol>
    <div class="as-record-picker" role="group" aria-label="PLAY / CREATOR"><button type="button" data-as-recording="play" aria-pressed="true">PLAY</button><button type="button" data-as-recording="creator" aria-pressed="false">CREATOR <small>BEST 7 SEC</small></button></div>
    <div class="as-face-picker" hidden><p>${t.faceChoice}</p><div role="group" aria-label="${t.faceChoice}">${['ORIGINAL', 'EFFECT', 'HIDE'].map(mode => `<button type="button" data-as-face="${mode}" aria-pressed="${mode === 'ORIGINAL'}">${mode}<small>${t[mode.toLowerCase()]}</small></button>`).join('')}</div><p>${t.creatorNotice}</p></div>
    <div class="launch-controls as-launch"><button type="button" class="launch-camera as-primary" disabled>LET'S SLASH ↗</button><button type="button" class="launch-demo as-secondary" disabled>${t.practice}</button><button type="button" class="launch-howto as-text">${t.howto} ↗</button></div><p class="launch-status" role="status"></p>
    <details class="as-privacy"><summary>${t.privacy}</summary><p>${esc(game[locale === 'ja' ? 'privacyJa' : 'privacyEn'])}</p></details></div></div></section>`;
}
export function howtoMarkup(game, locale) {
  const t = copy(locale);
  return `<h2 id="sheet-title">AIR SLASH · ${t.howto}</h2><p>${t.tagline}</p><ol>${t.steps.map(([a, b]) => `<li><strong>${a}</strong><p>${b}</p></li>`).join('')}</ol><p>FRUIT +100 · COMBO +20 × combo · POWER +50 · X-SLASH +300 · BOMB −300</p><p>${t.cameraHint}</p><p>${t.demoHint}</p><p>${locale === 'ja' ? 'ゆっくり動くと光の軌跡だけ。静止中は斬れません。見失った直後は一時停止し、再認識後180msは斬撃を禁止します。' : 'Slow sweeps leave a trail. Still hands cannot cut. Lost tracking pauses the game; reacquired hands need 180ms to re-arm.'}</p><p>${esc(game[locale === 'ja' ? 'privacyJa' : 'privacyEn'])}</p>`;
}
export function resultMarkup(game, r, locale) {
  const t = copy(locale);
  return `<section class="as-result"><div class="as-meta"><span>AIR SLASH / ROUND COMPLETE</span><span>15 SEC</span></div><div class="as-result-mark" aria-hidden="true">↗</div><p class="as-kicker">${esc(r.title)}</p><h2>${r.score.toLocaleString('en-US')}</h2><p class="as-score-label">POINTS ${r.source === 'demo' ? '· PRACTICE' : '· LIVE CAMERA'}</p>
    <dl class="as-result-stats"><div><dt>${t.fruit}</dt><dd>${r.sliced}</dd></div><div><dt>${t.combo}</dt><dd>${r.bestCombo}<small> ×</small></dd></div><div><dt>${t.bombs}</dt><dd>${r.bombs}</dd></div></dl><p class="as-result-extra">POWER SLASH ×${r.powerSlashes} <span>／</span> X-SLASH ×${r.xSlashes}</p>
    ${r.creator?.frames?.length ? `<div class="as-replay"><h3>AUTO DIRECTOR <small>BEST 7 SEC · ${esc(r.creator.faceMode)}</small></h3><canvas role="img" aria-label="AIR SLASH highlight replay"></canvas><div class="as-clip-actions"><button type="button" class="as-secondary" data-as-clip="replay">${t.replay} ↻</button><button type="button" class="as-secondary" data-as-clip="encode">${t.encode}</button><button type="button" class="as-secondary" data-as-clip="save" disabled>${t.save}</button><button type="button" class="as-secondary" data-as-clip="share" disabled>${t.videoShare}</button></div><p class="as-export-status" role="status"></p><p class="as-privacy">${t.clipNotice}</p></div>` : ''}
    <div class="result-actions as-result-actions"><button type="button" class="as-primary" data-result-action="retry">${t.again} ↻</button><button type="button" class="as-secondary" data-result-action="next">${t.next} →</button><button type="button" class="as-text" data-result-action="share">${t.share} ↗</button></div></section>`;
}
export function paint() {}
export function handleLaunchClick(root, event) {
  const entry = root.querySelector('.as-entry'), record = event.target.closest('[data-as-recording]'), face = event.target.closest('[data-as-face]');
  if (!entry || !record && !face) return false;
  if (record) { entry.dataset.recording = record.dataset.asRecording; entry.querySelector('.as-face-picker').hidden = entry.dataset.recording !== 'creator'; entry.querySelectorAll('[data-as-recording]').forEach(b => b.setAttribute('aria-pressed', String(b === record))); }
  if (face) { entry.dataset.face = face.dataset.asFace; entry.querySelectorAll('[data-as-face]').forEach(b => b.setAttribute('aria-pressed', String(b === face))); }
  return true;
}
export function readOptions(root) { const entry = root.querySelector('.as-entry'); return { creator: entry?.dataset.recording === 'creator', faceMode: entry?.dataset.face ?? 'ORIGINAL' }; }
export function mountResult(root, result, locale) { if (!result.creator?.frames?.length) return; const replay = new AirSlashReplay(root, result, copy(locale)); return () => replay.dispose(); }
export function discardResult(result) { if (result?.creator) { result.creator.frames = []; result.creator.events = []; result.creator.file = null; } }
