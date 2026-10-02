import { storage } from "./storage.js";
const KEY = "camera-game-lab-platform-favorites-v1";
export function createFavorites(store = storage) {
  const all = () => { const value = store.read(KEY, []); return Array.isArray(value) ? [...new Set(value.filter((id) => typeof id === "string"))] : []; };
  return { all, has: (id) => all().includes(id), toggle(id) {
    const value = new Set(all());
    if (value.has(id)) value.delete(id); else value.add(id);
    store.write(KEY, [...value]);
    return value.has(id);
  } };
}
