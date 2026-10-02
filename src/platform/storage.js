// A blocked/quota-full storage still works for this tab. No data leaves the device.
export function createStorage(getStorage = () => globalThis.localStorage) {
  const memory = new Map();
  const sessionOnly = new Set();
  return {
    read(key, fallback) {
      if (sessionOnly.has(key)) return memory.get(key) ?? fallback;
      try {
        const raw = getStorage()?.getItem(key);
        if (raw != null) { const value = JSON.parse(raw); memory.set(key, value); return value; }
      } catch { /* Invalid JSON or private browsing. */ }
      return memory.has(key) ? memory.get(key) : fallback;
    },
    write(key, value) {
      memory.set(key, value);
      try { getStorage()?.setItem(key, JSON.stringify(value)); } catch { sessionOnly.add(key); }
    },
  };
}
export const storage = createStorage();
