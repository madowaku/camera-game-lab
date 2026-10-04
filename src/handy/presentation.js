import cover from "./assets/cover-v1.webp";
import { spriteUrls } from "./renderer.js";
import { textFor } from "./messages.js";
import { escapeHtml as esc } from "../platform/copy.js";
import "./handyPals.css";

export function launchMarkup(game, locale) {
  const t = textFor(locale);
  return `<section class="hp-entry" data-left="bear" data-right="bunny"><div class="hp-entry-copy"><p class="hp-meta"><span>EXP-045 / HAND TOY</span><span>30 SECONDS OF JOY</span></p>
    <h1>HANDY<br><span>PALS<span class="hp-title-star" aria-hidden="true">✦</span></span></h1><p class="hp-tagline">${t.tagline}</p><p class="hp-sub">${t.sub}</p></div>
    <div class="hp-cover"><img src="${cover}" width="720" height="1279" alt="${locale === "ja" ? "手のひらの上で、くまと、うさぎが仲良くダンス" : "A tiny bear and bunny dancing together on two palms"}"><span>SMALL PALS. BIG FEELINGS.</span></div>
    <div class="hp-entry-actions"><fieldset class="hp-picker"><legend>${t.choose}</legend><div class="hp-slots">${["left", "right"].map((slot, i) => `<div class="hp-slot"><span>${i ? t.right : t.left}</span><div role="group" aria-label="${i ? t.right : t.left}">${["bear", "bunny"].map(species => `<button type="button" data-pal-slot="${slot}" data-species="${species}" aria-pressed="${species === (i ? "bunny" : "bear")}"><img src="${spriteUrls[species]}" width="28" height="36" alt="">${t[species]}</button>`).join("")}</div></div>`).join("")}</div></fieldset>
    <div class="launch-controls hp-launch-controls"><button type="button" class="launch-camera hp-primary" disabled>${t.play} <span aria-hidden="true">↗</span></button><button type="button" class="launch-demo hp-secondary" disabled>${t.demo}</button><button type="button" class="launch-howto hp-text">${t.howto} <span aria-hidden="true">＋</span></button></div>
    <p class="launch-status hp-status" role="status"></p><p class="hp-privacy">${esc(game[locale === "ja" ? "privacyJa" : "privacyEn"])}</p></div></section>`;
}
export function howtoMarkup(game, locale) {
  const t = textFor(locale);
  return `<h2 id="sheet-title">HANDY PALS · ${t.howto}</h2><ol class="hp-howto">${t.steps.map(([title, detail]) => `<li><strong>${title}</strong><p>${detail}</p></li>`).join("")}</ol><p>${esc(game[locale === "ja" ? "privacyJa" : "privacyEn"])}</p>`;
}
export function handleLaunchClick(root, event) {
  const button = event.target.closest("[data-pal-slot]"); if (!button) return false;
  const entry = root.querySelector(".hp-entry"), slot = button.dataset.palSlot;
  entry.dataset[slot] = button.dataset.species;
  root.querySelectorAll(`[data-pal-slot="${slot}"]`).forEach(b => b.setAttribute("aria-pressed", String(b === button)));
  return true;
}
export function readOptions(root) {
  const entry = root.querySelector(".hp-entry"); return { characters: [entry?.dataset.left ?? "bear", entry?.dataset.right ?? "bunny"] };
}
export function resultMarkup(game, result, locale) {
  const t = textFor(locale);
  return `<section class="hp-result"><p class="hp-meta"><span>HANDY PALS</span><span>A MOMENT TO KEEP</span></p><h1>TODAY'S<br><span>DUO<span aria-hidden="true">♡</span></span></h1>
    <p class="hp-tagline">${t.result}</p><figure class="hp-souvenir"><img class="hp-result-photo" width="720" height="900" alt="${locale === "ja" ? "今日のふたりの記念写真" : "Your duo's final pose souvenir"}" ${result.photoData ? "" : "hidden"}><figcaption>${esc(result[locale === "ja" ? "titleJa" : "titleEn"])}<small>${t.caption}</small></figcaption>${!result.photoData ? `<p>${t.photoError}</p>` : ""}</figure>
    ${result.source === "demo" ? `<p class="hp-practice-label">${t.practice}</p>` : ""}
    <div class="hp-result-actions result-actions"><button type="button" class="hp-primary" data-result-action="retry">${t.again} <span aria-hidden="true">↗</span></button><button type="button" class="hp-secondary hp-save" ${result.image ? "" : "disabled"}>${t.photo} ↓</button><button type="button" class="hp-secondary" data-result-action="share">${t.share} ↗</button><button type="button" class="hp-text" data-result-action="next">${t.next} →</button></div></section>`;
}
export function paint(root, result) {
  const image = root.querySelector(".hp-result-photo"); if (image && result?.photoData) image.src = result.photoData;
}
export function mountResult(root, result) {
  const button = root.querySelector(".hp-save"); let url;
  if (result.image) url = URL.createObjectURL(result.image);
  const save = event => {
    event.stopPropagation(); if (!url) return;
    const a = document.createElement("a"); a.href = url; a.download = "handy-pals-todays-duo.png"; document.body.append(a); a.click(); a.remove();
  };
  button.addEventListener("click", save);
  return () => {
    button.removeEventListener("click", save); if (url) URL.revokeObjectURL(url);
    root.querySelector(".hp-result-photo")?.removeAttribute("src");
  };
}
export function discardResult(result) { if (result) { result.photoData = null; result.image = null; } }
