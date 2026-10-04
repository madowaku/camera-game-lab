function disposeMaterial(material, seen) {
  if (!material || seen.has(material)) return;
  seen.add(material);
  for (const value of Object.values(material)) {
    if (value?.isTexture && typeof value.dispose === 'function' && !seen.has(value)) {
      seen.add(value); value.dispose();
    }
  }
  material.dispose?.();
}

export function disposeObject3D(root) {
  if (!root) return;
  const seen = new Set();
  root.traverse?.(object => {
    if (object.geometry && !seen.has(object.geometry)) {
      seen.add(object.geometry); object.geometry.dispose?.();
    }
    if (Array.isArray(object.material)) object.material.forEach(material => disposeMaterial(material, seen));
    else disposeMaterial(object.material, seen);
  });
}
