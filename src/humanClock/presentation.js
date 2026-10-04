import cover from './assets/cover-v3.webp';
import { copy } from './messages.js';
import { formatTime } from './core.js';
import { escapeHtml as esc } from '../platform/copy.js';
import './humanClock.css';
export function launchMarkup(game, locale) {
  const t=copy(locale);let difficulty='easy';try{difficulty=localStorage.getItem('human-clock-difficulty')==='normal'?'normal':'easy';}catch{}
  return `<section class="hc-entry"><div class="hc-meta"><span>EXP-050 / HUMAN CLOCK</span><span>30 SEC · TWO HANDS</span></div>
    <div class="hc-entry-grid"><div class="hc-cover"><img src="${cover}" width="768" height="1152" alt="${locale==='ja'?'時計盤の中で、2本の人差し指そのものが短針と長針になったイラスト':'Two index fingers inside a clock dial become the hour and minute hands'}"><h1>HUMAN<br><span>CLOCK</span><i aria-hidden="true">↗</i></h1><span class="hc-cover-note">YOUR FINGERS.<br>YOUR TIME.</span></div>
    <div class="hc-entry-copy"><p class="hc-kicker">MAKE TIME WITH YOUR HANDS.</p><p class="hc-tagline">${t.tagline}</p>
    <ol class="hc-steps">${t.steps.map(([title,body],i)=>`<li><b>0${i+1}</b><div><strong>${title}</strong><span>${body}</span></div></li>`).join('')}</ol>
    <fieldset class="hc-difficulty"><legend>${t.difficulty}</legend><label><input type="radio" name="hc-difficulty" value="easy" ${difficulty==='easy'?'checked':''}><span><b>EASY</b><small>${t.easy}</small></span></label><label><input type="radio" name="hc-difficulty" value="normal" ${difficulty==='normal'?'checked':''}><span><b>NORMAL</b><small>${t.normal}</small></span></label></fieldset>
    <div class="launch-controls hc-launch"><button type="button" class="launch-camera hc-primary" disabled>${t.play} ↗</button><button type="button" class="launch-demo hc-secondary" disabled>${t.practice}</button><button type="button" class="launch-howto hc-text">${t.howto} ↗</button></div><p class="launch-status" role="status"></p>
    <details class="hc-privacy"><summary>${t.privacy}</summary><p>${esc(game[locale==='ja'?'privacyJa':'privacyEn'])}</p></details></div></div></section>`;
}
export function readOptions(panel) {
  const difficulty=panel.querySelector('input[name="hc-difficulty"]:checked')?.value??'easy';try{localStorage.setItem('human-clock-difficulty',difficulty);}catch{}return {difficulty};
}
export function handleLaunchClick(panel,event){if(event.target.closest('.hc-difficulty')){readOptions(panel);return true;}return false;}
export function howtoMarkup(game,locale){
  const t=copy(locale);return `<h2 id="sheet-title">HUMAN CLOCK · ${t.howto}</h2><p>${t.guide}</p><ol>${t.steps.map(([a,b])=>`<li><strong>${a}</strong><p>${b}</p></li>`).join('')}</ol><p>${t.hourTip}</p><p>${t.demoHint}</p><p>±12° · 400ms · 30s · 5 COMBO → TIME RUSH 5s</p><p>${esc(game[locale==='ja'?'privacyJa':'privacyEn'])}</p>`;
}
export function resultMarkup(game,r,locale){
  const t=copy(locale);return `<section class="hc-result"><div class="hc-meta"><span>HUMAN CLOCK / ${r.difficulty.toUpperCase()}</span><span>30 SEC · COMPLETE</span></div><div class="hc-result-grid"><div class="hc-result-art"><img src="${cover}" width="768" height="1152" alt=""><span>TIME,<br>MADE<br>BY YOU.</span></div><div class="hc-result-copy"><p class="hc-kicker">${t.finished}</p><h2>${r.score}<small>TIME${r.score===1?'':'S'}</small></h2><p>${r.score?t.result:t.zero}</p>${r.source==='demo'?`<p class="hc-practice-label">PRACTICE · ${t.practiceResult}</p>`:''}
    <dl class="hc-result-stats"><div><dt>${t.bestCombo}</dt><dd>×${r.bestCombo}</dd></div><div><dt>${t.fastest}</dt><dd>${r.fastest==null?'—':`${r.fastest.toFixed(1)}${t.seconds}`}</dd></div><div><dt>${t.skips}</dt><dd>${r.skipped}</dd></div></dl>
    ${r.completed.length?`<div class="hc-history"><p>${t.history}</p><div>${r.completed.map(time=>`<span>${formatTime(time)}</span>`).join('')}</div></div>`:''}
    <div class="result-actions hc-result-actions"><button class="hc-primary" type="button" data-result-action="retry">${t.again} ↗</button><button class="hc-secondary" type="button" data-result-action="next">${t.next} →</button><button class="hc-text" type="button" data-result-action="share">${t.share} ↗</button></div></div></div></section>`;
}
export function paint(){}
