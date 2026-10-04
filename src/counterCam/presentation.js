import cover from './assets/cover-v1.webp';
import { copy } from './messages.js';
import { escapeHtml as esc } from '../platform/copy.js';
import { Replay } from '../creator/Replay.js';
import './counterCam.css';
import '../creator/creator.css';
export function launchMarkup(game, locale) {
  const t = copy(locale);
  return `<section class="cc-entry" data-mode="play" data-face="ORIGINAL"><div class="cc-meta"><span>EXP-050 / BODY BOXING</span><span>30 SEC · ONE ROBOT</span></div><div class="cc-entry-grid">
    <div class="cc-cover"><img src="${cover}" width="941" height="1672" alt="${locale === 'ja' ? 'ロボットの拳をかわし、パンチを返すプレイヤー' : 'A player dodges a robot’s red glove and punches back'}"><h1>COUNTER<br><span>CAM</span><i aria-hidden="true">↙</i></h1><span class="cc-stamp">DODGE.<br>THEN<br>PUNCH.</span><span class="cc-cover-bottom">YOUR BODY IS THE CONTROLLER.</span></div>
    <div class="cc-entry-copy"><p class="cc-kicker">MAKE THE MISS. MAKE IT HURT.</p><p class="cc-tagline">${t.tagline}</p><ol class="cc-steps">${t.steps.map(([a, b], i) => `<li><b>0${i + 1}</b><div><strong>${a}</strong><span>${b}</span></div></li>`).join('')}</ol>
    <div class="cc-damage" aria-label="Damage"><span>NORMAL <b>10</b></span><span>COUNTER <b>40</b></span><span>PERFECT <b>80</b></span></div>
    <div class="creator-mode-tabs" role="group" aria-label="PLAY / CREATOR"><button type="button" data-creator-mode="play" aria-pressed="true">PLAY</button><button type="button" data-creator-mode="creator" aria-pressed="false">CREATOR</button></div>
    <div class="creator-face-picker" hidden><p>${t.faceChoice}</p><div class="creator-face-options">${['ORIGINAL', 'EFFECT', 'HIDE'].map(m => `<button type="button" data-face-mode="${m}" aria-pressed="${m === 'ORIGINAL'}">${m}<small>${t[m.toLowerCase()]}</small></button>`).join('')}</div><p>${t.creatorNotice}</p></div>
    <div class="launch-controls cc-launch"><button class="launch-camera cc-primary" type="button" disabled>PLAY ↗</button><button class="launch-demo cc-secondary" type="button" disabled>${t.practice}</button><button class="launch-howto cc-text" type="button">${t.howto} ↗</button></div><p class="launch-status" role="status"></p>
    <p class="cc-distance">↔ ${t.distance}</p><details class="cc-privacy"><summary>${t.privacy}</summary><p>${esc(game[locale === 'ja' ? 'privacyJa' : 'privacyEn'])}</p></details></div></div></section>`;
}
export function howtoMarkup(game, locale) {
  const t = copy(locale); return `<h2 id="sheet-title">COUNTER CAM · ${t.howto}</h2><p>${t.guide}</p><p>${t.specialGuide}</p><p>${t.distance}</p><p>${t.demoHint}</p><p>C · KO / B · COUNTER ×3 / A · JUST DODGE ×5 / S · ${t.noDamage} / S+ · PERFECT KO</p><p>${esc(game[locale === 'ja' ? 'privacyJa' : 'privacyEn'])}</p><p>SE: Kenney Impact Sounds · CC0</p>`;
}
export function resultMarkup(game, r, locale) {
  const t = copy(locale);
  return `<section class="cc-result"><div class="cc-meta"><span>COUNTER CAM / ROOKIE ROBOT</span><span>${r.source === 'demo' ? 'PRACTICE' : 'FRONT CAMERA'}</span></div><div class="cc-result-head"><div><p>${r.title === 'KO' ? 'ROBOT. MEET COUNTER.' : 'ONE MORE ROUND?'}</p><h2>${r.title}</h2><span>${(r.elapsed / 1000).toFixed(2)} SEC</span></div><strong class="cc-rank">${r.rank}</strong></div>
    ${r.source === 'demo' ? `<p class="cc-practice-label">${t.demo}</p>` : ''}<dl class="cc-result-stats"><div><dt>COUNTER</dt><dd>×${r.counters}</dd></div><div><dt>PERFECT</dt><dd>×${r.perfectCounters}</dd></div><div><dt>JUST DODGE</dt><dd>×${r.justDodges}</dd></div></dl><p class="cc-result-score">${t.score} <b>${r.score}</b> <span>♥ ${r.lives}/3 · GUARD ×${r.guards}</span></p>
    ${r.creator?.frames.length ? `<div class="cc-replay"><h3>BEST COUNTER <small>7 SEC · ${esc(r.creator.faceMode)}</small></h3><canvas class="cc-replay-canvas" role="img" aria-label="BEST COUNTER"></canvas><div><button class="cc-secondary cc-replay-play" type="button">${t.replay} ↻</button><button class="cc-secondary cc-clip-save" type="button">${locale === 'ja' ? '動画を保存' : 'Save clip'} ↓</button></div><p class="cc-export-status" role="status">${locale === 'ja' ? 'リプレイと保存動画は音声なしです。' : 'Replay and saved clips are silent.'}</p></div>` : ''}
    <div class="result-actions cc-result-actions"><button class="cc-primary" type="button" data-result-action="retry">RETRY ↗</button><button class="cc-secondary" type="button" data-result-action="next">NEXT →</button><button class="cc-text" type="button" data-result-action="share">SHARE ↗</button></div></section>`;
}
class CounterReplay extends Replay {
  constructor(canvas, result) { super(canvas, result); this.frames = result.frames; this.stats = result.stats; }
  outro() {
    const c = this.canvas.getContext('2d'); c.fillStyle = '#142628'; c.fillRect(0, 0, 270, 480); c.textAlign = 'center';
    c.fillStyle = '#ffdb4a'; c.font = '900 36px Impact, sans-serif'; c.fillText('COUNTER CAM', 135, 185);
    c.font = '900 48px Impact, sans-serif'; c.fillText(this.stats.title, 135, 250);
    c.fillStyle = '#fff7db'; c.font = '700 14px Trebuchet MS, sans-serif'; c.fillText(`${(this.stats.elapsed / 1000).toFixed(2)} SEC · ${this.stats.rank}`, 135, 286);
    c.fillText(`PERFECT COUNTER ×${this.stats.perfectCounters}`, 135, 316);
  }
}
export function mountResult(root, r, locale) {
  if (!r.creator?.frames.length) return;
  const canvas = root.querySelector('.cc-replay-canvas'), player = new CounterReplay(canvas, r.creator), button = root.querySelector('.cc-replay-play'), save = root.querySelector('.cc-clip-save'), status = root.querySelector('.cc-export-status');
  let disposed = false, recorder = null, stream = null, timer = null;
  const play = () => player.play(), background = () => { if (document.hidden) { player.stop(); if (recorder?.state === 'recording') recorder.stop(); } };
  const stopRecording = () => { if (recorder?.state === 'recording') recorder.stop(); clearTimeout(timer); stream?.getTracks().forEach(t => t.stop()); stream = null; };
  const encode = () => {
    if (!globalThis.MediaRecorder || !canvas.captureStream) { status.textContent = locale === 'ja' ? 'このブラウザではリプレイのみ利用できます。' : 'This browser supports replay only.'; return; }
    if (recorder?.state === 'recording') return;
    const mime = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/mp4', 'video/webm'].find(m => MediaRecorder.isTypeSupported(m));
    if (!mime) { status.textContent = locale === 'ja' ? 'このブラウザでは動画を保存できません。' : 'Clip saving is unavailable in this browser.'; return; }
    const chunks = []; stream = canvas.captureStream(24); recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 1200000 });
    recorder.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
    recorder.onstop = () => {
      stream?.getTracks().forEach(t => t.stop()); stream = null; clearTimeout(timer); save.disabled = false;
      if (disposed || !chunks.length || document.hidden) return;
      const url = URL.createObjectURL(new Blob(chunks, { type: mime })), link = document.createElement('a');
      link.href = url; link.download = `counter-cam-${r.rank}.${mime.includes('mp4') ? 'mp4' : 'webm'}`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
      status.textContent = locale === 'ja' ? '7秒の動画を保存しました。' : 'Your seven-second clip was saved.';
    };
    recorder.onerror = () => { stopRecording(); status.textContent = locale === 'ja' ? '保存できませんでした。もう一度お試しください。' : 'Could not save. Try again.'; };
    save.disabled = true; status.textContent = locale === 'ja' ? '7秒の動画を準備しています…' : 'Preparing your seven-second clip…'; recorder.start(); player.play(); timer = setTimeout(stopRecording, 7000);
  };
  button.addEventListener('click', play); save.addEventListener('click', encode); document.addEventListener('visibilitychange', background); player.play();
  return () => { disposed = true; stopRecording(); button.removeEventListener('click', play); save.removeEventListener('click', encode); document.removeEventListener('visibilitychange', background); player.dispose(); };
}
export function discardResult(result) { if (result?.creator) { result.creator.frames = []; result.creator.events = []; } }
export function paint() {}
export function handleLaunchClick(root, event) {
  const entry = root.querySelector('.cc-entry'), mode = event.target.closest('[data-creator-mode]'), face = event.target.closest('[data-face-mode]');
  if (!entry || (!mode && !face)) return false;
  if (mode) { entry.dataset.mode = mode.dataset.creatorMode; entry.querySelector('.creator-face-picker').hidden = entry.dataset.mode !== 'creator'; entry.querySelectorAll('[data-creator-mode]').forEach(b => b.setAttribute('aria-pressed', String(b === mode))); }
  if (face) { entry.dataset.face = face.dataset.faceMode; entry.querySelectorAll('[data-face-mode]').forEach(b => b.setAttribute('aria-pressed', String(b === face))); }
  return true;
}
export function readOptions(root) { const e = root.querySelector('.cc-entry'); return { creator: e?.dataset.mode === 'creator', faceMode: e?.dataset.face ?? 'ORIGINAL' }; }
