import cover from "./assets/cover-v1.webp";
import { textFor } from "./messages.js";
import { escapeHtml as esc } from "../platform/copy.js";
import { readSettings, saveSettings } from "./records.js";
import "./palmPong.css";
export function launchMarkup(game, locale) {
  const t = textFor(locale);
  return `<section class="pp-entry"><div class="pp-entry-art"><img src="${cover}" width="960" height="1440" alt="${locale === "ja" ? "ふたりの手にミントとコーラルのラケット。黄色い球をつなぐ" : "Two friends with mint and coral palm paddles sharing a yellow ball"}"><div class="pp-art-title"><span>EXP-048 / DUO</span><h1>PALM<br><em>PONG<span aria-hidden="true">●</span></em></h1></div><span class="pp-art-caption">A LITTLE PONG. A LOT OF US.</span></div>
    <div class="pp-entry-copy"><p class="pp-kicker">2 PLAYERS <span>30 SECONDS</span></p><h2>${t.tagline}</h2><p class="pp-sub">${t.sub}</p><ol class="pp-steps">${t.steps.map(([name, detail], i) => `<li><span>0${i + 1}</span><div><strong>${name}</strong><p>${detail}</p></div></li>`).join("")}</ol>
    <label class="pp-guide-option"><input type="checkbox" class="pp-guide-check" ${readSettings().guide ? "checked" : ""}> ${t.guide}</label><div class="launch-controls pp-launch-controls"><button type="button" class="launch-camera pp-primary" disabled>${t.play} <span aria-hidden="true">↗</span></button><button type="button" class="launch-demo pp-secondary" disabled>${t.demo}</button><button type="button" class="launch-howto pp-text" disabled>${t.howto} ＋</button></div><p class="launch-status pp-status" role="status"></p><details class="pp-privacy"><summary>${locale === "ja" ? "カメラとプライバシー" : "Camera & privacy"}</summary><p>${esc(game[locale === "ja" ? "privacyJa" : "privacyEn"])}</p></details></div></section>`;
}
export function readOptions(root) { const guide = root.querySelector(".pp-guide-check")?.checked !== false; saveSettings({ guide }); return { guide }; }
export function howtoMarkup(game, locale) {
  const t = textFor(locale);
  return `<h2 id="sheet-title">PALM PONG · ${t.howto}</h2><ol class="pp-howto">${t.steps.map(([name, detail]) => `<li><strong>${name}</strong><p>${detail}</p></li>`).join("")}</ol><p>${t.demoTip}</p><p>${esc(game[locale === "ja" ? "privacyJa" : "privacyEn"])}</p>`;
}
export function resultMarkup(game, result, locale) {
  const t = textFor(locale);
  return `<section class="pp-result"><p class="pp-kicker">PALM PONG <span>BETTER TOGETHER.</span></p><div class="pp-result-card"><div class="pp-result-paddles" aria-hidden="true"><i>●</i><b>●</b><i>●●</i></div><p>${t.together}</p><h1><strong>${Number(result.bestRally)}</strong><span>${t.resultTail}</span></h1><p class="pp-result-note">${locale === "ja" ? "次は、もう一回先まで。" : "Next time, one little pong further."}</p></div>${result.source === "demo" ? `<p class="pp-practice-label">${t.practice}</p>` : ""}
    <dl class="pp-result-stats"><div><dt>${t.total}</dt><dd>${Number(result.totalReturns)}</dd></div><div><dt>${t.turns}</dt><dd><span class="pp-mint">● ${Number(result.playerReturns[0])}</span> / <span class="pp-coral">●● ${Number(result.playerReturns[1])}</span></dd></div><div><dt>${t.bestLocal}${result.source === "demo" ? ` · ${locale === "ja" ? "練習" : "practice"}` : ""}</dt><dd>${Number(result.personalBest)}</dd></div></dl><div class="result-actions pp-result-actions"><button type="button" class="pp-primary" data-result-action="retry">${t.again} ↗</button><button type="button" class="pp-secondary" data-result-action="share">${t.share}</button><button type="button" class="pp-text" data-result-action="browse">${t.next} →</button></div></section>`;
}
export function paint() {}
