import { escapeHtml } from "./copy.js";

// Small, inline, silent illustrations. No canvas loop, media permission or game imports.
const hand = `<path d="M102 234c-22-26-48-58-51-72-3-14 9-22 19-12l29 28V78c0-17 23-17 23 0v65-96c0-17 24-17 24 0v93-73c0-17 24-17 24 0v81-48c0-17 23-17 23 0v91c0 32-16 54-32 63v23h-59Z"/>`;
const motifs = {
  bridge: `<g class="preview-float"><path d="M14 180h85l-12 89-41-19ZM202 180h87l-24 73-51 16Z" fill="#40695c"/><path d="M12 174h89v13H12m189-13h89v13h-89" fill="#bfd2a5"/><path d="m83 161 145-31 4 18-145 31-19-5Z" fill="currentColor"/><path d="m83 161 4 18-19-5Z" fill="#ead5b1"/><path d="m221 132 7-2 4 18-7 2Z" fill="#d98972"/><rect x="94" y="162" width="108" height="18" rx="3" fill="none" stroke="#fff3d8" stroke-width="2" stroke-dasharray="5 5"/><circle cx="63" cy="147" r="10" fill="#f4dca7"/><path d="M55 155h16l3 19H53Z" fill="currentColor"/></g><path d="m145 65 5-13 5 13 13 5-13 5-5 13-5-13-13-5Z" fill="#e5ebc1"/>`,
  blink: `<g fill="none" stroke="currentColor"><path d="M62 264V35h176v229M90 264V63h120v201" opacity=".22" stroke-width="2"/><path d="M46 147q102-96 207 0-105 96-207 0Z" stroke-width="4"/><g class="preview-pulse"><ellipse cx="149" cy="148" rx="26" ry="32" fill="currentColor"/><path d="m138 145 7-3m8 3 7-3" stroke="#151711" stroke-width="5"/></g><path d="m79 214 16-16m42 31 4-20m50 12-9-21m44-8-17-13" stroke-width="3"/></g>`,
  pinch: `<path d="M33 235h235M194 122v83h26v-83" stroke="currentColor" stroke-width="2" fill="none" opacity=".4"/><rect x="222" y="193" width="39" height="39" rx="5" fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="4 4"/><g class="preview-float"><rect x="102" y="145" width="58" height="58" rx="7" fill="#ec8d6d"/><path d="M40 67q42 2 83 71m126-81q-56 18-98 81" stroke="currentColor" stroke-width="28" fill="none" stroke-linecap="round"/><circle cx="123" cy="138" r="12" fill="#f5f3df"/><circle cx="151" cy="138" r="12" fill="#f5f3df"/><path d="m124 139 13 24 13-24" stroke="#183a31" stroke-width="3" fill="none"/></g><path d="m67 219 6 7-6 7m98-14 6 7-6 7" fill="none" stroke="currentColor" stroke-width="2"/>`,
  hand: `<g class="preview-hand" fill="currentColor" stroke="#151711" stroke-width="3" stroke-linejoin="round">${hand}<path d="M125 176q38-17 48 14m-64 43h50" fill="none" stroke-width="3"/></g><g class="preview-beats" fill="currentColor"><rect x="220" y="74" width="18" height="18"/><rect x="231" y="128" width="12" height="12" opacity=".5"/><rect x="222" y="178" width="9" height="9" opacity=".25"/></g>`,
  target: `<g fill="none" stroke="currentColor"><circle cx="176" cy="123" r="58" stroke-width="2"/><circle cx="176" cy="123" r="38" stroke-width="2"/><circle class="preview-pulse" cx="176" cy="123" r="14" stroke-width="9"/><path d="M176 45v27m0 102v27m-78-78h26m104 0h27" stroke-width="3"/></g><path class="preview-hand" d="M40 237v-40l30-57q7-14 18-7t4 20l-10 19h92q19 0 19 12t-19 12h-42q15 22-9 26l-29 22v27H46Z" fill="currentColor" stroke="#111" stroke-width="3"/>`,
  mouth: `<path d="M44 145Q145 67 246 145Q144 275 44 145Z" fill="currentColor"/><path d="M62 145Q145 130 228 145Q145 226 62 145Z" fill="#111510"/><path d="M85 151h120v15H85Z" fill="#f5f6e8"/><g class="preview-float" fill="currentColor"><path d="M132 73c-38-34-62 20-29 39 13 8 20 1 29 1s16 7 29-1c33-19 9-73-29-39"/><path d="m132 68 8-25 18 6-23 16"/></g>`,
  voice: `<g stroke="currentColor" stroke-width="1" opacity=".3"><path d="M35 100h230M35 125h230M35 150h230M35 175h230M35 200h230"/></g><g class="preview-float" fill="currentColor"><ellipse cx="118" cy="172" rx="22" ry="15" transform="rotate(-20 118 172)"/><path d="M134 173V77l66-16v94h-8V82l-50 12v79Z"/><ellipse cx="178" cy="156" rx="22" ry="15" transform="rotate(-20 178 156)"/></g><g stroke="currentColor" fill="none" stroke-width="3"><path d="M63 122q-28 28 0 56m-15-73q-43 45 0 90M229 120q28 28 0 56"/></g>`,
  duo: `<g class="preview-bot" fill="currentColor"><path d="M36 127h87v79H36Zm12-22h62v17H48Zm-21 34h-9v46h9Zm105 0h9v46h-9ZM44 214h25v23H44Zm45 0h25v23H89Z"/><path d="M51 149h16v12H51Zm40 0h16v12H91Z" fill="#101613"/></g><g class="preview-bot preview-bot--two" fill="#f5a9c3"><path d="M178 91h87v79h-87Zm12-22h62v17h-62Zm-21 34h-9v46h9Zm105 0h9v46h-9Zm-88 75h25v23h-25Zm45 0h25v23h-25Z"/><path d="M193 113h16v12h-16Zm40 0h16v12h-16Z" fill="#101613"/></g><path d="m150 127-12 21h14l-8 27 23-34h-14l9-14Z" fill="#f4f3df"/>`,
  body: `<path d="m149 38 55 30 16 58-42 57-27 56-34-55-46-57 18-59Z" fill="currentColor" opacity=".25"/><path d="m82 133-44-30 10-35 49 26m115 39 44-30-10-35-49 26" stroke="currentColor" stroke-width="14" fill="none"/><g class="preview-float" fill="none" stroke="currentColor" stroke-width="13" stroke-linecap="round"><circle cx="149" cy="104" r="24"/><path d="M149 141v62m-47-51 47 23 47-23m-47 51-32 46m32-46 32 46"/></g>`,
  melon: `<g class="preview-float"><circle cx="150" cy="158" r="75" fill="currentColor"/><g fill="none" stroke="#133c25" stroke-width="7"><path d="M143 84q-59 71-12 147M164 85q57 77 11 145M150 82q-11 82 5 151"/></g><path d="m164 97 44 54-33 49" fill="none" stroke="#ff806f" stroke-width="12"/></g><path d="m222 59 23 18-37 46-22-18Z" fill="#f2ddae"/><path d="m51 66 6 16 18 3-17 7-3 18-8-16-17-3 17-9Z" fill="currentColor"/>`,
  hero: `<g class="preview-float" fill="currentColor"><path d="m66 243 46-90h67l47 90ZM72 130l70-99 25 65 51 26-22 23H86Z"/><path d="M112 151h69v46h-69Z" fill="#131c17"/><path d="M123 164h12v10h-12m26-10h12v10h-12"/><path d="m219 196 17-21 17 21-17 21Z"/><path d="M232 213h8v53h-8Z"/></g><g fill="none" stroke="currentColor" stroke-width="3"><path d="m48 167-14 13 14 13m215-102 14 13-14 13"/></g>`,
};

