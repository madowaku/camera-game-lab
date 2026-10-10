import cover from "./assets/cover.webp";
import { messages } from "./messages.js";
import { NoteEaterAudio } from "./audio.js";
import { drawNote } from "./renderer.js";
import { escapeHtml as esc } from "../platform/copy.js";
import { Replay } from "../creator/Replay.js";
import "./noteEater.css";
import "../creator/creator.css";
const copy = locale => messages[locale === "ja" ? "ja" : "en"];

export function launchMarkup(game, locale) {
  const t = copy(locale);
  return `<section class="ne-entry" data-mode="play" data-face="ORIGINAL"><div class="ne-entry-meta"><span>EXP-016</span><span>30 SEC · 5 SOUNDS</span></div>
    <h1>NOTE<span>EATER<i aria-hidden="true">♪</i></span></h1><p class="ne-tagline">${t.tagline}</p>
    <div class="ne-cover"><img src="${cover}" width="1024" height="1536" alt="${locale === "ja" ? "口を開けた人に、色とりどりの音符が飛び込むイラスト" : "A playful face catching colorful musical notes with an open mouth"}"><span aria-hidden="true">YOU ARE THE INSTRUMENT.</span></div>
    <div class="creator-mode-tabs" role="group" aria-label="PLAY / CREATOR"><button type="button" data-creator-mode="play" aria-pressed="true">PLAY</button><button type="button" data-creator-mode="creator" aria-pressed="false">CREATOR</button></div>
    <div class="creator-face-picker" hidden><p>${t.faceChoice}</p><div class="creator-face-options" role="group" aria-label="${locale === "ja" ? "顔の表示" : "Face mode"}">${[["ORIGINAL", t.original], ["EFFECT", t.effect], ["HIDE", t.hide]].map(([mode, description]) => `<button type="button" data-face-mode="${mode}" aria-pressed="${mode === "ORIGINAL"}">${mode}<small>${description}</small></button>`).join("")}</div><p class="ne-privacy">${t.creatorNotice}</p></div>
    <div class="launch-controls ne-launch-controls"><button type="button" class="launch-camera ne-primary" disabled>${t.play} ↗</button><button type="button" class="launch-demo ne-secondary" disabled>${t.demo}</button><button type="button" class="launch-howto ne-text">${t.howto}</button></div>
    <p class="launch-status" role="status"></p><p class="ne-privacy">${esc(game[locale === "ja" ? "privacyJa" : "privacyEn"])}</p></section>`;
}
export function howtoMarkup(game, locale) {
  const t = copy(locale);
  return `<h2 id="sheet-title">NOTE EATER · ${t.howto}</h2><ol class="ne-howto">${t.howtoSteps.map(([title, detail]) => `<li><strong>${title}</strong><p>${detail}</p></li>`).join("")}</ol><p>${esc(game[locale === "ja" ? "privacyJa" : "privacyEn"])}</p>`;
}
export function resultMarkup(game, r, locale) {
  const t = copy(locale);
  return `<section class="ne-result"><p class="ne-entry-meta"><span>NOTE EATER</span><span>YOUR LITTLE SESSION</span></p><p class="ne-result-line">${r.notesEaten ? t.result : t.empty}</p>
    <h2>${r.notesEaten}<span>${t.notes}</span></h2>${r.source === "demo" ? `<p class="ne-practice-label">${t.practice}</p>` : ""}
    <div class="ne-result-stats"><span>MAX GROOVE <strong>${r.maxGroove}</strong></span><span>${t.unique} <strong>${r.uniqueNotes}<small>/5</small></strong></span></div>
    <div class="ne-melody"><h3>${t.melody}</h3><p class="ne-song-hint">${t.songHint}</p><canvas class="ne-sequence" role="img" aria-label="${t.melody} · ${r.notesEaten}"></canvas>
    <div class="ne-song-styles" role="group" aria-label="${t.styleLabel}">${[["dream",t.dream],["pop",t.pop],["festival",t.festival]].map(([id,label]) => `<button type="button" data-song-style="${id}" aria-pressed="${id === "dream"}" ${r.melody.length ? "" : "disabled"}>${label}</button>`).join("")}</div>
    <button type="button" class="ne-melody-play" ${r.melody.length ? "" : "disabled"}>${t.playMelody}</button>${r.melody.length ? "" : `<p>${t.melodyEmpty}</p>`}</div>
    ${r.creator ? `<div class="ne-replay"><p>${t.replay} · ${r.creator.faceMode}</p><canvas class="creator-replay-canvas" role="img" aria-label="${t.replay}"></canvas><button type="button" class="ne-replay-play">${t.replayButton}</button></div>` : ""}
    <div class="result-actions ne-result-actions"><button type="button" class="ne-primary" data-result-action="retry">${t.again} ↗</button><button type="button" class="ne-secondary" data-result-action="next">${t.next} →</button><button type="button" class="ne-text" data-result-action="share">${t.share} ↗</button></div></section>`;
}
export function paint(root, result) {
  const canvas = root.querySelector(".ne-sequence"); if (!canvas || !result) return;
  const w = Math.max(200, canvas.clientWidth), h = 88, dpr = Math.min(devicePixelRatio || 1, 2);
  canvas.width = w * dpr; canvas.height = h * dpr; const c = canvas.getContext("2d"); c.scale(dpr, dpr);
  const notes = result.melody, gap = Math.min(28, (w - 24) / Math.max(1, notes.length));
  notes.forEach((n, i) => {
    const x = Number.isFinite(n.at) ? 12 + Math.max(0, Math.min(1, n.at / 30000)) * (w - 24) : 12 + gap * (i + .5);
    drawNote(c, n.type, x, 44 + Math.sin(i * .8) * 15, Math.min(10, Math.max(5, gap * .4)));
  });
}
export function mountResult(root, result, locale) {
  const t = copy(locale), audio = new NoteEaterAudio(), button = root.querySelector(".ne-melody-play");
  const styles = [...root.querySelectorAll("[data-song-style]")];
  let playing = false, style = "dream";
  const reset = () => { playing = false; button.textContent = t.playMelody; button.setAttribute("aria-pressed", "false"); };
  const start = () => {
    playing = true; button.textContent = t.stopMelody; button.setAttribute("aria-pressed", "true");
    audio.playSong(result.melody, reset, { style });
  };
  const play = () => { if (playing) { audio.stop(); reset(); } else start(); };
  const changeStyle = event => {
    const selected = event.currentTarget.dataset.songStyle;
    if (selected === style) return;
    style = selected;
    styles.forEach(item => item.setAttribute("aria-pressed", String(item.dataset.songStyle === style)));
    if (playing) { audio.stop(); start(); }
  };
  styles.forEach(item => item.addEventListener("click", changeStyle));
  button.addEventListener("click", play);
  const replayButton = root.querySelector(".ne-replay-play"), player = result.creator ? new Replay(root.querySelector(".creator-replay-canvas"), result.creator) : null;
  const replay = () => player?.play(); replayButton?.addEventListener("click", replay); player?.play();
  const background = () => { if (document.hidden) { audio.stop(); reset(); player?.stop(); } };
  document.addEventListener("visibilitychange", background);
  return () => { button.removeEventListener("click", play); styles.forEach(item => item.removeEventListener("click", changeStyle)); replayButton?.removeEventListener("click", replay); document.removeEventListener("visibilitychange", background); audio.dispose(); player?.dispose(); };
}
export function discardResult(result) { if (result?.creator) { result.creator.frames = []; result.creator.events = []; } }
export function handleLaunchClick(root, event) {
  const entry = root.querySelector(".ne-entry"), mode = event.target.closest("[data-creator-mode]"), face = event.target.closest("[data-face-mode]");
  if (!entry || (!mode && !face)) return false;
  if (mode) {
    entry.dataset.mode = mode.dataset.creatorMode; entry.querySelector(".creator-face-picker").hidden = entry.dataset.mode !== "creator";
    entry.querySelector(".launch-camera").hidden = entry.dataset.mode === "creator";
    entry.querySelectorAll("[data-creator-mode]").forEach(b => b.setAttribute("aria-pressed", String(b === mode)));
  }
  if (face) { entry.dataset.face = face.dataset.faceMode; entry.querySelectorAll("[data-face-mode]").forEach(b => b.setAttribute("aria-pressed", String(b === face))); return "start-camera"; }
  return true;
}
export function readOptions(root) { const entry = root.querySelector(".ne-entry"); return { creator: entry?.dataset.mode === "creator", faceMode: entry?.dataset.face ?? "ORIGINAL" }; }
