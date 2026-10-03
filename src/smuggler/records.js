export const RECORD_KEY = 'camera-game-lab-frame-smuggler-v1';
export const GATE_KEYS = ['quickStart', 'clearRules', 'cameraParticipation', 'naturalConversation', 'surprise', 'swapAgain'];

export function createRecords(backend = () => globalThis.localStorage) {
  let records = [];
  try { const data = JSON.parse(backend().getItem(RECORD_KEY) ?? '[]'); if (Array.isArray(data)) records = data.filter(r => r?.game === 'EXP-035' && typeof r.id === 'string').slice(-50); } catch { /* Keep session records if storage is unavailable. */ }
  const persist = () => { try { backend().setItem(RECORD_KEY, JSON.stringify(records)); return true; } catch { return false; } };
  return {
    all: () => structuredClone(records),
    add(record) { records.push({ ...record, game: 'EXP-035', observations: null }); records = records.slice(-50); return persist(); },
    observe(id, answers) {
      const record = records.find(r => r.id === id);
      if (!record || record.source !== 'camera' || !GATE_KEYS.every(k => ['yes', 'no', 'unobserved'].includes(answers[k]))) return { accepted: false, persisted: false };
      record.observations = Object.fromEntries(GATE_KEYS.map(k => [k, answers[k]]));
      return { accepted: true, persisted: persist() };
    },
    humanCount: () => records.filter(r => r.source === 'camera' && r.observations).length,
  };
}
