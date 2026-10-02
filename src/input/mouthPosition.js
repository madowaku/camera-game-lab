// Project normalized landmarks into the mirrored object-fit:cover camera tile.
export function projectMouth(point, videoWidth, videoHeight, tileWidth, tileHeight) {
  if (!point || ![point.x, point.y, videoWidth, videoHeight, tileWidth, tileHeight].every(Number.isFinite) ||
      Math.min(videoWidth, videoHeight, tileWidth, tileHeight) <= 0) return null;
  const scale = Math.max(tileWidth / videoWidth, tileHeight / videoHeight);
  const x = 1 - (point.x * videoWidth * scale - (videoWidth * scale - tileWidth) / 2) / tileWidth;
  const y = (point.y * videoHeight * scale - (videoHeight * scale - tileHeight) / 2) / tileHeight;
  // A mouth outside the visible crop is not a valid launch point.
  return x >= 0 && x <= 1 && y >= 0 && y <= 1 ? { x, y } : null;
}
