import { projectMouth } from "./mouthPosition.js";

export function nosePosition(result) {
  if (result?.faceLandmarks?.length !== 1) return null;
  const p = result.faceLandmarks[0]?.[1];
  return p && [p.x, p.y].every((n) => Number.isFinite(n) && n >= 0 && n <= 1) ? { x: p.x, y: p.y } : null;
}

// The shared point projection matches mirrored, centered object-fit:cover video.
export const projectGhostPosition = projectMouth;
