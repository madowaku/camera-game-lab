import { artworkAssets } from "../platform/artworkAssets.js";
import logo from "./assets/logo.png";
import { drawPortrait, heroShape } from "./renderer.js";
import { messages } from "./messages.js";
import { escapeHtml as esc } from "../platform/copy.js";
import "./softServe.css";
import { CreatorResult } from "../creator/CreatorResult.js";
import "../creator/creator.css";
const text = locale => messages[locale === "ja" ? "ja" : "en"];
export function launchMarkup(game, locale) {
  const t = text(locale);
  return `<section class="ss-entry" data-mode="play" data-face="ORIGINAL"><img class="ss-logo" src="${logo}" alt="SOFT SERVE" width="720" height="480"><h1>${t.entryTitle}</h1><p class="ss-tagline">${t.entryTagline}</p>
    <div class="creator-mode-tabs" role="group" aria-label="PLAY / CREATOR"><button type="button" data-creator-mode="play" aria-pressed="true">PLAY</button><button type="button" data-creator-mode="creator" aria-pressed="false">CREATOR 🎬</button></div>
    <div class="creator-face-picker" hidden><p>${t.faceChoice}</p><div class="creator-face-options" role="group" aria-label="Face mode">${[["ORIGINAL",t.faceOriginal],["EFFECT",t.faceEffect],["HIDE",t.faceHide]].map(([mode,description])=>`<button type="button" data-face-mode="${mode}" aria-pressed="${mode==="ORIGINAL"}">${mode}<small>${description}</small></button>`).join("")}</div><p class="creator-notice">${t.creatorNotice}</p></div>
    <div class="ss-hero"><img class="ss-key-art" src="${artworkAssets[game.id]}" alt="" width="768" height="768" decoding="async"><span class="ss-hero-note">${t.virtualCone}</span><i class="ss-spark ss-spark-a" aria-hidden="true">✦</i><i class="ss-spark ss-spark-b" aria-hidden="true">✧</i></div>
    <ol class="launch-steps ss-entry-steps">${t.steps.map((s,i)=>`<li><b>${i+1}</b>${s}</li>`).join("")}</ol>
    <div class="launch-controls"><button type="button" class="launch-camera ss-primary" disabled>${t.challenge}</button><button type="button" class="launch-howto">${t.howto}</button><button type="button" class="launch-demo" disabled>${t.tryDemo}</button></div>
    <p class="launch-status" role="status"></p><p class="ss-entry-privacy">${esc(game[locale === "ja" ? "privacyJa" : "privacyEn"])}</p></section>`;
}
export function howtoMarkup(game,locale) {
  const t=text(locale);
  return `<h2 id="sheet-title">${t.howto}</h2><ol class="ss-howto">${t.howtoSteps.map(([title,detail])=>`<li><strong>${title}</strong><p>${detail}</p></li>`).join("")}</ol><p>${t.virtualCone}</p><p>${esc(game[locale === "ja" ? "privacyJa" : "privacyEn"])}</p>`;
}
export function resultMarkup(game,r,locale) {
  const t=text(locale),clean=r.outcome==="clean";
  if(r.creator)return `<section class="creator-replay"><h2 class="creator-ready">${t.clipReady}</h2><p class="creator-replay-title">AUTO DIRECTOR · ${(r.creator.faceModes??[r.creator.faceMode]).join(" / ")}${r.source==="demo"?` · ${t.practiceLabel}`:""}</p><canvas class="creator-replay-canvas" role="img" aria-label="${locale==="ja"?"あなたの撮れ高リプレイ":"Your highlight replay"}"></canvas><video class="creator-replay-video" controls playsinline muted hidden aria-label="${t.clipReady}"></video><div class="creator-format-picker" role="group" aria-label="Clip length"><button type="button" data-creator-action="15" aria-pressed="true">15 SEC</button><button type="button" data-creator-action="7" aria-pressed="false">7 SEC</button><button type="button" data-creator-action="replay">↻ REPLAY</button></div><p class="creator-export-status" role="status" aria-live="polite">${t.clipGenerating}</p><div class="creator-replay-controls"><button type="button" data-creator-action="share" disabled>↗ SHARE</button><button type="button" data-creator-action="save" disabled>↓ ${t.clipSave}</button></div><button class="creator-again" type="button" data-creator-action="encode" hidden>${t.clipEncodeRetry}</button><button class="creator-again" type="button" data-result-action="retry">↻ RETRY</button><button class="ss-text-button" type="button" data-result-action="browse">${t.otherGames} →</button><details class="ss-result-details"><summary>${t.scoreDetails} · ${r.score}</summary><p>${t[r.outcome]} · ${r.maxSwirls} ${t.swirls} · ${t.eaten} ${r.eatenPercent}% · ${r.beauty}</p></details></section>`;
  return `<section class="ss-result-card"><img class="ss-result-logo" src="${logo}" alt="SOFT SERVE" width="720" height="480"><p class="ss-result-greeting">${t[r.outcome]}</p>
    <h2>${r.outcome === "empty" ? t.emptyTitle : `${r.maxSwirls}<small>${clean?t.finishedUnit:t.madeUnit}</small>`}</h2>
    ${r.source==="demo"?`<p class="ss-practice">${t.practiceLabel}</p>`:""}<canvas class="ss-result-food" role="img" aria-label="${esc(t.madeShape)} · ${r.maxSwirls} ${t.swirls}"></canvas>
    <p class="ss-result-next">${clean?t.oneMore:t[`${r.outcome}Detail`]}</p>${clean?"":`<p class="ss-eaten">${t.eaten} ${r.eatenPercent}%</p>`}
    <div class="result-actions"><button class="ss-primary" type="button" data-result-action="retry">${t.makeAgain}</button><button class="ss-secondary" type="button" data-result-action="share">${t.challengeFriend}</button><button class="ss-text-button" type="button" data-result-action="browse">${t.otherGames} →</button></div>
    <details class="ss-result-details"><summary>${t.scoreDetails} · ${r.score} ${t.score}</summary><dl><div><dt>${t.base} ×${r.multiplier}</dt><dd>${r.base}</dd></div><div><dt>${t.beauty}</dt><dd>+${r.beautyBonus+r.perfectBonus}</dd></div><div><dt>${t.cleanBonus}</dt><dd>+${r.cleanBonus}</dd></div></dl></details></section>`;
}
export function paint(root,result) {
  if(result?.creator)return;
  const canvas=root.querySelector("canvas");if(canvas)drawPortrait(canvas,result?.shape??heroShape());
}
export function mountResult(root,result,locale) {
  if(!result.creator)return;
  const t=text(locale),player=new CreatorResult(root,result.creator,{generating:t.clipGenerating,ready:t.clipVideoReady,failed:t.clipFailed,unsupported:t.clipUnsupported,noFrames:t.clipNoFrames,saved:t.clipSaved,shared:t.clipShared});
  return ()=>player.dispose();
}
export function discardResult(result) {
  if(result?.creator){result.creator.frames=[];result.creator.events=[];result.creator.files={};result.creator.plans={};}
}
export function handleLaunchClick(root,event) {
  const mode=event.target.closest("[data-creator-mode]"),face=event.target.closest("[data-face-mode]"),entry=root.querySelector(".ss-entry");
  if(!entry||(!mode&&!face))return false;
  if(mode){entry.dataset.mode=mode.dataset.creatorMode;entry.classList.toggle("has-creator",entry.dataset.mode==="creator");entry.querySelector(".creator-face-picker").hidden=entry.dataset.mode!=="creator";entry.querySelector(".launch-camera").hidden=entry.dataset.mode==="creator";entry.querySelectorAll("[data-creator-mode]").forEach(b=>b.setAttribute("aria-pressed",String(b===mode)));}
  if(face){entry.dataset.face=face.dataset.faceMode;entry.querySelectorAll("[data-face-mode]").forEach(b=>b.setAttribute("aria-pressed",String(b===face)));return "start-camera";}
  return true;
}
export function readOptions(root) { const entry=root.querySelector(".ss-entry");return {creator:entry?.dataset.mode==="creator",faceMode:entry?.dataset.face??"ORIGINAL"}; }
