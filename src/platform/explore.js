import { experiments, categories, inputs, titleOf, subtitleOf } from "./experiments.js";
import { copy, inputLabel, escapeHtml as esc } from "./copy.js";
import { previewMarkup } from "./preview.js";

export function mountExplore(root, { locale, state, onAction }) {
  const t = (key) => copy(locale, key);
  root.innerHTML = `<section class="explore-page"><p class="platform-kicker">THE EXPERIMENT INDEX</p><h1>${t("explore")}</h1>
    <div class="explore-search"><label for="experiment-search">${t("search")}</label><div><input id="experiment-search" type="search" value="${esc(state.query)}" autocomplete="off"><button type="button" data-clear aria-label="${locale === "ja" ? "検索をクリア" : "Clear search"}" ${state.query ? "" : "hidden"}>×</button></div></div>
    <div class="explore-filters" role="group" aria-label="${t("collection")}">${["ALL", ...categories].map((category) => `<button type="button" data-category="${category}" aria-pressed="${state.category === category}">${category === "ALL" ? t("all") : category}</button>`).join("")}</div>
    <div class="explore-filters explore-filters--input" role="group" aria-label="${t("inputFilter")}">${["ALL", ...inputs].map((input) => `<button type="button" data-input="${input}" aria-pressed="${state.input === input}">${input === "ALL" ? t("all") : inputLabel(input, locale)}</button>`).join("")}</div>
    <p class="explore-count" role="status"></p><div class="explore-grid"></div></section>`;
  const search = root.querySelector("input"), clear = root.querySelector("[data-clear]"), grid = root.querySelector(".explore-grid");
  root.querySelectorAll("[data-category], [data-input]").forEach((button) => button.setAttribute("aria-label", `${t(button.hasAttribute("data-category") ? "collection" : "inputFilter")}: ${button.textContent}`));
  const update = () => {
    const query = state.query.trim().normalize("NFKC").toLowerCase();
    const games = experiments.filter((game) => (state.category === "ALL" || game.category === state.category) && (state.input === "ALL" || game.input.includes(state.input)) && [game.titleJa, game.titleEn, game.subtitleJa, game.subtitleEn, game.exp, ...game.tags, ...game.input, ...game.input.map((input) => inputLabel(input, locale))].join(" ").normalize("NFKC").toLowerCase().includes(query));
    root.querySelector(".explore-count").textContent = `${String(games.length).padStart(2, "0")} ${locale === "ja" ? "本の実験" : "EXPERIMENTS"}`;
    grid.innerHTML = games.length ? games.map((game) => `<article class="explore-card" style="--accent:${game.accent}"><a href="${game.route}" data-game="${game.id}" aria-label="PLAY ${esc(titleOf(game, locale))}"><div class="explore-art">${previewMarkup(game)}</div><span class="feed-meta">${game.exp} / ${game.category}</span><h2>${esc(titleOf(game, locale))}</h2><p>${esc(subtitleOf(game, locale))}</p><span class="explore-play">PLAY <span aria-hidden="true">↗</span></span></a></article>`).join("") : `<p class="explore-empty">${t("empty")}</p>`;
    clear.hidden = !state.query;
    grid.querySelectorAll("img[data-src]").forEach((image) => { image.src = image.dataset.src; });
    root.querySelectorAll("[data-category]").forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.category === state.category)));
    root.querySelectorAll("[data-input]").forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.input === state.input)));
  };
  search.addEventListener("input", (event) => { if (!event.isComposing) { state.query = search.value; update(); } });
  search.addEventListener("compositionend", () => { state.query = search.value; update(); });
  clear.addEventListener("click", () => { state.query = ""; search.value = ""; update(); search.focus(); });
  root.addEventListener("click", (event) => {
    const category = event.target.closest("[data-category]"), input = event.target.closest("[data-input]"), game = event.target.closest("[data-game]");
    if (category) { state.category = category.dataset.category; update(); }
    if (input) { state.input = input.dataset.input; update(); }
    if (game && !event.ctrlKey && !event.metaKey && !event.shiftKey && event.button === 0) { event.preventDefault(); onAction("play", experiments.find((item) => item.id === game.dataset.game)); }
  }, { signal: state.signal });
  update();
}
