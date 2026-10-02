import { titleOf } from "./experiments.js";
export function gameUrl(game, base = globalThis.location?.href ?? "http://localhost/") {
  const url = new URL(base); url.hash = game.route; return url.href;
}
export function resultPayload(game, { score, summary = "", image } = {}, locale = "en", base) {
  const title = titleOf(game, locale);
  return { title: `CAMERA GAME LAB / ${title}`, text: [title, score != null ? `${score} ${locale === "ja" ? "点" : "pts"}` : "", summary].filter(Boolean).join(" · "), url: gameUrl(game, base), ...(image ? { files: [image] } : {}) };
}
// Future image adapters return File (e.g. an asynchronously prepared 720×1280
// canvas PNG). Prepare it before the click to preserve Web Share user activation.
export async function sharePayload(payload, { navigator: nav = globalThis.navigator, document: doc = globalThis.document } = {}) {
  const { files, ...textPayload } = payload;
  const shareData = files && nav?.canShare?.({ files }) ? payload : textPayload;
  if (nav?.share) {
    try { await nav.share(shareData); return { method: "native" }; }
    catch (error) { if (error.name === "AbortError") return { method: "cancelled" }; }
  }
  const text = [payload.text, payload.url].filter(Boolean).join("\n");
  try { if (nav?.clipboard?.writeText) { await nav.clipboard.writeText(text); return { method: "clipboard" }; } } catch { /* Try the legacy clipboard next. */ }
  if (doc?.body) {
    const previous = doc.activeElement, area = doc.createElement("textarea");
    area.value = text; area.setAttribute("aria-label", "Share link"); area.style.cssText = "position:fixed;top:0;left:0;opacity:0";
    doc.body.append(area); area.select();
    let copied = false; try { copied = doc.execCommand?.("copy") === true; } catch { /* Offer a selectable link. */ }
    area.remove(); previous?.focus?.({ preventScroll: true });
    if (copied) return { method: "clipboard" };
  }
  return { method: "manual", text };
}
