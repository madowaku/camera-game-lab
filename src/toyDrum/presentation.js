import cover from "./assets/cover-v1.webp";
import { copy } from "./messages.js";
import { escapeHtml as esc } from "../platform/copy.js";
import "./toyDrum.css";
export function launchMarkup(game, locale) {
  const t = copy(locale);
  return `<section class="td-entry"><div class="td-meta"><span>EXP-047 / TOY ROOM</span><span>2 HANDS · 30 SEC</span></div>
    <div class="td-cover"><img src="${cover}" width="1024" height="1536" alt="${locale === "ja" ? "カラフルな4つのおもちゃドラムと、弾ける星や音符" : "Four colorful toy drums bursting with stars and musical notes"}"><h1>TOY<br><span>DRUM</span><i aria-hidden="true">✳</i></h1><span class="td-sticker">MAKE<br>SOME<br>NOISE!</span></div>
    <p class="td-tagline">${t.tagline}</p><ol class="td-steps">${t.steps.map(([a, b], i) => `<li><b>0${i + 1}</b><strong>${a}</strong><span>${b}</span></li>`).join("")}</ol>
    <div class="launch-controls td-launch"><button type="button" class="launch-camera td-primary" disabled>${t.play} ↗</button><button type="button" class="launch-demo td-secondary" disabled>${t.practice}</button><button type="button" class="launch-howto td-text">${t.howto} ↗</button></div><p class="launch-status" role="status"></p>
    <details class="td-privacy"><summary>${t.privacy}</summary><p>${esc(game[locale === "ja" ? "privacyJa" : "privacyEn"])}</p></details></section>`;
}
export function howtoMarkup(game, locale) {
  const t = copy(locale); return `<h2 id="sheet-title">TOY DRUM · ${t.howto}</h2><p>${t.guide}</p><ol>${t.steps.map(([a, b]) => `<li><strong>${a}</strong><p>${b}</p></li>`).join("")}</ol><p>${t.tip}</p><p>${t.demoHint}</p><p>${esc(game[locale === "ja" ? "privacyJa" : "privacyEn"])}</p>`;
}
export function resultMarkup(game, r, locale) {
  const t = copy(locale);
  return `<section class="td-result"><div class="td-meta"><span>TOY DRUM / YOUR LITTLE BAND</span><span>30 SEC · COMPLETE</span></div><div class="td-result-art"><img src="${cover}" alt="" width="1024" height="1536"><span aria-hidden="true">${r.finishSuccess ? "✳" : "♫"}</span></div><p class="td-result-heading">${t.thanks}</p><h2>${r.score}<small>${t.total}</small></h2>
    ${r.source === "demo" ? `<p class="td-practice">${t.demo}</p>` : ""}<dl class="td-stats"><div><dt>${t.hits}</dt><dd>${r.hits}</dd></div><div><dt>${t.combo}</dt><dd>×${r.bestCombo}</dd></div><div><dt>${t.doubles}</dt><dd>${r.doubles}</dd></div></dl><p class="td-finale">${r.finishSuccess ? "BAAAN!! · " + t.finale : t.noFinale}</p><div class="result-actions td-result-actions"><button type="button" class="td-primary" data-result-action="retry">${t.again} ↗</button><button type="button" class="td-secondary" data-result-action="next">${t.next} →</button><button type="button" class="td-text" data-result-action="share">${t.share} ↗</button></div></section>`;
}
export function paint() {}
