import aquarium from './assets/aquarium-v1.webp';
import fish from './assets/fish-v1.webp';
import { escapeHtml as esc } from '../platform/copy.js';
import { mountFishReplay } from './creator.js';
import './humanFish.css';
import '../creator/creator.css';

export function launchMarkup(game, locale) {
  const ja = locale === 'ja';
  return `<section class="hf-entry" data-mode="play" data-face="EFFECT"><div class="hf-entry-meta"><span>EXP-059 / 人面魚生活</span><span>45 SEC · ONE STRANGE LIFE</span></div><div class="hf-entry-grid">
    <div class="hf-cover"><img class="hf-cover-water" src="${aquarium}" alt="${ja ? '珊瑚、水草、沈没船のおもちゃがある美しい水槽' : 'A luminous aquarium with coral, plants and a tiny shipwreck'}"><span class="hf-cover-kicker">A VERY STRANGE LITTLE LIFE.</span><h1>HUMAN<br><em>FISH.</em></h1><img class="hf-cover-fish" src="${fish}" alt="${ja ? '熱帯魚の体に人間の顔がついた人面魚' : 'An iridescent tropical fish with a human face'}"><span class="hf-cover-note">LOOKS LIKE PARADISE.<br>FEELS LIKE HOLDING YOUR BREATH.</span><span class="hf-cover-number">059</span></div>
    <div class="hf-entry-copy"><p class="hf-kicker">WELCOME TO YOUR NEW LIFE.</p><h2>${ja ? '美しい水槽で、<br>欲張りな45秒。' : 'A beautiful tank.<br>A greedy little life.'}</h2><p class="hf-description">${ja ? '人面魚として生き延びる。<br>欲張るほど、息が苦しくなる。' : 'Live as a human fish.<br>The greedier you get, the harder it is to breathe.'}</p>
    <div class="hf-verbs"><div><span>01 / SWIM</span><b>${ja ? '顔で泳ぐ' : 'Move your face'}</b></div><div><span>02 / BITE</span><b>${ja ? '水中でパクッ' : 'Bite underwater'}</b></div><div><span>03 / BREATHE</span><b>${ja ? '水面でぷはっ' : 'Gasp at the surface'}</b></div></div>
    <p class="hf-one-more">${ja ? 'あと1個だけ……帰れる？' : 'Just one more… can you make it back?'}</p>
    <div class="creator-mode-tabs hf-mode-tabs" role="group" aria-label="PLAY / CREATOR"><button type="button" data-creator-mode="play" aria-pressed="true">PLAY</button><button type="button" data-creator-mode="creator" aria-pressed="false">CREATOR</button></div>
    <div class="creator-face-picker hf-face-picker" hidden><p>${ja ? 'きょうの顔を選ぶ' : 'CHOOSE TODAY’S FACE'}</p><div class="creator-face-options">${['EFFECT', 'ORIGINAL', 'HIDE'].map(m => `<button type="button" data-face-mode="${m}" aria-pressed="${m === 'EFFECT'}">${m}<small>${m === 'EFFECT' ? ja ? '鱗＋魚の目' : 'SCALES + FISH EYES' : m === 'ORIGINAL' ? ja ? 'そのままの顔' : 'YOUR OWN FACE' : ja ? '魚の顔' : 'FISH AVATAR'}</small></button>`).join('')}</div><p>${ja ? '息継ぎが主役の7秒リプレイ。動画は音声なし・端末内で生成。' : 'A seven-second gasp highlight. Silent video, composed on your device.'}</p></div>
    <div class="launch-controls hf-launch"><button class="launch-camera hf-primary" type="button" disabled>${ja ? '人面魚になる' : 'BECOME A HUMAN FISH'} ↗</button><button class="launch-demo hf-secondary" type="button" disabled>${ja ? 'カメラなしで練習' : 'PRACTICE WITHOUT CAMERA'}</button><button class="launch-howto hf-text" type="button">${ja ? '遊び方・素材クレジット' : 'HOW TO PLAY & CREDITS'} ↗</button></div><p class="launch-status" role="status"></p>
    <details class="hf-privacy"><summary>${ja ? 'カメラと保存について' : 'CAMERA & SAVING'}</summary><p>${esc(game[ja ? 'privacyJa' : 'privacyEn'])}</p></details></div></div></section>`;
}
export function howtoMarkup(game, locale) {
  const ja = locale === 'ja';
  return `<h2 id="sheet-title">HUMAN FISH / ${ja ? '遊び方' : 'HOW TO PLAY'}</h2><p>${ja ? '正面を向いて約1秒静止すると準備完了。顔を少し左右・上下に動かして泳ぎ、エサに近づいて口をパクッ。水面では、口を閉じてから開き直すと酸素が100%に戻ります。水面へ来るだけでは回復しません。' : 'Look straight ahead for a second to calibrate. Move your face a little left, right, up or down. Get close to food, close your mouth, then open to bite. At the surface, close and reopen to refill oxygen. Reaching the surface alone does not refill it.'}</p>
  <p>${ja ? '小さなエサ +1、エビ +3。20秒から真珠 +10、巨大真珠 +20、黄金のエサ +15。宝物を取ると酸素を余分に消費。巨大真珠の後に出るエビも誘惑です。' : 'Small food +1, shrimp +3. From 20 seconds: pearls +10, giant pearls +20, golden food +15. Treasure costs extra oxygen, and the bonus shrimp is another temptation.'}</p>
  <p>${ja ? '38秒から猫の手。明るい予告ゾーンを横によけて、別の場所で息継ぎしましょう。叩かれると酸素−12、少し下へ押し戻されます。45秒生き延びるか、酸素が尽きると人生記録へ。' : 'From 38 seconds, a cat’s paw approaches. Move sideways out of the warning zone and breathe elsewhere. A hit takes 12 oxygen and pushes you down. Survive 45 seconds, or float away when oxygen runs out.'}</p>
  <p>${ja ? '顔を見失うとその場で浮遊。0.5秒続くと酸素と時間を停止し、顔が戻ると再開します。復帰時は口を閉じてから開いてください。Pで一時停止。練習は水槽をタップ・ドラッグ、矢印 / WASD、画面のボタン / Spaceでパクッ。' : 'Lost tracking leaves the fish floating. After 0.5 seconds oxygen and time pause; one face returning resumes play. Close your mouth before your next bite. P pauses. Practice: tap / drag or arrows / WASD to swim, button / Space to bite.'}</p>
  <p>${ja ? 'PHOTOで「今日の人面魚」を保存。CREATORは実際の息継ぎを中心に7秒を選びます。ORIGINALは自分の顔、EFFECTは鱗と魚の目、HIDEは魚の顔。' : 'PHOTO saves today’s human fish. CREATOR selects seven seconds around a real gasp. ORIGINAL uses your face; EFFECT adds scales and fish eyes; HIDE uses the avatar.'}</p>
  <p>${esc(game[ja ? 'privacyJa' : 'privacyEn'])}</p><p>Art: OpenAI Imagegen · SE: <a href="https://kenney.nl/assets/rpg-audio" target="_blank" rel="noopener noreferrer">Kenney RPG Audio</a> / <a href="https://kenney.nl/assets/impact-sounds" target="_blank" rel="noopener noreferrer">Impact Sounds</a> (CC0) + original Web Audio.</p>`;
}
export function resultMarkup(game, r, locale) {
  const ja = locale === 'ja';
  const stats = [[ja ? '生存時間' : 'LIFETIME', `${r.survival.toFixed(1)} sec`], [ja ? '食べたエサ' : 'FOOD EATEN', r.foods], [ja ? '呼吸回数' : 'BREATHS', r.breaths], [ja ? '最深潜水' : 'DEEPEST DIVE', `${r.maxDepth}%`], [ja ? 'ギリギリ呼吸' : 'LAST-GASP BREATHS', r.closeBreaths], [ja ? '猫に叩かれた' : 'CAT SLAPS', r.catHits]];
  return `<section class="hf-result"><div class="hf-entry-meta"><span>HUMAN FISH REPORT</span><span>${r.source === 'demo' ? 'CAMERA-FREE PRACTICE' : 'ONE LIFE, WELL LIVED.'}</span></div><div class="hf-report-grid"><div class="hf-memory"><img class="hf-portrait" alt="${ja ? '今日の人面魚の水槽写真' : 'Today’s human fish in the aquarium'}"><span>${ja ? '今日の人面魚' : 'TODAY’S HUMAN FISH'}</span>${r.photo ? `<button class="hf-save-photo hf-secondary" type="button">${ja ? '記念写真を保存' : 'SAVE PHOTO'} ↓</button>` : ''}</div>
    <div class="hf-report"><p class="hf-kicker">${r.survived ? 'STILL ALIVE. STILL STRANGE.' : 'ぷかー…… / GAME OVER'}</p><h2>${ja ? `人面魚として<br><strong>${r.survival.toFixed(1)}秒</strong> 生きました` : `You lived as a human fish<br>for <strong>${r.survival.toFixed(1)} seconds.</strong>`}</h2><div class="hf-title"><small>${ja ? 'あなたの称号' : 'YOUR TITLE'}</small><b>「${esc(r[ja ? 'titleJa' : 'titleEn'])}」</b></div><dl class="hf-report-stats">${stats.map(([key, value]) => `<div><dt>${key}</dt><dd>${value}</dd></div>`).join('')}</dl><p class="hf-final-score">COLLECTED <strong>${r.score}</strong> PT</p>${r.source === 'demo' ? `<p class="hf-practice-note">${ja ? 'カメラなしの練習記録です。' : 'This report is from camera-free practice.'}</p>` : ''}
    <div class="result-actions hf-result-actions"><button class="hf-primary" type="button" data-result-action="retry">${ja ? 'もう一度、生きる' : 'ONE MORE LIFE'} ↗</button><button class="hf-secondary" type="button" data-result-action="share">${ja ? '人生記録を共有' : 'SHARE MY LIFE'}</button><button class="hf-text" type="button" data-result-action="next">NEXT →</button></div></div></div>
    ${r.creator?.plan ? `<div class="hf-creator-result"><div><p class="hf-kicker">AUTO DIRECTOR / 7 SEC</p><h3>${ja ? '息継ぎのある人生。' : 'A LIFE WITH A GASP.'}</h3><p>${esc(r.creator.faceMode)} · ${ja ? '動画は音声なし' : 'SILENT VIDEO'}</p><button class="hf-replay hf-secondary" type="button">${ja ? 'リプレイ' : 'REPLAY'} ↻</button><button class="hf-save-clip hf-primary" type="button">${ja ? '7秒の動画を保存' : 'SAVE SEVEN SECONDS'} ↓</button><p class="hf-export-status" role="status"></p></div><canvas class="hf-replay-canvas" role="img" aria-label="HUMAN FISH replay"></canvas></div>` : ''}</section>`;
}
export function mountResult(root, r, locale) {
  const abort = new AbortController(); let url;
  if (r.photo) {
    url = URL.createObjectURL(r.photo); root.querySelector('.hf-portrait').src = url;
    root.querySelector('.hf-save-photo')?.addEventListener('click', () => { const a = document.createElement('a'); a.href = url; a.download = 'todays-human-fish.png'; a.click(); }, { signal: abort.signal });
  } else root.querySelector('.hf-memory').hidden = true;
  const cleanup = mountFishReplay(root, r, locale);
  return () => { abort.abort(); cleanup?.(); if (url) URL.revokeObjectURL(url); };
}
export function discardResult(r) { if (r?.creator) r.creator.frames = []; if (r) r.photo = null; }
export function paint() {}
export function handleLaunchClick(root, e) {
  const entry = root.querySelector('.hf-entry'), mode = e.target.closest('[data-creator-mode]'), face = e.target.closest('[data-face-mode]');
  if (!entry || (!mode && !face)) return false;
  if (mode) { entry.dataset.mode = mode.dataset.creatorMode; entry.querySelector('.hf-face-picker').hidden = entry.dataset.mode !== 'creator'; entry.querySelectorAll('[data-creator-mode]').forEach(b => b.setAttribute('aria-pressed', String(b === mode))); }
  if (face) { entry.dataset.face = face.dataset.faceMode; entry.querySelectorAll('[data-face-mode]').forEach(b => b.setAttribute('aria-pressed', String(b === face))); }
  return true;
}
export function readOptions(root) { const entry = root.querySelector('.hf-entry'); return { creator: entry?.dataset.mode === 'creator', faceMode: entry?.dataset.face || 'EFFECT' }; }
