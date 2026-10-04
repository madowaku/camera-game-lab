export const airSlashCreatorProfile = {
  brand: 'AIR SLASH',
  FIRST: { kind: 'perfect', label: 'FIRST SLASH!', duration: 700 },
  XSLASH: { kind: 'perfect', label: 'X-SLASH!', duration: 950 },
  COMBO10: { kind: 'perfect', label: '10 COMBO!', duration: 900 },
  BOMB: { kind: 'fail', label: 'BOOM!', duration: 950 },
  STORM: { kind: 'perfect', label: 'FRUIT STORM', duration: 1000 },
};
export function selectAirSlashReplay(snapshot, result) {
  if (!snapshot.frames.length) return { ...snapshot, duration: 7000, source: result.source };
  const priorities = { XSLASH: 5, COMBO10: 4, BOMB: 3, STORM: 2, FIRST: 1 };
  const best = [...snapshot.events].sort((a, b) => (priorities[b.type] ?? 0) - (priorities[a.type] ?? 0) || b.at - a.at)[0];
  const last = snapshot.frames.at(-1).at, first = snapshot.frames[0].at;
  const from = Math.max(first, Math.min((best?.at ?? last) - 1800, last - 6000));
  return { ...snapshot, frames: snapshot.frames.filter(f => f.at >= from && f.at <= from + 6000), from, heroAt: best?.at ?? null, heroLabel: best?.label ?? result.title, source: result.source, duration: 7000 };
}
