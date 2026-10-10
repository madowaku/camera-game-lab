// Read-only data for the existing camera input HUD (no camera pixels).
export function gestureDiagnostics(snapshot) {
  return {
    atMs: snapshot.atMs,
    inferenceCount: snapshot.metrics.inferenceCount,
    rejectedFrames: snapshot.metrics.rejectedFrames,
    rejectedHands: snapshot.metrics.rejectedHands,
    longestInferenceGapMs: snapshot.metrics.gapMaxMs,
    recentEvents: snapshot.events.map(e => ({ ...e })),
    tracks: snapshot.tracks.map(t => ({
      trackId: t.trackId,
      status: t.status,
      fresh: t.fresh,
      rawPalm: t.fresh ? t.palm : null,
      coordinateSpace: 'video-normalized-unmirrored',
      gestures: Object.fromEntries(Object.entries(t.gestures).map(([k, v]) => [k,
        { active: v.active, armed: v.armed, phase: v.phase, candidateMs: v.candidateMs }])),
    })),
  };
}
