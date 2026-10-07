// Deliberately independent of Phaser, DOM and recognition implementations.
export class GameEventBus {
  #listeners = new Map();
  on(type, listener) {
    if (!this.#listeners.has(type)) this.#listeners.set(type, new Set());
    this.#listeners.get(type).add(listener);
    return () => { const set = this.#listeners.get(type); set?.delete(listener); if (!set?.size) this.#listeners.delete(type); };
  }
  emit(type, payload = {}) {
    const event = Object.freeze({ ...payload, type });
    for (const listener of [...(this.#listeners.get(type) ?? []), ...(this.#listeners.get('*') ?? [])]) listener(event);
    return event;
  }
  clear() { this.#listeners.clear(); }
  get listenerCount() { return [...this.#listeners.values()].reduce((n, set) => n + set.size, 0); }
}
