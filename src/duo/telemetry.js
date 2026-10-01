const STORAGE_KEY = "camera-game-lab-duo-rounds";

export function recordDuoRound(result) {
  const receipt = { ...result, recordedAt: new Date().toISOString() };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...readDuoRounds(), receipt].slice(-50)));
  } catch { /* In-memory result still works without storage. */ }
  return receipt;
}

export function readDuoRounds() {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(value) ? value : [];
  } catch { return []; }
}

export function createDuoPlaytestReport(latestRound = null) {
  const rounds = readDuoRounds();
  // Keep the visible receipt exportable even when localStorage is unavailable.
  if (latestRound && !rounds.some((round) => round?.recordedAt === latestRound.recordedAt &&
    round?.experiment === latestRound.experiment && round?.source === latestRound.source)) rounds.push(latestRound);
  return {
    format: "tiny-bot-duel-playtest-v1",
    exportedAt: new Date().toISOString(),
    humanVerdict: "NOT_RECORDED",
    rounds: rounds.slice(-50)
  };
}
