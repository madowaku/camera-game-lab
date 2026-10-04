export const DIRECTOR_PRIORITY = Object.freeze({
  GAME_START: 10, FIRST_ACTION: 20, FIRST_SUCCESS: 40, NEAR_MISS: 60,
  FAIL: 65, COMBO: 50, BIG_SUCCESS: 80, HERO: 100, REACTION_WINDOW: 75, GAME_END: 0,
});

// Timestamps use the game's active presentation clock, in milliseconds.
export class DirectorEventBus {
  constructor(profile = {}) { this.profile = profile; this.events = []; this.listeners = new Set(); }
  emit(payload) {
    if (!(payload.type in DIRECTOR_PRIORITY) || !Number.isFinite(payload.timestamp) || payload.timestamp < 0) return null;
    const event = { ...payload, priority: payload.priority ?? this.profile.eventPriority?.[payload.type] ?? DIRECTOR_PRIORITY[payload.type], metadata: { ...payload.metadata } };
    this.events.push(event);
    // A round has bounded history; its HERO and first successful action survive trimming.
    if (this.events.length > 160) {
      const index = this.events.findIndex(e => !["HERO", "FIRST_SUCCESS", "GAME_START"].includes(e.type));
      this.events.splice(index < 0 ? 0 : index, 1);
    }
    this.listeners.forEach(fn => fn(event));
    return event;
  }
  subscribe(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  dispose() { this.events = []; this.listeners.clear(); }
}
