const names = new Set(["creator_mode_started", "creator_mode_completed", "hero_detected", "clip_generated", "clip_replayed", "share_pressed", "retry_pressed", "face_mode_selected"]);
export function creatorMetric(name, fields = {}) {
  if (!names.has(name)) return;
  // Store counts and fixed product enums, never events, media or face features.
  try {
    const key = "camera-game-lab-creator-metrics", stored = JSON.parse(localStorage.getItem(key) || "{}");
    const safe = Object.fromEntries(Object.entries(fields).filter(([key]) => ["format", "faceMode", "source"].includes(key)));
    localStorage.setItem(key, JSON.stringify({ ...stored, [name]: { count: (stored[name]?.count ?? 0) + 1, ...safe } }));
  } catch { /* Metrics are optional. */ }
}
