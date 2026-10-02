// Deterministic and pure. Freeze this order during a visit so favorites never move
// a card out from under a finger. New sessions use the updated local preferences.
export function orderFeed(registry, { favorites = [], recent = [] } = {}) {
  const liked = new Set(favorites), played = new Map(recent.map((item, i) => [item.id, i]));
  const candidates = registry.filter((game) => game.status === "playable").map((game, index) => ({ game, index,
    weight: (game.featured ? 6 : 0) + (liked.has(game.id) ? 4 : 0) + (!played.has(game.id) ? 3 : -3 / (played.get(game.id) + 1)),
  }));
  const result = [];
  while (candidates.length) {
    const last = result.at(-1)?.category;
    candidates.sort((a, b) => (b.weight - (b.game.category === last ? 5 : 0)) - (a.weight - (a.game.category === last ? 5 : 0)) || a.index - b.index);
    result.push(candidates.shift().game);
  }
  return result;
}
export function nextExperiment(order, id) { return order[(order.findIndex((game) => game.id === id) + 1) % order.length] ?? null; }
