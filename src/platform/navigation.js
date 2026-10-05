import { experiments } from "./experiments.js";
export const feedRoute = (id) => id ? `#/feed/${encodeURIComponent(id)}` : "#/";
export function resolveRoute(hash = "", registry = experiments) {
  if (["", "#", "#/", "#feed", "#/feed"].includes(hash)) return { view: "feed" };
  if (["#explore", "#/explore"].includes(hash)) return { view: "explore" };
  if (hash.startsWith("#/feed/")) {
    let id; try { id = decodeURIComponent(hash.slice(7)); } catch { return { view: "not-found" }; }
    const game = registry.find(game => game.id === id || game.legacyIds?.includes(id));
    return game ? { view: "feed", id: game.id } : { view: "not-found" };
  }
  const experiment = registry.find((game) => game.route === hash || game.aliases.includes(hash));
  return experiment ? { view: "game", experiment } : { view: "not-found" };
}
