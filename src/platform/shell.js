import "../style.css";
import "./platform.css";
import { experiments, titleOf, subtitleOf, validateRegistry } from "./experiments.js";
import { getInitialLocale } from "../i18n.js";
import { copy, inputLabel, escapeHtml as esc } from "./copy.js";
import { storage } from "./storage.js";
import { createFavorites } from "./favorites.js";
import { createRecent } from "./recent.js";
import { orderFeed, nextExperiment } from "./ordering.js";
import { resolveRoute, feedRoute } from "./navigation.js";
import { createEvents } from "./events.js";
import { resultPayload, sharePayload } from "./share.js";
import { mountFeed } from "./feed.js";
import { mountExplore } from "./explore.js";
import { createLauncher } from "./launcher.js";

export function mountPlatform(app) {
  const invalid = validateRegistry(experiments);
  if (invalid.length) throw new Error(invalid.join("\n"));
  const favorites = createFavorites(), recent = createRecent();
  const order = orderFeed(experiments, { favorites: favorites.all(), recent: recent.all() });
  const events = createEvents({ logger: import.meta.env.DEV ? (event) => console.debug("[camera-lab]", event) : undefined });
  let locale = getInitialLocale(), feed, route, routeGeneration = 0, feedId = order[0].id, session = null, toastTimer, viewAbort = new AbortController();
  const exploreState = { query: "", category: "ALL", input: "ALL" };
  const t = (key, values) => copy(locale, key, values);
  app.classList.add("platform");
  app.innerHTML = `<header class="platform-header"><a class="platform-brand" href="#/" aria-label="CAMERA GAME LAB · FEED"><span class="brand-frame" aria-hidden="true"><i></i></span><span>CAMERA<br>GAME LAB</span></a><nav aria-label="Navigation"><a href="#/" data-nav="feed">FEED</a><a href="#/explore" data-nav="explore">EXPLORE</a></nav><button class="platform-locale" type="button" aria-label="Switch language"></button></header>
    <div id="platform-view"></div><div class="platform-game" hidden><div class="game-topbar"><a class="game-back" href="#/"></a><span class="game-name"></span><button type="button" class="game-info" aria-label="Info">ⓘ</button></div><div class="launch-panel"></div><div class="game-cache lab"></div><div class="platform-result" hidden></div></div>
    <dialog class="platform-sheet" aria-labelledby="sheet-title"><button type="button" class="sheet-close">×</button><div class="sheet-content"></div></dialog><div class="platform-toast" role="status" aria-live="polite"></div><div class="onboarding-slot"></div>`;
  const $ = (selector) => app.querySelector(selector);
  const view = $("#platform-view"), gamePage = $(".platform-game"), panel = $(".launch-panel"), cacheRoot = $(".game-cache"), result = $(".platform-result"), sheet = $("dialog");
  let sheetTrigger;
  function toast(message) { clearTimeout(toastTimer); $(".platform-toast").textContent = message; $(".platform-toast").classList.add("is-visible"); toastTimer = setTimeout(() => $(".platform-toast").classList.remove("is-visible"), 3200); }
  function closeSheet() { if (sheet.open) sheet.close(); }
  sheet.addEventListener("close", () => { sheetTrigger?.isConnected && sheetTrigger.focus({ preventScroll: true }); });
  $(".sheet-close").addEventListener("click", closeSheet);
  sheet.addEventListener("click", (event) => { if (event.target === sheet) { const bounds = sheet.getBoundingClientRect(); if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) closeSheet(); } });
  function showSheet(content) {
    sheetTrigger = document.activeElement;
    $(".sheet-content").innerHTML = content;
    $(".sheet-close").setAttribute("aria-label", t("close"));
    if (!sheet.open) sheet.showModal();
    $(".sheet-close").focus();
  }
  function info(game) {
    showSheet(`<p class="platform-kicker">${game.exp} / ${game.collection}</p><h2 id="sheet-title">${esc(titleOf(game, locale))}</h2><p>${esc(subtitleOf(game, locale))}</p><dl><dt>${t("input")}</dt><dd>${game.input.map((input) => inputLabel(input, locale)).join(" + ")} · ${game.players}${t("players")}</dd><dt>${t("duration")}</dt><dd>${t("seconds", { n: game.duration })}</dd></dl>${game.orientation === "landscape" ? `<p>${t("rotate")}</p>` : ""}<h3>${t("privacy")}</h3><p>${t("privacyText")}</p>${game.requiresMicrophone ? `<p>${t("voiceReason")}</p>` : ""}<a class="sheet-play" href="${game.route}">PLAY ↗</a>`);
    if (session?.game.id === game.id) $(".sheet-play").remove();
    else $(".sheet-play").addEventListener("click", (event) => { event.preventDefault(); closeSheet(); action("play", game); });
  }
  async function share(game, gameResult) {
    const payload = resultPayload(game, gameResult, locale);
    const outcome = await sharePayload(payload);
    events.emit("share", { id: game.id, kind: gameResult ? "result" : "game", method: outcome.method });
    if (outcome.method === "manual") {
      showSheet(`<h2 id="sheet-title">${t("copyManually")}</h2><label for="share-link">${t("share")}</label><textarea id="share-link" rows="5" readonly>${esc(outcome.text)}</textarea>`);
      $("#share-link").focus(); $("#share-link").select();
    } else if (outcome.method !== "cancelled") toast(t(outcome.method === "native" ? "shared" : "copied"));
  }
  function navigate(hash) { if (location.hash === hash) void renderRoute(); else location.hash = hash; }
  function action(name, game, button) {
    dismissOnboarding();
    if (name === "play") {
      events.emit("game_play", { id: game.id });
      feedId = game.id; navigate(game.route);
    } else if (name === "favorite") {
      const saved = favorites.toggle(game.id);
      button.setAttribute("aria-pressed", String(saved)); button.querySelector("span").textContent = saved ? "♥" : "♡";
      events.emit("favorite", { id: game.id, saved }); toast(t(saved ? "saved" : "removed"));
    } else if (name === "share") void share(game);
    else if (name === "info") info(game);
  }
  function resultSummary(data) {
    const localized = data?.[locale === "ja" ? "summaryJa" : "summaryEn"] ?? data?.summary;
    if (localized) return localized;
    if (data?.winner != null) return data.winner ? (locale === "ja" ? `P${data.winner}の勝ち！` : `P${data.winner} wins!`) : (locale === "ja" ? "引き分け！" : "A draw!");
    if (data?.accuracy != null) return `${Math.round(data.accuracy)}% ${locale === "ja" ? "成功" : "accuracy"}`;
    return t("completed");
  }
  function showResult() {
    if (!session?.result) return;
    const game = session.game;
    result.hidden = false; cacheRoot.classList.add("platform-has-result");
    result.innerHTML = `<p class="platform-kicker">${t("nextHint")}</p><h2>${t("completed")}</h2><p>${esc(resultSummary(session.result))} · ${session.result.score ?? 0} ${locale === "ja" ? "点" : "pts"}</p><div class="result-actions"><button type="button" data-result-action="retry">↻ ${t("retry")}</button><button type="button" data-result-action="next">${t("next")} ↑</button><button type="button" data-result-action="share">↗ ${t("shareResult")}</button></div>`;
    result.querySelectorAll("button").forEach((button) => button.setAttribute("aria-label", button.textContent));
    // Keep result controls in reach after a full-screen game.
    result.scrollIntoView({ block: "nearest", behavior: "instant" });
  }
  const launcher = createLauncher(cacheRoot, {
    onExit: () => navigate(feedRoute(feedId)),
    onPhotoError: () => toast(t("failed")),
    onState(snapshot, game) {
      if (!session || session.game.id !== game.id || !session.begun) return;
      // A controller can recover from denied camera access into its demo mode.
      // Retry must keep the mode that actually produced the result.
      if (["camera", "demo"].includes(snapshot.source)) session.source = snapshot.source;
      if (["playing", "countdown"].includes(snapshot.phase) && !session.started) {
        session.started = true; recent.record(game.id); events.emit("game_start", { id: game.id, source: snapshot.source });
      }
      if (snapshot.phase === "result" && snapshot.result && !session.result) {
        session.result = { ...snapshot.result }; events.emit(snapshot.result.reason === "STOPPED" ? "game_abort" : "game_complete", { id: game.id, score: snapshot.result.score, source: snapshot.source });
        // Let the game finish its own result render / receipt before releasing input.
        const completed = session;
        queueMicrotask(() => { if (session === completed) { launcher.releaseResult(); showResult(); } });
      }
    },
  });
  result.addEventListener("click", (event) => {
    const action = event.target.closest("[data-result-action]")?.dataset.resultAction;
    if (!action || !session) return;
    const game = session.game;
    if (action === "next") {
      const next = nextExperiment(order, game.id); events.emit("next_game", { id: game.id, nextId: next.id });
      feedId = next.id; navigate(feedRoute(next.id));
    } else if (action === "share") void share(game, { ...session.result, summary: resultSummary(session.result) });
    else {
      events.emit("retry", { id: game.id });
      session.started = false; session.result = null; result.hidden = true; cacheRoot.classList.remove("platform-has-result");
      launcher.retry(session.source);
    }
  });
  function launchCopy(game) {
    panel.innerHTML = `<p class="platform-kicker">${t("before")}</p><span class="launch-number">${game.exp} / ${game.category}</span><h1>${esc(titleOf(game, locale))}</h1><p class="launch-reason">${game.requiresMicrophone ? t("voiceReason") : t("reason", { input: game.input.map((input) => inputLabel(input, locale)).join("・") })}</p><p class="launch-local">${t("local")}</p>${game.orientation === "landscape" ? `<div class="orientation-guide"><span aria-hidden="true">▯ ↻ ▭</span><p>${t("rotate")}</p><small>${t("rotateDetail")}</small></div>` : ""}<div class="launch-controls"><button type="button" class="launch-camera" disabled>${t(game.requiresMicrophone ? "microphone" : "camera")}</button>${game.demo ? `<button type="button" class="launch-demo" disabled>${t("demo")}</button>` : ""}</div><p class="launch-status" role="status">${t("loading")}</p>`;
    panel.querySelectorAll("button").forEach((button) => button.setAttribute("aria-label", button.textContent));
  }
  function updateChrome() {
    document.documentElement.lang = locale;
    $("nav").setAttribute("aria-label", locale === "ja" ? "メインナビゲーション" : "Main navigation");
    $(".platform-locale").textContent = locale === "ja" ? "EN" : "JA";
    $(".platform-locale").setAttribute("aria-label", locale === "ja" ? "Switch to English" : "日本語に切り替える");
    $(".game-back").textContent = `← ${t("back")}`; $(".game-back").href = feedRoute(feedId);
    $(".game-info").setAttribute("aria-label", t("info"));
    app.querySelectorAll("[data-nav]").forEach((link) => { if (route?.view === link.dataset.nav) link.setAttribute("aria-current", "page"); else link.removeAttribute("aria-current"); });
  }
  function dismissOnboarding() { storage.write("camera-game-lab-platform-onboarded-v1", true); $(".onboarding-slot").replaceChildren(); }
  function onboarding() {
    if (storage.read("camera-game-lab-platform-onboarded-v1", false)) return;
    $(".onboarding-slot").innerHTML = `<aside class="platform-onboarding"><span class="onboarding-mark" aria-hidden="true">↑</span><h2>${t("onboarding")}</h2><p>${t("onboardingDetail")}</p><button type="button">${t("gotIt")}</button></aside>`;
    $(".platform-onboarding button").setAttribute("aria-label", t("gotIt"));
    $(".platform-onboarding").addEventListener("click", dismissOnboarding);
    const signal = viewAbort.signal;
    view.addEventListener("pointerdown", (event) => {
      const start = event.clientY;
      view.addEventListener("pointerup", (up) => { if (Math.abs(up.clientY - start) > 20) dismissOnboarding(); }, { once: true, signal });
    }, { signal });
    view.querySelector(".lab-feed")?.addEventListener("scroll", dismissOnboarding, { once: true, passive: true, signal });
  }
  async function renderRoute(preserveFeed = false) {
    const generation = ++routeGeneration;
    if (feed) { feedId = feed.id; feed.destroy(); feed = null; }
    if (session?.begun && !session.result) events.emit("game_abort", { id: session.game.id, started: session.started });
    session = null; launcher.stop(); closeSheet(); viewAbort.abort(); viewAbort = new AbortController();
    $(".onboarding-slot").replaceChildren();
    route = resolveRoute(location.hash);
    view.hidden = route.view === "game"; gamePage.hidden = route.view !== "game"; result.hidden = true;
    app.classList.toggle("platform--feed", route.view === "feed");
    panel.hidden = false; cacheRoot.hidden = true; cacheRoot.classList.remove("platform-has-result");
    updateChrome(); window.scrollTo(0, 0);
    document.title = `${route.experiment ? titleOf(route.experiment, locale) : route.view === "explore" ? "EXPLORE" : "LAB FEED"} · CAMERA GAME LAB`;
    if (route.view === "feed") {
      const initialId = preserveFeed ? feedId : route.id ?? feedId;
      feed = mountFeed(view, { order, locale, favorites, events, initialId, onAction: action, onView: (id) => { feedId = id; } });
      onboarding();
    } else if (route.view === "explore") {
      mountExplore(view, { locale, state: { ...exploreState, signal: viewAbort.signal }, onAction: action });
      // Preserve local filters across game visits. This transient catalog state isn't a shared URL.
      view.addEventListener("input", () => { exploreState.query = view.querySelector("input").value; }, { signal: viewAbort.signal });
      view.addEventListener("click", () => { exploreState.query = view.querySelector("input").value; exploreState.category = view.querySelector('[data-category][aria-pressed="true"]').dataset.category; exploreState.input = view.querySelector('[data-input][aria-pressed="true"]').dataset.input; }, { signal: viewAbort.signal });
    } else if (route.view === "game") {
      const game = route.experiment; feedId = game.id;
      gamePage.style.setProperty("--accent", game.accent);
      $(".game-name").textContent = titleOf(game, locale); $(".game-back").href = feedRoute(game.id);
      cacheRoot.className = `game-cache lab lab--${({ watermelon: "outcam", blaster: "blaster", daitai: "daitai", guardian: "guardian", duo: "duo" })[game.module] ?? "solo"}`;
      launchCopy(game);
      session = { game, begun: false, started: false, result: null, source: "camera" };
      try {
        const ready = await launcher.prepare(game, locale);
        if (!ready || generation !== routeGeneration) return;
        panel.querySelectorAll("button").forEach((button) => { button.disabled = false; });
        panel.querySelector(".launch-status").textContent = t("ready");
      } catch (error) {
        if (generation !== routeGeneration) return;
        console.error("Game import failed", error);
        panel.querySelector(".launch-status").textContent = t("failed");
        const reload = document.createElement("button"); reload.type = "button"; reload.textContent = t("reload"); reload.setAttribute("aria-label", t("reload")); reload.addEventListener("click", () => location.reload()); panel.append(reload);
      }
    } else view.innerHTML = `<section class="explore-page"><h1>${t("notFound")}</h1><a class="sheet-play" href="#/">${t("back")}</a></section>`;
  }
  panel.addEventListener("click", (event) => {
    const button = event.target.closest(".launch-camera, .launch-demo");
    if (!button || button.disabled || !session || session.begun) return;
    session.begun = true; session.source = button.classList.contains("launch-demo") ? "demo" : "camera";
    panel.hidden = true; cacheRoot.hidden = false;
    launcher.begin(session.source);
  });
  $(".game-info").addEventListener("click", () => route.experiment && info(route.experiment));
  $(".platform-locale").addEventListener("click", () => {
    locale = locale === "ja" ? "en" : "ja";
    try { localStorage.setItem("camera-game-lab-locale", locale); } catch { /* Session preference still applies. */ }
    updateChrome(); closeSheet();
    if (route.view === "game" && session?.begun) {
      launcher.setLocale(locale); $(".game-name").textContent = titleOf(session.game, locale);
      document.title = `${titleOf(session.game, locale)} · CAMERA GAME LAB`;
      if (session.result) showResult();
    } else void renderRoute(route.view === "feed");
  });
  window.addEventListener("hashchange", () => void renderRoute());
  window.addEventListener("pagehide", () => { launcher.stop(); feed?.destroy(); if (session?.begun && !session.result) events.emit("game_abort", { id: session.game.id, reason: "pagehide" }); });
  window.addEventListener("pageshow", (event) => { if (event.persisted) void renderRoute(); });
  void renderRoute();
}
