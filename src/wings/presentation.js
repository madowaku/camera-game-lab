import cover from "./assets/cover-v1.webp";
import { messages } from "./messages.js";
import { escapeHtml as esc } from "../platform/copy.js";
import { Replay } from "../creator/Replay.js";
import "./wings.css";
import "../creator/creator.css";
const copy = locale => messages[locale === "ja" ? "ja" : "en"];
export function launchMarkup(game, locale) {
  const t = copy(locale);
  return `<section class="bw-entry" data-mode="play" data-face="ORIGINAL"><div class="bw-entry-meta"><span>EXP-046 / BODY CONTROL</span><span>30 SEC · RING RUSH</span></div>
    <div class="bw-entry-hero"><img src="${cover}" width="800" height="1200" alt="${locale === "ja" ? "腕におもちゃの翼を付けて、青空のリングへ飛び出す人" : "A delighted person with toy wings flying through golden sky rings"}"><h1>BODY<br><span>WINGS</span><i aria-hidden="true">↗</i></h1><span class="bw-stamp">YOU ARE<br>THE PLANE.</span></div>
    <div class="bw-entry-content"><p class="bw-tagline">${t.tagline}</p><ol class="bw-steps">${t.steps.map(([a, b], i) => `<li><b>0${i + 1}</b><strong>${a}</strong><span>${b}</span></li>`).join("")}</ol>
    <div class="creator-mode-tabs" role="group" aria-label="PLAY / CREATOR"><button type="button" data-creator-mode="play" aria-pressed="true">PLAY</button><button type="button" data-creator-mode="creator" aria-pressed="false">CREATOR</button></div>
    <div class="creator-face-picker" hidden><p>${t.faceChoice}</p><div class="creator-face-options" role="group" aria-label="${t.faceModes}">${["ORIGINAL", "EFFECT", "AVATAR", "HIDE"].map(m => `<button type="button" data-face-mode="${m}" aria-pressed="${m === "ORIGINAL"}">${m}<small>${m === 'AVATAR' ? locale === 'ja' ? '小鳥に変身・顔映像なし' : 'BECOME A BIRD · NO CAMERA IMAGE' : t[m.toLowerCase()]}</small></button>`).join("")}</div><p class="bw-privacy">${t.creatorNotice}</p></div>
    <div class="launch-controls bw-launch-controls"><button type="button" class="launch-camera bw-primary" disabled>${t.play} ↗</button><button type="button" class="launch-demo bw-secondary" disabled>${t.practice}</button><button type="button" class="launch-howto bw-text">${t.howto}</button></div><p class="launch-status" role="status"></p><details class="bw-privacy"><summary>${locale === "ja" ? "カメラとプライバシー" : "Camera & privacy"}</summary><p>${esc(game[locale === "ja" ? "privacyJa" : "privacyEn"])}</p></details></div></section>`;
}
export function howtoMarkup(game, locale) {
  const t = copy(locale); return `<h2 id="sheet-title">BODY WINGS · ${t.howto}</h2><ol class="bw-howto">${t.steps.map(([a, b]) => `<li><strong>${a}</strong><p>${b}</p></li>`).join("")}</ol><p>${t.cameraHint}</p><p>${t.demoHint}</p><p>${esc(game[locale === "ja" ? "privacyJa" : "privacyEn"])}</p>`;
}
export function resultMarkup(game, r, locale) {
  const t = copy(locale);
  return `<section class="bw-result"><div class="bw-entry-meta"><span>BODY WINGS</span><span>30 SEC / COMPLETE</span></div><p class="bw-result-heading">YOUR FLIGHT</p><h2>${r.distance}<small> m</small><i aria-hidden="true">↗</i></h2>
    ${r.source === "demo" ? `<p class="bw-practice-label">${t.demo}</p>` : ""}<dl class="bw-result-stats"><div><dt>RINGS</dt><dd>${r.rings}<small> / ${r.totalRings}</small></dd></div><div><dt>BEST COMBO</dt><dd>×${r.bestCombo}</dd></div><div><dt>MAX SPEED</dt><dd>${r.maxSpeed}<small> km/h</small></dd></div></dl><p class="bw-fiction">${t.distanceNote}</p>
    ${r.creator?.frames.length ? `<div class="bw-replay"><h3>BEST FLIGHT <small>· ${esc(r.creator.faceMode)}</small></h3><canvas class="creator-replay-canvas" role="img" aria-label="BEST FLIGHT"></canvas><button type="button" class="bw-secondary bw-replay-play">${t.replay} ↻</button></div>` : ""}
    <div class="result-actions bw-result-actions"><button type="button" class="bw-primary" data-result-action="retry">${t.again} ↗</button><button type="button" class="bw-secondary" data-result-action="next">${t.next} →</button><button type="button" class="bw-text" data-result-action="share">${t.share} ↗</button></div></section>`;
}
export function paint() {}
export function mountResult(root, result) {
  if (!result.creator?.frames.length) return;
  const player = new Replay(root.querySelector(".creator-replay-canvas"), result.creator), button = root.querySelector(".bw-replay-play");
  const play = () => player.play(), background = () => { if (document.hidden) player.stop(); };
  button.addEventListener("click", play); document.addEventListener("visibilitychange", background); player.play();
  return () => { button.removeEventListener("click", play); document.removeEventListener("visibilitychange", background); player.dispose(); };
}
export function discardResult(result) { if (result?.creator) { result.creator.frames = []; result.creator.events = []; } }
export function handleLaunchClick(root, event) {
  const entry = root.querySelector(".bw-entry"), mode = event.target.closest("[data-creator-mode]"), face = event.target.closest("[data-face-mode]");
  if (!entry || (!mode && !face)) return false;
  if (mode) { entry.dataset.mode = mode.dataset.creatorMode; entry.querySelector(".creator-face-picker").hidden = entry.dataset.mode !== "creator";
    entry.querySelectorAll("[data-creator-mode]").forEach(b => b.setAttribute("aria-pressed", String(b === mode))); }
  if (face) { entry.dataset.face = face.dataset.faceMode; entry.querySelectorAll("[data-face-mode]").forEach(b => b.setAttribute("aria-pressed", String(b === face))); }
  return true;
}
export function readOptions(root) { const e = root.querySelector(".bw-entry"); return { creator: e?.dataset.mode === "creator", faceMode: e?.dataset.face ?? "ORIGINAL" }; }
