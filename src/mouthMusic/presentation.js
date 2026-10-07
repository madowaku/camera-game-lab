import { copy } from './view.js';
import { MouthMusicAudio } from './audio.js';
import { escapeHtml as esc } from '../platform/copy.js';
import './style.css';

export function launchMarkup(game, locale) {
  const t = copy(locale), ja = locale === 'ja';
  return `<section class="mm-entry"><p class="mm-meta">TECH-003 · 30 SEC · 5 SHAPES</p><h1>MOUTH<br><em>MUSIC</em></h1><p class="mm-tagline">${t.tagline}</p>
    <div class="mm-poster" aria-hidden="true"><span>●</span><span>▲</span><span>◆</span><span>★</span><span>♥</span><b>◡</b><small>YOU ARE THE INSTRUMENT.</small></div>
    <p>${t.instruction}</p><p>${ja ? '適当に食べても、小さな曲に。まとめて食べると和音。演奏が育つ30秒。' : 'Every bite makes a little melody. Catch shapes together for a chord. Grow your music in 30 seconds.'}</p>
    <div class="launch-controls"><button class="launch-camera mm-primary" type="button" disabled>PLAY ↗</button><button class="launch-demo" type="button" disabled>${t.practice}</button><button class="launch-howto" type="button">${ja ? '遊び方' : 'HOW TO PLAY'}</button></div><p class="launch-status" role="status"></p><p class="mm-privacy">${esc(game[ja ? 'privacyJa' : 'privacyEn'])}</p></section>`;
}
export function howtoMarkup(game, locale) {
  const ja = locale === 'ja';
  return `<h2 id="sheet-title">MOUTH MUSIC</h2><ol><li>${ja ? '顔を映して、口を閉じて待つ。' : 'Show your face and wait with your mouth closed.'}</li><li>${ja ? '音の粒が口に集まったら、開けてパクッ。次は一度閉じる。' : 'When shapes gather at your mouth, open wide. Close again for the next bite.'}</li><li>${ja ? '2個ならCHORD、3個ならTRIAD。連続成功で曲が育つ。' : 'Two shapes make a CHORD, three a TRIAD. Keep catching to grow your music.'}</li><li>${ja ? 'MUSIC / SIMPLE SE、SOUND ON / OFFを切り替えて楽しさを比べる。' : 'Compare MUSIC / SIMPLE SE and SOUND ON / OFF.'}</li></ol><p>${esc(game[ja ? 'privacyJa' : 'privacyEn'])}</p>`;
}
const questions = locale => locale === 'ja' ? [
  '発音が遅れて感じない', '口を開く感覚と音が一致する', '適当に食べても心地よい曲になる',
  'Comboで曲が育つのが楽しい', 'Camera認識FPSに悪影響がない', 'Android Chrome実機で安定',
  '音ありの方が楽しい', '普通のSEより「口で音を食べる」方が明らかに楽しい',
] : ['Sound feels immediate', 'Mouth opening and sound feel synchronized', 'Random bites sound musical',
  'Growing the music is fun', 'Camera tracking FPS stays stable', 'Stable on physical Android Chrome',
  'More fun with sound', 'Eating music is clearly more fun than simple SE'];

