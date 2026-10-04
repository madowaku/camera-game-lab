import cover from './assets/cover-v1.webp';
import { copy } from './messages.js';
import { escapeHtml as esc } from '../platform/copy.js';
import './dontLaugh.css';
export function launchMarkup(game, locale) {
  const t = copy(locale);
  return `<section class="dl-entry" data-mode="play" data-face="ORIGINAL"><div class="dl-meta"><span>EXP-055 / SELF CONTROL</span><span>ONE FACE · 15 SEC</span></div><div class="dl-entry-grid"><div class="dl-cover"><img src="${cover}" width="768" height="1152" alt="${locale === 'ja' ? '真顔のプレイヤーと小さな自分の分身、頭に乗った黄色い小鳥' : 'A deadpan player, tiny copies of himself and a serious yellow bird'}"><h1>DON’T<br>LAUGH<span>😐</span></h1><div class="dl-sticker">YOU vs.<br>YOURSELF.</div><small>KEEP. IT. STRAIGHT.</small></div><div class="dl-entry-copy"><p class="dl-kicker">YOUR FACE IS THE FINAL BOSS.</p><p class="dl-tagline">${t.tagline}</p><ol class="dl-steps">${t.steps.map(([a, b], i) => `<li><b>0${i + 1}</b><div><strong>${a}</strong><span>${b}</span></div></li>`).join('')}</ol><div class="dl-mode-tabs" role="group" aria-label="PLAY / CREATOR"><button type="button" data-dl-mode="play" aria-pressed="true">PLAY</button><button type="button" data-dl-mode="creator" aria-pressed="false">CREATOR</button></div><div class="dl-face-picker" hidden><p>${t.faceChoice}</p><div>${['ORIGINAL', 'EFFECT', 'HIDE'].map(m => `<button type="button" data-dl-face="${m}" aria-pressed="${m === 'ORIGINAL'}">${m}<small>${t[m]}</small></button>`).join('')}</div><p>${t.creatorNotice}</p></div><div class="launch-controls dl-launch"><button type="button" class="launch-camera dl-primary" disabled>PLAY ↗</button><button type="button" class="launch-demo dl-secondary" disabled>${t.practice}</button><button type="button" class="launch-howto dl-text">${t.howto} ↗</button></div><p class="launch-status" role="status"></p><details class="dl-privacy"><summary>${t.privacy}</summary><p>${esc(game[locale === 'ja' ? 'privacyJa' : 'privacyEn'])}</p></details></div></div></section>`;
}
export function handleLaunchClick(root, e) {
  const entry = root.querySelector('.dl-entry'), mode = e.target.closest('[data-dl-mode]'), face = e.target.closest('[data-dl-face]'); if (!entry || (!mode && !face)) return false;
  if (mode) { entry.dataset.mode = mode.dataset.dlMode; entry.querySelector('.dl-face-picker').hidden = entry.dataset.mode !== 'creator'; entry.querySelectorAll('[data-dl-mode]').forEach(b => b.setAttribute('aria-pressed', String(b === mode))); }
  if (face) { entry.dataset.face = face.dataset.dlFace; entry.querySelectorAll('[data-dl-face]').forEach(b => b.setAttribute('aria-pressed', String(b === face))); } return true;
}
export function readOptions(root) { const e = root.querySelector('.dl-entry'); return { creator: e?.dataset.mode === 'creator', faceMode: e?.dataset.face ?? 'ORIGINAL' }; }
export function howtoMarkup(game, locale) { const t = copy(locale); return `<h2 id="sheet-title">DON’T LAUGH · ${t.howto}</h2><p>${t.guide}</p><p>${t.demoHint}</p><p>${t.creatorNotice}</p><p>${esc(game[locale === 'ja' ? 'privacyJa' : 'privacyEn'])}</p><p>SE: Kenney UI SFX Set · CC0</p>`; }
export function resultMarkup(game, r, locale) {
  const t = copy(locale), survived = r.reason === 'survived';
  return `<section class="dl-result"><div class="dl-meta"><span>DON’T LAUGH / NORMAL</span><span>${r.source === 'demo' ? 'PRACTICE' : 'FRONT CAMERA'}</span></div><div class="dl-result-title"><p>${survived ? 'SURVIVED 😐✨' : 'CAUGHT YOU.'}</p><span>${survived ? t.survived : t.caught}</span><small>YOU LASTED</small><h2>${r.elapsed.toFixed(2)}<em>SEC</em></h2><b>BEST: ${r.best.toFixed(2)} sec</b></div>${r.source === 'demo' ? `<p class="dl-practice-label">${t.demo}</p>` : ''}<div class="dl-result-media"><figure class="dl-photo"><canvas width="270" height="480" role="img" aria-label="${survived ? 'SURVIVED' : 'CAUGHT YOU'}"></canvas><figcaption>${survived ? 'THE STRAIGHT FACE.' : 'THE FACE THAT GAVE YOU AWAY.'}</figcaption></figure><div class="dl-replay"><h3>${survived ? 'THE FINAL ATTACK' : 'THE MOMENT YOU CRACKED'}</h3><canvas width="270" height="480" role="img" aria-label="DON’T LAUGH REPLAY"></canvas><div class="dl-replay-actions"><button class="dl-secondary dl-replay-play" type="button">${t.replay} ↻</button>${r.creator ? `<button class="dl-secondary dl-save" type="button">${t.save} ↓</button>` : ''}</div><p>${t.local}</p>${r.creator ? `<p class="dl-export-status" role="status">${t.silent}</p>` : ''}</div></div><div class="result-actions dl-result-actions"><button type="button" class="dl-primary" data-result-action="retry">${t.again} ↗</button><button type="button" class="dl-secondary" data-result-action="next">${t.next} →</button><button type="button" class="dl-text" data-result-action="share">${t.share} ↗</button></div></section>`;
}
export function paint(root, r) { const c = root.querySelector('.dl-photo canvas'); if (c && r?.photo?.width) c.getContext('2d').drawImage(r.photo, 0, 0, c.width, c.height); }
export function mountResult(root, r, locale) {
  const canvas = root.querySelector('.dl-replay canvas'), button = root.querySelector('.dl-replay-play'), save = root.querySelector('.dl-save'), status = root.querySelector('.dl-export-status'), t = copy(locale);
  let raf = null, generation = 0, recorder = null, stream = null, timer = null, disposed = false, exporting = false;
  const duration = 3000, frames = r.replay.frames, first = frames[0]?.time ?? 0, last = frames.at(-1)?.time ?? first;
  function stop() { ++generation; if (raf != null) cancelAnimationFrame(raf); raf = null; }
  function play() {
    if (disposed) return; stop(); const token = generation, started = performance.now(), c = canvas.getContext('2d');
    const tick = now => {
      if (token !== generation || disposed) return;
      const elapsed = now - started, time = first + Math.min(last - first, elapsed / 1000);
      let frame = frames[0]; for (const f of frames) { if (f.time > time) break; frame = f; }
      const source = frame?.canvas ?? r.photo; if (source?.width) c.drawImage(source, 0, 0, canvas.width, canvas.height);
      if (elapsed >= (last - first) * 1000) { c.fillStyle = '#ffdf3b'; c.fillRect(0, 380, 270, 100); c.textAlign = 'center'; c.fillStyle = '#181b19'; c.font = '900 23px sans-serif'; c.fillText(r.reason === 'laughed' ? 'CAUGHT YOU.' : 'SURVIVED.', 135, 417); c.font = '900 28px sans-serif'; c.fillText(`${r.elapsed.toFixed(2)} SEC`, 135, 456); }
      if (elapsed < duration) raf = requestAnimationFrame(tick); else raf = null;
    }; raf = requestAnimationFrame(tick);
  }
  function stopRecording() { if (recorder?.state === 'recording') recorder.stop(); clearTimeout(timer); stream?.getTracks().forEach(track => track.stop()); stream = null; }
  function encode() {
    if (exporting || disposed) return;
    const mime = globalThis.MediaRecorder && canvas.captureStream && ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/mp4', 'video/webm'].find(m => MediaRecorder.isTypeSupported(m));
    if (!mime) { status.textContent = t.unsupported; return; }
    try {
      const chunks = []; stream = canvas.captureStream(24); recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 1200000 }); exporting = true; save.disabled = true; button.disabled = true;
      recorder.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
      recorder.onstop = () => { stream?.getTracks().forEach(track => track.stop()); stream = null; clearTimeout(timer); exporting = false; save.disabled = false; button.disabled = false;
        if (disposed || document.hidden || !chunks.length) return;
        const url = URL.createObjectURL(new Blob(chunks, { type: mime })), link = document.createElement('a'); link.href = url; link.download = `dont-laugh-${r.elapsed.toFixed(2)}sec.${mime.includes('mp4') ? 'mp4' : 'webm'}`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); status.textContent = t.saved;
      };
      recorder.onerror = () => { stopRecording(); status.textContent = t.saveError; }; recorder.start(); play(); status.textContent = t.preparing; timer = setTimeout(stopRecording, duration + 100);
    } catch { stopRecording(); exporting = false; save.disabled = false; button.disabled = false; status.textContent = t.saveError; }
  }
  const replay = () => { if (!exporting) play(); }, background = () => { if (document.hidden) { stop(); stopRecording(); } };
  button.addEventListener('click', replay); save?.addEventListener('click', encode); document.addEventListener('visibilitychange', background); play();
  return () => { disposed = true; stop(); stopRecording(); button.removeEventListener('click', replay); save?.removeEventListener('click', encode); document.removeEventListener('visibilitychange', background); canvas.width = 0; };
}
export function discardResult(r) { if (r?.photo) r.photo.width = 0; r?.replay?.frames.forEach(f => { f.canvas.width = 0; }); if (r?.replay) r.replay.frames = []; }
