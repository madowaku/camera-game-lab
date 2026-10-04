export const RECORD_KEY = "camera-game-lab-duo-palm-pong-v1";
export const SETTINGS_KEY = "camera-game-lab-palm-pong-settings-v1";
export function readSettings(storage) {
  try { const s = JSON.parse((storage ?? globalThis.localStorage)?.getItem(SETTINGS_KEY) ?? "{}"); return { guide: s?.guide !== false, effects: s?.effects !== false }; }
  catch { return { guide: true, effects: true }; }
}
export function saveSettings(patch, storage) {
  const s = { ...readSettings(storage), ...patch };
  try { (storage ?? globalThis.localStorage)?.setItem(SETTINGS_KEY, JSON.stringify({ guide: s.guide, effects: s.effects })); } catch { /* Session settings still work. */ }
}
export function readRecords(storage) {
  try {
    const backend = storage ?? globalThis.localStorage;
    const r = JSON.parse(backend?.getItem(RECORD_KEY) ?? "{}");
    return Object.fromEntries(["camera", "demo"].map(source => [source, { best: Math.max(0, Number(r[source]?.best) || 0), rounds: Math.max(0, Number(r[source]?.rounds) || 0), total: Math.max(0, Number(r[source]?.total) || 0) }]));
  } catch { return { camera: { best: 0, rounds: 0, total: 0 }, demo: { best: 0, rounds: 0, total: 0 } }; }
}
export function saveResult(result, storage) {
  const records = readRecords(storage), source = result.source === "demo" ? "demo" : "camera", record = records[source];
  record.best = Math.max(record.best, result.bestRally); record.rounds++; record.total += result.totalReturns;
  try { (storage ?? globalThis.localStorage)?.setItem(RECORD_KEY, JSON.stringify(records)); } catch { /* Storage is optional. */ }
  return record.best;
}
