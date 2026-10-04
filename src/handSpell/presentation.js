import dragon from './assets/dragon-v1.webp';
import enemy from './assets/enemy-v1.webp';
import { SPELLS, ALL_SPELLS, GLYPHS } from './core.js';
import { readBook } from './book.js';
import { replayFrame } from './replay.js';
import { copy } from './messages.js';
import { escapeHtml as esc } from '../platform/copy.js';
import './handSpell.css';

const spell = id => ALL_SPELLS.find(s => s.id === id) ?? ALL_SPELLS.at(-1);
export function bookMarkup(book, locale) {
  const t = copy(locale);
  return `<section class="hs-book"><div><h3>SPELL BOOK</h3><span>${t.book} · ${book.length} / 10</span></div><ol>${ALL_SPELLS.map(s => `<li class="${book.includes(s.id) ? 'is-found' : 'is-unknown'}"><b aria-hidden="true">${book.includes(s.id) ? s.icon : '✦'}</b><span>${book.includes(s.id) ? s.name : '???'}</span></li>`).join('')}</ol></section>`;
}
export function launchMarkup(game, locale) {
  const t = copy(locale);
  return `<section class="hs-entry" data-mode="play" data-face="ORIGINAL" data-spell="0"><div class="hs-meta"><span>EXP-056 / HAND SPELL</span><span>ONE WIZARD · 15 SEC</span></div>
    <div class="hs-entry-grid"><div class="hs-cover"><div class="hs-cover-ring"></div><img class="hs-cover-dragon" src="${dragon}" width="768" height="768" alt="${locale === 'ja' ? '光り輝く炎龍の魔法' : 'A colossal dragon made of golden fire'}"><img class="hs-cover-enemy" src="${enemy}" width="768" height="768" alt=""><div class="hs-cover-title"><p>CAN YOU CAST THIS?</p><h1>HAND<br><em>SPELL</em></h1></div><div class="hs-cover-signs"><span>☝</span><i>→</i><span>✌</span><i>→</i><span>🤟</span></div><small>EPIC MAGIC. QUESTIONABLE RESULTS.</small></div>
    <div class="hs-entry-copy"><p class="hs-kicker">YOUR HANDS. UNLIMITED POSSIBILITIES.</p><p class="hs-tagline">${t.tagline}</p><ol class="hs-steps">${t.steps.map(([a, b], i) => `<li><b>0${i + 1}</b><div><strong>${a}</strong><span>${b}</span></div></li>`).join('')}</ol>
    <label class="hs-spell-picker">${t.choose}<select aria-label="${t.choose}">${SPELLS.map((s, i) => `<option value="${i}">${s.name}</option>`).join('')}</select></label>
    <div class="hs-mode-tabs" role="group" aria-label="PLAY / CREATOR"><button type="button" data-hs-mode="play" aria-pressed="true">PLAY</button><button type="button" data-hs-mode="creator" aria-pressed="false">CREATOR <small>15s → 7s</small></button></div>
    <div class="hs-face-picker" hidden><p>${t.faceChoice}</p><div>${['ORIGINAL', 'EFFECT', 'HIDE'].map(m => `<button type="button" data-hs-face="${m}" aria-pressed="${m === 'ORIGINAL'}">${m}<small>${t[m]}</small></button>`).join('')}</div><p>${t.creatorNotice}</p></div>
    <div class="launch-controls hs-launch"><button type="button" class="launch-camera hs-primary" disabled>PLAY ↗</button><button type="button" class="launch-demo hs-secondary" disabled>${t.practice}</button><button type="button" class="launch-howto hs-text">${t.howto} ↗</button></div><p class="launch-status" role="status"></p><details class="hs-privacy"><summary>${t.privacy}</summary><p>${esc(game[locale === 'ja' ? 'privacyJa' : 'privacyEn'])}</p></details></div></div>${bookMarkup(readBook(), locale)}</section>`;
}
export function handleLaunchClick(root, e) {
  const entry = root.querySelector('.hs-entry'), mode = e.target.closest('[data-hs-mode]'), face = e.target.closest('[data-hs-face]');
  if (!entry || (!mode && !face)) return false;
  if (mode) { entry.dataset.mode = mode.dataset.hsMode; entry.querySelector('.hs-face-picker').hidden = entry.dataset.mode !== 'creator'; entry.querySelectorAll('[data-hs-mode]').forEach(b => b.setAttribute('aria-pressed', String(b === mode))); }
  if (face) { entry.dataset.face = face.dataset.hsFace; entry.querySelectorAll('[data-hs-face]').forEach(b => b.setAttribute('aria-pressed', String(b === face))); }
  return true;
}
export function readOptions(root) { const e = root.querySelector('.hs-entry'); return { creator: e?.dataset.mode === 'creator', faceMode: e?.dataset.face ?? 'ORIGINAL', spell: Number(e?.querySelector('select')?.value) || 0 }; }
export function howtoMarkup(game, locale) {
  const t = copy(locale), ja = locale === 'ja';
  return `<h2 id="sheet-title">HAND SPELL · ${t.howto}</h2>${t.steps.map(([a, b]) => `<p><strong>${a}</strong><br>${b}</p>`).join('')}<p>${ja ? 'グー・パー・人差し指・Vサイン・3本指。THREEは人差し指＋中指＋薬指、または親指＋人差し指＋小指。手首と指先まで映し、印を少しキープ。同じ印は一度ほどいてから。印が消えたら、自分で思い出そう。' : 'FIST, PALM, ONE, TWO, THREE. THREE accepts index + middle + ring, or thumb + index + pinky. Keep wrist and tips visible. Hold briefly. Relax before repeating a sign. Recall the spell after its signs disappear.'}</p><p>${t.cameraHint}</p><p>${t.demoHint}</p><p>${t.creatorNotice}</p><p>${esc(game[ja ? 'privacyJa' : 'privacyEn'])}</p><p>SE: Kenney RPG Audio / Impact Sounds · CC0</p>`;
}
export function resultMarkup(game, r, locale) {
  const t = copy(locale), s = spell(r.spell);
  return `<section class="hs-result" style="--hs-spell:${s.color}"><div class="hs-meta"><span>HAND SPELL / ROUND COMPLETE</span><span>${r.source === 'demo' ? 'PRACTICE' : 'FRONT CAMERA'}</span></div><div class="hs-result-heading"><p>${r.perfect ? 'PERFECT' : 'UNEXPECTED MAGIC'}</p><div class="hs-result-icon">${s.icon}</div><h2>${s.name}</h2><span>${r.isNew ? t.newSpell : t.book}</span><p class="hs-result-signs">${r.signs.length ? r.signs.map(v => `${GLYPHS[v]} ${v}`).join(' → ') : '—'}</p><small>${r.released ? 'RELEASE ✓' : 'TIME OUT'} · 15 SEC</small></div>
    ${r.creator ? `<div class="hs-replay"><div><h3>THE CAST / 7 SEC</h3><span>${r.creator.faceMode} · ${r.source === 'demo' ? 'PRACTICE' : 'CAMERA'}</span></div><canvas width="270" height="480" role="img" aria-label="HAND SPELL REPLAY"></canvas><div class="hs-replay-actions"><button type="button" class="hs-secondary hs-replay-play">${t.replay} ↻</button><button type="button" class="hs-secondary hs-save">${t.save} ↓</button></div><p class="hs-export-status" role="status">${t.silent}</p><p>${t.local}</p></div>` : ''}
    ${bookMarkup(r.book ?? [], locale)}<div class="result-actions hs-result-actions"><button type="button" class="hs-primary" data-result-action="retry">${t.again} ↗</button><button type="button" class="hs-secondary" data-result-action="next">${t.next} →</button><button type="button" class="hs-text" data-result-action="share">${t.share} ↗</button></div></section>`;
}
export function paint() {}
export function mountResult(root, result, locale) {
  const replay = result.creator, canvas = root.querySelector('.hs-replay canvas'); if (!replay || !canvas) return;
  const button = root.querySelector('.hs-replay-play'), save = root.querySelector('.hs-save'), status = root.querySelector('.hs-export-status'), t = copy(locale);
  let raf = null, generation = 0, disposed = false, recorder = null, stream = null, timer = null, exporting = false;
  function stop() { generation++; if (raf != null) cancelAnimationFrame(raf); raf = null; }
  function draw(elapsed) {
    const frame = replayFrame(replay, elapsed), c = canvas.getContext('2d'); c.fillStyle = '#140c28'; c.fillRect(0, 0, 270, 480);
    if (frame?.canvas.width) c.drawImage(frame.canvas, 0, 0, 270, 480);
    c.fillStyle = '#100a24de'; c.fillRect(0, 0, 270, 43); c.fillStyle = '#f3e7c8'; c.font = '900 15px sans-serif'; c.textAlign = 'center'; c.fillText('CAN YOU CAST THIS?', 135, 20); c.font = '700 10px sans-serif'; c.fillStyle = '#d5ff78'; c.fillText(result.source === 'demo' ? 'HAND SPELL · PRACTICE' : 'HAND SPELL · FRONT CAMERA', 135, 35);
  }
  function play() {
    if (disposed) return; stop(); const token = generation, started = performance.now();
    const tick = now => { if (disposed || token !== generation) return; const elapsed = Math.min(7000, now - started); draw(elapsed); if (elapsed < 7000) raf = requestAnimationFrame(tick); else raf = null; }; draw(0); raf = requestAnimationFrame(tick);
  }
  function releaseStream() { stream?.getTracks().forEach(t => t.stop()); stream = null; }
  function stopRecording() { clearTimeout(timer); if (recorder?.state === 'recording') recorder.stop(); releaseStream(); }
  function encode() {
    if (exporting || disposed) return;
    const mime = globalThis.MediaRecorder && canvas.captureStream && ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/mp4', 'video/webm'].find(m => MediaRecorder.isTypeSupported(m));
    if (!mime) { status.textContent = t.unsupported; return; }
    try {
      const chunks = []; draw(0); stream = canvas.captureStream(24); recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 1500000 }); exporting = true; save.disabled = true; button.disabled = true;
      recorder.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
      recorder.onstop = () => { releaseStream(); clearTimeout(timer); exporting = false; save.disabled = false; button.disabled = false; if (disposed || document.hidden || !chunks.length) return;
        const url = URL.createObjectURL(new Blob(chunks, { type: mime })), link = document.createElement('a'); link.href = url; link.download = `hand-spell-${result.spell.toLowerCase()}-7s.${mime.includes('mp4') ? 'mp4' : 'webm'}`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); status.textContent = t.saved;
      };
      recorder.onerror = () => { stopRecording(); status.textContent = t.saveError; }; recorder.start(); play(); status.textContent = t.preparing; timer = setTimeout(stopRecording, 7100);
    } catch { stopRecording(); exporting = false; save.disabled = false; button.disabled = false; status.textContent = t.saveError; }
  }
  const click = () => { if (!exporting) play(); }, background = () => { if (document.hidden) { stop(); stopRecording(); } };
  button.addEventListener('click', click); save.addEventListener('click', encode); document.addEventListener('visibilitychange', background); play();
  return () => { disposed = true; stop(); stopRecording(); button.removeEventListener('click', click); save.removeEventListener('click', encode); document.removeEventListener('visibilitychange', background); canvas.width = 0; };
}
export function discardResult(r) { r?.creator?.frames.forEach(f => f.canvas.width = 0); if (r?.creator) r.creator.frames = []; }
