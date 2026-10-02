import { storage } from "./storage.js";
const KEY = "camera-game-lab-platform-recent-v1";
export function createRecent(store = storage) {
  const all = () => { const value = store.read(KEY, []); return Array.isArray(value) ? value.filter((item) => item && typeof item.id === "string" && Number.isFinite(item.playedAt)).slice(0, 50) : []; };
  return { all, record(id, playedAt = Date.now()) {
    const value = [{ id, playedAt }, ...all().filter((item) => item.id !== id)].slice(0, 50);
    store.write(KEY, value); return value;
  } };
}