export function previewMarkup(game) {
  if (game.previewAsset && game.previewType === "image") return `<img class="preview-asset" data-src="${escapeHtml(game.previewAsset)}" alt="" loading="lazy" decoding="async">`;
  if (game.previewAsset && game.previewType === "video") return `<video class="preview-asset" data-src="${escapeHtml(game.previewAsset)}" muted loop playsinline preload="none" aria-hidden="true"></video>`;
  return `<div class="preview-orbit"></div><svg class="preview-drawing" viewBox="0 0 300 300" aria-hidden="true">${motifs[game.motif] ?? motifs.hand}</svg><span class="preview-coordinate" aria-hidden="true">X 0.50<br>Y 0.50</span><span class="preview-input" aria-hidden="true">${game.input.join(" + ")}</span>`;
}

export function activatePreview(card, active, reducedMotion = false) {
  card.classList.toggle("preview-active", active && !reducedMotion);
  const asset = card.querySelector(".preview-asset");
  if (!asset) return;
  if (active && !asset.getAttribute("src")) asset.src = asset.dataset.src;
  if (asset.tagName === "VIDEO") {
    asset.muted = true;
    if (active && !reducedMotion) void asset.play().catch(() => {});
    else asset.pause();
    if (!active && asset.getAttribute("src")) { asset.removeAttribute("src"); asset.load(); }
  }
}
