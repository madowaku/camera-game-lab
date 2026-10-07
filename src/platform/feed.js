import { titleOf, subtitleOf } from "./experiments.js";
import { copy, escapeHtml as esc, inputLabel } from "./copy.js";
import { previewMarkup, activatePreview } from "./preview.js";

export function mountFeed(root, { order, locale, favorites, events, initialId, onAction, onView }) {
  const t = (key, values) => copy(locale, key, values);
  root.innerHTML = `<div class="lab-feed" tabindex="0" role="region" aria-label="${t("feedLabel")}">${order.map((game, index) => `
    <article class="feed-card" data-id="${game.id}" style="--accent:${game.accent}" aria-labelledby="title-${game.id}">
      <div class="feed-edition"><span><i></i> INTERACTIVE EXPERIMENT</span><span>${String(index + 1).padStart(2, "0")} / ${String(order.length).padStart(2, "0")}</span></div>
      <div class="game-preview">${previewMarkup(game)}<span class="preview-caption">${t("preview")} / ${game.untimed ? "FREE TIME" : `${game.duration}S`}</span></div>
      <div class="feed-copy"><div class="feed-meta">${game.exp}<span>/</span>${game.category}</div><h1 id="title-${game.id}">${esc(titleOf(game, locale))}</h1><p>${esc(subtitleOf(game, locale))}</p></div>
      <div class="action-rail">
        <button type="button" data-action="favorite" aria-label="${t("favorite")}" aria-pressed="${favorites.has(game.id)}"><span aria-hidden="true">${favorites.has(game.id) ? "♥" : "♡"}</span></button>
        <button type="button" data-action="share" aria-label="${t("share")}"><span aria-hidden="true">↗</span></button>
        <button type="button" data-action="info" aria-label="${t("info")}"><span class="info-glyph" aria-hidden="true">i</span></button>
      </div>
      <div class="feed-facts"><span>${game.input.map((input) => inputLabel(input, locale)).join(" + ")}</span><span>${game.players}${t("players")}</span><span>${game.untimed ? (locale === "ja" ? "時間制限なし" : "NO TIME LIMIT") : t("seconds", { n: game.duration })}</span></div>
      <button type="button" class="feed-play" data-action="play" aria-label="PLAY ${esc(titleOf(game, locale))}"><span class="play-triangle" aria-hidden="true"></span> PLAY <span class="play-arrow" aria-hidden="true">↗</span></button>
      <div class="feed-foot"><span>CAMERA ON. WORLD OFF.</span><button type="button" data-action="advance" aria-label="${t("swipe")}">${t("swipe")} <span aria-hidden="true">↑</span></button></div>
    </article>`).join("")}</div>`;
  const scroller = root.firstElementChild, cards = [...scroller.children];
  root.querySelectorAll('.action-rail button').forEach((button) => { button.title = button.getAttribute("aria-label"); });
  const motion = matchMedia("(prefers-reduced-motion: reduce)");
  const controller = new AbortController();
  const signal = controller.signal;
  let current = Math.max(0, order.findIndex((game) => game.id === initialId)), raf = null, disposed = false;
  const sync = () => cards.forEach((card, index) => {
    activatePreview(card, Math.abs(index - current) <= 1 && !document.hidden, motion.matches);
    // Offscreen controls must not pull keyboard focus through a snapped viewport.
    card.inert = index !== current;
  });
  const view = (index, swiped = false) => {
    current = index; sync(); onView?.(order[index].id);
    events.emit("feed_view", { id: order[index].id, index });
    if (swiped) events.emit("feed_swipe", { id: order[index].id, index });
  };
  // Cards may exceed a short/zoomed viewport; use their real positions.
  const topOf = (index) => cards[index].offsetTop - cards[0].offsetTop;
  const move = (index) => scroller.scrollTo({ top: topOf(Math.max(0, Math.min(cards.length - 1, index))), behavior: motion.matches ? "instant" : "smooth" });
  scroller.addEventListener("scroll", () => {
    if (disposed || raf) return;
    raf = requestAnimationFrame(() => {
      raf = null;
      const index = cards.reduce((nearest, _, index) => Math.abs(topOf(index) - scroller.scrollTop) < Math.abs(topOf(nearest) - scroller.scrollTop) ? index : nearest, 0);
      if (index !== current) view(index, true);
    });
  }, { passive: true, signal });
  scroller.addEventListener("keydown", (event) => {
    if (!["ArrowDown", "ArrowUp", "PageDown", "PageUp", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    move(event.key === "Home" ? 0 : event.key === "End" ? cards.length - 1 : current + (["ArrowDown", "PageDown"].includes(event.key) ? 1 : -1));
    scroller.focus({ preventScroll: true });
  }, { signal });
  scroller.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action]"), card = button?.closest(".feed-card");
    if (!button || !card) return;
    if (button.dataset.action === "advance") return move((current + 1) % cards.length);
    onAction(button.dataset.action, order.find((game) => game.id === card.dataset.id), button);
  }, { signal });
  const resize = new ResizeObserver(() => { if (!disposed) scroller.scrollTo({ top: topOf(current), behavior: "instant" }); });
  resize.observe(scroller);
  document.addEventListener("visibilitychange", sync); motion.addEventListener("change", sync);
  scroller.scrollTo({ top: topOf(current), behavior: "instant" }); view(current);
  return { destroy() { disposed = true; controller.abort(); resize.disconnect(); cancelAnimationFrame(raf); document.removeEventListener("visibilitychange", sync); motion.removeEventListener("change", sync); cards.forEach((card) => activatePreview(card, false)); }, get id() { return order[current].id; } };
}