export function resultMarkup(game, r, locale) {
  const t = copy(locale), ja = locale === 'ja', p = r.performance ?? {}, number = v => Number.isFinite(v) ? v.toFixed(1) : 'n/a';
  return `<section class="mm-result"><p class="mm-meta">TECH-003 · MOUTH MUSIC</p><h2>YOUR<br><em>MUSIC</em></h2><div class="mm-result-count"><strong>${r.notesEaten}<small>NOTES</small></strong><strong>${r.chords}<small>CHORDS</small></strong><strong>${r.triads}<small>TRIADS</small></strong></div><p>${t.layers[r.stage]} · ${r.maxCombo} COMBO</p>${r.source === 'demo' ? `<p>${t.practice}</p>` : ''}
    <button class="mm-listen" type="button" ${r.melody.length ? '' : 'disabled'}>▶ ${ja ? 'きみの演奏を聴く' : 'LISTEN TO YOUR MUSIC'}</button>
    <div class="result-actions"><button class="mm-primary" type="button" data-result-action="retry">${t.again}</button><button type="button" data-result-action="next">${t.next}</button><button type="button" data-result-action="share">${t.share}</button></div>
    <details class="mm-validation"><summary>TECH VALIDATION</summary><p>${ja ? '同じ遊びをMUSIC / SIMPLE SE / SOUND OFFで比べてから記録。採用判断は自分で選びます。' : 'Compare MUSIC / SIMPLE SE / SOUND OFF before recording. You choose the verdict.'}</p>
    <p>${esc(r.source)} · ${esc(p.mode ?? 'music')} · SOUND ${p.sound ? 'ON' : 'OFF'} · BACKING ${p.backing ? 'ON' : 'OFF'}</p>
    <pre>RENDER ${number(p.renderFps)} FPS · INPUT ${number(p.inputFps)} FPS
INFERENCE ${number(p.inferenceMs)} ms · FRAME → AUDIO ${number(p.dispatchMs)} ms
BASE ${number(p.baseMs)} ms · OUTPUT ${number(p.outputMs)} ms</pre><p>${ja ? '処理とAPIの参考値です。口から耳までの遅延や実機の安定性を証明する値ではありません。' : 'Processing and API estimates do not prove mouth-to-ear latency or device stability.'}</p>
    <form class="mm-verdict-form">${questions(locale).map((q, i) => `<label>${q}<select name="q${i}" required><option value="pending">${ja ? '未確認' : 'UNTESTED'}</option><option value="yes">YES</option><option value="no">NO</option></select></label>`).join('')}
    <label>VERDICT<select name="verdict"><option value="PENDING">${ja ? '未決定' : 'UNDECIDED'}</option><option>ADOPT</option><option>TRY AGAIN</option><option>PARK</option></select></label><label>${ja ? 'メモ / 端末 / 比較した感想' : 'Notes / device / comparison'}<textarea name="notes" rows="3" maxlength="2000"></textarea></label><button type="submit">${ja ? 'この端末に検証結果を保存' : 'SAVE VALIDATION ON THIS DEVICE'}</button><p class="mm-saved" role="status"></p></form></details></section>`;
}
export function paint() {}
export function mountResult(root, result, locale) {
  const audio = new MouthMusicAudio(), button = root.querySelector('.mm-listen'), form = root.querySelector('.mm-verdict-form');
  const ja = locale === 'ja'; let playing = false, disposed = false;
  const reset = () => { playing = false; button.textContent = `▶ ${ja ? 'きみの演奏を聴く' : 'LISTEN TO YOUR MUSIC'}`; button.setAttribute('aria-pressed', 'false'); };
  const play = async () => {
    if (playing) { audio.dispose(); reset(); return; }
    playing = true; button.textContent = '■ STOP'; button.setAttribute('aria-pressed', 'true');
    try { await audio.play(result.melody, () => { audio.dispose(); reset(); }); }
    catch { if (!disposed) { audio.dispose(); reset(); root.querySelector('.mm-saved').textContent = ja ? '音を再開できませんでした。' : 'Audio could not resume.'; } }
  };
  const save = e => {
    e.preventDefault(); const data = new FormData(form), feedback = Object.fromEntries(data);
    const record = { tech: 'TECH-003', recordedAt: new Date().toISOString(), source: result.source,
      device: navigator.userAgent, result: { ...result, melody: undefined }, feedback };
    try {
      const key = 'camera-game-lab-tech-003-validation', saved = JSON.parse(localStorage.getItem(key) ?? '[]');
      localStorage.setItem(key, JSON.stringify([...(Array.isArray(saved) ? saved : []), record].slice(-30)));
      root.querySelector('.mm-saved').textContent = ja ? 'この端末に保存しました。' : 'Saved on this device.';
    } catch { root.querySelector('.mm-saved').textContent = ja ? '端末への保存ができませんでした。' : 'Device storage is unavailable.'; }
  };
  const background = () => { if (document.hidden) { audio.dispose(); reset(); } };
  const blur = () => { audio.dispose(); reset(); };
  button.addEventListener('click', play); form.addEventListener('submit', save);
  document.addEventListener('visibilitychange', background); window.addEventListener('blur', blur);
  return () => { disposed = true; audio.dispose(); button.removeEventListener('click', play); form.removeEventListener('submit', save); document.removeEventListener('visibilitychange', background); window.removeEventListener('blur', blur); };
}
