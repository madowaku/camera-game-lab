export function viewportSize(host) {
  const rect = host?.getBoundingClientRect?.();
  const width = Math.max(1, Math.round(rect?.width || host?.clientWidth || 1));
  const height = Math.max(1, Math.round(rect?.height || host?.clientHeight || 1));
  return { width, height };
}

export function cappedPixelRatio(maxPixelRatio = 1.5, deviceRatio = globalThis.devicePixelRatio ?? 1) {
  const ratio = Number.isFinite(deviceRatio) ? deviceRatio : 1;
  return Math.max(1, Math.min(Math.max(1, maxPixelRatio), ratio));
}
