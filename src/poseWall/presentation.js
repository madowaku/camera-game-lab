import cover from './assets/cover-v1.webp';
import { copy } from './messages.js';
import { escapeHtml as esc } from '../platform/copy.js';
import './poseWall.css';
export function launchMarkup(game, locale) {
  const t = copy(locale);
  return `<section class="pw-entry"><div class="pw-meta"><span>EXP-048 / THE POSE SHOW</span><span>5 WALLS · 15 SEC</span></div>
    <div class="pw-entry-grid"><div class="pw-cover"><img src="${cover}" width="768" height="1152" alt="${locale === 'ja' ? 'YとTのポーズの穴が開いたカラフルな壁と明るいゲームショーの舞台' : 'Colorful foam walls with Y and T pose cutouts on a bright game-show stage'}"><h1>POSE<br><span>WALL</span><i aria-hidden="true">✳</i></h1><span class="pw-sticker">MAKE<br>THE<br>SHAPE!</span></div>
    <div class="pw-entry-copy"><p class="pw-kicker">YOUR BODY. YOUR TICKET THROUGH.</p><p class="pw-tagline">${t.tagline}</p><ol class="pw-steps">${t.steps.map(([a, b], i) => `<li><b>0${i + 1}</b><div><strong>${a}</strong><span>${b}</span></div></li>`).join('')}</ol>
    <div class="launch-controls pw-launch"><button type="button" class="launch-camera pw-primary" disabled>${t.play} ↗</button><button type="button" class="launch-demo pw-secondary" disabled>${t.practice}</button><button type="button" class="launch-howto pw-text">${t.howto} ↗</button></div><p class="launch-status" role="status"></p>
    <details class="pw-privacy"><summary>${t.privacy}</summary><p>${esc(game[locale === 'ja' ? 'privacyJa' : 'privacyEn'])}</p></details></div></div></section>`;
}
export function howtoMarkup(game, locale) {
  const t = copy(locale); return `<h2 id="sheet-title">POSE WALL · ${t.howto}</h2><p>${t.guide}</p><ol>${t.steps.map(([a, b]) => `<li><strong>${a}</strong><p>${b}</p></li>`).join('')}</ol><p>${t.tip}</p><p>${t.demoHint}</p><p>PERFECT 90–100 · CLEAR 70–89 · SQUEEZE 50–69 · CRASH 0–49</p><p>${esc(game[locale === 'ja' ? 'privacyJa' : 'privacyEn'])}</p>`;
}
export function resultMarkup(game, r, locale) {
  const t = copy(locale);
  return `<section class="pw-result"><div class="pw-meta"><span>POSE WALL / THE POSE SHOW</span><span>5 / 5 · COMPLETE</span></div><div class="pw-result-banner"><img src="${cover}" width="768" height="1152" alt=""><span aria-hidden="true">${r.score >= 70 ? '✳' : r.score >= 50 ? '〰' : '✹'}</span></div><p class="pw-result-title">${r.title}</p><h2>${r.score}<small>%</small></h2><p class="pw-average">${t.average}</p>${r.source === 'demo' ? `<p class="pw-practice-label">${t.demo}</p>` : ''}
    <div class="pw-ranks">${Object.entries(r.counts).map(([rank, count]) => `<div data-rank="${rank}"><span>${rank}</span><b>${count}</b></div>`).join('')}</div>
    <dl class="pw-best"><div><dt>${t.best}</dt><dd>WALL ${r.best.index + 1} · ${r.best.score}%</dd></div><div><dt>${t.combo}</dt><dd>×${r.bestCombo}</dd></div></dl>
    <div class="pw-result-walls">${r.walls.map(w => `<div data-rank="${w.rank}"><small>${w.name}</small><b>${w.score}%</b></div>`).join('')}</div>
    <div class="result-actions pw-result-actions"><button type="button" class="pw-primary" data-result-action="retry">${t.again} ↗</button><button type="button" class="pw-secondary" data-result-action="next">${t.next} →</button><button type="button" class="pw-text" data-result-action="share">${t.share} ↗</button></div></section>`;
}
export function paint() {}
