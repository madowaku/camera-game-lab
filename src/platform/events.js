export const eventNames = Object.freeze(["feed_view", "feed_swipe", "game_play", "game_start", "game_complete", "game_abort", "retry", "next_game", "favorite", "share"]);
export function createEvents({ target = globalThis.window, logger } = {}) {
  const listeners = new Set();
  return {
    emit(name, detail = {}) {
      if (!eventNames.includes(name)) throw new Error(`Unknown platform event: ${name}`);
      const event = { name, ...detail, timestamp: Date.now() };
      listeners.forEach((listener) => listener(event));
      if (target && typeof CustomEvent !== "undefined") target.dispatchEvent(new CustomEvent("camera-lab:platform", { detail: event }));
      logger?.(event);
      return event;
    },
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
  };
}
